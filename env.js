// Reads EXPO_PUBLIC_ env vars — set via .env file locally or EAS secrets for builds.
// See .env.example for the required variables.

export const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_API_KEY || '';
export const POSTHOG_API_KEY = process.env.EXPO_PUBLIC_POSTHOG_API_KEY || '';
export const YELP_API_KEY = process.env.EXPO_PUBLIC_YELP_API_KEY || '';
export const FOURSQUARE_API_KEY = process.env.EXPO_PUBLIC_FOURSQUARE_API_KEY || '';
