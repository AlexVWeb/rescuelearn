"use client";

import { motion } from "framer-motion";
import { AlertTriangle, Home, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function SectionDisabledPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <main className="relative z-10 flex max-w-md flex-col items-center">
        {/* Animated Icon Container */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-xl"
        >
          <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 opacity-20 blur-lg" />
          <AlertTriangle className="relative h-10 w-10 text-amber-600" />
        </motion.div>

        {/* Heading */}
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent sm:text-4xl"
        >
          Section désactivée
        </motion.h1>

        {/* Description */}
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="mt-4 text-base leading-relaxed text-gray-500"
        >
          L&apos;accès à cette fonctionnalité est temporairement suspendu par un
          administrateur. Veuillez réessayer ultérieurement.
        </motion.p>

        {/* CTA or info */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="mt-8 flex w-full flex-col justify-center gap-3 sm:flex-row"
        >
          <button
            onClick={() => window.history.back()}
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </button>
          <Link
            href="/"
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700"
          >
            <Home className="h-4 w-4" />
            Accueil
          </Link>
        </motion.div>
      </main>
    </div>
  );
}
