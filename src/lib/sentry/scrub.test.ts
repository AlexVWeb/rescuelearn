import type { Breadcrumb, ErrorEvent } from "@sentry/nextjs";
import { describe, expect, it } from "vitest";
import {
  type StreamedSpanJSON,
  scrubBreadcrumb,
  scrubDeep,
  scrubEvent,
  scrubSpan,
  scrubString,
  scrubUrl,
} from "./scrub";

describe("scrubString", () => {
  it("masque les emails", () => {
    expect(scrubString("Stagiaire jean.dupont+pse@mail.fr introuvable")).toBe(
      "Stagiaire [email] introuvable"
    );
  });

  it("masque les numéros de téléphone français", () => {
    expect(scrubString("tel 06 12 34 56 78")).toBe("tel [tel]");
    expect(scrubString("tel +33612345678")).toBe("tel [tel]");
    expect(scrubString("tel 01.23.45.67.89")).toBe("tel [tel]");
  });

  it("ne touche pas aux identifiants ni aux nombres courts", () => {
    expect(scrubString("inscription cmh2x9k0a0001 status 404")).toBe(
      "inscription cmh2x9k0a0001 status 404"
    );
  });

  it("masque les signatures d'URL R2 pré-signées", () => {
    const url =
      "/doc.pdf?X-Amz-Algorithm=AWS4&X-Amz-Credential=AKIA%2F2026&X-Amz-Signature=abc123&X-Amz-Expires=300";
    const out = scrubString(url);
    expect(out).not.toContain("AKIA");
    expect(out).not.toContain("abc123");
    expect(out).toContain("X-Amz-Expires=300");
  });

  it("retire query et fragment des URL absolues dans du texte libre", () => {
    expect(
      scrubString(
        "[view] http://localhost:3100/sentry-test?q=Dupont#t=SECRET done"
      )
    ).toBe("[view] http://localhost:3100/sentry-test done");
    expect(
      scrubString("GET https://r2.example.com/f.pdf?X-Amz-Signature=abc")
    ).toBe("GET https://r2.example.com/f.pdf");
  });

  it("masque les paramètres de recherche dans les chemins relatifs", () => {
    expect(scrubString("/admin/stagiaires?q=Dupont&page=2")).toBe(
      "/admin/stagiaires?q=[Filtered]&page=2"
    );
    expect(scrubString("/verify-email?email=x")).toBe(
      "/verify-email?email=[Filtered]"
    );
  });

  it("masque les tokens passés en paramètre", () => {
    expect(scrubString("/reset-password?token=abc.def&x=1")).toBe(
      "/reset-password?token=[Filtered]&x=1"
    );
    expect(scrubString("/?bypass=supersecret")).toBe("/?bypass=[Filtered]");
  });

  it("masque le token d'invitation dans le chemin", () => {
    expect(scrubString("GET /invitation/7f3a9c2b1d")).toBe(
      "GET /invitation/[token]"
    );
  });

  it("masque les JWT", () => {
    expect(
      scrubString("bad jwt eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.c2lnbmF0dXJl")
    ).toBe("bad jwt [jwt]");
  });
});

describe("scrubUrl", () => {
  it("supprime le fragment (token de l'espace stagiaire)", () => {
    expect(scrubUrl("https://app.fr/espace/acces#t=SECRET")).toBe(
      "https://app.fr/espace/acces"
    );
  });

  it("supprime toute la query string", () => {
    expect(scrubUrl("https://app.fr/admin/stagiaires?q=Dupont&page=2")).toBe(
      "https://app.fr/admin/stagiaires"
    );
  });

  it("masque le token d'invitation", () => {
    expect(scrubUrl("/invitation/abc123?x=1#y")).toBe("/invitation/[token]");
  });
});

describe("scrubDeep", () => {
  it("filtre les clés sensibles par nom exact, insensible à la casse", () => {
    expect(
      scrubDeep({
        email: "a@b.fr",
        firstName: "Jean",
        lastName: "Dupont",
        dateOfBirth: "2000-01-01",
        Authorization: "Bearer x",
        status: "inscrit",
      })
    ).toEqual({
      email: "[Filtered]",
      firstName: "[Filtered]",
      lastName: "[Filtered]",
      dateOfBirth: "[Filtered]",
      Authorization: "[Filtered]",
      status: "inscrit",
    });
  });

  it("garde les clés qui contiennent un mot sensible sans en être un", () => {
    expect(
      scrubDeep({
        total: 3,
        autoSubmit: true,
        organismeId: "o1",
        traineeId: "t1",
      })
    ).toEqual({
      total: 3,
      autoSubmit: true,
      organismeId: "o1",
      traineeId: "t1",
    });
  });

  it("filtre les clés sensibles par motif", () => {
    expect(
      scrubDeep({
        smtpPassword: "x",
        accessToken: "y",
        R2_SECRET_ACCESS_KEY: "z",
        apiKey: "k",
        "x-amz-security-token": "w",
      })
    ).toEqual({
      smtpPassword: "[Filtered]",
      accessToken: "[Filtered]",
      R2_SECRET_ACCESS_KEY: "[Filtered]",
      apiKey: "[Filtered]",
      "x-amz-security-token": "[Filtered]",
    });
  });

  it("descend dans les tableaux et objets imbriqués et masque les valeurs", () => {
    expect(
      scrubDeep({ list: [{ phone: "0612345678" }, { note: "voir a@b.fr" }] })
    ).toEqual({ list: [{ phone: "[Filtered]" }, { note: "voir [email]" }] });
  });

  it("limite la profondeur", () => {
    const deep: Record<string, unknown> = {};
    let cur = deep;
    for (let i = 0; i < 20; i++) {
      cur.child = {};
      cur = cur.child as Record<string, unknown>;
    }
    expect(JSON.stringify(scrubDeep(deep))).toContain("[MaxDepth]");
  });
});

describe("scrubEvent", () => {
  it("ne garde que l'id utilisateur", () => {
    const event = scrubEvent({
      type: undefined,
      user: { id: "u1", email: "a@b.fr", ip_address: "1.2.3.4", username: "x" },
    } as ErrorEvent);
    expect(event.user).toEqual({ id: "u1" });
  });

  it("nettoie la requête", () => {
    const event = scrubEvent({
      type: undefined,
      request: {
        url: "https://app.fr/espace/acces?x=1#t=SECRET",
        query_string: "x=1",
        cookies: { rl_trainee: "jwt" },
        data: { email: "a@b.fr" },
        headers: { cookie: "a=b", "user-agent": "Firefox" },
      },
    } as ErrorEvent);
    expect(event.request).toEqual({
      url: "https://app.fr/espace/acces",
      headers: { cookie: "[Filtered]", "user-agent": "Firefox" },
    });
  });

  it("tronque le message d'une PrismaClientValidationError (contient les valeurs)", () => {
    const value = [
      "Invalid `prisma.trainee.findFirst()` invocation:",
      "{",
      '  where: { lastName: "Dupont", birthPlace: "Lyon" }',
      "}",
      "Unknown argument `lastNam`. Did you mean `lastName`?",
    ].join("\n");
    const event = scrubEvent({
      type: undefined,
      exception: { values: [{ type: "PrismaClientValidationError", value }] },
    } as ErrorEvent);
    const out = event.exception!.values![0].value!;
    expect(out).not.toContain("Dupont");
    expect(out).not.toContain("Lyon");
    expect(out).toContain("prisma.trainee.findFirst()");
    expect(out).toContain("Unknown argument `lastNam`");
  });

  it("masque les PII dans les messages d'exception", () => {
    const event = scrubEvent({
      type: undefined,
      exception: { values: [{ type: "Error", value: "Échec envoi à a@b.fr" }] },
      message: "Échec envoi à a@b.fr",
    } as ErrorEvent);
    expect(event.exception!.values![0].value).toBe("Échec envoi à [email]");
    expect(event.message).toBe("Échec envoi à [email]");
  });

  it("nettoie transaction, extra, contexts et tags", () => {
    const event = scrubEvent({
      type: undefined,
      transaction: "/invitation/abc",
      extra: { context: "x", email: "a@b.fr" },
      contexts: { trainee: { lastName: "Dupont" } },
      tags: { url: "/p?token=x" },
    } as ErrorEvent);
    expect(event.transaction).toBe("/invitation/[token]");
    expect(event.extra).toEqual({ context: "x", email: "[Filtered]" });
    expect(event.contexts).toEqual({ trainee: { lastName: "[Filtered]" } });
    expect(event.tags).toEqual({ url: "/p?token=[Filtered]" });
  });

  it("nettoie les breadcrumbs embarqués", () => {
    const event = scrubEvent({
      type: undefined,
      breadcrumbs: [
        { category: "navigation", data: { from: "/a#t=1", to: "/b?q=x" } },
        { category: "ui.input", message: "input" },
      ],
    } as ErrorEvent);
    expect(event.breadcrumbs).toEqual([
      { category: "navigation", data: { from: "/a", to: "/b" } },
    ]);
  });

  it("supprime les variables locales des frames", () => {
    const event = scrubEvent({
      type: undefined,
      exception: {
        values: [
          {
            type: "Error",
            value: "x",
            stacktrace: {
              frames: [{ filename: "a.js", vars: { email: "a@b.fr" } }],
            },
          },
        ],
      },
    } as ErrorEvent);
    expect(
      event.exception!.values![0].stacktrace!.frames![0].vars
    ).toBeUndefined();
  });

  it("masque les PII dans les lignes de code source", () => {
    const event = scrubEvent({
      type: undefined,
      exception: {
        values: [
          {
            type: "Error",
            value: "x",
            stacktrace: {
              frames: [
                {
                  filename: "a.js",
                  pre_context: ['const to = "a@b.fr";'],
                  context_line: 'throw new Error("06 12 34 56 78");',
                  post_context: ["}"],
                },
              ],
            },
          },
        ],
      },
    } as ErrorEvent);
    const frame = event.exception!.values![0].stacktrace!.frames![0];
    expect(frame.pre_context).toEqual(['const to = "[email]";']);
    expect(frame.context_line).toBe('throw new Error("[tel]");');
    expect(frame.post_context).toEqual(["}"]);
  });
});

describe("scrubBreadcrumb", () => {
  it("supprime les breadcrumbs de saisie", () => {
    expect(scrubBreadcrumb({ category: "ui.input" })).toBeNull();
  });

  it("nettoie les URL fetch/xhr/navigation", () => {
    const b: Breadcrumb = {
      category: "fetch",
      data: {
        url: "https://r2.example.com/f.pdf?X-Amz-Signature=abc",
        method: "GET",
        status_code: 200,
      },
    };
    expect(scrubBreadcrumb(b)).toEqual({
      category: "fetch",
      data: {
        url: "https://r2.example.com/f.pdf",
        method: "GET",
        status_code: 200,
      },
    });
  });

  it("nettoie les messages console", () => {
    expect(
      scrubBreadcrumb({ category: "console", message: "[ERROR] mail a@b.fr" })
    ).toEqual({ category: "console", message: "[ERROR] mail [email]" });
  });

  it("garde les clics UI (sélecteur CSS sans contenu saisi)", () => {
    const b = { category: "ui.click", message: "button.save" };
    expect(scrubBreadcrumb(b)).toEqual(b);
  });
});

describe("scrubSpan", () => {
  it("nettoie le nom et les attributs texte", () => {
    const span = {
      trace_id: "t",
      span_id: "s",
      name: "GET /invitation/abc",
      start_timestamp: 0,
      status: "ok",
      is_segment: true,
      attributes: {
        "url.full": "https://app.fr/espace/acces?x=1#t=SECRET",
        "url.query": "?token=abc",
        "http.request.header.cookie": "a=b",
        "http.response.status_code": 200,
        "db.query.text": "select * from trainee where id = $1",
      },
    } as StreamedSpanJSON;
    const out = scrubSpan(span);
    expect(out.name).toBe("GET /invitation/[token]");
    expect(out.attributes).toEqual({
      "url.full": "https://app.fr/espace/acces",
      "http.request.header.cookie": "[Filtered]",
      "http.response.status_code": 200,
      "db.query.text": "select * from trainee where id = $1",
    });
  });
});
