"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { GlasgowTableTraining } from './GlasgowTableTraining';
import { RealGlasgowTable } from './RealGlasgowTable';
import { MnemonicsCard } from './MnemonicsCard';

export function GlasgowTrainingSection() {
    const [showRealTable, setShowRealTable] = useState(false);

    return (
        <div className="space-y-6">
            {/* Bandeau d'information */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-md bg-yellow-100 px-2.5 py-1 text-xs font-medium text-yellow-800 border border-yellow-200">
                        Tableau mnémotechnique
                    </span>
                    <p className="text-sm text-gray-600">
                        Utilisez ce tableau pour mémoriser rapidement les libellés. Le tableau réel se trouve plus bas et peut être affiché/masqué.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={() => setShowRealTable((v) => !v)} variant={showRealTable ? 'secondary' : 'default'} aria-expanded={showRealTable} aria-controls="real-glasgow-table">
                        {showRealTable ? 'Masquer le tableau réel' : 'Voir le tableau réel'}
                    </Button>
                </div>
            </div>

            {/* 1) Tableau d'entraînement */}
            <GlasgowTableTraining />

            {/* 2) Carte mnémotechnique sous le tableau d'entraînement */}
            <MnemonicsCard />

            {/* 3) Tableau réel (masqué par défaut), placé en dessous */}
            <div id="real-glasgow-table" className={showRealTable ? 'block' : 'hidden'}>
                <RealGlasgowTable />
            </div>
        </div>
    );
}
