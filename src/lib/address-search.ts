/**
 * Recherche d'adresses pour l'autocomplétion du lieu de session.
 *
 * - API Adresse (BAN, servie par la Géoplateforme IGN) : adresses officielles françaises.
 * - Photon (index OpenStreetMap) : complète avec les lieux nommés absents de la BAN
 *   (gymnases, casernes, salles…). Nominatim interdit l'autocomplétion côté client,
 *   Photon est conçu pour cet usage.
 */

export const API_ADRESSE_URL = "https://data.geopf.fr/geocodage/search";
export const PHOTON_URL = "https://photon.komoot.io/api/";

export const MIN_QUERY_LENGTH = 3;

export type AddressSource = "ban" | "osm";

export interface AddressSuggestion {
  id: string;
  /** Texte inséré dans le champ */
  label: string;
  /** Ligne secondaire affichée sous le libellé */
  context?: string;
  source: AddressSource;
}

interface BanFeature {
  properties: {
    id?: string;
    label?: string;
    context?: string;
  };
}

interface PhotonFeature {
  properties: {
    osm_type?: string;
    osm_id?: number;
    name?: string;
    housenumber?: string;
    street?: string;
    postcode?: string;
    city?: string;
    state?: string;
    country?: string;
    countrycode?: string;
  };
}

export function parseBanResponse(data: {
  features?: BanFeature[];
}): AddressSuggestion[] {
  return (data.features ?? []).flatMap((feature) => {
    const { id, label, context } = feature.properties;
    if (!label) return [];
    return [
      { id: `ban:${id ?? label}`, label, context, source: "ban" as const },
    ];
  });
}

export function parsePhotonResponse(data: {
  features?: PhotonFeature[];
}): AddressSuggestion[] {
  return (data.features ?? []).flatMap((feature) => {
    const p = feature.properties;
    const streetLine = [p.housenumber, p.street].filter(Boolean).join(" ");
    const cityLine = [p.postcode, p.city].filter(Boolean).join(" ");
    const address = [streetLine, cityLine].filter(Boolean).join(" ");
    const label = [p.name, address].filter(Boolean).join(", ");
    if (!label) return [];

    const context = [
      p.state,
      p.countrycode && p.countrycode !== "FR" ? p.country : undefined,
    ]
      .filter(Boolean)
      .join(", ");

    return [
      {
        id: `osm:${p.osm_type ?? ""}${p.osm_id ?? label}`,
        label,
        context: context || undefined,
        source: "osm" as const,
      },
    ];
  });
}

function normalize(label: string) {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Adresses BAN en premier, puis les lieux OSM non doublonnés. */
export function mergeSuggestions(
  ban: AddressSuggestion[],
  osm: AddressSuggestion[],
  limit = 8
): AddressSuggestion[] {
  const seen = new Set<string>();
  const merged: AddressSuggestion[] = [];
  for (const suggestion of [...ban, ...osm]) {
    const key = normalize(suggestion.label);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(suggestion);
    if (merged.length >= limit) break;
  }
  return merged;
}

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

export async function searchAddresses(
  query: string,
  signal?: AbortSignal
): Promise<AddressSuggestion[]> {
  const q = query.trim();
  if (q.length < MIN_QUERY_LENGTH) return [];

  const banUrl = `${API_ADRESSE_URL}?${new URLSearchParams({
    q,
    autocomplete: "1",
    limit: "5",
  })}`;
  const photonUrl = `${PHOTON_URL}?${new URLSearchParams({
    q,
    limit: "5",
    lang: "fr",
  })}`;

  const [ban, osm] = await Promise.allSettled([
    fetchJson<{ features?: BanFeature[] }>(banUrl, signal).then(
      parseBanResponse
    ),
    fetchJson<{ features?: PhotonFeature[] }>(photonUrl, signal).then(
      parsePhotonResponse
    ),
  ]);

  // Une source indisponible ne doit pas bloquer l'autre
  return mergeSuggestions(
    ban.status === "fulfilled" ? ban.value : [],
    osm.status === "fulfilled" ? osm.value : []
  );
}
