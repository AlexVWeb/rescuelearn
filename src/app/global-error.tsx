"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

// Dernier filet : erreur dans le layout racine. Le layout n'est pas rendu, d'où
// le <html> minimal et les styles en ligne.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error, {
      tags: { boundary: "global" },
      extra: { digest: error.digest },
    });
  }, [error]);

  return (
    <html lang="fr">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          margin: 0,
          padding: 16,
        }}
      >
        <div role="alert" style={{ maxWidth: 420, textAlign: "center" }}>
          <h1 style={{ fontSize: 20, marginBottom: 8 }}>
            Une erreur inattendue est survenue
          </h1>
          <p style={{ color: "#666", marginBottom: 16 }}>
            L&apos;équipe technique a été prévenue. Vous pouvez réessayer.
          </p>
          {error.digest && (
            <p style={{ color: "#999", fontSize: 12, marginBottom: 16 }}>
              Référence : {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={reset}
            style={{
              padding: "8px 16px",
              borderRadius: 6,
              border: "1px solid #ccc",
              cursor: "pointer",
            }}
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  );
}
