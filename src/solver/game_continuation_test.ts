import { assertEquals } from "@std/assert";
import { GnosiaSolver } from "./solver.ts";
import { GameEvent, GameSettings } from "../types.ts";

const players = [
  { id: "setsu", name: "セツ" },
  { id: "gina", name: "ジナ" },
  { id: "sq", name: "SQ" },
  { id: "raqio", name: "ラキオ" },
  { id: "stella", name: "ステラ" },
];

const settingsWithGnosia = (gnosiaCount: number): GameSettings => ({
  players,
  roles: {
    gnosiaCount,
    hasEngineer: false,
    hasDoctor: false,
    hasGuardianAngel: false,
    hasGuardDuty: false,
    hasACFollower: false,
    hasBug: false,
  },
  allowHiddenRoles: false,
});

Deno.test("ゲーム継続条件 - グノーシア1人の村で冷凍後もゲームが続くなら、冷凍者はグノーシアではない", () => {
  const events: ReadonlyArray<GameEvent> = [
    { id: "1", day: 1, type: "VOTE", frozenPlayerId: "setsu" },
    { id: "2", day: 1, type: "DISAPPEARANCE", disappearedPlayerIds: ["gina"] },
  ];
  const result = new GnosiaSolver(settingsWithGnosia(1), events).solve();
  assertEquals(result.hasContradiction, false);
  assertEquals(result.gnosiaProbabilities["setsu"], 0);
});

Deno.test("ゲーム継続条件 - 最後のイベントの後はゲーム終了の可能性があるので制約しない", () => {
  const events: ReadonlyArray<GameEvent> = [
    { id: "1", day: 1, type: "VOTE", frozenPlayerId: "setsu" },
  ];
  const result = new GnosiaSolver(settingsWithGnosia(1), events).solve();
  assertEquals(result.hasContradiction, false);
  assertEquals(result.gnosiaProbabilities["setsu"], 0.2);
});

Deno.test("ゲーム継続条件 - グノーシアが生存者の半数以上になる世界は除外される", () => {
  // 5人中グノーシア2人。セツ冷凍 → ジナ襲撃 → 生存3人で翌日も続く
  // セツが人間なら生存3人中グノーシア2人となりゲーム終了のはずなので、セツはグノーシア確定
  const events: ReadonlyArray<GameEvent> = [
    { id: "1", day: 1, type: "VOTE", frozenPlayerId: "setsu" },
    { id: "2", day: 1, type: "DISAPPEARANCE", disappearedPlayerIds: ["gina"] },
    { id: "3", day: 2, type: "VOTE", frozenPlayerId: "sq" },
  ];
  const result = new GnosiaSolver(settingsWithGnosia(2), events).solve();
  assertEquals(result.hasContradiction, false);
  assertEquals(result.gnosiaProbabilities["setsu"], 1);
});
