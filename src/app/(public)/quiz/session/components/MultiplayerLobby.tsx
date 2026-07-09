"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check, Play, Users } from "lucide-react";

interface QuizSessionState {
  id: string;
  code: string;
  status: "LOBBY" | "IN_PROGRESS" | "FINISHED";
}

interface MultiplayerLobbyProps {
  session: QuizSessionState;
  isHost: boolean;
  participantId: string | null;
  nickname: string;
  participants: Array<{ id: string; nickname: string }>;
  copied: boolean;
  hostNicknameInput: string;
  setHostNicknameInput: (val: string) => void;
  handleHostRegisterToPlay: () => Promise<void>;
  handleStartQuiz: () => Promise<void>;
  copyLink: () => void;
}

export function MultiplayerLobby({
  session,
  isHost,
  participantId,
  nickname,
  participants,
  copied,
  hostNicknameInput,
  setHostNicknameInput,
  handleHostRegisterToPlay,
  handleStartQuiz,
  copyLink,
}: MultiplayerLobbyProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-1 gap-6 md:grid-cols-3"
    >
      {/* Session Info / Invitation card */}
      <div className="flex flex-col justify-between rounded-2xl border border-purple-100 bg-white p-6 shadow-md md:col-span-2">
        <div>
          <h2 className="mb-2 text-xl font-bold text-gray-800">
            En attente de joueurs...
          </h2>
          <p className="mb-6 text-sm text-gray-600">
            Invitez vos stagiaires ou vos collègues à rejoindre le salon en
            partageant le code ci-dessous.
          </p>

          <div className="mb-6 flex items-center justify-between rounded-xl border border-purple-200 bg-purple-50 p-4">
            <div>
              <span className="font-mono text-xs font-semibold tracking-wider text-purple-600 uppercase">
                Code du salon
              </span>
              <p className="font-mono text-3xl font-extrabold tracking-widest text-purple-800">
                {session.code}
              </p>
            </div>
            <button
              onClick={copyLink}
              className="flex items-center gap-2 rounded-lg border border-purple-200 bg-white px-4 py-3 text-sm font-bold text-purple-700 shadow-sm transition-all hover:bg-purple-100 active:scale-95"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {copied ? "Copié !" : "Copier le code"}
            </button>
          </div>
        </div>

        {isHost ? (
          <div className="space-y-4">
            {!participantId ? (
              <div className="rounded-xl border border-purple-200 bg-purple-50 p-4">
                <h3 className="mb-2 text-sm font-bold text-purple-900">
                  Voulez-vous aussi jouer ?
                </h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Votre pseudo pour jouer"
                    value={hostNicknameInput}
                    onChange={(e) => setHostNicknameInput(e.target.value)}
                    maxLength={20}
                    className="flex-grow rounded-lg border border-purple-200 px-3 py-2 text-sm text-gray-800 focus:border-purple-500 focus:outline-none"
                  />
                  <button
                    onClick={handleHostRegisterToPlay}
                    className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-purple-700"
                  >
                    Rejoindre
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-center text-sm font-semibold text-green-800">
                Vous participez aussi en tant que : {nickname} 🎮
              </div>
            )}
            <button
              onClick={handleStartQuiz}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 py-4 text-lg font-bold text-white shadow-md transition-colors hover:bg-purple-700"
            >
              <Play className="h-5 w-5" /> Démarrer la partie
            </button>
          </div>
        ) : (
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 text-center">
            <p className="animate-pulse font-medium text-gray-600">
              L'hôte va bientôt lancer la partie...
            </p>
          </div>
        )}
      </div>

      {/* Players List (Presence) */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-md">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-800">
          <Users className="h-5 w-5 text-blue-600" />
          Joueurs ({participants.length})
        </h3>
        <div className="max-h-[300px] space-y-2 overflow-y-auto">
          <AnimatePresence>
            {participants.map((player) => (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-2"
              >
                <span className="font-semibold text-gray-800">
                  {player.nickname}
                </span>
                <span className="h-2 w-2 rounded-full bg-green-500" />
              </motion.div>
            ))}
          </AnimatePresence>
          {participants.length === 0 && (
            <p className="py-8 text-center text-sm text-gray-600">
              Aucun joueur connecté pour le moment.
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
