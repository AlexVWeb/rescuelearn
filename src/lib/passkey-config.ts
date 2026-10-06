/**
 * Relying Party WebAuthn dérivée de l'URL de l'application.
 *
 * Le rpID doit être le domaine apex (sans www.) : une passkey créée pour
 * "rescuelearn.fr" fonctionne aussi sur "www.rescuelearn.fr", l'inverse non.
 * Les origines acceptées couvrent donc l'apex et le sous-domaine www.
 */
export function getPasskeyRelyingParty(appUrl: string): {
  rpID: string;
  origins: string[];
} {
  const url = new URL(appUrl);
  const rpID = url.hostname.replace(/^www\./, "");

  if (rpID === "localhost" || rpID === "127.0.0.1") {
    return { rpID, origins: [url.origin] };
  }

  const port = url.port ? `:${url.port}` : "";
  return {
    rpID,
    origins: [
      `${url.protocol}//${rpID}${port}`,
      `${url.protocol}//www.${rpID}${port}`,
    ],
  };
}
