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

Deno.test("Event Update - イベントの編集とソルバー再計算", () => {
  const events: GameEvent[] = [
    {
      id: "ev-1",
      day: 1,
      type: "CO",
      playerId: "sha_ming",
      claimedRole: "ENGINEER",
    },
    {
      id: "ev-2",
      day: 1,
      type: "INVESTIGATION",
      investigatorId: "sha_ming",
      targetId: "shigemichi",
      result: "HUMAN",
    },
  ];

  // 編集前
  const solver1 = new GnosiaSolver(DEFAULT_SETTINGS, events);
  const res1 = solver1.solve();
  assertEquals(res1.hasContradiction, false);

  // イベント編集 (沙明の調査結果を HUMAN -> GNOSIA に変更)
  const updatedEvents = events.map((e) =>
    e.id === "ev-2"
      ? { ...e, result: "GNOSIA" as const }
      : e
  );

  const solver2 = new GnosiaSolver(DEFAULT_SETTINGS, updatedEvents);
  const res2 = solver2.solve();
  assertEquals(res2.hasContradiction, false);

  const targetEvent = updatedEvents[1];
  if (targetEvent.type === "INVESTIGATION") {
    assertEquals(targetEvent.result, "GNOSIA");
  }
});

