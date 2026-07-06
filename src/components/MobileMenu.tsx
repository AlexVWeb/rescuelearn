"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

export function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-gray-700 hover:text-blue-600"
        aria-label="Menu"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {isOpen && (
        <div className="absolute top-16 right-0 left-0 z-50 bg-white shadow-lg">
          <nav className="flex flex-col space-y-4 p-4">
            <Link
              href="/"
              className="px-4 py-2 text-gray-700 hover:text-blue-600"
              onClick={() => setIsOpen(false)}
            >
              Accueil
            </Link>
            <Link
              href="/quiz"
              className="px-4 py-2 text-gray-700 hover:text-blue-600"
              onClick={() => setIsOpen(false)}
            >
              Quiz
            </Link>
            <Link
              href="/snv"
              className="px-4 py-2 text-gray-700 hover:text-blue-600"
              onClick={() => setIsOpen(false)}
            >
              SNV
            </Link>
            <Link
              href="/glasgow"
              className="px-4 py-2 text-gray-700 hover:text-blue-600"
              onClick={() => setIsOpen(false)}
            >
              Glasgow
            </Link>
            <Link
              href="/learning"
              className="px-4 py-2 text-gray-700 hover:text-blue-600"
              onClick={() => setIsOpen(false)}
            >
              Cartes d&apos;apprentissage
            </Link>
            <Link
              href="/login"
              className="mx-4 rounded-md bg-blue-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-blue-700"
              onClick={() => setIsOpen(false)}
            >
              Connexion
            </Link>
          </nav>
        </div>
      )}
    </div>
  );
}
