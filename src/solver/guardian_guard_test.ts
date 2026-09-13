import { assertEquals } from "@std/assert";
import { GnosiaSolver } from "./solver.ts";
import { GameEvent, GameSettings } from "../types.ts";

Deno.test("GUARDIAN_GUARD - 自分が守護天使で護衛成功（犠牲者ゼロ）により非グノーシア確定", () => {
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
      hasGuardianAngel: true,
      hasGuardDuty: false,
      hasACFollower: false,
      hasBug: false, // バグなし
    },
    allowHiddenRoles: false,
  };

  const events: ReadonlyArray<GameEvent> = [
    {
      id: "1",
      day: 1,
      type: "VOTE",
      frozenPlayerId: "setsu",
    },
    {
      id: "2",
      day: 1,
      type: "GUARDIAN_GUARD",
      targetId: "gina",
    },
    {
      id: "3",
      day: 1,
      type: "DISAPPEARANCE",
      disappearedPlayerIds: [], // 平和（犠牲者ゼロ）
    },
  ];

  const solver = new GnosiaSolver(settings, events);
  const result = solver.solve({
    perspectivePlayerId: "player",
    perspectiveRole: "GUARDIAN_ANGEL",
  });

  assertEquals(result.hasContradiction, false);
  assertEquals(result.definiteRoles["player"], "GUARDIAN_ANGEL");
  // バグ不在かつ平和になったため、ジナの護衛成功（襲撃対象だった）が確定 -> グノーシア確率0%
  assertEquals(result.gnosiaProbabilities["gina"], 0);
  assertEquals(result.roleProbabilities["gina"]?.["GNOSIA"], 0);
});

Deno.test("GUARDIAN_GUARD - 護衛対象がその夜に消滅（バグ蒸発でもない）した場合は破綻を検知", () => {
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
      hasGuardianAngel: true,
      hasGuardDuty: false,
      hasACFollower: false,
      hasBug: false,
    },
    allowHiddenRoles: false,
  };

  const events: ReadonlyArray<GameEvent> = [
    {
      id: "1",
      day: 1,
      type: "VOTE",
      frozenPlayerId: "setsu",
    },
    {
      id: "2",
      day: 1,
      type: "GUARDIAN_GUARD",
      targetId: "gina",
    },
    {
      id: "3",
      day: 1,
      type: "DISAPPEARANCE",
      disappearedPlayerIds: ["gina"], // 護衛されたはずのジナが消滅
    },
  ];

  const solver = new GnosiaSolver(settings, events);
  const result = solver.solve({
    perspectivePlayerId: "player",
    perspectiveRole: "GUARDIAN_ANGEL",
  });

  // 守護天使の護衛対象が襲撃で消滅することはあり得ないため矛盾
  assertEquals(result.hasContradiction, true);
});

Deno.test("GUARDIAN_GUARD - 自分自身を守ろうとした場合は破綻を検知", () => {
  const settings: GameSettings = {
    players: [
      { id: "player", name: "自分" },
      { id: "setsu", name: "セツ" },
      { id: "gina", name: "ジナ" },
    ],
    roles: {
      gnosiaCount: 1,
      hasEngineer: false,
      hasDoctor: false,
      hasGuardianAngel: true,
      hasGuardDuty: false,
      hasACFollower: false,
      hasBug: false,
    },
    allowHiddenRoles: false,
  };

  const events: ReadonlyArray<GameEvent> = [
    {
      id: "1",
      day: 1,
      type: "GUARDIAN_GUARD",
      targetId: "player", // 自分自身を護衛
    },
  ];

  const solver = new GnosiaSolver(settings, events);
  const result = solver.solve();

  assertEquals(result.hasContradiction, true);
});

Deno.test("GUARDIAN_GUARD - 守護天使が存在しない設定で護衛イベントがある場合は破綻を検知", () => {
  const settings: GameSettings = {
    players: [
      { id: "player", name: "自分" },
      { id: "setsu", name: "セツ" },
      { id: "gina", name: "ジナ" },
    ],
    roles: {
      gnosiaCount: 1,
      hasEngineer: false,
      hasDoctor: false,
      hasGuardianAngel: false, // 守護天使なし
      hasGuardDuty: false,
      hasACFollower: false,
      hasBug: false,
    },
    allowHiddenRoles: false,
  };

  const events: ReadonlyArray<GameEvent> = [
    {
      id: "1",
      day: 1,
      type: "GUARDIAN_GUARD",
      targetId: "gina",
    },
  ];

  const solver = new GnosiaSolver(settings, events);
  const result = solver.solve();

  assertEquals(result.hasContradiction, true);
});

Deno.test("GUARDIAN_GUARD - 複数夜にわたる護衛（プレイヤーズ）の記録と推論", () => {
  const settings: GameSettings = {
    players: [
      { id: "player", name: "自分" },
      { id: "setsu", name: "セツ" },
      { id: "gina", name: "ジナ" },
      { id: "sq", name: "SQ" },
      { id: "raqio", name: "ラキオ" },
      { id: "stella", name: "ステラ" },
    ],
    roles: {
      gnosiaCount: 1,
      hasEngineer: false,
      hasDoctor: true,
      hasGuardianAngel: true,
      hasGuardDuty: false,
      hasACFollower: false,
      hasBug: false,
    },
    allowHiddenRoles: false,
  };

  // Day 1: ジナがドクターCO。セツ冷凍。ジナ護衛 -> 平和 (ジナ白確定、真ドクター確定)
  // Day 2: ジナが「セツは人間」と報告。ラキオ冷凍。SQ護衛 -> ステラ消滅
  // Day 3: ジナが「ラキオは人間」と報告。
  const events: ReadonlyArray<GameEvent> = [
    { id: "1", day: 1, type: "CO", playerId: "gina", claimedRole: "DOCTOR" },
    { id: "2", day: 1, type: "VOTE", frozenPlayerId: "setsu" },
    { id: "3", day: 1, type: "GUARDIAN_GUARD", targetId: "gina" },
    { id: "4", day: 1, type: "DISAPPEARANCE", disappearedPlayerIds: [] },
    {
      id: "5",
      day: 2,
      type: "DOCTOR_REPORT",
      reporterId: "gina",
      targetId: "setsu",
      result: "HUMAN",
    },
    { id: "6", day: 2, type: "VOTE", frozenPlayerId: "raqio" },
    { id: "7", day: 2, type: "GUARDIAN_GUARD", targetId: "sq" },
    {
      id: "8",
      day: 2,
      type: "DISAPPEARANCE",
      disappearedPlayerIds: ["stella"],
    },
    {
      id: "9",
      day: 3,
      type: "DOCTOR_REPORT",
      reporterId: "gina",
      targetId: "raqio",
      result: "HUMAN",
    },
  ];

  const solver = new GnosiaSolver(settings, events);
  const result = solver.solve({
    perspectivePlayerId: "player",
    perspectiveRole: "GUARDIAN_ANGEL",
  });

  assertEquals(result.hasContradiction, false);
  assertEquals(result.definiteRoles["player"], "GUARDIAN_ANGEL");
  // ジナはDay 1の護衛成功により真ドクター確定
  assertEquals(result.definiteRoles["gina"], "DOCTOR");
  // ステラは消滅したためグノーシア確率0%
  assertEquals(result.gnosiaProbabilities["stella"], 0);
  // セツ・ラキオはドクター判定で人間、ジナは真ドクター、自分は守護天使、ステラは消滅 -> 残るSQがグノーシア100%確定
  assertEquals(result.gnosiaProbabilities["sq"], 1.0);
  assertEquals(result.definiteRoles["sq"], "GNOSIA");
});
