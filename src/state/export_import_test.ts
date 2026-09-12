import { assertEquals } from "@std/assert";
import { DEFAULT_SETTINGS } from "./store.ts";
import { GameEvent, SessionData } from "../types.ts";
import { GnosiaSolver } from "../solver/solver.ts";

Deno.test("SessionData - エクスポート＆インポートによる整合性の保持", () => {
  const events: GameEvent[] = [
    {
      id: "ev-1",
      day: 1,
      type: "CO",
      playerId: "player",
      claimedRole: "ENGINEER",
    },
    {
      id: "ev-2",
      day: 1,
      type: "INVESTIGATION",
      investigatorId: "player",
      targetId: "setsu",
      result: "HUMAN",
    },
  ];

  const session: SessionData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: DEFAULT_SETTINGS,
    events,
    currentDay: 1,
    perspective: { id: "player", name: "自分 (Player)", role: "ENGINEER" },
  };

  // シリアライズ＆デシリアライズ
  const json = JSON.stringify(session);
  const restored: SessionData = JSON.parse(json);

  assertEquals(restored.version, 1);
  assertEquals(restored.events.length, 2);
  assertEquals(restored.perspective.role, "ENGINEER");

  // 復元したデータでソルバーが正常に解けるか
  const solver = new GnosiaSolver(restored.settings, restored.events);
  const result = solver.solve({
    perspectivePlayerId: restored.perspective.id,
    perspectiveRole: restored.perspective.role,
  });

  assertEquals(result.hasContradiction, false);
  assertEquals(result.definiteRoles["player"], "ENGINEER");
});
