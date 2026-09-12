import { assertEquals } from "@std/assert";
import { GnosiaSolver } from "./solver.ts";
import { GameSettings, GameEvent } from "../types.ts";

Deno.test("NO_ATTACK - 守護天使の護衛成功による非グノーシア確定と破綻検知", () => {
  const settings: GameSettings = {
    players: [
      { id: "player", name: "自分" },
      { id: "setsu", name: "セツ" },
      { id: "gina", name: "ジナ" },
      { id: "sq", name: "SQ" },
      { id: "raqio", name: "ラキオ" },
    ],
    roles: {
      gnosiaCount: 1,
      hasEngineer: false,
      hasDoctor: false,
      hasGuardianAngel: true, // 守護天使あり
      hasGuardDuty: false,
      hasACFollower: false,
      hasBug: false,
    },
    allowHiddenRoles: false,
  };

  // 夜間に襲撃なしが発生し、ジナが護衛されていた
  const events: GameEvent[] = [
    {
      id: "1",
      day: 1,
      type: "NO_ATTACK",
      guardedPlayerId: "gina",
      note: "ジナ護衛成功",
    },
  ];

  const solver = new GnosiaSolver(settings, events);
  const result = solver.solve();

  assertEquals(result.hasContradiction, false);
  // ジナは護衛された（襲撃対象だった）ためグノーシア確率 0%
  assertEquals(result.gnosiaProbabilities["gina"], 0);

  // もし守護天使もバグもいない設定で NO_ATTACK が起きたら矛盾（破綻）
  const noAngelSettings: GameSettings = {
    ...settings,
    roles: {
      ...settings.roles,
      hasGuardianAngel: false,
      hasBug: false,
    },
  };

  const invalidSolver = new GnosiaSolver(noAngelSettings, events);
  const invalidResult = invalidSolver.solve();
  assertEquals(invalidResult.hasContradiction, true);
});
