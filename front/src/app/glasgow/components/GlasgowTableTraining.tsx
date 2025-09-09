'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Shuffle, RotateCcw, CheckCircle, XCircle, Eye, MessageCircle, Hand } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { GlasgowData, GameMode, UserAnswers, ScoreResult } from '../interfaces/GlasgowData';

/**
 * Composant d'entraînement au Score de Glasgow
 * Permet de s'entraîner à mémoriser les scores et descriptions du tableau de Glasgow
 */
export function GlasgowTableTraining({ className }: { className?: string }) {
    // Données complètes du score de Glasgow
    const glasgowData: GlasgowData = useMemo<GlasgowData>(() => ({
        oculaire: [
            { score: 1, description: "Aucune" },
            { score: 2, description: "Douleur" },
            { score: 3, description: "Appel" },
            { score: 4, description: "Normale" }
        ],
        verbale: [
            { score: 1, description: "Aucune" },
            { score: 2, description: "Sons" },
            { score: 3, description: "Mots" },
            { score: 4, description: "Confuse" },
            { score: 5, description: "Normale" }
        ],
        motrice: [
            { score: 1, description: "Aucune" },
            { score: 2, description: "Extension" },
            { score: 3, description: "Flexion stéréotypée" },
            { score: 4, description: "Flexion simple" },
            { score: 5, description: "Dirigée vers la douleur" },
            { score: 6, description: "Normale" }
        ]
    }), []);

    const [hiddenCells, setHiddenCells] = useState<Set<string>>(new Set());
    const [userAnswers, setUserAnswers] = useState<UserAnswers>({});
    const [showResults, setShowResults] = useState<boolean>(false);
    const [gameMode, setGameMode] = useState<GameMode>('mixed');
    const [numCellsToHide, setNumCellsToHide] = useState<number>(8);

    /**
     * Calculer le nombre maximum de cellules selon le mode
     */
    const getMaxCells = useCallback((): number => {
        const totalRows = 15; // 4 + 5 + 6 = 15 lignes
        if (gameMode === 'scores' || gameMode === 'descriptions') {
            return totalRows;
        }
        return totalRows * 2; // scores + descriptions
    }, [gameMode]);

    /**
     * Générer les cellules cachées
     */
    const generateHiddenCells = useCallback((): void => {
        const allCells: string[] = [];

        // Créer toutes les combinaisons possibles (typage strict des items)
        (Object.keys(glasgowData) as Array<keyof GlasgowData>).forEach((category) => {
            const items = glasgowData[category];
            items.forEach((item) => {
                allCells.push(`${String(category)}-${item.score}-score`);
                allCells.push(`${String(category)}-${item.score}-description`);
            });
        });

        // Filtrer selon le mode de jeu
        let availableCells = allCells;
        if (gameMode === 'scores') {
            availableCells = allCells.filter(cell => cell.endsWith('-score'));
        } else if (gameMode === 'descriptions') {
            availableCells = allCells.filter(cell => cell.endsWith('-description'));
        }

        // Mélanger et sélectionner le nombre demandé
        const shuffled = [...availableCells].sort(() => Math.random() - 0.5);
        const actualNumToHide = Math.min(numCellsToHide, availableCells.length);
        const selected = shuffled.slice(0, actualNumToHide);

        setHiddenCells(new Set(selected));
        setUserAnswers({});
        setShowResults(false);
    }, [gameMode, numCellsToHide, glasgowData]);

    /**
     * Ajuster le nombre de cellules si le mode change
     */
    useEffect(() => {
        const maxCells = getMaxCells();
        if (numCellsToHide > maxCells) {
            setNumCellsToHide(maxCells);
        }
    }, [gameMode, numCellsToHide, getMaxCells]);

    /**
     * Générer le tableau initial
     */
    useEffect(() => {
        generateHiddenCells();
    }, [generateHiddenCells]);

    /**
     * Gérer les réponses utilisateur
     */
    const handleAnswerChange = (cellId: string, value: string): void => {
        setUserAnswers(prev => ({
            ...prev,
            [cellId]: value
        }));
    };

    /**
     * Vérifier les réponses
     */
    const checkAnswers = (): void => {
        setShowResults(true);
    };

    /**
     * Obtenir la réponse correcte
     */
    const getCorrectAnswer = (cellId: string): string => {
        const [category, scoreStr, type] = cellId.split('-');
        const score = parseInt(scoreStr);
        const item = (glasgowData[category as keyof GlasgowData]).find((i) => i.score === score);

        if (!item) return '';
        return type === 'score' ? score.toString() : item.description;
    };

    /**
     * Vérifier si une réponse est correcte
     */
    const isCorrect = (cellId: string): boolean | null => {
        if (!showResults) return null;
        const userAnswer = userAnswers[cellId];
        const correctAnswer = getCorrectAnswer(cellId);

        if (!userAnswer) return false;

        if (cellId.endsWith('-score')) {
            return parseInt(userAnswer) === parseInt(correctAnswer);
        } else {
            return userAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim();
        }
    };

    /**
     * Calculer le score
     */
    const calculateScore = (): ScoreResult => {
        let correct = 0;
        const total = hiddenCells.size;

        hiddenCells.forEach(cellId => {
            if (isCorrect(cellId)) correct++;
        });

        return { correct, total };
    };

    /**
     * Rendu d'une cellule
     */
    const renderCell = (category: string, item: { score: number; description: string }, type: 'score' | 'description'): React.ReactNode => {
        const cellId = `${category}-${item.score}-${type}`;
        const isHidden = hiddenCells.has(cellId);
        const correct = isCorrect(cellId);

        if (!isHidden) {
            return (
                <td key={cellId} className="border border-gray-300 px-3 py-2 bg-gray-50 text-center">
                    {type === 'score' ? item.score : item.description}
                </td>
            );
        }

        return (
            <td key={cellId} className={cn(
                "border border-gray-300 px-2 py-2 text-center",
                showResults ?
                    (correct ? 'bg-green-100 border-green-400' :
                        correct === false ? 'bg-red-100 border-red-400' : 'bg-yellow-100')
                    : 'bg-yellow-50'
            )}>
                {type === 'score' ? (
                    <input
                        type="number"
                        min="1"
                        max="6"
                        value={userAnswers[cellId] || ''}
                        onChange={(e) => handleAnswerChange(cellId, e.target.value)}
                        disabled={showResults}
                        className="w-12 text-center border border-gray-300 rounded px-1 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="?"
                    />
                ) : (
                    <input
                        type="text"
                        value={userAnswers[cellId] || ''}
                        onChange={(e) => handleAnswerChange(cellId, e.target.value)}
                        disabled={showResults}
                        className="w-full text-center border border-gray-300 rounded px-1 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        placeholder="?"
                    />
                )}

                {showResults && (
                    <div className="mt-1 flex justify-center">
                        {correct ? (
                            <CheckCircle size={16} className="text-green-600" />
                        ) : correct === false ? (
                            <div className="text-xs">
                                <XCircle size={16} className="text-red-600 mx-auto" />
                                <div className="text-red-700 font-medium mt-1">
                                    {getCorrectAnswer(cellId)}
                                </div>
                            </div>
                        ) : null}
                    </div>
                )}
            </td>
        );
    };

    /**
     * Obtenir l'icône de catégorie
     */
    const getCategoryIcon = (category: string): React.ReactNode => {
        switch (category) {
            case 'oculaire': return <Eye size={20} className="text-blue-600" />;
            case 'verbale': return <MessageCircle size={20} className="text-green-600" />;
            case 'motrice': return <Hand size={20} className="text-red-600" />;
            default: return null;
        }
    };

    /**
     * Obtenir la couleur de catégorie
     */
    const getCategoryColor = (category: string): string => {
        switch (category) {
            case 'oculaire': return 'bg-blue-100 text-blue-800';
            case 'verbale': return 'bg-green-100 text-green-800';
            case 'motrice': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const score = showResults ? calculateScore() : { correct: 0, total: hiddenCells.size };

    return (
        <div className={cn("max-w-6xl mx-auto p-6 bg-white", className)}>
            <div className="text-center mb-8">
                <p className="text-gray-600">
                    Complétez les cases manquantes dans le tableau de Glasgow
                </p>
            </div>

            {/* Contrôles */}
            <div className="flex justify-center gap-4 mb-6 flex-wrap">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Mode:</span>
                    <select
                        value={gameMode}
                        onChange={(e) => setGameMode(e.target.value as GameMode)}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="mixed">Scores et descriptions</option>
                        <option value="scores">Scores uniquement</option>
                        <option value="descriptions">Descriptions uniquement</option>
                    </select>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Cases à deviner:</span>
                    <input
                        type="range"
                        min="1"
                        max={getMaxCells()}
                        value={numCellsToHide}
                        onChange={(e) => setNumCellsToHide(parseInt(e.target.value))}
                        className="w-20"
                    />
                    <span className="text-sm font-bold text-blue-600 min-w-[60px]">
                        {numCellsToHide}/{getMaxCells()}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Difficulté:</span>
                    <div className="flex gap-1">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setNumCellsToHide(Math.ceil(getMaxCells() * 0.25))}
                            className="text-xs bg-green-100 text-green-700 hover:bg-green-200"
                        >
                            Facile (25%)
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setNumCellsToHide(Math.ceil(getMaxCells() * 0.5))}
                            className="text-xs bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                        >
                            Moyen (50%)
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setNumCellsToHide(Math.ceil(getMaxCells() * 0.75))}
                            className="text-xs bg-orange-100 text-orange-700 hover:bg-orange-200"
                        >
                            Difficile (75%)
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setNumCellsToHide(getMaxCells())}
                            className="text-xs bg-red-100 text-red-700 hover:bg-red-200"
                        >
                            Expert (100%)
                        </Button>
                    </div>
                </div>

                <Button
                    onClick={generateHiddenCells}
                    className="flex items-center gap-2"
                >
                    <Shuffle size={16} />
                    Nouveau tableau
                </Button>

                <Button
                    variant="secondary"
                    onClick={() => {
                        setUserAnswers({});
                        setShowResults(false);
                    }}
                    className="flex items-center gap-2"
                >
                    <RotateCcw size={16} />
                    Recommencer
                </Button>
            </div>

            {/* Tableau principal */}
            <div className="overflow-x-auto mb-6">
                <table className="w-full border-collapse border border-gray-400 mx-auto">
                    <thead>
                        <tr className="bg-gray-200">
                            <th className="border border-gray-400 px-4 py-3 text-left">
                                Réponse
                            </th>
                            <th className="border border-gray-400 px-4 py-3 text-center">
                                Score
                            </th>
                            <th className="border border-gray-400 px-4 py-3 text-center">
                                Description
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* Réponse Oculaire */}
                        {glasgowData.oculaire.map((item, index) => (
                            <tr key={`oculaire-${item.score}`}>
                                {index === 0 && (
                                    <td rowSpan={4} className={cn("border border-gray-400 px-4 py-8 font-bold text-center", getCategoryColor('oculaire'))}>
                                        <div className="flex flex-col items-center gap-2">
                                            {getCategoryIcon('oculaire')}
                                            <div>Réponse</div>
                                            <div>Oculaire</div>
                                            <div className="text-lg">(Y)</div>
                                        </div>
                                    </td>
                                )}
                                {renderCell('oculaire', item, 'score')}
                                {renderCell('oculaire', item, 'description')}
                            </tr>
                        ))}

                        {/* Réponse Verbale */}
                        {glasgowData.verbale.map((item, index) => (
                            <tr key={`verbale-${item.score}`}>
                                {index === 0 && (
                                    <td rowSpan={5} className={cn("border border-gray-400 px-4 py-8 font-bold text-center", getCategoryColor('verbale'))}>
                                        <div className="flex flex-col items-center gap-2">
                                            {getCategoryIcon('verbale')}
                                            <div>Réponse</div>
                                            <div>Verbale</div>
                                            <div className="text-lg">(V)</div>
                                        </div>
                                    </td>
                                )}
                                {renderCell('verbale', item, 'score')}
                                {renderCell('verbale', item, 'description')}
                            </tr>
                        ))}

                        {/* Réponse Motrice */}
                        {glasgowData.motrice.map((item, index) => (
                            <tr key={`motrice-${item.score}`}>
                                {index === 0 && (
                                    <td rowSpan={6} className={cn("border border-gray-400 px-4 py-8 font-bold text-center", getCategoryColor('motrice'))}>
                                        <div className="flex flex-col items-center gap-2">
                                            {getCategoryIcon('motrice')}
                                            <div>Réponse</div>
                                            <div>Motrice</div>
                                            <div className="text-lg">(M)</div>
                                        </div>
                                    </td>
                                )}
                                {renderCell('motrice', item, 'score')}
                                {renderCell('motrice', item, 'description')}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Informations et contrôles */}
            <div className="text-center mb-4">
                <div className="text-sm text-gray-600 mb-4">
                    Cases à compléter: <span className="font-bold text-yellow-600">{hiddenCells.size}</span>
                    <span className="text-gray-500"> / {getMaxCells()} possibles</span>
                    {showResults && (
                        <>
                            {" | "}
                            Score: <span className={cn("font-bold", score.correct === score.total ? 'text-green-600' : 'text-blue-600')}>
                                {score.correct}/{score.total}
                            </span>
                            <span className="text-gray-500"> ({Math.round((score.correct / score.total) * 100)}%)</span>
                        </>
                    )}
                </div>

                {/* Indicateur de progression */}
                <div className="max-w-md mx-auto mb-4">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Facile</span>
                        <span>Difficile</span>
                        <span>Expert</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                            className={cn(
                                "h-2 rounded-full transition-all duration-300",
                                numCellsToHide / getMaxCells() <= 0.25 ? 'bg-green-500' :
                                    numCellsToHide / getMaxCells() <= 0.5 ? 'bg-yellow-500' :
                                        numCellsToHide / getMaxCells() <= 0.75 ? 'bg-orange-500' : 'bg-red-500'
                            )}
                            style={{ width: `${(numCellsToHide / getMaxCells()) * 100}%` }}
                        ></div>
                    </div>
                </div>

                {!showResults ? (
                    <Button
                        onClick={checkAnswers}
                        disabled={Object.keys(userAnswers).length === 0}
                        className="px-6 py-3 bg-green-500 text-white hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        Vérifier les réponses
                    </Button>
                ) : (
                    <div className="bg-gray-50 p-6 rounded-lg max-w-md mx-auto">
                        <h3 className="text-xl font-bold mb-2">Résultats</h3>
                        <p className="text-lg mb-2">
                            Score: <span className="font-bold text-blue-600">{score.correct}/{score.total}</span>
                            <span className="text-gray-600"> ({Math.round((score.correct / score.total) * 100)}%)</span>
                        </p>

                        {/* Niveau de maîtrise */}
                        <div className="mb-3">
                            {score.correct === score.total ? (
                                <div className="flex items-center justify-center gap-2 text-green-700">
                                    <CheckCircle size={20} />
                                    <span className="font-semibold">Parfait !</span>
                                </div>
                            ) : (
                                <div className="text-gray-600">
                                    Niveau: <span className="font-semibold">
                                        {score.correct / score.total >= 0.9 ? 'Excellent' :
                                            score.correct / score.total >= 0.8 ? 'Très bien' :
                                                score.correct / score.total >= 0.7 ? 'Bien' :
                                                    score.correct / score.total >= 0.6 ? 'Moyen' : 'À améliorer'}
                                    </span>
                                </div>
                            )}
                        </div>

                        <p className="text-gray-600 text-sm">
                            {score.correct === score.total ?
                                `Vous maîtrisez ${numCellsToHide === getMaxCells() ? 'parfaitement' : 'bien'} le tableau de Glasgow !` :
                                score.correct >= score.total * 0.8 ?
                                    "Très bien ! Presque parfait !" :
                                    score.correct >= score.total * 0.6 ?
                                        "Bien ! Continuez à vous entraîner !" :
                                        "Il faut réviser encore un peu !"
                            }
                        </p>

                        {/* Suggestion pour augmenter la difficulté */}
                        {score.correct === score.total && numCellsToHide < getMaxCells() && (
                            <Button
                                onClick={() => {
                                    const newNum = Math.min(numCellsToHide + Math.ceil(getMaxCells() * 0.25), getMaxCells());
                                    setNumCellsToHide(newNum);
                                }}
                                className="mt-3"
                                size="sm"
                            >
                                Augmenter la difficulté
                            </Button>
                        )}
                    </div>
                )}
            </div>

            {/* Formule de calcul */}
            <div className="bg-blue-50 p-4 rounded-lg text-center">
                <div className="text-lg font-semibold text-blue-800 mb-2">
                    Score de Glasgow = Y + V + M
                </div>
                <div className="text-sm text-blue-700">
                    <strong>Score ≤ 8 :</strong> Victime inconsciente → BILAN JAUNE
                </div>
                <div className="text-xs text-blue-600 mt-2">
                    Y (Oculaire): 1-4 | V (Verbale): 1-5 | M (Motrice): 1-6
                </div>
            </div>
        </div>
    );
}
