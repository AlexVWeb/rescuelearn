import { describe, expect, it } from "vitest";

import { getDirectionsLinks, googleMapsDirectionsUrl } from "./directions";

describe("getDirectionsLinks", () => {
  it("encode l'adresse pour chaque application", () => {
    const links = getDirectionsLinks("12 Rue de la Paix 75002 Paris");

    expect(links.map((l) => l.provider)).toEqual(["google", "apple", "waze"]);
    expect(links[0].url).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=12+Rue+de+la+Paix+75002+Paris"
    );
    expect(links[1].url).toBe(
      "https://maps.apple.com/?daddr=12+Rue+de+la+Paix+75002+Paris"
    );
    expect(links[2].url).toBe(
      "https://waze.com/ul?q=12+Rue+de+la+Paix+75002+Paris&navigate=yes"
    );
  });

  it("échappe les caractères spéciaux", () => {
    expect(googleMapsDirectionsUrl("Salle A&B, Lyon")).toContain(
      "destination=Salle+A%26B%2C+Lyon"
    );
  });

  it("ne renvoie rien sans lieu", () => {
    expect(getDirectionsLinks("   ")).toEqual([]);
  });
});
