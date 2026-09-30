// Native (iOS/Android) — the real SDK. See stripeCompat.web.ts for why this
// indirection exists: @stripe/stripe-react-native has no web target at all
// (its own index.js unconditionally pulls in CardForm.js, which imports
// react-native renderer internals Metro can't resolve for platform=web),
// so importing it directly from app/_layout.tsx broke the ENTIRE app's web
// bundle with a 500, not just a Stripe-specific screen — found while
// investigating an unrelated mobile-search bug report and fixed here since
// it was blocking any web-preview testing at all, not just search's.
export { StripeProvider, useStripe } from '@stripe/stripe-react-native';
