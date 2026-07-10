"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  Settings2,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import {
  getProgressionTreesAction,
  createProgressionNodeAction,
  updateProgressionNodeAction,
  deleteProgressionNodeAction,
  reorderProgressionNodesAction,
  generateEntireTreeWithAiAction,
} from "@/app/actions/progression-admin-actions";
import { getReferencielsAction } from "@/app/actions/referenciel-actions";
import { ProgressionNodeForm } from "./components/ProgressionNodeForm";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { toast } from "sonner";

interface Node {
  id: string;
  title: string;
  description: string | null;
  order: number;
  xpReward: number;
}

interface Referenciel {
  id: number;
  title: string;
}

interface Tree {
  id: string;
  level: string;
  description: string | null;
  nodes: Node[];
}

export default function AdminProgressionPage() {
  const [trees, setTrees] = useState<Tree[]>([]);
  const [selectedLevel, setSelectedLevel] = useState("GQS");
  const [isLoading, setIsLoading] = useState(true);

  // AI Generation States
  const [referenciels, setReferenciels] = useState<Referenciel[]>([]);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiReferencielId, setAiReferencielId] = useState("");
  const [aiTopic, setAiTopic] = useState("");
  const [isGeneratingTree, setIsGeneratingTree] = useState(false);

  // Dialog states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<Node | null>(null);
  const [isDeletingOpen, setIsDeletingOpen] = useState(false);
  const [nodeToDelete, setNodeToDelete] = useState<string | null>(null);

  const fetchTrees = async () => {
    setIsLoading(true);
    try {
      const res = await getProgressionTreesAction();
      if (res.success && res.data) {
        setTrees(res.data as Tree[]);
      } else {
        toast.error(res.error || "Erreur de chargement des arbres");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchReferenciels = async () => {
    const res = await getReferencielsAction(1, 100);
    if (res.success && res.data) {
      setReferenciels(res.data);
    }
  };

  useEffect(() => {
    fetchTrees();
    fetchReferenciels();
  }, []);

  const activeTree = trees.find((t) => t.level === selectedLevel);
  const activeNodes = activeTree?.nodes || [];

  const handleCreateNode = async (data: {
    title: string;
    description: string;
    xpReward: number;
  }) => {
    if (!activeTree) return;
    try {
      const res = await createProgressionNodeAction({
        treeId: activeTree.id,
        ...data,
      });

      if (res.success) {
        toast.success("Étape ajoutée avec succès !");
        setIsFormOpen(false);
        fetchTrees();
      } else {
        toast.error(res.error || "Erreur lors de la création");
      }
    } catch {
      toast.error("Erreur inattendue.");
    }
  };

  const handleUpdateNode = async (data: {
    title: string;
    description: string;
    xpReward: number;
  }) => {
    if (!editingNode) return;
    try {
      const res = await updateProgressionNodeAction(editingNode.id, data);

      if (res.success) {
        toast.success("Étape modifiée avec succès !");
        setIsFormOpen(false);
        setEditingNode(null);
        fetchTrees();
      } else {
        toast.error(res.error || "Erreur lors de la mise à jour");
      }
    } catch {
      toast.error("Erreur inattendue.");
    }
  };

  const handleDeleteNode = async () => {
    if (!nodeToDelete) return;
    try {
      const res = await deleteProgressionNodeAction(nodeToDelete);
      if (res.success) {
        toast.success("Étape supprimée.");
        setIsDeletingOpen(false);
        setNodeToDelete(null);
        fetchTrees();
      } else {
        toast.error(res.error || "Erreur lors de la suppression");
      }
    } catch {
      toast.error("Erreur inattendue.");
    }
  };

  const handleGenerateEntireTree = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTree || !aiReferencielId || !aiTopic.trim()) {
      toast.error("Veuillez sélectionner un référentiel et saisir un sujet.");
      return;
    }

    setIsGeneratingTree(true);
    try {
      const res = await generateEntireTreeWithAiAction({
        treeId: activeTree.id,
        referencielId: parseInt(aiReferencielId, 10),
        topic: aiTopic,
      });

      if (res.success) {
        toast.success("Le parcours entier a été généré avec succès !");
        setAiDialogOpen(false);
        setAiTopic("");
        fetchTrees();
      } else {
        toast.error(res.error || "Erreur de génération par l'IA.");
      }
    } catch {
      toast.error("Une erreur inattendue est survenue.");
    } finally {
      setIsGeneratingTree(false);
    }
  };

  const handleMoveNode = async (index: number, direction: "up" | "down") => {
    if (!activeTree) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= activeNodes.length) return;

    const newNodes = [...activeNodes];
    const temp = newNodes[index];
    newNodes[index] = newNodes[targetIndex];
    newNodes[targetIndex] = temp;

    // Optimistic UI
    const updatedTrees = trees.map((t) => {
      if (t.id === activeTree.id) {
        return { ...t, nodes: newNodes.map((n, i) => ({ ...n, order: i })) };
      }
      return t;
    });
    setTrees(updatedTrees);

    try {
      const res = await reorderProgressionNodesAction(
        activeTree.id,
        newNodes.map((n) => n.id)
      );
      if (!res.success) {
        toast.error(res.error || "Erreur de réordonnancement");
        fetchTrees();
      }
    } catch {
      toast.error("Erreur de réordonnancement.");
      fetchTrees();
    }
  };

  return (
    <div className="w-full space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            Arbre de Progression (Duolingo)
          </h1>
          <p className="text-muted-foreground text-sm">
            Configurez les étapes d'apprentissage adaptées à l'onboarding de
            chaque joueur.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="border-indigo-200 bg-indigo-50/50 text-indigo-700 hover:bg-indigo-100"
            onClick={() => setAiDialogOpen(true)}
            disabled={isLoading || !activeTree}
          >
            <Sparkles className="mr-2 h-4 w-4" /> Générer par IA
          </Button>
          <Button
            onClick={() => {
              setEditingNode(null);
              setIsFormOpen(true);
            }}
            disabled={isLoading || !activeTree}
          >
            <Plus className="mr-2 h-4 w-4" /> Ajouter une étape
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {["GQS", "PSC", "SST", "PSE"].map((lvl) => (
          <button
            key={lvl}
            onClick={() => setSelectedLevel(lvl)}
            className={`-mb-0.5 border-b-2 px-4 py-2.5 text-sm font-bold transition-all ${
              selectedLevel === lvl
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {lvl}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-muted-foreground flex h-40 items-center justify-center text-sm font-semibold">
          Chargement des arbres de progression...
        </div>
      ) : (
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Chemin de Secourisme : {selectedLevel}
              </CardTitle>
              <CardDescription>{activeTree?.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeNodes.length === 0 ? (
                <div className="text-muted-foreground flex flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center">
                  <AlertCircle className="text-muted-foreground/40 mb-2 h-10 w-10" />
                  <p className="font-semibold text-gray-700">
                    Aucune étape définie pour ce niveau
                  </p>
                  <p className="text-xs">
                    Ajoutez une étape en cliquant sur le bouton ci-dessus.
                  </p>
                </div>
              ) : (
                <div className="relative ml-4 space-y-6 border-l-2 border-dashed border-gray-100 pl-6">
                  {activeNodes.map((node, index) => {
                    const isFirst = index === 0;
                    const isLast = index === activeNodes.length - 1;

                    return (
                      <div key={node.id} className="group relative">
                        {/* Dot on timeline */}
                        <span className="absolute top-1.5 -left-[31px] flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-blue-600 shadow" />

                        <div className="flex flex-col gap-4 rounded-xl border bg-white p-4 transition-shadow hover:shadow-sm sm:flex-row sm:items-center sm:justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold tracking-widest text-gray-400 uppercase">
                                Étape {index + 1}
                              </span>
                              <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-black text-amber-700">
                                +{node.xpReward} XP
                              </span>
                            </div>
                            <h3 className="font-bold text-gray-900">
                              {node.title}
                            </h3>
                            {node.description && (
                              <p className="text-muted-foreground text-xs">
                                {node.description}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2 self-start sm:self-center">
                            <div className="mr-2 flex items-center gap-1 border-r border-gray-100 pr-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                disabled={isFirst}
                                onClick={() => handleMoveNode(index, "up")}
                                aria-label="Monter"
                              >
                                <ArrowUp className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                disabled={isLast}
                                onClick={() => handleMoveNode(index, "down")}
                                aria-label="Descendre"
                              >
                                <ArrowDown className="h-4 w-4" />
                              </Button>
                            </div>

                            <Link href={`/admin/progression/${node.id}`}>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-9"
                              >
                                <Settings2 className="mr-1.5 h-4 w-4" />{" "}
                                Exercices
                              </Button>
                            </Link>

                            <Button
                              variant="outline"
                              size="icon"
                              className="h-9 w-9 text-gray-600 hover:text-gray-950"
                              onClick={() => {
                                setEditingNode(node);
                                setIsFormOpen(true);
                              }}
                              aria-label="Modifier"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-9 w-9 text-red-500 hover:bg-red-50 hover:text-red-600"
                              onClick={() => {
                                setNodeToDelete(node.id);
                                setIsDeletingOpen(true);
                              }}
                              aria-label="Supprimer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Dialog for Node Form */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingNode ? "Modifier l'étape" : "Ajouter une étape"}
            </DialogTitle>
            <DialogDescription>
              Définissez les détails de l'étape sur la carte de progression.
            </DialogDescription>
          </DialogHeader>
          <ProgressionNodeForm
            initialData={
              editingNode
                ? {
                    title: editingNode.title,
                    description: editingNode.description || "",
                    xpReward: editingNode.xpReward,
                  }
                : undefined
            }
            onSubmit={editingNode ? handleUpdateNode : handleCreateNode}
            onCancel={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Alert Dialog for Deletion */}
      <AlertDialog open={isDeletingOpen} onOpenChange={setIsDeletingOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action supprimera définitivement cette étape, tous les
              exercices configurés au sein de celle-ci, ainsi que le suivi de
              progression des joueurs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeletingOpen(false)}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteNode}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Dialog for Generating Entire Tree with AI */}
      <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-indigo-700">
              <Sparkles className="h-5 w-5 animate-pulse fill-current text-indigo-600" />
              <span>Générer tout le parcours par IA</span>
            </DialogTitle>
            <DialogDescription>
              Gemini va analyser le référentiel et générer automatiquement 4 à 6
              leçons adaptées à ce niveau.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleGenerateEntireTree} className="space-y-4 pt-2">
            <div className="flex gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-xs text-red-800">
              <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
              <span>
                <strong>Attention :</strong> Générer un nouveau parcours va
                **effacer et remplacer définitivement** toutes les étapes
                existantes du niveau <strong>{selectedLevel}</strong>.
              </span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="entire-ai-ref">Référentiel source (PDF)</Label>
              <Select
                value={aiReferencielId}
                onValueChange={setAiReferencielId}
              >
                <SelectTrigger id="entire-ai-ref">
                  <SelectValue placeholder="Sélectionner le document..." />
                </SelectTrigger>
                <SelectContent>
                  {referenciels.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {r.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="entire-ai-topic">Sujet principal / Thème</Label>
              <Input
                id="entire-ai-topic"
                placeholder="Ex: Gestes de premiers secours complets"
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
                required
                disabled={isGeneratingTree}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAiDialogOpen(false)}
                disabled={isGeneratingTree}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                className="bg-indigo-600 text-white hover:bg-indigo-700"
                disabled={
                  isGeneratingTree || !aiReferencielId || !aiTopic.trim()
                }
              >
                {isGeneratingTree
                  ? "Génération (30s)..."
                  : "Générer le parcours"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
