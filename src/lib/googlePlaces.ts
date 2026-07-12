const API_KEY = process.env.GOOGLE_PLACES_API_KEY ?? "";
const BASE_URL = "https://maps.googleapis.com/maps/api/place";

export type PlaceResult = {
  placeId: string;
  name: string;
  address: string | null;
};

export type PlaceDetails = {
  phone: string | null;
  website: string | null;
};

export function isGooglePlacesConfigured(): boolean {
  return API_KEY.length > 0;
}

/** Text Search — e.g. query = "Rumah sakit di Jakarta Selatan". Returns up
 * to ~20 results per call (Google's page size); good enough for a lead-gen
 * batch, no pagination needed here. */
export async function searchPlaces(query: string): Promise<PlaceResult[]> {
  if (!API_KEY) throw new Error("GOOGLE_PLACES_API_KEY belum diatur");
  const url = `${BASE_URL}/textsearch/json?query=${encodeURIComponent(query)}&key=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Google Places search error: ${res.status}`);
  const data = await res.json();
  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    throw new Error(`Google Places search error: ${data.status} ${data.error_message ?? ""}`);
  }
  const results = Array.isArray(data.results) ? data.results : [];
  return results.map((r: { place_id: string; name: string; formatted_address?: string }) => ({
    placeId: r.place_id,
    name: r.name,
    address: r.formatted_address ?? null,
  }));
}

/** Place Details — Text Search doesn't include phone/website, so this is a
 * second billable call per place to fetch them. */
export async function getPlaceDetails(placeId: string): Promise<PlaceDetails> {
  if (!API_KEY) throw new Error("GOOGLE_PLACES_API_KEY belum diatur");
  const fields = "international_phone_number,website";
  const url = `${BASE_URL}/details/json?place_id=${encodeURIComponent(placeId)}&fields=${fields}&key=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Google Places details error: ${res.status}`);
  const data = await res.json();
  if (data.status !== "OK") {
    return { phone: null, website: null };
  }
  const result = data.result ?? {};
  return {
    phone: normalizePhone(result.international_phone_number ?? null),
    website: result.website ?? null,
  };
}

/** "+62 21 1234 5678" -> "622112345678" — WA chat IDs are digits-only. */
function normalizePhone(raw: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^\d]/g, "");
  return digits.length >= 8 ? digits : null;
}
