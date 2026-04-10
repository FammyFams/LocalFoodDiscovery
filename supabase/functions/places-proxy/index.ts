// Supabase Edge Function: places-proxy
//
// Proxies Google Places API (New) calls so the GOOGLE_API_KEY never ships
// to the mobile client. Holds two endpoints:
//
//   POST /places-proxy/search
//     Body: { body: <searchNearby body>, fieldMask: <comma-separated string> }
//     Returns: raw Places API JSON response
//
//   GET  /places-proxy/photo?name=places/XXX/photos/YYY&maxHeightPx=800
//     Returns: 302 redirect to a signed lh3.googleusercontent.com URL
//              that does NOT contain the API key
//
// Secrets required (set in Supabase dashboard → Edge Functions → Secrets):
//   GOOGLE_API_KEY
//
// Deploy with `verify_jwt = false` so the <Image> component can load
// /photo URLs directly without attaching auth headers.

const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY");
const PLACES_BASE = "https://places.googleapis.com/v1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!GOOGLE_API_KEY) {
    return jsonResponse({ error: "GOOGLE_API_KEY not configured" }, 500);
  }

  const url = new URL(req.url);
  // Supabase routes the function at /functions/v1/places-proxy/*
  // Strip the prefix so we can match on /search or /photo.
  const path = url.pathname.replace(/^.*\/places-proxy/, "") || "/";

  try {
    // ---- Search endpoint -------------------------------------------------
    if (req.method === "POST" && path === "/search") {
      const payload = await req.json();
      const { body, fieldMask } = payload ?? {};
      if (!body || !fieldMask) {
        return jsonResponse({ error: "Missing body or fieldMask" }, 400);
      }

      const response = await fetch(`${PLACES_BASE}/places:searchNearby`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": GOOGLE_API_KEY,
          "X-Goog-FieldMask": fieldMask,
        },
        body: JSON.stringify(body),
      });

      const text = await response.text();
      return new Response(text, {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- Photo redirect endpoint -----------------------------------------
    if (req.method === "GET" && path === "/photo") {
      const photoName = url.searchParams.get("name");
      const maxHeightPx = url.searchParams.get("maxHeightPx") ?? "800";

      if (!photoName || !photoName.startsWith("places/")) {
        return new Response("Invalid photo name", {
          status: 400,
          headers: corsHeaders,
        });
      }

      // Ask Google for the signed CDN URL without following the redirect.
      // This returns JSON like: { "name": "...", "photoUri": "https://lh3.googleusercontent.com/..." }
      // The photoUri is a short-lived signed URL that does NOT require our API key.
      const googleUrl =
        `${PLACES_BASE}/${photoName}/media` +
        `?maxHeightPx=${encodeURIComponent(maxHeightPx)}` +
        `&skipHttpRedirect=true` +
        `&key=${GOOGLE_API_KEY}`;

      const response = await fetch(googleUrl);
      if (!response.ok) {
        return new Response("Photo fetch failed", {
          status: 502,
          headers: corsHeaders,
        });
      }

      const data = await response.json();
      if (!data.photoUri) {
        return new Response("No photoUri in response", {
          status: 502,
          headers: corsHeaders,
        });
      }

      // 302 redirect — React Native's <Image> follows this transparently.
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          Location: data.photoUri,
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    return new Response("Not found", { status: 404, headers: corsHeaders });
  } catch (err) {
    return jsonResponse({ error: String(err) }, 500);
  }
});
