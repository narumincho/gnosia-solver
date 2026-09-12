import { assertEquals } from "@std/assert";
import { GnosiaSolver } from "./solver.ts";
import { GameSettings, GameEvent } from "../types.ts";

Deno.test("GnosiaSolver - 基本的な探索と確率計算", () => {
  const settings: GameSettings = {
    players: [
      { id: "p1", name: "プレイヤー" },
      { id: "p2", name: "セツ" },
      { id: "p3", name: "ジナ" },
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
      { id: "p3", name: "ジナ" },
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
    // p3 (ジナ) が夜に襲撃された
    { id: "4", day: 1, type: "ATTACK", attackedPlayerId: "p3" },
  ];

  const solver = new GnosiaSolver(settings, events);
  const result = solver.solve();

  assertEquals(result.hasContradiction, false);
  // ジナは襲撃されたのでグノーシア確率 0
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

  // SQ (p3) が嘘をついたことが確定した（自分が直感で看破、敵対役職＝グノーシアのみの設定）
  const events: GameEvent[] = [
    { id: "1", day: 1, type: "DEFINITE_LIE", targetId: "p3", witnessId: "player" },
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
      { id: "gina", name: "ジナ" },
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

Deno.test("GnosiaSolver - 他者による密告 (密告者が人間なら対象は敵、密告者が敵なら濡れ衣の可能性あり)", () => {
  const settings: GameSettings = {
    players: [
      { id: "player", name: "自分" },
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

  // セツ (p2) が「SQ (p3) が嘘をついている」と夜に密告
  const events: GameEvent[] = [
    { id: "1", day: 1, type: "DEFINITE_LIE", witnessId: "p2", targetId: "p3" },
  ];

  const solver = new GnosiaSolver(settings, events);
  const result = solver.solve();

  assertEquals(result.hasContradiction, false);

  // 4人のうちグノーシア1人。
  // p2とp3が共に人間（CREW）の世界は除外される。
  // 可能な世界:
  // 1) p2がGNOSIA（p3はCREW、濡れ衣）
  // 2) p3がGNOSIA（p2はCREW、正しい密告）
  // 3) playerがGNOSIA -> 不可能（p2とp3が両方CREWになってしまう）
  // 4) p4がGNOSIA -> 不可能（p2とp3が両方CREWになってしまう）
  // したがって、グノーシアは p2 か p3 のどちらかしかあり得ない！
  assertEquals(result.gnosiaProbabilities["player"], 0.0);
  assertEquals(result.gnosiaProbabilities["p4"], 0.0);
  assertEquals(result.gnosiaProbabilities["p2"], 0.5);
  assertEquals(result.gnosiaProbabilities["p3"], 0.5);

  // もし p2 が人間確定（襲撃されて消滅）したら、p3 はグノーシア確定になるはず
  const eventsWithAttack: GameEvent[] = [
    ...events,
    { id: "2", day: 1, type: "ATTACK", attackedPlayerId: "p2" },
  ];
  const solver2 = new GnosiaSolver(settings, eventsWithAttack);
  const result2 = solver2.solve();
  assertEquals(result2.definiteRoles["p3"], "GNOSIA");
  assertEquals(result2.gnosiaProbabilities["p3"], 1.0);
});

Deno.test("GnosiaSolver - 消滅もしくは平和 (0人消滅/平和 と 2人消滅)", () => {
  const settings: GameSettings = {
    players: [
      { id: "player", name: "自分" },
      { id: "p2", name: "セツ" },
      { id: "p3", name: "SQ" },
      { id: "p4", name: "ラキオ" },
      { id: "p5", name: "ジナ" },
    ],
    roles: {
      gnosiaCount: 1,
      hasEngineer: true,
      hasDoctor: false,
      hasGuardianAngel: true,
      hasGuardDuty: false,
      hasACFollower: false,
      hasBug: true,
    },
    allowHiddenRoles: false,
  };

  // 1) 0人消滅（平和）: 破綻せず計算できる
  const peaceEvents: GameEvent[] = [
    { id: "1", day: 1, type: "DISAPPEARANCE", disappearedPlayerIds: [] },
  ];
  const solverPeace = new GnosiaSolver(settings, peaceEvents);
  const resultPeace = solverPeace.solve();
  assertEquals(resultPeace.hasContradiction, false);

  // 2) 2人消滅: エンジニアがp3を調査し、朝にp2とp3が消滅 -> p3がバグ確定
  const twoDisappearedEvents: GameEvent[] = [
    { id: "1", day: 1, type: "CO", playerId: "player", claimedRole: "ENGINEER" },
    { id: "2", day: 1, type: "INVESTIGATION", investigatorId: "player", targetId: "p3", result: "HUMAN" },
    { id: "3", day: 1, type: "DISAPPEARANCE", disappearedPlayerIds: ["p2", "p3"] },
  ];
  const solverTwo = new GnosiaSolver(settings, twoDisappearedEvents);
  const resultTwo = solverTwo.solve();
  assertEquals(resultTwo.hasContradiction, false);
  assertEquals(resultTwo.definiteRoles["p3"], "BUG");
  assertEquals(resultTwo.definiteRoles["p2"] !== "GNOSIA", true);
});

Deno.test("GnosiaSolver - グノーシア視点で襲撃対象と違う人物が消滅した場合、その人物はバグ確定＆守護天使生存確定", () => {
  const settings: GameSettings = {
    players: [
      { id: "player", name: "自分" },
      { id: "setsu", name: "セツ" },
      { id: "sq", name: "SQ" },
      { id: "raqio", name: "ラキオ" },
      { id: "gina", name: "ジナ" },
      { id: "stella", name: "ステラ" },
    ],
    roles: {
      gnosiaCount: 1,
      hasEngineer: true,
      hasDoctor: false,
      hasGuardianAngel: true,
      hasGuardDuty: false,
      hasACFollower: false,
      hasBug: true,
    },
    allowHiddenRoles: false,
  };

  // 自分がグノーシア視点
  // ラキオがエンジニアCOし、SQを調査
  // 夜、グノーシアとしてセツを襲撃対象に指定
  // 朝、消滅したのはSQ（襲撃対象のセツではない！）
  const events: GameEvent[] = [
    { id: "1", day: 1, type: "CO", playerId: "raqio", claimedRole: "ENGINEER" },
    { id: "2", day: 1, type: "INVESTIGATION", investigatorId: "raqio", targetId: "sq", result: "HUMAN" },
    { id: "3", day: 1, type: "GNOSIA_ATTACK", targetId: "setsu" },
    { id: "4", day: 1, type: "DISAPPEARANCE", disappearedPlayerIds: ["sq"] },
  ];

  const solver = new GnosiaSolver(settings, events);
  const result = solver.solve({
    perspectivePlayerId: "player",
    perspectiveRole: "GNOSIA",
  });

  assertEquals(result.hasContradiction, false);

  // SQ は確実にバグ！
  assertEquals(result.definiteRoles["sq"], "BUG");
  assertEquals(result.roleProbabilities["sq"]["BUG"], 1.0);

  // セツは襲撃されたが守護天使に守られたため非グノーシアかつ非バグ
  assertEquals(result.gnosiaProbabilities["setsu"], 0.0);
  assertEquals(result.roleProbabilities["setsu"]["BUG"], 0.0);

  // ラキオはSQ（バグ）を調査して消滅させたため真エンジニア確定
  assertEquals(result.definiteRoles["raqio"], "ENGINEER");

  // もし守護天使が存在しない設定なら、セツが生き残ることはあり得ないため破綻する
  const noAngelSettings: GameSettings = {
    ...settings,
    roles: { ...settings.roles, hasGuardianAngel: false },
  };
  const solverContradiction = new GnosiaSolver(noAngelSettings, events);
  const resultContradiction = solverContradiction.solve();
  assertEquals(resultContradiction.hasContradiction, true);
});

Deno.test("GnosiaSolver - 留守番CO（2人同時ペアCO）による確定留守番（白確定）の検証", () => {
  const settings: GameSettings = {
    players: [
      { id: "player", name: "自分" },
      { id: "setsu", name: "セツ" },
      { id: "shigemichi", name: "しげみち" },
      { id: "raqio", name: "ラキオ" },
      { id: "gina", name: "ジナ" },
    ],
    roles: {
      gnosiaCount: 1,
      hasEngineer: true,
      hasDoctor: false,
      hasGuardianAngel: false,
      hasGuardDuty: true,
      hasACFollower: false,
      hasBug: false,
    },
    allowHiddenRoles: false,
  };

  // セツとしげみちがペアで留守番CO
  const events: GameEvent[] = [
    {
      id: "1",
      day: 1,
      type: "CO",
      playerId: "setsu",
      partnerPlayerId: "shigemichi",
      claimedRole: "GUARD_DUTY",
    },
  ];

  const solver = new GnosiaSolver(settings, events);
  const result = solver.solve();

  assertEquals(result.hasContradiction, false);
  assertEquals(result.definiteRoles["setsu"], "GUARD_DUTY");
  assertEquals(result.definiteRoles["shigemichi"], "GUARD_DUTY");
  assertEquals(result.roleProbabilities["setsu"]["GUARD_DUTY"], 1.0);
  assertEquals(result.roleProbabilities["shigemichi"]["GUARD_DUTY"], 1.0);
  assertEquals(result.gnosiaProbabilities["setsu"], 0.0);
  assertEquals(result.gnosiaProbabilities["shigemichi"], 0.0);

  // 他の人物は留守番確率 0%
  assertEquals(result.roleProbabilities["player"]["GUARD_DUTY"], 0.0);
  assertEquals(result.roleProbabilities["raqio"]["GUARD_DUTY"], 0.0);
  assertEquals(result.roleProbabilities["gina"]["GUARD_DUTY"], 0.0);
});

