import { createAuthClient } from "better-auth/react";
import { organizationClient } from "better-auth/client/plugins";
import { passkeyClient } from "@better-auth/passkey/client";

export const authClient = createAuthClient({
  // Côté navigateur, on cible toujours l'origine courante : sinon une page
  // servie sur www.* appelle l'apex en cross-origin et le POST est bloqué par CORS.
  baseURL:
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL,
  plugins: [organizationClient(), passkeyClient()],
});
