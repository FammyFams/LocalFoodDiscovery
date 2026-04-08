import PostHog from 'posthog-react-native';
import { POSTHOG_API_KEY } from '../env';

let posthog = null;

export async function initAnalytics() {
  if (!POSTHOG_API_KEY) return;
  posthog = await PostHog.initAsync(POSTHOG_API_KEY, {
    host: 'https://us.i.posthog.com',
  });
}

export function trackEvent(event, properties = {}) {
  posthog?.capture(event, properties);
}

export function getPosthog() {
  return posthog;
}
