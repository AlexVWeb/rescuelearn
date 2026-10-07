"use client";

import React, { createContext, useContext } from "react";
import {
  buildPlayerModulesState,
  type PlayerModulesState,
} from "@/types/player-modules";

const PlayerModulesContext = createContext<PlayerModulesState>(
  buildPlayerModulesState([])
);

export function PlayerModulesProvider({
  modules,
  children,
}: {
  modules: PlayerModulesState;
  children: React.ReactNode;
}) {
  return (
    <PlayerModulesContext.Provider value={modules}>
      {children}
    </PlayerModulesContext.Provider>
  );
}

export function usePlayerModules(): PlayerModulesState {
  return useContext(PlayerModulesContext);
}
