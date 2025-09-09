import React from 'react';

export function MnemonicsCard() {
    return (
        <div className="bg-white rounded-lg border p-5 space-y-4">
            <div>
                <h3 className="text-lg font-semibold text-gray-900">Mnémotechniques</h3>
                <p className="text-sm text-gray-600">Le tableau d&apos;entraînement est volontairement mnémotechnique pour faciliter la mémorisation. Référez-vous au tableau réel pour les libellés complets.</p>
            </div>

            <div className="space-y-3 text-gray-800 text-sm">
                <div>
                    <p className="font-medium">Structure générale</p>
                    <p>&quot;Y V M&quot; — Yeux (Oculaire), Voix (Verbale), Mouvement (Motrice)</p>
                    <p>&quot;4-5-6&quot; — Max par échelle (Y:4, V:5, M:6)</p>
                </div>

                <div>
                    <p className="font-medium">Oculaire (Y = 1-4) — &quot;ADAN&quot;</p>
                    <ul className="list-disc list-inside">
                        <li>Aucune (1)</li>
                        <li>Douleur (2)</li>
                        <li>Appel (3)</li>
                        <li>Normale (4)</li>
                    </ul>
                </div>

                <div>
                    <p className="font-medium">Verbale (V = 1-5) — &quot;ASMCN&quot;</p>
                    <ul className="list-disc list-inside">
                        <li>Aucune (1)</li>
                        <li>Sons (2)</li>
                        <li>Mots (3)</li>
                        <li>Confuse (4)</li>
                        <li>Normale (5)</li>
                    </ul>
                </div>

                <div>
                    <p className="font-medium">Motrice (M = 1-6) — &quot;AEFSFDN&quot;</p>
                    <ul className="list-disc list-inside">
                        <li>Aucune (1)</li>
                        <li>Extension (2)</li>
                        <li>Flexion stéréotypée (3)</li>
                        <li>Flexion simple (4)</li>
                        <li>Dirigée vers la douleur (5)</li>
                        <li>Normale (6)</li>
                    </ul>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                    <p className="text-blue-800 text-sm"><strong>Règle critique :</strong> &quot;8 ou moins = JAUNE&quot; — Score de Glasgow ≤ 8 = Victime inconsciente = BILAN JAUNE</p>
                    <p className="text-blue-800 text-sm mt-1"><strong>Phrase clé :</strong> &quot;Yeux Voix Mouvement, 4-5-6, en dessous de 8 c&apos;est jaune&quot;</p>
                </div>
            </div>
        </div>
    );
}
