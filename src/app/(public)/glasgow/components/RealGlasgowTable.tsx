import React from "react";

export function RealGlasgowTable() {
  return (
    <div className="w-full">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
          Tableau de référence officiel
        </h3>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Libellés complets de l&apos;échelle de Glasgow (GCS) enseignés en
          secourisme.
        </p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
              <th className="w-16 px-3 py-2.5 text-center font-semibold text-gray-700 dark:text-gray-300">
                Score
              </th>
              <th className="px-3 py-2.5 font-semibold text-gray-700 dark:text-gray-300">
                Y : Ouverture des yeux
              </th>
              <th className="px-3 py-2.5 font-semibold text-gray-700 dark:text-gray-300">
                V : Réponse verbale
              </th>
              <th className="px-3 py-2.5 font-semibold text-gray-700 dark:text-gray-300">
                M : Réponse motrice
              </th>
            </tr>
          </thead>
          <tbody className="text-gray-650 divide-y divide-gray-100 text-xs dark:divide-gray-800 dark:text-gray-400">
            <tr>
              <td className="bg-gray-50/50 px-3 py-2.5 text-center font-bold text-gray-900 dark:bg-gray-900/50 dark:text-white">
                1
              </td>
              <td className="px-3 py-2.5">Aucune</td>
              <td className="px-3 py-2.5">Aucune</td>
              <td className="px-3 py-2.5">Aucune</td>
            </tr>
            <tr>
              <td className="bg-gray-50/50 px-3 py-2.5 text-center font-bold text-gray-900 dark:bg-gray-900/50 dark:text-white">
                2
              </td>
              <td className="px-3 py-2.5">À la douleur</td>
              <td className="px-3 py-2.5">Sons incompréhensibles</td>
              <td className="px-3 py-2.5">
                Extension anormale (décérébration)
              </td>
            </tr>
            <tr>
              <td className="bg-gray-50/50 px-3 py-2.5 text-center font-bold text-gray-900 dark:bg-gray-900/50 dark:text-white">
                3
              </td>
              <td className="px-3 py-2.5">À la demande</td>
              <td className="px-3 py-2.5">Paroles inappropriées</td>
              <td className="px-3 py-2.5">Flexion anormale (décortication)</td>
            </tr>
            <tr>
              <td className="bg-gray-50/50 px-3 py-2.5 text-center font-bold text-gray-900 dark:bg-gray-900/50 dark:text-white">
                4
              </td>
              <td className="px-3 py-2.5">Spontanée</td>
              <td className="px-3 py-2.5">Confuse</td>
              <td className="px-3 py-2.5">Évitement / Retrait à la douleur</td>
            </tr>
            <tr>
              <td className="bg-gray-50/50 px-3 py-2.5 text-center font-bold text-gray-900 dark:bg-gray-900/50 dark:text-white">
                5
              </td>
              <td className="bg-gray-50/30 px-3 py-2.5 dark:bg-gray-950/20"></td>
              <td className="px-3 py-2.5 font-medium text-gray-900 dark:text-white">
                Orientée
              </td>
              <td className="px-3 py-2.5">Localise la douleur</td>
            </tr>
            <tr>
              <td className="bg-gray-50/50 px-3 py-2.5 text-center font-bold text-gray-900 dark:bg-gray-900/50 dark:text-white">
                6
              </td>
              <td className="bg-gray-50/30 px-3 py-2.5 dark:bg-gray-950/20"></td>
              <td className="bg-gray-50/30 px-3 py-2.5 dark:bg-gray-950/20"></td>
              <td className="px-3 py-2.5 font-medium text-gray-900 dark:text-white">
                À l&apos;ordre (obéit)
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
