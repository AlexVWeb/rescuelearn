"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Wrench, Bug, ArrowRight, TrendingUp } from "lucide-react";
import { changelogData, ChangelogItem } from "@/data/changelog";

type FilterType = "all" | "features" | "improvements";

export function ChangelogClient() {
  const [filter, setFilter] = useState<FilterType>("all");

  const filteredData = changelogData.filter((item) => {
    if (filter === "all") return true;
    if (filter === "features") return item.category === "feature";
    if (filter === "improvements")
      return item.category === "improvement" || item.category === "bugfix";
    return true;
  });

  const getCategoryBadge = (category: ChangelogItem["category"]) => {
    switch (category) {
      case "feature":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-600/20">
            <Sparkles className="h-3.5 w-3.5" />
            Nouveauté
          </span>
        );
      case "improvement":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-600/20">
            <Wrench className="h-3.5 w-3.5" />
            Amélioration
          </span>
        );
      case "bugfix":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-600/20">
            <Bug className="h-3.5 w-3.5" />
            Correction
          </span>
        );
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="relative overflow-hidden bg-slate-50 py-16 sm:py-24">
      {/* Decorative background gradients */}
      <div className="absolute top-0 right-0 -z-10 h-[400px] w-[400px] rounded-full bg-blue-100/40 blur-3xl" />
      <div className="absolute top-1/2 left-0 -z-10 h-[300px] w-[300px] rounded-full bg-indigo-100/30 blur-3xl" />

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700 ring-1 ring-blue-700/10">
            <TrendingUp className="h-4 w-4" />
            Évolution de la plateforme
          </div>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            Journal des mises à jour
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-slate-600">
            Retrouvez toutes les nouveautés, améliorations et corrections
            déployées sur RescueLearn.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="mt-12 flex justify-center">
          <div className="inline-flex rounded-xl bg-slate-200/80 p-1 shadow-sm ring-1 ring-black/5">
            {[
              { id: "all", label: "Tout" },
              { id: "features", label: "Nouveautés" },
              { id: "improvements", label: "Améliorations & Corrections" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id as FilterType)}
                className={`relative rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-200 ${
                  filter === tab.id
                    ? "bg-white font-semibold text-slate-950 shadow-sm"
                    : "text-slate-600 hover:text-slate-950"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Timeline Grid */}
        <div className="relative mt-16">
          {/* Main vertical timeline line */}
          <div className="absolute top-0 bottom-0 left-6 w-0.5 bg-slate-200 sm:left-1/2 sm:-ml-px" />

          <div className="space-y-12">
            <AnimatePresence mode="popLayout">
              {filteredData.map((item, index) => {
                const isEven = index % 2 === 0;

                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                    className="relative flex flex-col sm:flex-row sm:justify-between"
                  >
                    {/* Timeline Node dot */}
                    <div className="absolute left-6 -ml-1.5 flex h-3 w-3 items-center justify-center rounded-full bg-white ring-4 ring-blue-500 sm:left-1/2 sm:-ml-1.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                    </div>

                    {/* Timeline Card Container */}
                    <div
                      className={`pl-12 sm:w-[45%] sm:pl-0 ${isEven ? "sm:text-right" : "sm:order-last"}`}
                    >
                      <div className="group relative rounded-2xl border border-slate-100 bg-white p-6 shadow-md transition-all duration-300 hover:border-slate-200 hover:shadow-lg">
                        {/* Status / Category indicators */}
                        <div
                          className={`flex flex-wrap gap-2 ${isEven ? "sm:justify-end" : "justify-start"}`}
                        >
                          {getCategoryBadge(item.category)}
                        </div>

                        {/* Title */}
                        <h3 className="mt-4 text-xl font-bold text-slate-900 transition-colors duration-200 group-hover:text-blue-600">
                          {item.title}
                        </h3>

                        {/* Date (for completed releases) */}
                        {item.date && (
                          <time className="mt-1 block text-xs font-semibold text-slate-400">
                            Déployé le {formatDate(item.date)}
                          </time>
                        )}

                        {/* Description */}
                        <p className="mt-3 text-sm leading-relaxed text-slate-600">
                          {item.description}
                        </p>

                        {/* Bullet point details */}
                        {item.details && item.details.length > 0 && (
                          <div
                            className={`mt-4 border-t border-slate-100 pt-3 text-left ${isEven ? "sm:text-right" : ""}`}
                          >
                            <ul
                              className={`space-y-1.5 text-xs text-slate-500 ${isEven ? "sm:inline-block sm:text-left" : ""}`}
                            >
                              {item.details.map((detail, idx) => (
                                <li
                                  key={idx}
                                  className="flex items-start gap-2"
                                >
                                  <ArrowRight className="mt-0.5 h-3 w-3 shrink-0 text-blue-500" />
                                  <span>{detail}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Empty block on the opposite side to balance the layout */}
                    <div className="hidden sm:block sm:w-[45%]" />
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {filteredData.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-12 text-center"
              >
                <p className="font-medium text-slate-500">
                  Aucun élément ne correspond à ce filtre.
                </p>
              </motion.div>
            )}
          </div>
        </div>

        {/* Suggestion Section */}
        <div className="mt-24 rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-center text-white shadow-xl sm:p-12">
          <h2 className="text-2xl font-bold sm:text-3xl">Une suggestion ?</h2>
          <p className="mx-auto mt-4 max-w-md text-blue-100">
            Une fonctionnalité vous manque ? Une idée pour améliorer la
            plateforme ? Partagez vos suggestions pour construire ensemble
            l&apos;avenir de RescueLearn.
          </p>
          <div className="mt-8 flex justify-center">
            <a
              href="mailto:contact@rescuelearn.fr"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-blue-700 shadow-md transition-transform duration-200 hover:scale-105"
            >
              Envoyer une suggestion
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
