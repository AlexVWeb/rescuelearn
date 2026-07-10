"use client";

import React from "react";
import {
  Check,
  Lock,
  Star,
  HelpCircle,
  Activity,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LevelNode {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  type: "quiz" | "snv" | "card";
  status: "completed" | "current" | "locked";
  xpReward: number;
  themeColor: string;
}

interface LearningPathProps {
  levels: LevelNode[];
  onLevelClick: (node: LevelNode) => void;
}

export function LearningPath({ levels, onLevelClick }: LearningPathProps) {
  return (
    <section
      className="space-y-6 lg:col-span-6"
      aria-labelledby="learning-path-title"
    >
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <h2
          id="learning-path-title"
          className="text-xl font-black tracking-wide text-gray-900 uppercase"
        >
          Chemin de Secourisme
        </h2>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black tracking-wider text-blue-600 uppercase">
          Section 1 : Les Fondamentaux
        </span>
      </div>

      {/* Sinuous Alternating Layout */}
      <div className="relative flex w-full flex-col gap-6 py-6">
        {/* Background connecting line down the middle */}
        <div className="absolute top-12 bottom-12 left-[48px] -z-10 w-1 -translate-x-1/2 border-l-4 border-dashed border-blue-100 md:left-1/2" />

        {levels.map((node, index) => {
          const IconType =
            node.type === "quiz"
              ? HelpCircle
              : node.type === "snv"
                ? Activity
                : BookOpen;
          const isLocked = node.status === "locked";
          const isCurrent = node.status === "current";
          const isCompleted = node.status === "completed";

          const isEven = index % 2 === 0;

          return (
            <div
              key={node.id}
              className={cn(
                "flex w-full items-center gap-6 py-4 transition-all duration-300",
                isEven ? "md:flex-row" : "md:flex-row-reverse"
              )}
            >
              {/* Circle Button Side */}
              <div className="flex shrink-0 justify-start md:w-1/2 md:justify-center">
                <div className="relative ml-2.5 flex items-center justify-center md:ml-0">
                  {isCurrent && (
                    <span className="absolute -inset-3 animate-ping rounded-full border-4 border-amber-300 opacity-60" />
                  )}

                  <button
                    onClick={() => onLevelClick(node)}
                    className={cn(
                      "relative flex h-24 w-24 items-center justify-center rounded-full border-b-[10px] text-white shadow-lg transition-all active:translate-y-[10px] active:border-b-0",
                      isLocked
                        ? "cursor-not-allowed border-gray-400 bg-gray-300 text-gray-100 shadow-none"
                        : `bg-gradient-to-b ${node.themeColor}`
                    )}
                    aria-label={`${node.title} - ${node.status}`}
                  >
                    {isCompleted ? (
                      <Check className="h-10 w-10 stroke-[4]" />
                    ) : isLocked ? (
                      <Lock className="h-8 w-8" />
                    ) : (
                      <IconType className="h-10 w-10 stroke-[2.5]" />
                    )}
                  </button>

                  {isCurrent && (
                    <div className="absolute -top-7 animate-bounce rounded-full border-2 border-white bg-amber-500 px-2.5 py-1 text-[9px] font-black tracking-wider text-white uppercase shadow-md">
                      JOUER !
                    </div>
                  )}
                </div>
              </div>

              {/* Description Card Side */}
              <div className="flex-1 md:w-1/2">
                <div
                  className={cn(
                    "relative w-full rounded-3xl border-2 bg-white p-5 shadow-sm transition-all hover:shadow-md",
                    isCurrent
                      ? "border-amber-400 shadow-amber-50"
                      : isCompleted
                        ? "border-emerald-200"
                        : "border-gray-100 opacity-75"
                  )}
                >
                  <div
                    className={cn(
                      "absolute top-1/2 hidden h-4 w-4 -translate-y-2 rotate-45 border-b-2 border-l-2 border-inherit bg-white md:block",
                      isEven
                        ? "-left-2 border-t-0 border-r-0"
                        : "-right-2 border-t-2 border-r-2 border-b-0 border-l-0"
                    )}
                  />

                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-[9px] font-black tracking-wider uppercase",
                        isCompleted
                          ? "bg-emerald-100 text-emerald-800"
                          : isCurrent
                            ? "bg-amber-100 text-amber-800"
                            : "bg-gray-100 text-gray-500"
                      )}
                    >
                      {node.subtitle}
                    </span>
                  </div>

                  <h3 className="mt-2 text-base font-black text-gray-900 md:text-lg">
                    {node.title}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-gray-500">
                    {node.description}
                  </p>

                  <div className="mt-3 flex items-center gap-1.5 border-t border-gray-50 pt-3">
                    <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[9px] font-black tracking-wider text-blue-600 uppercase">
                      {node.type}
                    </span>
                    <span className="h-1.5 w-1.5 rounded-full bg-gray-200" />
                    <span className="flex items-center gap-0.5 text-xs font-black text-yellow-600">
                      <Star className="h-3 w-3 fill-current text-yellow-500" />{" "}
                      +{node.xpReward} XP
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
