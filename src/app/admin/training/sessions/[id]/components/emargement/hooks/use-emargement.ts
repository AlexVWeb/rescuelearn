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

    const channel = supabase
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

    return () => {
      supabase?.removeChannel(channel);
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
