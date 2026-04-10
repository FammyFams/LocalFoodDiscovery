import PostHog from 'posthog-react-native';
import { POSTHOG_API_KEY } from '../env';

let posthog = null;

export function initAnalytics() {
  if (!POSTHOG_API_KEY) {
    console.warn('[Analytics] No PostHog API key found');
    return;
  }
  try {
    posthog = new PostHog(POSTHOG_API_KEY, {
      host: 'https://us.i.posthog.com',
    });
    console.log('[Analytics] PostHog initialized');
  } catch (e) {
    console.warn('[Analytics] PostHog init failed:', e);
  }
}

export function trackEvent(event, properties = {}) {
  if (!posthog) {
    console.warn('[Analytics] PostHog not initialized, skipping:', event);
    return;
  }
  posthog.capture(event, properties);
}

export function getPosthog() {
  return posthog;
}
