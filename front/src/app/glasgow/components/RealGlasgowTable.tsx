import React from 'react';

export function RealGlasgowTable() {
  return (
    <div className="w-full">
      <div className="mb-4">
        <h3 className="text-xl font-semibold text-gray-900">Tableau de référence (officiel)</h3>
        <p className="text-sm text-gray-600">Libellés complets tels qu'enseignés classiquement.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300 bg-white">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-3 py-2 text-center">Score</th>
              <th className="border border-gray-300 px-3 py-2 text-center">Y : Ouverture des yeux</th>
              <th className="border border-gray-300 px-3 py-2 text-center">V : Réponse verbale</th>
              <th className="border border-gray-300 px-3 py-2 text-center">M : Réponse motrice</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-300 px-3 py-2 text-center">1</td>
              <td className="border border-gray-300 px-3 py-2">Aucune</td>
              <td className="border border-gray-300 px-3 py-2">Aucune</td>
              <td className="border border-gray-300 px-3 py-2">Aucune</td>
            </tr>
            <tr>
              <td className="border border-gray-300 px-3 py-2 text-center">2</td>
              <td className="border border-gray-300 px-3 py-2">À la douleur</td>
              <td className="border border-gray-300 px-3 py-2">Sons incompréhensibles</td>
              <td className="border border-gray-300 px-3 py-2">Extension anormale (extension, enroulement des membres)</td>
            </tr>
            <tr>
              <td className="border border-gray-300 px-3 py-2 text-center">3</td>
              <td className="border border-gray-300 px-3 py-2">À la demande</td>
              <td className="border border-gray-300 px-3 py-2">Paroles inappropriées</td>
              <td className="border border-gray-300 px-3 py-2">Flexion anormale (flexion des membres)</td>
            </tr>
            <tr>
              <td className="border border-gray-300 px-3 py-2 text-center">4</td>
              <td className="border border-gray-300 px-3 py-2">Spontanée</td>
              <td className="border border-gray-300 px-3 py-2">Confuse</td>
              <td className="border border-gray-300 px-3 py-2">Retrait à la douleur</td>
            </tr>
            <tr>
              <td className="border border-gray-300 px-3 py-2 text-center">5</td>
              <td className="border border-gray-300 px-3 py-2 bg-gray-100"></td>
              <td className="border border-gray-300 px-3 py-2">Normale</td>
              <td className="border border-gray-300 px-3 py-2">Localise la douleur</td>
            </tr>
            <tr>
              <td className="border border-gray-300 px-3 py-2 text-center">6</td>
              <td className="border border-gray-300 px-3 py-2 bg-gray-100"></td>
              <td className="border border-gray-300 px-3 py-2 bg-gray-100"></td>
              <td className="border border-gray-300 px-3 py-2">Normale</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
