import { assertEquals } from "@std/assert";
import { DEFAULT_SETTINGS, recalculateDays } from "./store.ts";
import { GameEvent, SessionData } from "../types.ts";
import { GnosiaSolver } from "../solver/solver.ts";

Deno.test("SessionData - エクスポート＆インポートによる整合性の保持", () => {
  const events: ReadonlyArray<GameEvent> = [
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
    gnosiaComrades: ["setsu"],
  };

  // シリアライズ＆デシリアライズ
  const json = JSON.stringify(session);
  const restored: SessionData = JSON.parse(json);

  assertEquals(restored.version, 1);
  assertEquals(restored.events.length, 2);
  assertEquals(restored.perspective.role, "ENGINEER");
  assertEquals(restored.gnosiaComrades, ["setsu"]);

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
  const events: ReadonlyArray<GameEvent> = [
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
    e.id === "ev-2" ? { ...e, result: "GNOSIA" as const } : e
  );

  const solver2 = new GnosiaSolver(DEFAULT_SETTINGS, updatedEvents);
  const res2 = solver2.solve();
  assertEquals(res2.hasContradiction, false);

  const targetEvent = updatedEvents[1];
  if (targetEvent && targetEvent.type === "INVESTIGATION") {
    assertEquals(targetEvent.result, "GNOSIA");
  }
});

Deno.test("Event Order & recalculateDays - 並び順からのDay自動計算と並び替え", () => {
  const initialEvents: ReadonlyArray<GameEvent> = [
    {
      id: "1",
      day: 0,
      type: "CO",
      playerId: "player",
      claimedRole: "ENGINEER",
    },
    { id: "2", day: 0, type: "VOTE", frozenPlayerId: "raqio" },
    { id: "3", day: 0, type: "ATTACK", attackedPlayerId: "gina" },
    {
      id: "4",
      day: 0,
      type: "INVESTIGATION",
      investigatorId: "player",
      targetId: "shigemichi",
      result: "HUMAN",
    },
  ];

  const calculated = recalculateDays(initialEvents);
  // 1 (CO) -> Day 1
  assertEquals(calculated[0]?.day, 1);
  // 2 (VOTE) -> Day 1
  assertEquals(calculated[1]?.day, 1);
  // 3 (ATTACK) -> Day 1 (夜の襲撃)
  assertEquals(calculated[2]?.day, 1);
  // 4 (INVESTIGATION after ATTACK) -> Day 2!
  assertEquals(calculated[3]?.day, 2);

  // イベント4 (INVESTIGATION) を イベント3 (ATTACK) の前（昼間）へ移動
  const e0 = calculated[0];
  const e1 = calculated[1];
  const e2 = calculated[2];
  const e3 = calculated[3];
  if (!e0 || !e1 || !e2 || !e3) throw new Error("unreachable");
  const reordered: ReadonlyArray<GameEvent> = [e0, e1, e3, e2];
  const reCalculated = recalculateDays(reordered);
  // 移動後は ATTACK の前なので Day 1 になる
  assertEquals(reCalculated[2]?.id, "4");
  assertEquals(reCalculated[2]?.day, 1);
  // ATTACK も Day 1
  assertEquals(reCalculated[3]?.id, "3");
  assertEquals(reCalculated[3]?.day, 1);

  // DISAPPEARANCE（消滅もしくは平和）でも翌日に進むこと
  const disEvents: ReadonlyArray<GameEvent> = [
    {
      id: "1",
      day: 0,
      type: "CO",
      playerId: "player",
      claimedRole: "ENGINEER",
    },
    { id: "2", day: 0, type: "VOTE", frozenPlayerId: "stella" },
    {
      id: "3",
      day: 0,
      type: "DISAPPEARANCE",
      disappearedPlayerIds: ["remnan"],
    },
    {
      id: "4",
      day: 0,
      type: "INVESTIGATION",
      investigatorId: "player",
      targetId: "setsu",
      result: "HUMAN",
    },
  ];
  const disCalculated = recalculateDays(disEvents);
  assertEquals(disCalculated[2]?.day, 1);
  assertEquals(disCalculated[3]?.day, 2);
});

Deno.test("SessionData - 仲間グノーシア視点でインポートされた場合でも自分がグノーシア100%になること", () => {
  const session: SessionData = {
    version: 1,
    exportedAt: "2026-09-13T02:14:54.189Z",
    settings: {
      players: [
        { id: "player", name: "自分 (Player)" },
        { id: "setsu", name: "セツ" },
        { id: "gina", name: "ジナ" },
        { id: "sq", name: "SQ" },
        { id: "raqio", name: "ラキオ" },
        { id: "stella", name: "ステラ" },
        { id: "shigemichi", name: "しげみち" },
        { id: "chipie", name: "シピ" },
        { id: "comet", name: "コメット" },
        { id: "jonas", name: "ジョナス" },
        { id: "kukrushka", name: "ククルシカ" },
        { id: "otome", name: "オトメ" },
        { id: "remnan", name: "レムナン" },
        { id: "sha_ming", name: "沙明" },
        { id: "yuriko", name: "夕里子" },
      ],
      roles: {
        gnosiaCount: 3,
        hasEngineer: true,
        hasDoctor: true,
        hasGuardianAngel: true,
        hasGuardDuty: true,
        hasACFollower: true,
        hasBug: true,
      },
      allowHiddenRoles: false,
    },
    events: [
      {
        type: "CO",
        playerId: "gina",
        claimedRole: "ENGINEER",
        id: "9f4ce97b-4c06-49b6-a696-79a135739d9d",
        day: 1,
      },
      {
        type: "CO",
        playerId: "stella",
        claimedRole: "ENGINEER",
        id: "1296428b-5fbc-4c20-8d08-7ca8b3852437",
        day: 1,
      },
      {
        type: "CO",
        playerId: "shigemichi",
        partnerPlayerId: "chipie",
        claimedRole: "GUARD_DUTY",
        id: "5638fb78-a00d-4156-bdb9-4e8e874453d9",
        day: 1,
      },
      {
        type: "CO",
        playerId: "player",
        claimedRole: "DOCTOR",
        id: "efffae34-fec8-4903-bd65-fa70277645a3",
        day: 1,
      },
      {
        type: "CO",
        playerId: "kukrushka",
        claimedRole: "DOCTOR",
        id: "b8638ebe-9d82-4720-bd8d-e44273745ec5",
        day: 1,
      },
      {
        type: "VOTE",
        frozenPlayerId: "raqio",
        id: "a6ce6379-5a23-402d-b5c2-13a99ee3c25a",
        day: 1,
      },
    ],
    currentDay: 1,
    perspective: {
      id: "remnan",
      name: "レムナン",
    },
    myRole: "GNOSIA",
    perspectiveRoles: {
      player: "GNOSIA",
    },
    gnosiaComrades: ["remnan", "jonas"],
  };

  // store内のsolverResultと同じ推論ロジックの検証
  const isPlayerGnosia = session.myRole === "GNOSIA" ||
    session.perspectiveRoles?.["player"] === "GNOSIA";
  const gnosiaTeam: ReadonlyArray<string> = isPlayerGnosia
    ? ["player", ...(session.gnosiaComrades || [])]
    : [];

  const isPerspectiveInGnosiaTeam = session.perspective.id !== "objective" &&
    gnosiaTeam.includes(session.perspective.id);

  const effectivePerspectiveRole = session.perspective.role ||
    (isPerspectiveInGnosiaTeam ? "GNOSIA" : undefined);

  const effectiveComrades = isPerspectiveInGnosiaTeam
    ? gnosiaTeam.filter((id) => id !== session.perspective.id)
    : undefined;

  const solver = new GnosiaSolver(session.settings, session.events);
  const result = solver.solve({
    perspectivePlayerId: session.perspective.id,
    perspectiveRole: effectivePerspectiveRole,
    gnosiaComrades: effectiveComrades,
  });

  assertEquals(result.hasContradiction, false);
  assertEquals(result.definiteRoles["player"], "GNOSIA");
  assertEquals(result.gnosiaProbabilities["player"], 1.0);
  assertEquals(result.definiteRoles["remnan"], "GNOSIA");
  assertEquals(result.gnosiaProbabilities["remnan"], 1.0);
  assertEquals(result.definiteRoles["jonas"], "GNOSIA");
  assertEquals(result.gnosiaProbabilities["jonas"], 1.0);
});

Deno.test("SessionData - 守護天使視点でのセッション保持と護衛イベントの整合性", () => {
  const events: ReadonlyArray<GameEvent> = [
    { id: "1", day: 1, type: "VOTE", frozenPlayerId: "setsu" },
    { id: "2", day: 1, type: "GUARDIAN_GUARD", targetId: "gina" },
    {
      id: "3",
      day: 1,
      type: "DISAPPEARANCE",
      disappearedPlayerIds: [],
      guardedPlayerId: "gina",
    },
  ];

  const session: SessionData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: {
      ...DEFAULT_SETTINGS,
      roles: {
        ...DEFAULT_SETTINGS.roles,
        hasBug: false,
      },
    },
    events,
    currentDay: 2,
    perspective: { id: "player", name: "自分 (Player)", role: "GUARDIAN_ANGEL" },
    myRole: "GUARDIAN_ANGEL",
  };

  const json = JSON.stringify(session);
  const restored: SessionData = JSON.parse(json);

  assertEquals(restored.events.length, 3);
  assertEquals(restored.events[1]?.type, "GUARDIAN_GUARD");
  assertEquals(restored.myRole, "GUARDIAN_ANGEL");

  const solver = new GnosiaSolver(restored.settings, restored.events);
  const result = solver.solve({
    perspectivePlayerId: restored.perspective.id,
    perspectiveRole: restored.perspective.role,
  });

  assertEquals(result.hasContradiction, false);
  assertEquals(result.definiteRoles["player"], "GUARDIAN_ANGEL");
  // 護衛成功によりジナのグノーシア確率0%
  assertEquals(result.gnosiaProbabilities["gina"], 0);
});

