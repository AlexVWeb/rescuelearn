/**
 * Liens d'itinéraire vers le lieu d'une session. Le lieu étant une adresse
 * complète (autocomplétion API Adresse / OSM), une recherche texte suffit :
 * pas besoin de coordonnées.
 */

export type DirectionsProvider = "google" | "apple" | "waze";

export interface DirectionsLink {
  provider: DirectionsProvider;
  label: string;
  url: string;
}

/** Google Maps : lien universel, ouvre l'app sur mobile et le site ailleurs */
export function googleMapsDirectionsUrl(location: string): string {
  return `https://www.google.com/maps/dir/?${new URLSearchParams({
    api: "1",
    destination: location.trim(),
  })}`;
}

export function getDirectionsLinks(location: string): DirectionsLink[] {
  const destination = location.trim();
  if (!destination) return [];

  return [
    {
      provider: "google",
      label: "Google Maps",
      url: googleMapsDirectionsUrl(destination),
    },
    {
      provider: "apple",
      label: "Plans (Apple)",
      url: `https://maps.apple.com/?${new URLSearchParams({ daddr: destination })}`,
    },
    {
      provider: "waze",
      label: "Waze",
      url: `https://waze.com/ul?${new URLSearchParams({ q: destination, navigate: "yes" })}`,
    },
  ];
}
