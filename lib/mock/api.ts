import { sleep } from "@/lib/utils";

/**
 * Simulated network call. Every mutation in the prototype goes through this
 * so loading states are realistic; swapping to the real backend later means
 * replacing these calls with fetch/RTK Query without touching the UI.
 */
export async function mock<T>(fn: () => T, ms = 650): Promise<T> {
  await sleep(ms);
  return fn();
}
