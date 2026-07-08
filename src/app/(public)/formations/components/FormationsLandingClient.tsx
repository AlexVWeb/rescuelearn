"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
  Users,
  ClipboardCheck,
  ShieldCheck,
  Clock,
  FileSpreadsheet,
  ChevronDown,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { DemoContactForm } from "./DemoContactForm";

// Tabs for interactive feature showcase
const FEATURES = [
  {
    id: "dashboard",
    title: "Tableau de Bord Intuitif",
    shortDesc: "Pilotez votre activité en un coup d'œil.",
    longDesc:
      "Suivez vos indicateurs de performance, le nombre de stagiaires actifs, les sessions planifiées et les taux de présence en temps réel sur une interface claire et épurée.",
    icon: BarChart3,
    image: "/dashboard_resculearn.png",
    alt: "Capture d'écran du tableau de bord RescueLearn affichant les statistiques globales de l'organisme de formation",
  },
  {
    id: "sessions",
    title: "Sessions & Émargement",
    shortDesc: "Émargement numérique sécurisé et instantané.",
    longDesc:
      "Planifiez vos sessions, attribuez des formateurs et permettez aux stagiaires de signer numériquement via un code PIN unique ou signature manuelle. Générez automatiquement les fiches de présence PDF conformes.",
    icon: ClipboardCheck,
    image: "/session_organisme.png",
    alt: "Capture d'écran de l'interface de gestion de session et d'émargement des stagiaires",
  },
  {
    id: "stagiaires",
    title: "Base Stagiaires Unifiée",
    shortDesc: "Historique et suivi individuel complet.",
    longDesc:
      "Conservez une fiche détaillée pour chaque apprenant. Suivez leur progression, leurs résultats aux quiz de secourisme, et téléchargez leurs attestations de réussite en quelques secondes.",
    icon: Users,
    image: "/base_stagiaire.png",
    alt: "Capture d'écran de l'annuaire et de la fiche individuelle d'un stagiaire dans RescueLearn",
  },
];

// FAQ items
const FAQ_ITEMS = [
  {
    question: "Comment fonctionne l'émargement numérique sur RescueLearn ?",
    answer:
      "RescueLearn simplifie l'émargement. Lors d'une session de formation, chaque stagiaire peut émarger directement sur tablette, smartphone ou ordinateur en saisissant un code PIN individuel sécurisé ou en signant sur l'écran. La feuille d'émargement PDF est générée instantanément avec les signatures et horodatages.",
  },
  {
    question: "La plateforme aide-t-elle à préparer les audits Qualiopi ?",
    answer:
      "Oui, tout à fait. RescueLearn centralise de façon structurée et infalsifiable toutes les pièces administratives requises lors d'un audit de certification (indicateurs de la base stagiaire, feuilles d'émargement signées numériquement, taux d'assiduité, et résultats d'évaluations). Cela vous évite les pertes de documents et facilite grandement la preuve de conformité.",
  },
  {
    question:
      "Pouvons-nous gérer plusieurs formateurs au sein de notre organisme ?",
    answer:
      "Absolument. En tant qu'administrateur de votre organisme sur RescueLearn, vous pouvez inviter vos formateurs, leur attribuer des sessions spécifiques et leur donner accès à la gestion de leurs stagiaires en toute autonomie.",
  },
  {
    question:
      "Vos documents générés (PDF) sont-ils conformes aux exigences réglementaires ?",
    answer:
      "Oui, les attestations de fin de formation et les feuilles d'émargement générées automatiquement contiennent toutes les mentions obligatoires requises par la DGSCGC et les financeurs publics : dates, heures, noms des formateurs, détails des modules de secourisme et signatures sécurisées.",
  },
];

export function FormationsLandingClient() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const activeFeature = FEATURES.find((f) => f.id === activeTab) || FEATURES[0];

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="relative overflow-hidden bg-slate-50 text-slate-900">
      {/* Hero Section */}
      <section
        className="relative pt-12 pb-20 md:pt-20 md:pb-32"
        aria-labelledby="hero-title"
      >
        {/* Glow effect background */}
        <div className="absolute inset-0 -z-10 flex items-center justify-center opacity-30 blur-[120px]">
          <div className="h-[350px] w-[350px] rounded-full bg-blue-400"></div>
          <div className="ml-[-100px] h-[300px] w-[300px] rounded-full bg-purple-400"></div>
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            {/* Tag / Badge */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-4 py-1.5 text-xs font-semibold text-blue-700 ring-1 ring-blue-600/10"
            >
              <Sparkles className="h-3.5 w-3.5 animate-pulse text-blue-600" />
              Espace Organismes & Formateurs
            </motion.div>

            <motion.h1
              id="hero-title"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mt-6 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl md:text-6xl"
            >
              Gerez vos formations en secourisme <br />
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                en toute simplicite
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mx-auto mt-6 max-w-3xl text-lg text-slate-600 sm:text-xl"
            >
              De la planification des sessions a la signature numerique des
              stagiaires. Automatisez vos documents administratifs et simplifiez
              la conformite de vos audits.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-10 flex flex-col justify-center gap-4 sm:flex-row"
            >
              <a
                href="#demo"
                className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-blue-600 px-6 py-3.5 text-base font-semibold text-white shadow-md shadow-blue-500/20 transition-all hover:bg-blue-700 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                Demander une demo gratuite
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-base font-semibold text-slate-700 transition-all hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600"
              >
                Acceder a l&apos;espace
              </Link>
            </motion.div>
          </div>

          {/* Hero Image Mockup */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="relative mx-auto mt-16 max-w-5xl rounded-2xl border border-slate-200 bg-white/50 p-2 shadow-2xl backdrop-blur-sm sm:mt-20"
          >
            <div className="overflow-hidden rounded-xl border border-slate-100 bg-slate-900 shadow-inner">
              <Image
                src="/dashboard_resculearn.png"
                alt="Apercu global de la plateforme RescueLearn pour les organismes de formation"
                width={1200}
                height={675}
                className="w-full object-cover transition-transform duration-700 hover:scale-102"
                priority
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section
        className="border-y border-slate-200 bg-white py-12"
        aria-label="Statistiques cles"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 text-center sm:grid-cols-3">
            <div className="flex flex-col items-center">
              <div className="rounded-full bg-blue-50 p-3 text-blue-600">
                <Clock className="h-6 w-6" />
              </div>
              <span className="mt-4 text-3xl font-extrabold text-slate-900 sm:text-4xl">
                -75%
              </span>
              <span className="mt-2 text-sm font-medium text-slate-500">
                De temps administratif passe par session
              </span>
            </div>
            <div className="flex flex-col items-center">
              <div className="rounded-full bg-indigo-50 p-3 text-indigo-600">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <span className="mt-4 text-3xl font-extrabold text-slate-900 sm:text-4xl">
                100%
              </span>
              <span className="mt-2 text-sm font-medium text-slate-500">
                Securise & Conforme aux exigences administratives
              </span>
            </div>
            <div className="flex flex-col items-center">
              <div className="rounded-full bg-purple-50 p-3 text-purple-600">
                <FileSpreadsheet className="h-6 w-6" />
              </div>
              <span className="mt-4 text-3xl font-extrabold text-slate-900 sm:text-4xl">
                Zero
              </span>
              <span className="mt-2 text-sm font-medium text-slate-500">
                Papier a imprimer pour l&apos;emargement
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Showcase Section (Tabs + Screenshots) */}
      <section className="py-20 md:py-28" aria-labelledby="showcase-title">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2
              id="showcase-title"
              className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
            >
              Une solution complete pensee pour les formateurs
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
              Decouvrez les outils cles pour optimiser, administrer et valoriser
              vos sessions de formation au secourisme.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
            {/* Left side tabs */}
            <div
              className="flex flex-col gap-4 lg:col-span-5"
              role="tablist"
              aria-label="Fonctionnalites principales"
            >
              {FEATURES.map((feature) => {
                const Icon = feature.icon;
                const isSelected = activeTab === feature.id;
                return (
                  <button
                    key={feature.id}
                    onClick={() => setActiveTab(feature.id)}
                    role="tab"
                    aria-selected={isSelected}
                    aria-controls={`panel-${feature.id}`}
                    id={`tab-${feature.id}`}
                    className={`group flex items-start gap-4 rounded-2xl p-5 text-left outline-hidden transition-all focus-visible:ring-2 focus-visible:ring-blue-600 ${
                      isSelected
                        ? "bg-white shadow-lg ring-1 ring-slate-200/50"
                        : "hover:bg-slate-100/80"
                    }`}
                  >
                    <div
                      className={`mt-1 rounded-xl p-3 transition-colors ${
                        isSelected
                          ? "bg-blue-600 text-white"
                          : "bg-slate-200 text-slate-600 group-hover:bg-slate-300"
                      }`}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3
                        className={`text-lg font-bold transition-colors ${isSelected ? "text-slate-900" : "text-slate-700"}`}
                      >
                        {feature.title}
                      </h3>
                      <p className="mt-1 text-sm font-semibold text-blue-600">
                        {feature.shortDesc}
                      </p>
                      <p className="mt-2 line-clamp-3 text-sm text-slate-500">
                        {feature.longDesc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Right side animated screenshots */}
            <div className="lg:col-span-7">
              <div className="relative aspect-video w-full rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    id={`panel-${activeFeature.id}`}
                    role="tabpanel"
                    aria-labelledby={`tab-${activeFeature.id}`}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.3 }}
                    className="h-full w-full overflow-hidden rounded-xl border border-slate-100 bg-slate-950 shadow-inner"
                  >
                    <Image
                      src={activeFeature.image}
                      alt={activeFeature.alt}
                      width={800}
                      height={450}
                      className="h-full w-full object-cover"
                    />
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why RescueLearn Section */}
      <section
        className="bg-slate-900 py-20 text-white md:py-28"
        aria-labelledby="why-title"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2
              id="why-title"
              className="text-3xl font-bold tracking-tight sm:text-4xl"
            >
              Pourquoi choisir RescueLearn ?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-400">
              Assurez un suivi administratif impeccable et offrez a vos
              stagiaires une experience moderne.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {/* Card 1 */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-8 transition-transform hover:-translate-y-1">
              <div className="inline-flex rounded-xl bg-blue-500/10 p-3 text-blue-400">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="mt-6 text-xl font-bold">Securite & Conformite</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">
                Sauvegardes automatiques, acces securises par roles
                (administrateurs, formateurs), emargements certifies par PIN
                individuel et tracabilite complete de vos donnees.
              </p>
            </div>

            {/* Card 2 */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-8 transition-transform hover:-translate-y-1">
              <div className="inline-flex rounded-xl bg-indigo-500/10 p-3 text-indigo-400">
                <FileSpreadsheet className="h-6 w-6" />
              </div>
              <h3 className="mt-6 text-xl font-bold">
                Generation PDF Instantanee
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">
                Generez des fiches de presence et des attestations de reussite
                au format officiel en un clic. Plus besoin de compiler
                manuellement les signatures.
              </p>
            </div>

            {/* Card 3 */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-8 transition-transform hover:-translate-y-1">
              <div className="inline-flex rounded-xl bg-purple-500/10 p-3 text-purple-400">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="mt-6 text-xl font-bold">Suivi et Pedagogie</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">
                Vos stagiaires beneficient d&apos;un acces aux quiz interactifs
                et scenarios de secourisme en ligne pour ancrer durablement
                leurs competences et maximiser leur reussite.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 md:py-28" aria-labelledby="faq-title">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2
              id="faq-title"
              className="text-3xl font-bold tracking-tight text-slate-900"
            >
              Questions Frequentes
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Tout ce que vous devez savoir pour demarrer sereinement.
            </p>
          </div>

          <div className="mt-12 space-y-4">
            {FAQ_ITEMS.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={index}
                  className="rounded-2xl border border-slate-200 bg-white p-2"
                >
                  <button
                    onClick={() => toggleFaq(index)}
                    aria-expanded={isOpen}
                    aria-controls={`faq-answer-${index}`}
                    className="flex w-full items-center justify-between p-4 text-left font-bold text-slate-800 transition-colors hover:text-blue-600"
                  >
                    <span>{faq.question}</span>
                    <ChevronDown
                      className={`h-5 w-5 text-slate-400 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        id={`faq-answer-${index}`}
                        role="region"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <p className="px-4 pb-4 text-sm leading-relaxed text-slate-600">
                          {faq.answer}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Form / CTA Section */}
      <section
        id="demo"
        className="bg-white py-20 md:py-28"
        aria-labelledby="demo-title"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <div>
              <h2
                id="demo-title"
                className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl"
              >
                Pret a digitaliser votre centre de formation ?
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-slate-600">
                Remplissez le formulaire ci-contre pour obtenir une
                demonstration personnalisee et decouvrir comment RescueLearn
                peut simplifier votre gestion quotidienne.
              </p>
              <div className="mt-8 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-blue-100 p-2 text-blue-600">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-semibold text-slate-700">
                    Demonstration gratuite et sans engagement
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-indigo-100 p-2 text-indigo-600">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-semibold text-slate-700">
                    Deploiement et accompagnement sur-mesure
                  </span>
                </div>
              </div>
            </div>

            {/* Request Demo Form Component */}
            <DemoContactForm />
          </div>
        </div>
      </section>
    </div>
  );
}
