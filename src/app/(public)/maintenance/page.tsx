"use client";

import { motion } from "framer-motion";
import { Wrench, Shield, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function MaintenancePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-radial from-slate-900 via-slate-950 to-black px-4 text-white">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] bg-[size:4rem_4rem]" />

      <main className="relative z-10 flex max-w-lg flex-col items-center text-center">
        {/* Animated Icon Container */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="relative mb-8 flex h-24 w-24 items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/50 p-4 shadow-2xl backdrop-blur-xl"
        >
          <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 opacity-30 blur-lg" />
          <Wrench className="relative h-12 w-12 animate-pulse text-blue-400" />
        </motion.div>

        {/* Heading */}
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="bg-gradient-to-r from-slate-100 via-white to-slate-400 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent sm:text-5xl"
        >
          Maintenance en cours
        </motion.h1>

        {/* Description */}
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="mt-6 text-lg leading-relaxed text-slate-400"
        >
          Nous mettons à jour la plateforme RescueLearn pour vous offrir une
          meilleure expérience d&apos;apprentissage du secourisme. Nous serons
          de retour très bientôt.
        </motion.p>

        {/* Security badge / note */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="mt-8 flex items-center gap-3 rounded-full border border-slate-800/80 bg-slate-950/40 px-5 py-2 text-sm text-slate-400 shadow-inner backdrop-blur-md"
        >
          <Shield className="h-4 w-4 text-emerald-400" />
          <span>Vos données et sessions sont en parfaite sécurité.</span>
        </motion.div>

        {/* CTA or info */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="mt-10"
        >
          <Link
            href="https://mobile.interieur.gouv.fr/Le-ministere/Securite-civile/Documentation-technique/Secourisme-et-associations/Les-recommandations-et-les-referentiels"
            target="_blank"
            className="group inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/80 px-5 py-3 text-sm font-semibold text-white transition-all hover:border-slate-700 hover:bg-slate-800"
          >
            Consulter les Référentiels Officiels
            <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-1" />
          </Link>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="absolute right-0 bottom-8 left-0 z-10 text-center text-xs text-slate-600">
        © {new Date().getFullYear()} RescueLearn. Tous droits réservés.
      </footer>
    </div>
  );
}
