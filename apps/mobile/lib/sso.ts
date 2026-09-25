import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { ApiError } from '@fashub/api-client';
import type { AppleSsoUser } from '@fashub/types';
// Type-only import — erased at compile time, so it carries none of the
// runtime risk described below. Needed so loadGoogleSignin() below can be
// typed without ever executing this package's top-level code eagerly.
import type * as GoogleSigninModule from '@react-native-google-signin/google-signin';

/**
 * @react-native-google-signin/google-signin registers its native module via
 * `TurboModuleRegistry.getEnforcing('RNGoogleSignin')` at the *top level* of
 * its own entry file — that's a hard requirement, not a soft check, and it
 * throws synchronously the moment the module is first loaded if the running
 * binary doesn't have the native module compiled in (true for every build
 * that predates this package being added — i.e. every device/simulator
 * until the next EAS dev-client rebuild). A normal top-level `import`
 * would trigger that the instant this file loads, crashing every screen
 * that imports lib/sso.ts (login, signup) before anyone even taps a
 * button. Loading it lazily, only inside googleSignIn() when it's actually
 * called, confines that failure to "tap Continue with Google on an old
 * binary" — caught below and turned into a real error — instead of taking
 * the whole app down on load.
 */
function loadGoogleSignin(): typeof GoogleSigninModule {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('@react-native-google-signin/google-signin');
}

let googleConfigured = false;
function ensureGoogleConfigured(GoogleSignin: typeof GoogleSigninModule.GoogleSignin) {
  if (googleConfigured) return;
  // webClientId is required even on native platforms — it's what makes
  // Google mint an idToken with an audience our backend can verify
  // (GOOGLE_CLIENT_ID server-side), not just an access token. iosClientId
  // is only needed if a separate iOS OAuth client was registered; leave
  // unset to fall back to webClientId's audience on iOS too.
  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || undefined,
  });
  googleConfigured = true;
}

export class SsoCancelledError extends Error {
  constructor() {
    super('Sign-in was cancelled');
    this.name = 'SsoCancelledError';
  }
}

/** Thrown when the current app binary doesn't have the native SSO module compiled in yet (needs a fresh EAS dev-client build, not just a JS reload). */
export class SsoNotAvailableError extends Error {
  constructor(provider: 'google' | 'apple') {
    super(
      `${provider === 'google' ? 'Google' : 'Apple'} sign-in isn't available in this build yet. ` +
        `This app needs to be rebuilt (EAS dev-client build) to include it — a JS-only reload isn't enough.`
    );
    this.name = 'SsoNotAvailableError';
  }
}

/** Prefer a real, actionable message (SsoNotAvailableError, ApiError) over a generic fallback — used identically by both login and signup screens. */
export function ssoErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof SsoNotAvailableError) return err.message;
  if (err instanceof ApiError) return err.message;
  return fallback;
}

function isMissingNativeModuleError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /TurboModuleRegistry|could not be found.*native binary|NativeModule.*null/i.test(message);
}

/**
 * Triggers native Google Sign-In on iOS/Android and resolves with the raw
 * Google ID token — send this to loginWithGoogle()/POST
 * /api/auth/sso/google. Throws SsoCancelledError if the person backs out,
 * SsoNotAvailableError if this binary lacks the native module, so callers
 * can distinguish both from "actually failed".
 */
export async function googleSignIn(): Promise<string> {
  if (!process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID) {
    throw new Error('Google sign-in is not configured yet');
  }

  let GoogleSignin: typeof GoogleSigninModule.GoogleSignin;
  let statusCodes: typeof GoogleSigninModule.statusCodes;
  try {
    const mod = loadGoogleSignin();
    GoogleSignin = mod.GoogleSignin;
    statusCodes = mod.statusCodes;
  } catch (err) {
    if (isMissingNativeModuleError(err)) throw new SsoNotAvailableError('google');
    throw err;
  }

  ensureGoogleConfigured(GoogleSignin);

  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (response.type !== 'success') {
      throw new SsoCancelledError();
    }
    if (!response.data.idToken) {
      throw new Error('Google sign-in did not return an ID token');
    }
    return response.data.idToken;
  } catch (err: any) {
    if (err?.code === statusCodes.SIGN_IN_CANCELLED) {
      throw new SsoCancelledError();
    }
    if (isMissingNativeModuleError(err)) {
      throw new SsoNotAvailableError('google');
    }
    throw err;
  }
}

export interface AppleSignInResult {
  identityToken: string;
  user?: AppleSsoUser;
}

/**
 * Triggers Sign in with Apple. Native (expo-apple-authentication) on iOS,
 * where Apple actually supports it. Android has no native "Sign in with
 * Apple" — Apple's own guidelines require offering it there too if another
 * third-party sign-in (Google) is offered, so Android instead needs Apple's
 * web-based OAuth flow (react-native's own WebBrowser + Apple's authorize
 * endpoint). That web-based fallback isn't implemented in this pass — see
 * the SSO ticket write-up — so this currently only works on iOS, and
 * callers should hide/disable the Apple button on Android until it lands.
 *
 * Unlike google-signin, expo-apple-authentication uses
 * requireOptionalNativeModule internally and never throws just from being
 * imported — isAvailableAsync() below already covers "this binary/device
 * doesn't support it" safely, so no lazy-loading trick is needed here.
 */
export async function appleSignIn(): Promise<AppleSignInResult> {
  if (Platform.OS !== 'ios') {
    throw new Error('Sign in with Apple is only available on iOS right now');
  }

  const isAvailable = await AppleAuthentication.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('Sign in with Apple is not available on this device');
  }

  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      throw new Error('Apple sign-in did not return an identity token');
    }

    // Apple only returns fullName/email on the very first authorization
    // ever for this app — both are null on every subsequent sign-in, by
    // Apple's own design, not a bug here.
    const hasName = credential.fullName?.givenName || credential.fullName?.familyName;
    const user: AppleSsoUser | undefined =
      hasName || credential.email
        ? {
            name: hasName
              ? {
                  firstName: credential.fullName?.givenName || undefined,
                  lastName: credential.fullName?.familyName || undefined,
                }
              : undefined,
            email: credential.email || undefined,
          }
        : undefined;

    return { identityToken: credential.identityToken, user };
  } catch (err: any) {
    if (err?.code === 'ERR_REQUEST_CANCELED') {
      throw new SsoCancelledError();
    }
    throw err;
  }
}
