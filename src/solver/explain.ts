import { GameEvent, GameSettings, Role, SolverResult } from "../types.ts";
import { GnosiaSolver, SolverOptions } from "./solver.ts";

/**
 * あるプレイヤーについて確定している結論
 * - ROLE: 役職が確定
 * - ENEMY: 役職は未確定だが敵陣営 (グノーシア・AC主義者・バグ) が確定
 * - NOT_ENEMY: 役職は未確定だが人間陣営が確定
 */
export type Conclusion =
  | { readonly kind: "ROLE"; readonly role: Role }
  | { readonly kind: "ENEMY" }
  | { readonly kind: "NOT_ENEMY" };

const EPSILON = 1e-9;

/** ソルバー結果からプレイヤーの確定結論を取り出す。何も確定していなければ undefined */
export function getConclusion(
  result: SolverResult,
  playerId: string,
): Conclusion | undefined {
  if (result.hasContradiction || result.totalPossibleWorlds === 0) {
    return undefined;
  }
  const roleProbs = result.roleProbabilities[playerId];
  if (roleProbs) {
    for (const [role, prob] of Object.entries(roleProbs)) {
      if (prob >= 1 - EPSILON) return { kind: "ROLE", role: role as Role };
    }
  }
  const enemy = result.enemyProbabilities[playerId];
  if (enemy === undefined) return undefined;
  if (enemy >= 1 - EPSILON) return { kind: "ENEMY" };
  if (enemy <= EPSILON) return { kind: "NOT_ENEMY" };
  return undefined;
}

function holds(
  result: SolverResult,
  playerId: string,
  conclusion: Conclusion,
): boolean {
  if (result.hasContradiction || result.totalPossibleWorlds === 0) {
    return false;
  }
  switch (conclusion.kind) {
    case "ROLE":
      return (result.roleProbabilities[playerId]?.[conclusion.role] ?? 0) >=
        1 - EPSILON;
    case "ENEMY":
      return (result.enemyProbabilities[playerId] ?? 0) >= 1 - EPSILON;
    case "NOT_ENEMY":
      return (result.enemyProbabilities[playerId] ?? 1) <= EPSILON;
  }
}

/**
 * eventIndex 番目のイベントが結論の根拠かどうか。
 * そのイベントを取り除いて解き直したときに結論が崩れるなら根拠とみなす。
 * (取り除くと破綻する場合は判断できないため根拠とはみなさない)
 */
export function isReasonEvent(
  settings: GameSettings,
  events: ReadonlyArray<GameEvent>,
  options: SolverOptions,
  playerId: string,
  conclusion: Conclusion,
  eventIndex: number,
): boolean {
  const without = events.filter((_, i) => i !== eventIndex);
  const result = new GnosiaSolver(settings, without).solve(options);
  if (result.hasContradiction || result.totalPossibleWorlds === 0) {
    return false;
  }
  return !holds(result, playerId, conclusion);
}

/** 結論の根拠となるイベントの一覧を返す (同期版。UI では isReasonEvent を分割実行する) */
export function explainConclusion(
  settings: GameSettings,
  events: ReadonlyArray<GameEvent>,
  options: SolverOptions,
  playerId: string,
  conclusion: Conclusion,
): ReadonlyArray<GameEvent> {
  return events.filter((_, i) =>
    isReasonEvent(settings, events, options, playerId, conclusion, i)
  );
}
