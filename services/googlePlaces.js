import { PLACES_PROXY_URL } from '../env';

const MAX_RADIUS_MILES = 31; // Google Places API cap (~50km)

function milesToMeters(miles) {
  return Math.round(Math.min(miles, MAX_RADIUS_MILES) * 1609.34);
}

// Photos load via the proxy's /photo endpoint, which 302-redirects to a
// signed Google CDN URL. The Google API key never touches the client.
export function getPhotoUrl(photoName) {
  return `${PLACES_PROXY_URL}/photo?name=${encodeURIComponent(photoName)}&maxHeightPx=800`;
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


const FIELD_MASK = [
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
].join(',');

async function fetchOneBucket({ latitude, longitude, radiusMiles, includedTypes, excludedTypes }) {
  const body = {
    includedTypes,
    ...(excludedTypes.length > 0 && { excludedTypes }),
    maxResultCount: 20,
    locationRestriction: {
      circle: {
        center: { latitude, longitude },
        radius: milesToMeters(radiusMiles),
      },
    },
  };
  if (!PLACES_PROXY_URL) {
    throw new Error('Restaurant service URL not configured');
  }
  const response = await fetch(`${PLACES_PROXY_URL}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body, fieldMask: FIELD_MASK }),
  });
  if (!response.ok) {
    throw new Error(`Restaurant search failed (${response.status})`);
  }
  const data = await response.json();
  return data.places || [];
}

export async function fetchNearbyRestaurants({ latitude, longitude, radiusMiles = 1, cuisineTypes = [], noFastFood = false, noConvenienceStore = false }) {
  const excludedTypes = [
    ...(noFastFood ? ['fast_food_restaurant'] : []),
    ...(noConvenienceStore ? ['convenience_store', 'gas_station'] : []),
  ];

  let rawPlaces;
  if (cuisineTypes.length === 0) {
    rawPlaces = await fetchOneBucket({
      latitude, longitude, radiusMiles,
      includedTypes: ['restaurant'],
      excludedTypes,
    });
  } else {
    rawPlaces = await fetchOneBucket({
      latitude, longitude, radiusMiles,
      includedTypes: cuisineTypes,
      excludedTypes,
    });
  }

  const HOTEL_TYPES = new Set(['hotel', 'motel', 'lodging', 'extended_stay_hotel', 'resort_hotel', 'bed_and_breakfast', 'hostel', 'inn']);

  const filtered = rawPlaces.filter((place) => {
    if (place.types?.some((t) => HOTEL_TYPES.has(t))) return false;
    return true;
  });

  // Partition into open and closed, shuffle each group, then concat
  // so closed restaurants appear at the back instead of being discarded
  const open = filtered.filter((p) => p.regularOpeningHours?.openNow !== false);
  const closed = filtered.filter((p) => p.regularOpeningHours?.openNow === false);

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  const shuffled = [...shuffle(open), ...shuffle(closed)];

  return shuffled.map((place) => ({
    id: place.id,
    name: place.displayName?.text ?? 'Unknown',
    distance: null,
    priceLevel: parsePriceLevel(place.priceLevel),
    images: (place.photos || []).slice(0, 1).map((p) => getPhotoUrl(p.name)),
    allPhotoRefs: (place.photos || []).slice(0, 3).map((p) => p.name),
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
