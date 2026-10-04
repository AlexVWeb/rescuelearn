import { isFeatureEnabled, FeatureKey } from "@/lib/features";
import LoginClientPage from "./client-page";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const playerEnabled = await isFeatureEnabled(FeatureKey.PLAYER_SYSTEM);
  return <LoginClientPage playerEnabled={playerEnabled} />;
}
