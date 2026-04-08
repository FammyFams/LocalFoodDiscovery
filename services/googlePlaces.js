import { GOOGLE_API_KEY } from '../env';

const BASE_URL = 'https://places.googleapis.com/v1/places:searchNearby';

const MAX_RADIUS_MILES = 31; // Google Places API cap (~50km)

function milesToMeters(miles) {
  return Math.round(Math.min(miles, MAX_RADIUS_MILES) * 1609.34);
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

// Known global/national chains that slip through the API type filter.
// Checked as a substring of the lowercased place name so "McDonald's Express" is also caught.
const CHAIN_PATTERNS = [
  // Burgers / fast food
  "mcdonald", "burger king", "wendy's", "wendys", "jack in the box",
  "five guys", "in-n-out", "culver's",
  "dairy queen", "hardee's", "carl's jr", "fatburger",
  "habit burger", "sonic drive", "steak 'n shake",
  // Chicken
  "kfc", "popeyes", "chick-fil-a", "raising cane", "zaxby's", "wingstop",
  "wing stop", "buffalo wild wings",
  // Pizza
  "pizza hut", "domino's", "little caesars", "papa john", "papa murphy",
  "mod pizza", "blaze pizza",
  // Mexican fast food
  "taco bell", "del taco", "qdoba", "moe's southwest",
  // Subs / sandwiches
  "subway", "jersey mike", "jimmy john", "firehouse subs", "quiznos",
  "blimpie", "jason's deli",
  // Casual dining chains
  "applebee's", "chili's", "olive garden", "red lobster", "tgi friday",
  "outback steakhouse", "longhorn steakhouse", "texas roadhouse",
  "cracker barrel", "golden corral", "ruby tuesday", "red robin",
  "bob evans", "perkins restaurant",
  // Breakfast chains
  "ihop", "denny's", "waffle house",
  // Asian fast casual
  "panda express",
  // Burritos / bowls
  "chipotle",
  // Noodles / other
  "noodles & company", "panera", "boston market", "el pollo loco",
  // Coffee (when they show up as food)
  "starbucks", "dunkin'", "dunkin donuts", "tim hortons", "dutch bros",
  // Convenience / gas station food
  "7-eleven", "7 eleven", "circle k", "wawa", "sheetz", "quiktrip",
  "casey's general",
];

function isGlobalChain(name) {
  const lower = name.toLowerCase();
  return CHAIN_PATTERNS.some((pattern) => lower.includes(pattern));
}

function parseTypes(types = []) {
  const skip = new Set(['restaurant', 'food', 'point_of_interest', 'establishment', 'store']);
  return types
    .filter((t) => !skip.has(t))
    .map((t) => t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()))
    .slice(0, 4);
}

// When "Any" is selected we fan out across these buckets in parallel so we
// get a diverse pool instead of Google's generic top-20 "restaurant" list.
const ANY_CUISINE_BUCKETS = [
  'american_restaurant',
  'chinese_restaurant',
  'italian_restaurant',
  'mexican_restaurant',
  'japanese_restaurant',
  'indian_restaurant',
  'thai_restaurant',
  'mediterranean_restaurant',
  'vietnamese_restaurant',
  'korean_restaurant',
];

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
  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_API_KEY,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) return [];
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
    // Fan out across cuisine buckets in parallel for a diverse "Any" result
    const results = await Promise.all(
      ANY_CUISINE_BUCKETS.map((type) =>
        fetchOneBucket({ latitude, longitude, radiusMiles, includedTypes: [type], excludedTypes })
      )
    );
    // Deduplicate by place ID
    const seen = new Set();
    rawPlaces = [];
    for (const batch of results) {
      for (const place of batch) {
        if (!seen.has(place.id)) {
          seen.add(place.id);
          rawPlaces.push(place);
        }
      }
    }
  } else {
    rawPlaces = await fetchOneBucket({
      latitude, longitude, radiusMiles,
      includedTypes: cuisineTypes,
      excludedTypes,
    });
  }

  const filtered = rawPlaces.filter((place) => !isGlobalChain(place.displayName?.text ?? ''));

  // Shuffle so the order feels random each time
  for (let i = filtered.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [filtered[i], filtered[j]] = [filtered[j], filtered[i]];
  }

  return filtered.map((place) => ({
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
