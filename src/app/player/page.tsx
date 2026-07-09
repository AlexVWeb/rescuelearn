import React from "react";
import { Trophy, BookOpen, Clock } from "lucide-react";

export default function PlayerPage() {
  return (
    <div className="animate-fade-in space-y-8">
      {/* Hero Welcome */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white shadow-lg md:p-10">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          Bonjour et bienvenue !
        </h1>
        <p className="mt-2 max-w-xl text-sm text-blue-100 sm:text-base">
          C'est ici que tu retrouveras bientôt ton historique de jeu, tes
          statistiques de réussite, et tes quiz favoris pour t'entraîner au
          secourisme.
        </p>
      </div>

      {/* Stats Summary Skeletons */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <Trophy className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
              Parties jouées
            </p>
            <p className="mt-0.5 text-2xl font-bold text-gray-900">0</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <BookOpen className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
              Quiz sauvegardés
            </p>
            <p className="mt-0.5 text-2xl font-bold text-gray-900">0</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:col-span-2 lg:col-span-1">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <Clock className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
              Temps de révision
            </p>
            <p className="mt-0.5 text-2xl font-bold text-gray-900">0 min</p>
          </div>
        </div>
      </div>

      {/* Main Content Sections */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Recents */}
        <section
          className="space-y-4 lg:col-span-2"
          aria-labelledby="recent-sessions-title"
        >
          <div className="flex items-center justify-between">
            <h2
              id="recent-sessions-title"
              className="text-lg font-bold text-gray-900"
            >
              Activités récentes
            </h2>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm">
            <p className="text-sm text-gray-500">
              Aucune activité enregistrée pour le moment.
            </p>
          </div>
        </section>

        {/* Saved Quizzes */}
        <section className="space-y-4" aria-labelledby="saved-quizzes-title">
          <h2
            id="saved-quizzes-title"
            className="text-lg font-bold text-gray-900"
          >
            Mes favoris
          </h2>
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm">
            <p className="text-sm text-gray-500">
              Tu n'as aucun quiz sauvegardé.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
