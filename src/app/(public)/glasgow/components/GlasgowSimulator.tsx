"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye,
  MessageSquare,
  Activity,
  AlertTriangle,
  CheckCircle,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface ScoreDetail {
  score: number;
  label: string;
  desc: string;
}

const ocularOptions: ScoreDetail[] = [
  { score: 4, label: "Spontanée", desc: "Ouvre les yeux spontanément" },
  { score: 3, label: "À la demande", desc: "Ouvre les yeux à l'ordre verbal" },
  {
    score: 2,
    label: "À la douleur",
    desc: "Ouvre les yeux lors d'une stimulation douloureuse",
  },
  {
    score: 1,
    label: "Aucune",
    desc: "Pas d'ouverture des yeux malgré les stimulations",
  },
];

const verbalOptions: ScoreDetail[] = [
  {
    score: 5,
    label: "Orientée",
    desc: "Répond correctement (nom, lieu, date)",
  },
  {
    score: 4,
    label: "Confuse",
    desc: "Répond mais est désorientée ou tient des propos incohérents",
  },
  {
    score: 3,
    label: "Inappropriée",
    desc: "Prononce des mots isolés ou sans rapport avec la question",
  },
  {
    score: 2,
    label: "Incompréhensible",
    desc: "Émet des gémissements ou des grognements sans mots",
  },
  { score: 1, label: "Aucune", desc: "Aucun son émis malgré les stimulations" },
];

const motorOptions: ScoreDetail[] = [
  {
    score: 6,
    label: "À l'ordre",
    desc: "Obéit aux ordres simples (ex: serrer les mains)",
  },
  {
    score: 5,
    label: "Localise la douleur",
    desc: "Geste orienté pour repousser une stimulation douloureuse",
  },
  {
    score: 4,
    label: "Évitement / Retrait",
    desc: "Retire le membre stimulé lors de la douleur",
  },
  {
    score: 3,
    label: "Flexion anormale",
    desc: "Mouvement lent d'enroulement/décortication",
  },
  {
    score: 2,
    label: "Extension anormale",
    desc: "Mouvement d'extension/décérébration des membres",
  },
  { score: 1, label: "Aucune", desc: "Aucun mouvement ou réaction motrice" },
];

export function GlasgowSimulator() {
  const [selectedY, setSelectedY] = useState<number | null>(null);
  const [selectedV, setSelectedV] = useState<number | null>(null);
  const [selectedM, setSelectedM] = useState<number | null>(null);

  const scoreTotal = useMemo(() => {
    if (selectedY === null || selectedV === null || selectedM === null)
      return null;
    return selectedY + selectedV + selectedM;
  }, [selectedY, selectedV, selectedM]);

  const clinicalState = useMemo(() => {
    if (scoreTotal === null) return null;
    if (scoreTotal === 15) {
      return {
        level: "normal",
        title: "Conscience normale",
        color:
          "text-green-600 border-green-200 bg-green-50 dark:bg-green-950/20 dark:text-green-400",
        icon: CheckCircle,
        desc: "La victime est parfaitement éveillée et orientée.",
        action:
          "Poursuivre le bilan général. Maintenir la victime en position de confort et surveiller régulièrement.",
      };
    }
    if (scoreTotal >= 13) {
      return {
        level: "light",
        title: "Altération légère de la conscience",
        color:
          "text-yellow-600 border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:text-yellow-400",
        icon: AlertTriangle,
        desc: "Somnolence ou légère désorientation constatée.",
        action:
          "Mettre au repos, surveiller de près les fonctions neurologiques. Rassurer la victime et surveiller l'évolution.",
      };
    }
    if (scoreTotal >= 9) {
      return {
        level: "moderate",
        title: "Altération modérée de la conscience",
        color:
          "text-orange-600 border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:text-orange-400",
        icon: AlertTriangle,
        desc: "Obnubilation importante ou réaction ralentie aux ordres.",
        action:
          "Libérer les voies aériennes, mettre en position demi-assise (ou plat dos si suspicion de trauma), administrer de l'oxygène si prescrit, demander un avis médical (transmettre un bilan neurologique précis).",
      };
    }
    return {
      level: "severe",
      title: "Coma / Altération grave (Score ≤ 8)",
      color:
        "text-rose-600 border-rose-200 bg-rose-50 dark:bg-rose-950/20 dark:text-rose-400",
      icon: ShieldAlert,
      desc: "La victime est considérée comme inconsciente.",
      action:
        "URGENCE ABSOLUE (Bilan Jaune). Libération immédiate des voies aériennes (LVA), mise en Position Latérale de Sécurité (PLS) si la victime respire, alerte immédiate pour renfort médicalisé (SAMU 15 / 112). Surveillance continue de la respiration et du pouls.",
    };
  }, [scoreTotal]);

  const handleReset = () => {
    setSelectedY(null);
    setSelectedV(null);
    setSelectedM(null);
  };

  return (
    <article className="mx-auto w-full max-w-5xl rounded-3xl border border-gray-100 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h3 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            <Sparkles className="h-6 w-6 text-blue-600" />
            Simulateur de Score de Glasgow
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Sélectionnez les réponses pour calculer le score et obtenir la
            conduite à tenir secouriste (DGSCGC / SUAP).
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleReset}
          className="px-4 py-2 text-xs font-semibold"
          disabled={
            selectedY === null && selectedV === null && selectedM === null
          }
        >
          Réinitialiser
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Colonne des Sélections (8 cols) */}
        <div className="space-y-6 lg:col-span-7">
          {/* Oculaire */}
          <div
            className="space-y-3"
            role="group"
            aria-labelledby="label-ocular"
          >
            <h4
              id="label-ocular"
              className="flex items-center gap-2 text-sm font-semibold tracking-wider text-blue-600 uppercase"
            >
              <Eye className="h-4 w-4" /> Ouverture des Yeux (Y : 1 à 4)
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {ocularOptions.map((opt) => (
                <button
                  key={`eye-${opt.score}`}
                  onClick={() => setSelectedY(opt.score)}
                  aria-pressed={selectedY === opt.score}
                  className={`flex flex-col items-start rounded-xl border p-3 text-left transition-all ${
                    selectedY === opt.score
                      ? "border-blue-600 bg-blue-50/50 text-blue-900 ring-2 ring-blue-600 dark:bg-blue-950/20 dark:text-blue-200"
                      : "border-gray-200 bg-transparent text-gray-700 hover:border-gray-300 dark:border-gray-800 dark:text-gray-300 dark:hover:border-gray-700"
                  }`}
                >
                  <span className="mb-1 rounded bg-blue-100 px-1.5 py-0.5 text-xs font-bold text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                    {opt.score} {opt.score > 1 ? "points" : "point"}
                  </span>
                  <span className="text-sm font-semibold">{opt.label}</span>
                  <span className="mt-1 line-clamp-1 text-xs text-gray-400 dark:text-gray-500">
                    {opt.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Verbale */}
          <div
            className="space-y-3"
            role="group"
            aria-labelledby="label-verbal"
          >
            <h4
              id="label-verbal"
              className="flex items-center gap-2 text-sm font-semibold tracking-wider text-green-600 uppercase"
            >
              <MessageSquare className="h-4 w-4" /> Réponse Verbale (V : 1 à 5)
            </h4>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
              {verbalOptions.map((opt) => (
                <button
                  key={`verbal-${opt.score}`}
                  onClick={() => setSelectedV(opt.score)}
                  aria-pressed={selectedV === opt.score}
                  className={`flex flex-col items-start rounded-xl border p-3 text-left transition-all ${
                    selectedV === opt.score
                      ? "border-green-600 bg-green-50/50 text-green-900 ring-2 ring-green-600 dark:bg-green-950/20 dark:text-green-200"
                      : "border-gray-200 bg-transparent text-gray-700 hover:border-gray-300 dark:border-gray-800 dark:text-gray-300 dark:hover:border-gray-700"
                  }`}
                >
                  <span className="mb-1 rounded bg-green-100 px-1.5 py-0.5 text-xs font-bold text-green-800 dark:bg-green-900 dark:text-green-300">
                    {opt.score} {opt.score > 1 ? "points" : "point"}
                  </span>
                  <span className="text-sm font-semibold">{opt.label}</span>
                  <span className="mt-1 line-clamp-1 text-xs text-gray-400 dark:text-gray-500">
                    {opt.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Motrice */}
          <div className="space-y-3" role="group" aria-labelledby="label-motor">
            <h4
              id="label-motor"
              className="flex items-center gap-2 text-sm font-semibold tracking-wider text-rose-600 uppercase"
            >
              <Activity className="h-4 w-4" /> Réponse Motrice (M : 1 à 6)
            </h4>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {motorOptions.map((opt) => (
                <button
                  key={`motor-${opt.score}`}
                  onClick={() => setSelectedM(opt.score)}
                  aria-pressed={selectedM === opt.score}
                  className={`flex flex-col items-start rounded-xl border p-3 text-left transition-all ${
                    selectedM === opt.score
                      ? "border-rose-600 bg-rose-50/50 text-rose-900 ring-2 ring-rose-600 dark:bg-rose-950/20 dark:text-rose-200"
                      : "border-gray-200 bg-transparent text-gray-700 hover:border-gray-300 dark:border-gray-800 dark:text-gray-300 dark:hover:border-gray-700"
                  }`}
                >
                  <span className="mb-1 rounded bg-rose-100 px-1.5 py-0.5 text-xs font-bold text-rose-800 dark:bg-rose-900 dark:text-rose-300">
                    {opt.score} {opt.score > 1 ? "points" : "point"}
                  </span>
                  <span className="text-sm font-semibold">{opt.label}</span>
                  <span className="mt-1 line-clamp-1 text-xs text-gray-400 dark:text-gray-500">
                    {opt.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Colonne de Rétroaction/Score (5 cols) */}
        <div className="flex flex-col justify-between lg:col-span-5">
          <div className="flex h-full flex-col justify-between rounded-2xl border border-gray-100 bg-gray-50/50 p-6 dark:border-gray-800 dark:bg-gray-900/50">
            <AnimatePresence mode="wait">
              {scoreTotal === null ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-1 flex-col items-center justify-center py-12 text-center"
                >
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30">
                    <Activity className="h-8 w-8 animate-pulse" />
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                    Calculateur Clinique
                  </h4>
                  <p className="mt-2 max-w-[280px] text-sm text-gray-400 dark:text-gray-500">
                    Sélectionnez une option dans chaque catégorie pour obtenir
                    le score et le protocole de prise en charge.
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex-1 space-y-6"
                >
                  <div className="border-b border-gray-200/50 py-4 text-center dark:border-gray-800/50">
                    <div className="text-xs font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-500">
                      Score de Glasgow
                    </div>
                    <div className="mt-1 text-6xl font-black text-gray-900 dark:text-white">
                      {scoreTotal}
                      <span className="text-xl font-normal text-gray-400 dark:text-gray-500">
                        /15
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                      Formule : Y({selectedY}) + V({selectedV}) + M({selectedM})
                    </div>
                  </div>

                  {clinicalState && (
                    <div className="space-y-4">
                      {/* État Clinique Badge */}
                      <div
                        className={`flex items-center gap-3 rounded-xl border p-3 ${clinicalState.color}`}
                      >
                        <clinicalState.icon className="h-6 w-6 flex-shrink-0" />
                        <div>
                          <h5 className="text-sm leading-tight font-bold">
                            {clinicalState.title}
                          </h5>
                          <p className="mt-0.5 text-xs opacity-90">
                            {clinicalState.desc}
                          </p>
                        </div>
                      </div>

                      {/* Action secouriste conseillée */}
                      <div className="space-y-2">
                        <h6 className="text-xs font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-500">
                          Conduite à tenir (DGSCGC)
                        </h6>
                        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                            {clinicalState.action}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </article>
  );
}
