import { assertEquals } from "@std/assert";
import { GnosiaSolver } from "./solver.ts";
import { explainConclusion, getConclusion } from "./explain.ts";
import { GameEvent, GameSettings } from "../types.ts";

const settings: GameSettings = {
  players: [
    { id: "setsu", name: "セツ" },
    { id: "gina", name: "ジナ" },
    { id: "sq", name: "SQ" },
    { id: "raqio", name: "ラキオ" },
    { id: "stella", name: "ステラ" },
  ],
  roles: {
    gnosiaCount: 1,
    hasEngineer: false,
    hasDoctor: false,
    hasGuardianAngel: false,
    hasGuardDuty: false,
    hasACFollower: false,
    hasBug: false,
  },
  allowHiddenRoles: false,
};

Deno.test("確定理由 - 結論を崩すイベントだけが根拠として返る", () => {
  const events: ReadonlyArray<GameEvent> = [
    {
      id: "lie",
      day: 1,
      type: "DEFINITE_LIE",
      targetId: "gina",
      witnessId: "player",
    },
    { id: "vote", day: 1, type: "VOTE", frozenPlayerId: "sq" },
  ];
  const result = new GnosiaSolver(settings, events).solve();
  const conclusion = getConclusion(result, "gina");
  assertEquals(conclusion, { kind: "ROLE", role: "GNOSIA" });
  if (!conclusion) return;
  const reasons = explainConclusion(settings, events, {}, "gina", conclusion);
  assertEquals(reasons.map((ev) => ev.id), ["lie"]);
});

Deno.test("確定理由 - 何も確定していなければ結論なし", () => {
  const result = new GnosiaSolver(settings, []).solve();
  assertEquals(getConclusion(result, "gina"), undefined);
});
