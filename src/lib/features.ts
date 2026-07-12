import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";
import { FeatureKey, ALL_FEATURES } from "@/types/features";
export { FeatureKey, ALL_FEATURES };

export async function getFeaturesState(): Promise<Record<FeatureKey, boolean>> {
  const getCachedFeatures = unstable_cache(
    async () => {
      const settings = await prisma.systemSetting.findMany();
      const state: Record<FeatureKey, boolean> = {
        [FeatureKey.PLAYER_SYSTEM]: true,
        [FeatureKey.DUOLINGO_SYSTEM]: true,
        [FeatureKey.GLASGOW_SYSTEM]: true,
        [FeatureKey.SNV_SYSTEM]: true,
        [FeatureKey.QUIZ_SYSTEM]: true,
      };

      settings.forEach((s) => {
        if (s.key in state) {
          state[s.key as FeatureKey] = s.value === "true";
        }
      });

      return state;
    },
    ["system-features"],
    {
      tags: ["system-features"],
      revalidate: 60,
    }
  );

  return getCachedFeatures();
}

export async function isFeatureEnabled(key: FeatureKey): Promise<boolean> {
  const state = await getFeaturesState();
  return state[key] ?? true;
}
