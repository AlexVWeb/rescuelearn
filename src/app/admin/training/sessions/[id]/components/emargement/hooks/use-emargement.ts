"use client";
import { logger } from "@/lib/logger";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  updateEmargementStatus,
  generateSlotPin,
  generateSessionPin,
  bulkUpdateEmargementStatus,
} from "../../../../../actions";
import { Slot, EmargementStatus } from "../../../../../types";

interface UseEmargementOptions {
  sessionId: string;
  slots: Slot[];
}

export interface UseEmargementReturn {
  loading: boolean;
  isAutoRefresh: boolean;
  setIsAutoRefresh: (value: boolean) => void;
  handleStatusChange: (
    inscriptionId: string,
    slotId: string,
    status: EmargementStatus
  ) => Promise<void>;
  handleBulkStatusChange: (
    slotId: string,
    status: EmargementStatus
  ) => Promise<void>;
  handleGeneratePin: (slotId: string) => Promise<void>;
  handleGenerateSessionPin: () => Promise<void>;
}

type EmargementRealtimeRecord = { slotId: string };

export function useEmargement({
  sessionId,
  slots,
}: UseEmargementOptions): UseEmargementReturn {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const slotsRef = useRef(slots);

  useEffect(() => {
    slotsRef.current = slots;
  }, [slots]);

  useEffect(() => {
    if (!isAutoRefresh || !supabase) return;

    const client = supabase;
    let channel: ReturnType<typeof client.channel> | null = null;
    let refreshTimer: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    // Récupère un JWT Supabase (role=authenticated) frappé côté serveur pour
    // l'admin connecté, et l'applique au client Realtime. Sans ce token, la
    // RLS de "Emargement" refuse l'abonnement (deny-all pour anon).
    const fetchToken = async (): Promise<number | null> => {
      const res = await fetch("/api/realtime/token", { cache: "no-store" });
      if (!res.ok) {
        logger.error(`Token Realtime indisponible (HTTP ${res.status})`);
        return null;
      }
      const { token, expiresIn } = (await res.json()) as {
        token: string;
        expiresIn: number;
      };
      await client.realtime.setAuth(token);
      return expiresIn;
    };

    const start = async () => {
      const expiresIn = await fetchToken();
      if (cancelled || expiresIn == null) return;

      // Re-frappe le token avant expiration (refresh du JWT, pas des données).
      const refreshMs = Math.max((expiresIn - 300) * 1000, 60_000);
      refreshTimer = setInterval(() => {
        void fetchToken();
      }, refreshMs);

      channel = client
        .channel("emargement_changes")
        .on<EmargementRealtimeRecord>(
          "postgres_changes",
          { event: "*", schema: "public", table: "Emargement" },
          (payload) => {
            const currentSlots = slotsRef.current;
            const newSlotId = (payload.new as Partial<EmargementRealtimeRecord>)
              .slotId;
            const oldSlotId = (payload.old as Partial<EmargementRealtimeRecord>)
              .slotId;

            if (
              (newSlotId && currentSlots.some((s) => s.id === newSlotId)) ||
              (oldSlotId && currentSlots.some((s) => s.id === oldSlotId))
            ) {
              router.refresh();
            }
          }
        )
        .subscribe();
    };

    void start();

    return () => {
      cancelled = true;
      if (refreshTimer) clearInterval(refreshTimer);
      if (channel) client.removeChannel(channel);
    };
  }, [isAutoRefresh, router]);

  async function handleStatusChange(
    inscriptionId: string,
    slotId: string,
    status: EmargementStatus
  ) {
    setLoading(true);
    try {
      await updateEmargementStatus(inscriptionId, slotId, status);
      router.refresh();
    } catch (error) {
      logger.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function handleBulkStatusChange(
    slotId: string,
    status: EmargementStatus
  ) {
    const slot = slots.find((s) => s.id === slotId);
    if (!slot) return;

    const label = status === "validé" ? "Présent" : "Absent";
    if (
      !confirm(
        `Voulez-vous marquer tous les stagiaires comme "${label}" pour le créneau "${slot.label}" ?`
      )
    )
      return;

    setLoading(true);
    try {
      await bulkUpdateEmargementStatus(slotId, status);
      router.refresh();
    } catch (error) {
      logger.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function handleGeneratePin(slotId: string) {
    setLoading(true);
    try {
      await generateSlotPin(slotId);
      router.refresh();
    } catch (error) {
      logger.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateSessionPin() {
    if (
      !confirm(
        "Voulez-vous générer un code PIN unique pour TOUS les créneaux de cette formation ?"
      )
    )
      return;

    setLoading(true);
    try {
      await generateSessionPin(sessionId);
      router.refresh();
    } catch (error) {
      logger.error(error);
    } finally {
      setLoading(false);
    }
  }

  return {
    loading,
    isAutoRefresh,
    setIsAutoRefresh,
    handleStatusChange,
    handleBulkStatusChange,
    handleGeneratePin,
    handleGenerateSessionPin,
  };
}
