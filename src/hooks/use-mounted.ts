import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * `false` pendant le rendu serveur et l'hydratation, `true` ensuite.
 * Remplace le pattern `useEffect(() => setMounted(true), [])` sans rendu en cascade.
 */
export function useMounted() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}
