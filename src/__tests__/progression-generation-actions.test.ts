import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserRole } from "@/lib/roles";

vi.mock("@/lib/context", () => ({
  getUserContext: vi.fn(),
}));

vi.mock("@/services/progression.service", () => ({
  ProgressionAdminService: {
    startTreeGenerationFromTopics: vi.fn(),
    generateNextTreeNode: vi.fn(),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { getUserContext } from "@/lib/context";
import { ProgressionAdminService } from "@/services/progression.service";
import {
  startTreeGenerationFromTopicsAction,
  generateNextTreeNodeAction,
} from "@/app/actions/progression-admin-actions";

const mockUser = (roles: string[]) =>
  vi.mocked(getUserContext).mockResolvedValue({ id: "u1", roles } as never);

describe("progression generation actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser([UserRole.SUPER_ADMIN]);
  });

  it("refuse les non SUPER_ADMIN", async () => {
    mockUser([UserRole.FORMATEUR]);

    expect(
      (
        await startTreeGenerationFromTopicsAction({
          treeId: "tree-1",
          referencielId: 5,
        })
      ).success
    ).toBe(false);
    expect((await generateNextTreeNodeAction("tree-1")).success).toBe(false);
    expect(
      ProgressionAdminService.startTreeGenerationFromTopics
    ).not.toHaveBeenCalled();
    expect(ProgressionAdminService.generateNextTreeNode).not.toHaveBeenCalled();
  });

  it("valide les paramètres du lancement", async () => {
    const res = await startTreeGenerationFromTopicsAction({ treeId: "tree-1" });
    expect(res).toEqual({ success: false, error: "Paramètres invalides" });
  });

  it("lance la génération et renvoie le nombre de nœuds", async () => {
    vi.mocked(
      ProgressionAdminService.startTreeGenerationFromTopics
    ).mockResolvedValue({ total: 71 });

    const res = await startTreeGenerationFromTopicsAction({
      treeId: "tree-1",
      referencielId: 5,
      restart: true,
    });

    expect(res).toEqual({ success: true, data: { total: 71 } });
    expect(
      ProgressionAdminService.startTreeGenerationFromTopics
    ).toHaveBeenCalledWith({
      treeId: "tree-1",
      referencielId: 5,
      restart: true,
    });
  });

  it("remonte l'erreur du service au lancement", async () => {
    vi.mocked(
      ProgressionAdminService.startTreeGenerationFromTopics
    ).mockRejectedValue(new Error("Génération déjà en cours"));

    const res = await startTreeGenerationFromTopicsAction({
      treeId: "tree-1",
      referencielId: 5,
    });

    expect(res).toEqual({ success: false, error: "Génération déjà en cours" });
  });

  it("génère le nœud suivant", async () => {
    const step = { status: "PROCESSING", done: 1, total: 71, nodeTitle: "A" };
    vi.mocked(ProgressionAdminService.generateNextTreeNode).mockResolvedValue(
      step
    );

    expect(await generateNextTreeNodeAction("tree-1")).toEqual({
      success: true,
      data: step,
    });
  });
});
