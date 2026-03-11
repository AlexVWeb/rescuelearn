import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks ---

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

const mockPrisma = {
  user: { findUnique: vi.fn() },
  slot: { findUnique: vi.fn() },
  trainingSession: { findUnique: vi.fn() },
  inscription: { findMany: vi.fn(), findUnique: vi.fn() },
  emargement: {
    upsert: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  $transaction: vi.fn(),
};

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

// --- Helpers ---

import { auth } from "@/lib/auth";

function mockAuthenticatedUser(organismeId = "org-1") {
  (auth.api.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
    user: { id: "user-1" },
  });
  mockPrisma.user.findUnique.mockResolvedValue({
    id: "user-1",
    organismeId,
  });
}

function mockUnauthenticated() {
  (auth.api.getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.$transaction.mockImplementation((ops: unknown) =>
    Array.isArray(ops) ? Promise.all(ops) : ops
  );
  mockPrisma.emargement.upsert.mockResolvedValue({});
});

// placeholder so vitest finds the file
describe("emargement actions", () => {
  it("placeholder", () => expect(true).toBe(true));
});
