import { assertEquals } from "@std/assert";
import { GnosiaSolver } from "./solver.ts";
import { GameSettings, GameEvent } from "../types.ts";

Deno.test("GnosiaSolver - 基本的な探索と確率計算", () => {
  const settings: GameSettings = {
    players: [
      { id: "p1", name: "プレイヤー" },
      { id: "p2", name: "セツ" },
      { id: "p3", name: "ジーナ" },
      { id: "p4", name: "SQ" },
      { id: "p5", name: "ラキオ" },
    ],
    roles: {
      gnosiaCount: 1,
      hasEngineer: true,
      hasDoctor: false,
      hasGuardianAngel: false,
      hasGuardDuty: false,
      hasACFollower: false,
      hasBug: false,
    },
    allowHiddenRoles: false,
  };

  const events: GameEvent[] = [];
  const solver = new GnosiaSolver(settings, events);
  const result = solver.solve();

  assertEquals(result.hasContradiction, false);
  // 5人、グノーシア1、エンジニア1、乗員3
  // 5 * 4 = 20通り
  assertEquals(result.totalPossibleWorlds, 20);
  assertEquals(result.gnosiaProbabilities["p1"], 0.2);
});

Deno.test("GnosiaSolver - エンジニアCOと調査結果、襲撃による確率変動", () => {
  const settings: GameSettings = {
    players: [
      { id: "p1", name: "自分" },
      { id: "p2", name: "セツ" },
      { id: "p3", name: "ジーナ" },
      { id: "p4", name: "SQ" },
      { id: "p5", name: "ラキオ" },
    ],
    roles: {
      gnosiaCount: 1,
      hasEngineer: true,
      hasDoctor: false,
      hasGuardianAngel: false,
      hasGuardDuty: false,
      hasACFollower: true,
      hasBug: false,
    },
    allowHiddenRoles: false,
  };


  const events: GameEvent[] = [
    // p2 (セツ) と p4 (SQ) がエンジニアCO
    { id: "1", day: 1, type: "CO", playerId: "p2", claimedRole: "ENGINEER" },
    { id: "2", day: 1, type: "CO", playerId: "p4", claimedRole: "ENGINEER" },
    // p2 (セツ) が p5 (ラキオ) を調査してグノーシア判定
    {
      id: "3",
      day: 1,
      type: "INVESTIGATION",
      investigatorId: "p2",
      targetId: "p5",
      result: "GNOSIA",
    },
    // p3 (ジーナ) が夜に襲撃された
    { id: "4", day: 1, type: "ATTACK", attackedPlayerId: "p3" },
  ];

  const solver = new GnosiaSolver(settings, events);
  const result = solver.solve();

  assertEquals(result.hasContradiction, false);
  // ジーナは襲撃されたのでグノーシア確率 0
  assertEquals(result.gnosiaProbabilities["p3"], 0);

  // プレイヤー視点: 自分が「乗員」の場合
  const p1Perspective = solver.solve({
    perspectivePlayerId: "p1",
    perspectiveRole: "CREW",
  });
  assertEquals(p1Perspective.hasContradiction, false);

  // もしセツ (p2) が真エンジニア視点だった場合: ラキオ (p5) はグノーシア確定
  const setsuPerspective = solver.solve({
    perspectivePlayerId: "p2",
    perspectiveRole: "ENGINEER",
  });
  assertEquals(setsuPerspective.definiteRoles["p5"], "GNOSIA");
});

Deno.test("GnosiaSolver - 嘘看破イベントによる人間陣営除外", () => {
  const settings: GameSettings = {
    players: [
      { id: "p1", name: "自分" },
      { id: "p2", name: "セツ" },
      { id: "p3", name: "SQ" },
      { id: "p4", name: "ラキオ" },
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

  // SQ (p3) が嘘をついたことが確定した（敵対役職＝グノーシアのみの設定）
  const events: GameEvent[] = [
    { id: "1", day: 1, type: "DEFINITE_LIE", targetId: "p3", reason: "直感" },
  ];

  const solver = new GnosiaSolver(settings, events);
  const result = solver.solve();

  assertEquals(result.hasContradiction, false);
  // 敵対役職はグノーシアしかいないのでSQはグノーシア確定
  assertEquals(result.definiteRoles["p3"], "GNOSIA");
  assertEquals(result.gnosiaProbabilities["p3"], 1.0);
  assertEquals(result.gnosiaProbabilities["p1"], 0.0);
});

Deno.test("GnosiaSolver - ドクター判定とバグ・AC主義者を含む15人配役", () => {
  const settings: GameSettings = {
    players: [
      { id: "player", name: "自分" },
      { id: "setsu", name: "セツ" },
      { id: "gina", name: "ジーナ" },
      { id: "sq", name: "SQ" },
      { id: "raqio", name: "ラキオ" },
      { id: "stella", name: "ステラ" },
      { id: "shigemichi", name: "しげみち" },
      { id: "chipie", name: "シピ" },
    ],
    roles: {
      gnosiaCount: 2,
      hasEngineer: true,
      hasDoctor: true,
      hasGuardianAngel: false,
      hasGuardDuty: false,
      hasACFollower: true,
      hasBug: false,
    },
    allowHiddenRoles: false,
  };

  const events: GameEvent[] = [
    // ラキオがエンジニアCO、セツがドクターCO
    { id: "1", day: 1, type: "CO", playerId: "raqio", claimedRole: "ENGINEER" },
    { id: "2", day: 1, type: "CO", playerId: "setsu", claimedRole: "DOCTOR" },
    // 昼の投票でしげみちがコールドスリープ
    { id: "3", day: 1, type: "VOTE", frozenPlayerId: "shigemichi" },
    // 翌日、セツ（ドクター）が「しげみちはグノーシアだった」と報告
    {
      id: "4",
      day: 2,
      type: "DOCTOR_REPORT",
      reporterId: "setsu",
      targetId: "shigemichi",
      result: "GNOSIA",
    },
  ];

  const solver = new GnosiaSolver(settings, events);
  // セツが唯一のドクターCOなのでセツ真ドクター確定、しげみちはグノーシア確定
  const result = solver.solve();
  assertEquals(result.hasContradiction, false);
  assertEquals(result.definiteRoles["setsu"], "DOCTOR");
  assertEquals(result.definiteRoles["shigemichi"], "GNOSIA");
  assertEquals(result.gnosiaProbabilities["shigemichi"], 1.0);
});

