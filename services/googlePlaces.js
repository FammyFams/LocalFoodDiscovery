import { GOOGLE_API_KEY } from '../config';

const BASE_URL = 'https://places.googleapis.com/v1/places:searchNearby';

function milesToMeters(miles) {
  return Math.min(Math.round(miles * 1609.34), 50000);
}

function getPhotoUrl(photoName) {
  return `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=800&key=${GOOGLE_API_KEY}`;
}

function parsePriceLevel(level) {
  const map = {
    PRICE_LEVEL_FREE: 0,
    PRICE_LEVEL_INEXPENSIVE: 1,
    PRICE_LEVEL_MODERATE: 2,
    PRICE_LEVEL_EXPENSIVE: 3,
    PRICE_LEVEL_VERY_EXPENSIVE: 4,
  };
  return map[level] ?? 1;
}

function parseTypes(types = []) {
  const skip = new Set(['restaurant', 'food', 'point_of_interest', 'establishment', 'store']);
  return types
    .filter((t) => !skip.has(t))
    .map((t) => t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()))
    .slice(0, 4);
}

export async function fetchNearbyRestaurants({ latitude, longitude, radiusMiles = 1 }) {
  const body = {
    includedTypes: ['restaurant'],
    maxResultCount: 20,
    locationRestriction: {
      circle: {
        center: { latitude, longitude },
        radius: milesToMeters(radiusMiles),
      },
    },
  };

  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_API_KEY,
      'X-Goog-FieldMask': [
        'places.id',
        'places.displayName',
        'places.rating',
        'places.userRatingCount',
        'places.priceLevel',
        'places.photos',
        'places.formattedAddress',
        'places.location',
        'places.editorialSummary',
        'places.regularOpeningHours',
        'places.nationalPhoneNumber',
        'places.websiteUri',
        'places.types',
        'places.servesBeer',
        'places.servesWine',
        'places.servesBrunch',
        'places.servesBreakfast',
        'places.servesLunch',
        'places.servesDinner',
        'places.takeout',
        'places.delivery',
        'places.dineIn',
      ].join(','),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google Places error ${response.status}: ${text}`);
  }

  const data = await response.json();

  return (data.places || []).map((place) => ({
    id: place.id,
    name: place.displayName?.text ?? 'Unknown',
    distance: null,
    priceLevel: parsePriceLevel(place.priceLevel),
    images: (place.photos || []).slice(0, 8).map((p) => getPhotoUrl(p.name)),
    address: place.formattedAddress ?? 'Address unavailable',
    rating: place.rating ? place.rating.toFixed(1) : null,
    userRatingsTotal: place.userRatingCount ?? null,
    // Extra detail fields
    description: place.editorialSummary?.text ?? null,
    phone: place.nationalPhoneNumber ?? null,
    website: place.websiteUri ?? null,
    openNow: place.regularOpeningHours?.openNow ?? null,
    hours: place.regularOpeningHours?.weekdayDescriptions ?? [],
    types: parseTypes(place.types),
    tags: [
      place.dineIn && 'Dine In',
      place.takeout && 'Takeout',
      place.delivery && 'Delivery',
      place.servesBreakfast && 'Breakfast',
      place.servesBrunch && 'Brunch',
      place.servesLunch && 'Lunch',
      place.servesDinner && 'Dinner',
      place.servesBeer && 'Beer',
      place.servesWine && 'Wine',
    ].filter(Boolean),
  }));
}
