import React from 'react';

/**
 * Web preview shim — see stripeCompat.ts's comment for why this file
 * exists. Metro picks this over stripeCompat.ts automatically for
 * platform=web (standard .web.ts override, same pattern as
 * lib/secureStorage.web.ts already uses), so the real, web-incompatible
 * @stripe/stripe-react-native package never enters the web bundle's
 * dependency graph at all.
 */
export function StripeProvider({ children }: { children: React.ReactNode }) {
  return React.createElement(React.Fragment, null, children);
}

export function useStripe() {
  const unavailable = async () => ({
    error: { message: 'Payments are not available in the web preview — use the native app.' },
  });
  return { initPaymentSheet: unavailable, presentPaymentSheet: unavailable };
}
