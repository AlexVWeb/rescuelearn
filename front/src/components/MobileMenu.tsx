'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

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
        <div className="absolute top-16 left-0 right-0 bg-white shadow-lg z-50">
          <nav className="flex flex-col p-4 space-y-4">
            <Link 
              href="/" 
              className="text-gray-700 hover:text-blue-600 px-4 py-2"
              onClick={() => setIsOpen(false)}
            >
              Accueil
            </Link>
            <Link 
              href="/quiz" 
              className="text-gray-700 hover:text-blue-600 px-4 py-2"
              onClick={() => setIsOpen(false)}
            >
              Quiz
            </Link>
            <Link 
              href="/snv" 
              className="text-gray-700 hover:text-blue-600 px-4 py-2"
              onClick={() => setIsOpen(false)}
            >
              SNV
            </Link>
            <Link 
              href="/learning" 
              className="text-gray-700 hover:text-blue-600 px-4 py-2"
              onClick={() => setIsOpen(false)}
            >
              Cartes d&apos;apprentissage
            </Link>
          </nav>
        </div>
      )}
    </div>
  );
}
