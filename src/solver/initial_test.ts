import { assertEquals } from "@std/assert";
import { GnosiaSolver } from "./solver.ts";
import { DEFAULT_SETTINGS } from "../state/store.ts";

Deno.test("GnosiaSolver - 15人初期状態（イベント0件）で破綻しないか検証", () => {
  const solver = new GnosiaSolver(DEFAULT_SETTINGS, []);
  const startTime = performance.now();
  const result = solver.solve();
  const duration = performance.now() - startTime;
  console.log(
    `Execution time: ${duration}ms, worlds: ${result.totalPossibleWorlds}, contradiction: ${result.hasContradiction}`,
  );
  assertEquals(result.hasContradiction, false);
});
