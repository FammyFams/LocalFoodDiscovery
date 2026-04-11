// Reads EXPO_PUBLIC_ env vars — set via .env file locally or EAS secrets for builds.
// See .env.example for the required variables.

// Places API proxy (Supabase Edge Function). The GOOGLE_API_KEY lives only
// in Supabase secrets — it is never bundled into the app.
export const PLACES_PROXY_URL: string = process.env.EXPO_PUBLIC_PLACES_PROXY_URL || '';

export const POSTHOG_API_KEY: string = process.env.EXPO_PUBLIC_POSTHOG_API_KEY || '';
