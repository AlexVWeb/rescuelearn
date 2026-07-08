"use client";

import dayjs from "dayjs";
import Link from "next/link";
import { MobileMenu } from "@/components/MobileMenu";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="sticky top-0 z-40 bg-white shadow-sm">
        <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between">
            <div className="flex items-center">
              <Link
                href="/"
                className="flex cursor-pointer items-center text-blue-600 transition-colors hover:text-blue-700"
              >
                <span className="text-2xl font-bold">RescueLearn</span>
              </Link>
            </div>

            {/* Menu desktop */}
            <div className="hidden items-center space-x-8 md:flex">
              <Link
                href="/"
                className="text-gray-700 transition-colors hover:text-blue-600"
              >
                Accueil
              </Link>
              <Link
                href="/quiz"
                className="text-gray-700 transition-colors hover:text-blue-600"
              >
                Quiz
              </Link>
              <Link
                href="/snv"
                className="text-gray-700 transition-colors hover:text-blue-600"
              >
                SNV
              </Link>
              <Link
                href="/glasgow"
                className="text-gray-700 transition-colors hover:text-blue-600"
              >
                Glasgow
              </Link>
              <Link
                href="/learning"
                className="text-gray-700 transition-colors hover:text-blue-600"
              >
                Cartes d&apos;apprentissage
              </Link>
              <Link
                href="/formations"
                className="font-medium text-blue-600! text-gray-700 transition-colors hover:text-blue-600"
              >
                Organismes de formation
              </Link>
              <Link
                href="/login"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                Connexion
              </Link>
            </div>

            {/* Menu mobile */}
            <div className="flex items-center md:hidden">
              <MobileMenu />
            </div>
          </div>
        </nav>
      </header>
      <main className="min-h-screen bg-gray-50">{children}</main>
      <footer className="border-t bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                RescueLearn
              </h3>
              <p className="mt-4 text-sm text-gray-500">
                Votre plateforme complète pour l&apos;apprentissage du
                secourisme.
              </p>
              <p className="mt-4 text-sm text-gray-500">
                {
                  "L'ensemble des quiz, scénarios SNV et cartes d'apprentissage sont inspirés uniquement des référentiels de recommandations de la DGSCGC et sont générés par des IA en analysant les référentiels."
                }
              </p>
              <p className="mt-4 text-sm text-gray-500">
                <Link
                  href="https://mobile.interieur.gouv.fr/Le-ministere/Securite-civile/Documentation-technique/Secourisme-et-associations/Les-recommandations-et-les-referentiels"
                  className="text-blue-600 hover:text-blue-700"
                  target="_blank"
                >
                  Voir les référentiels
                </Link>
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Navigation
              </h3>
              <ul className="mt-4 space-y-2">
                <li>
                  <Link
                    href="/quiz"
                    className="text-sm text-gray-500 hover:text-blue-600"
                  >
                    Quiz
                  </Link>
                </li>
                <li>
                  <Link
                    href="/snv"
                    className="text-sm text-gray-500 hover:text-blue-600"
                  >
                    Scénarios SNV
                  </Link>
                </li>
                <li>
                  <Link
                    href="/glasgow"
                    className="text-sm text-gray-500 hover:text-blue-600"
                  >
                    Score de Glasgow
                  </Link>
                </li>
                <li>
                  <Link
                    href="/learning"
                    className="text-sm text-gray-500 hover:text-blue-600"
                  >
                    Cartes d&apos;apprentissage
                  </Link>
                </li>
                <li>
                  <Link
                    href="/formations"
                    className="text-sm font-semibold text-gray-500 hover:text-blue-600"
                  >
                    Espace Organismes (Formations)
                  </Link>
                </li>
                <li>
                  <Link
                    href="/login"
                    className="text-sm text-gray-500 hover:text-blue-600"
                  >
                    Connexion
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t pt-8">
            <p className="text-center text-sm text-gray-500">
              © {dayjs().year()} RescueLearn. Tous droits réservés.{" "}
              <Link
                href="https://www.linkedin.com/in/alexandre-valet/"
                className="text-blue-600 hover:text-blue-700"
              >
                Alexandre Valet
              </Link>
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
