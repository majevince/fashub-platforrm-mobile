import React, { Component, type ReactNode } from 'react';

/**
 * Native port of web's SectionErrorBoundary — isolates the new project-detail
 * Location/Map and Recommended Projects sections so a failure in either
 * (both new, non-critical enhancements — WebView+Leaflet map, a fresh
 * recommendations fetch) can't take the pre-existing owner-contact panel
 * (Message/Request Quote/Schedule Consult) down with it. Fails silently
 * rather than rendering an error UI, since these sections are enhancements.
 */
export class SectionErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('[SectionErrorBoundary]', error);
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}
