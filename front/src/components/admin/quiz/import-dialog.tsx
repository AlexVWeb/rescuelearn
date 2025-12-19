"use client";

import { useState, useRef, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { importQuizAction } from "@/app/actions/quiz-actions";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, FileJson, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ImportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ImportDialog({ open, onOpenChange }: ImportDialogProps) {
    const router = useRouter();
    const [jsonContent, setJsonContent] = useState("");
    const [isValid, setIsValid] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const defaultExample = {
        title: "Titre du Quiz",
        timePerQuestion: 30,
        passingScore: 70,
        modeRandom: false,
        level: "Niveau 1",
        questions: [
            {
                question: "Question exemple ?",
                options: ["Réponse A", "Réponse B", "Réponse C", "Réponse D"],
                correctAnswer: 1, // Index 0-3 (1 = B)
                explanation: "Explication optionnelle."
            }
        ]
    };

    useEffect(() => {
        if (open && !jsonContent) {
            setJsonContent(JSON.stringify(defaultExample, null, 2));
            validateJSON(JSON.stringify(defaultExample, null, 2));
        }
    }, [open]);

    const validateJSON = (content: string) => {
        try {
            if (!content.trim()) {
                setIsValid(false);
                setError("Le JSON ne peut pas être vide.");
                return false;
            }

            const parsed = JSON.parse(content);

            // Basic Schema Check
            if (!parsed.title) throw new Error("Propriété 'title' manquante.");
            if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) throw new Error("Tableau 'questions' manquant ou vide.");

            parsed.questions.forEach((q: any, i: number) => {
                if (!q.question) throw new Error(`Question ${i + 1}: 'question' manquante.`);
                if (!Array.isArray(q.options) || q.options.length < 2) throw new Error(`Question ${i + 1}: Il faut au moins 2 'options'.`);
                if (typeof q.correctAnswer !== 'number') throw new Error(`Question ${i + 1}: 'correctAnswer' doit être un index numérique.`);
            });

            setIsValid(true);
            setError(null);
            return true;
        } catch (e: any) {
            setIsValid(false);
            setError(e.message || "JSON invalide.");
            return false;
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setJsonContent(val);
        validateJSON(val);
    };

    const handleFormat = () => {
        try {
            const parsed = JSON.parse(jsonContent);
            setJsonContent(JSON.stringify(parsed, null, 2));
            validateJSON(JSON.stringify(parsed, null, 2));
        } catch (e) {
            // Ignore format error if invalid JSON
        }
    };

    const handleSubmit = async () => {
        if (!isValid) return;
        setIsLoading(true);
        try {
            const parsed = JSON.parse(jsonContent);
            const res = await importQuizAction(parsed);
            if (res.success) {
                onOpenChange(false);
                router.refresh();
                setJsonContent("");
            } else {
                setError(res.error || "Erreur lors de l'import.");
                setIsValid(false);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileJson className="h-5 w-5" /> Import JSON
                    </DialogTitle>
                    <DialogDescription>
                        Collez le JSON du quiz ci-dessous. Le format sera validé automatiquement.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto space-y-4 py-2">
                    <div className="relative">
                        <Textarea
                            value={jsonContent}
                            onChange={handleChange}
                            className="font-mono text-sm min-h-[400px]"
                            placeholder="Collez votre JSON ici..."
                        />
                        <Button
                            variant="outline"
                            size="sm"
                            className="absolute top-2 right-2 h-7 text-xs"
                            onClick={handleFormat}
                        >
                            Formater
                        </Button>
                    </div>

                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Erreur</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {isValid && !error && (
                        <Alert className="text-green-600 border-green-200 bg-green-50">
                            <CheckCircle2 className="h-4 w-4 stroke-green-600" />
                            <AlertTitle>Valide</AlertTitle>
                            <AlertDescription>Le format JSON est correct. Prêt à importer.</AlertDescription>
                        </Alert>
                    )}

                    <Alert className="bg-muted/50">
                        <Info className="h-4 w-4" />
                        <AlertDescription className="text-xs text-muted-foreground">
                            Structure : {`{ title, timePerQuestion, passingScore, modeRandom, level, questions: [{ question, options: [], correctAnswer (index), explanation }] }`}
                        </AlertDescription>
                    </Alert>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Annuler
                    </Button>
                    <Button onClick={handleSubmit} disabled={!isValid || isLoading}>
                        {isLoading ? "Importation..." : "Importer le Quiz"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
