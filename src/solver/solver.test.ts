import { assertEquals } from "@std/assert";
import { GnosiaSolver } from "./solver.ts";
import { GameEvent, GameSettings } from "../types.ts";

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

  const events: ReadonlyArray<GameEvent> = [];
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

  const events: ReadonlyArray<GameEvent> = [
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
  const events: ReadonlyArray<GameEvent> = [
    {
      id: "1",
      day: 1,
      type: "DEFINITE_LIE",
      targetId: "p3",
      witnessId: "player",
    },
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

  const events: ReadonlyArray<GameEvent> = [
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
  const events: ReadonlyArray<GameEvent> = [
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
  const eventsWithAttack: ReadonlyArray<GameEvent> = [
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
  const peaceEvents: ReadonlyArray<GameEvent> = [
    { id: "1", day: 1, type: "DISAPPEARANCE", disappearedPlayerIds: [] },
  ];
  const solverPeace = new GnosiaSolver(settings, peaceEvents);
  const resultPeace = solverPeace.solve();
  assertEquals(resultPeace.hasContradiction, false);

  // 2) 2人消滅: エンジニアがp3を調査し、朝にp2とp3が消滅 -> p3がバグ確定
  const twoDisappearedEvents: ReadonlyArray<GameEvent> = [
    {
      id: "1",
      day: 1,
      type: "CO",
      playerId: "player",
      claimedRole: "ENGINEER",
    },
    {
      id: "2",
      day: 1,
      type: "INVESTIGATION",
      investigatorId: "player",
      targetId: "p3",
      result: "HUMAN",
    },
    {
      id: "3",
      day: 1,
      type: "DISAPPEARANCE",
      disappearedPlayerIds: ["p2", "p3"],
    },
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
  const events: ReadonlyArray<GameEvent> = [
    { id: "1", day: 1, type: "CO", playerId: "raqio", claimedRole: "ENGINEER" },
    {
      id: "2",
      day: 1,
      type: "INVESTIGATION",
      investigatorId: "raqio",
      targetId: "sq",
      result: "HUMAN",
    },
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
  assertEquals(result.roleProbabilities["sq"]?.["BUG"], 1.0);

  // セツは襲撃されたが守護天使に守られたため非グノーシアかつ非バグ
  assertEquals(result.gnosiaProbabilities["setsu"], 0.0);
  assertEquals(result.roleProbabilities["setsu"]?.["BUG"], 0.0);

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
  const events: ReadonlyArray<GameEvent> = [
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
  assertEquals(result.roleProbabilities["setsu"]?.["GUARD_DUTY"], 1.0);
  assertEquals(result.roleProbabilities["shigemichi"]?.["GUARD_DUTY"], 1.0);
  assertEquals(result.gnosiaProbabilities["setsu"], 0.0);
  assertEquals(result.gnosiaProbabilities["shigemichi"], 0.0);

  // 他の人物は留守番確率 0%
  assertEquals(result.roleProbabilities["player"]?.["GUARD_DUTY"], 0.0);
  assertEquals(result.roleProbabilities["raqio"]?.["GUARD_DUTY"], 0.0);
  assertEquals(result.roleProbabilities["gina"]?.["GUARD_DUTY"], 0.0);
});

Deno.test("GnosiaSolver - 実戦フルプレイ検証（15人・4グノーシア・Day 1〜Day 6 完走データ）", () => {
  const settings: GameSettings = {
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
      gnosiaCount: 4,
      hasEngineer: true,
      hasDoctor: true,
      hasGuardianAngel: true,
      hasGuardDuty: true,
      hasACFollower: true,
      hasBug: true,
    },
    allowHiddenRoles: false,
  };

  const events: ReadonlyArray<GameEvent> = [
    {
      day: 1,
      type: "CO",
      playerId: "player",
      claimedRole: "ENGINEER",
      id: "7c0e2278-f68d-4af2-b783-fcd39029246f",
    },
    {
      day: 1,
      type: "CO",
      playerId: "raqio",
      claimedRole: "ENGINEER",
      id: "635e0078-82b7-4e16-be10-f2e1eb57d430",
    },
    {
      day: 1,
      type: "CO",
      playerId: "sha_ming",
      claimedRole: "ENGINEER",
      id: "f088c516-e337-423c-a360-ff5f9eb95e0d",
    },
    {
      day: 1,
      type: "VOTE",
      frozenPlayerId: "raqio",
      id: "b5b57d58-252f-4681-8035-cdc4c030bff4",
    },
    {
      day: 1,
      type: "NO_ATTACK",
      note: "夜間の犠牲者なし (天使護衛成功 または バグ襲撃)",
      id: "e401c396-32dd-44da-af91-619bc81e45b4",
    },
    {
      day: 2,
      type: "INVESTIGATION",
      investigatorId: "player",
      targetId: "yuriko",
      result: "HUMAN",
      id: "a1efcca9-ec65-470a-b3ab-a978a0789def",
    },
    {
      day: 2,
      type: "INVESTIGATION",
      investigatorId: "sha_ming",
      targetId: "kukrushka",
      result: "HUMAN",
      id: "6aa9a2a3-cafd-4ecb-ab85-46a07676f6af",
    },
    {
      day: 2,
      type: "CO",
      playerId: "shigemichi",
      claimedRole: "DOCTOR",
      id: "7d5839a6-f113-4bf0-bf48-d1ea7ef00334",
    },
    {
      day: 2,
      type: "DOCTOR_REPORT",
      reporterId: "shigemichi",
      targetId: "raqio",
      result: "GNOSIA",
      id: "6df66b38-ebd7-421a-adf7-c9ca590e7a8d",
    },
    {
      day: 2,
      type: "CO",
      playerId: "remnan",
      claimedRole: "DOCTOR",
      id: "b761ed13-0a0e-471b-98e8-72562f5481ec",
    },
    {
      day: 2,
      type: "DOCTOR_REPORT",
      reporterId: "remnan",
      targetId: "raqio",
      result: "HUMAN",
      id: "9abac046-d5e0-40ca-aeda-d7ac35f2f6f8",
    },
    {
      type: "VOTE",
      frozenPlayerId: "jonas",
      id: "32fb3c6d-f6e1-4a21-8c38-e07536c1d9bb",
      day: 2,
    },
    {
      type: "ATTACK",
      attackedPlayerId: "yuriko",
      id: "be01bf39-e09e-4327-b190-10b1be5af7e9",
      day: 2,
    },
    {
      type: "INVESTIGATION",
      investigatorId: "sha_ming",
      targetId: "sq",
      result: "GNOSIA",
      id: "63f6698d-0770-4a66-8b84-10a96b733ced",
      day: 3,
    },
    {
      type: "INVESTIGATION",
      investigatorId: "player",
      targetId: "otome",
      result: "HUMAN",
      id: "95ed97ea-524b-4db6-8523-65c71f2792c4",
      day: 3,
    },
    {
      type: "DOCTOR_REPORT",
      reporterId: "shigemichi",
      targetId: "jonas",
      result: "GNOSIA",
      id: "3157c36a-740b-40ac-9383-f63375637c0f",
      day: 3,
    },
    {
      type: "DOCTOR_REPORT",
      reporterId: "remnan",
      targetId: "jonas",
      result: "HUMAN",
      id: "3f7f61d1-0cd7-475b-b21c-4a278a554a64",
      day: 3,
    },
    {
      type: "DEFINITE_LIE",
      targetId: "remnan",
      witnessId: "player",
      id: "57bf0db7-5560-4412-8ac6-d0deed33a2bb",
      day: 3,
    },
    {
      type: "CO",
      playerId: "gina",
      partnerPlayerId: "comet",
      claimedRole: "GUARD_DUTY",
      id: "5dcafdc3-1b64-4290-b26f-fc36288a6c42",
      day: 3,
    },
    {
      type: "VOTE",
      frozenPlayerId: "stella",
      id: "74bdf208-10a0-443b-9da1-532ea6b391a4",
      day: 3,
    },
    {
      type: "DISAPPEARANCE",
      disappearedPlayerIds: ["sq"],
      id: "5223d6f7-17f0-4442-b6da-a88e040d6538",
      day: 3,
    },
    {
      type: "INVESTIGATION",
      investigatorId: "player",
      targetId: "remnan",
      result: "GNOSIA",
      id: "37938a35-8281-48d7-ba46-2eb682b4ff18",
      day: 4,
    },
    {
      type: "INVESTIGATION",
      investigatorId: "sha_ming",
      targetId: "setsu",
      result: "GNOSIA",
      id: "50ed4366-d73c-4da2-9f17-32638d3c3389",
      day: 4,
    },
    {
      type: "DOCTOR_REPORT",
      reporterId: "shigemichi",
      targetId: "stella",
      result: "HUMAN",
      id: "1cd8fba3-10e3-4db2-a4a8-047b6698392c",
      day: 4,
    },
    {
      type: "DOCTOR_REPORT",
      reporterId: "remnan",
      targetId: "stella",
      result: "HUMAN",
      id: "58a19672-441b-4c61-825d-05ad58577859",
      day: 4,
    },
    {
      type: "VOTE",
      frozenPlayerId: "sha_ming",
      id: "37e72e17-4fd6-440b-8f69-0a9b09c1b25e",
      day: 4,
    },
    {
      type: "DISAPPEARANCE",
      disappearedPlayerIds: ["gina"],
      id: "c0bc7a84-33f5-4719-ab28-a27de4981a0b",
      day: 4,
    },
    {
      type: "INVESTIGATION",
      investigatorId: "player",
      targetId: "chipie",
      result: "GNOSIA",
      id: "c79d96fc-935c-4bcb-8777-7d10b4eec027",
      day: 5,
    },
    {
      type: "DOCTOR_REPORT",
      reporterId: "remnan",
      targetId: "sha_ming",
      result: "GNOSIA",
      id: "653618a0-0c21-4354-9065-2fc0e0518be4",
      day: 5,
    },
    {
      type: "DOCTOR_REPORT",
      reporterId: "shigemichi",
      targetId: "sha_ming",
      result: "HUMAN",
      id: "2308ef33-fd82-4283-be09-f17f44665df8",
      day: 5,
    },
    {
      type: "VOTE",
      frozenPlayerId: "chipie",
      id: "e14a6f9d-2d89-4ad8-b91a-1ae36c735c79",
      day: 5,
    },
    {
      type: "DISAPPEARANCE",
      disappearedPlayerIds: ["shigemichi"],
      id: "429d407e-b225-41b8-8d07-6abc62c27b1b",
      day: 5,
    },
    {
      type: "INVESTIGATION",
      investigatorId: "player",
      targetId: "setsu",
      result: "HUMAN",
      id: "17b5fc99-50c2-4221-9b71-f412b974b36d",
      day: 6,
    },
    {
      type: "DOCTOR_REPORT",
      reporterId: "remnan",
      targetId: "chipie",
      result: "GNOSIA",
      id: "2e3084bd-8eae-439e-be6f-3a2fe0418dc7",
      day: 6,
    },
    {
      type: "VOTE",
      frozenPlayerId: "remnan",
      id: "eceb11b5-5eb0-42a3-a9b3-e2b522d13d27",
      day: 6,
    },
  ];

  const solver = new GnosiaSolver(settings, events);
  const result = solver.solve({
    perspectivePlayerId: "player",
    perspectiveRole: "ENGINEER",
  });

  // 1. 論理破綻しないこと
  assertEquals(result.hasContradiction, false);
  assertEquals(result.totalPossibleWorlds > 0, true);

  // 2. 確定役職の検証
  assertEquals(result.definiteRoles["player"], "ENGINEER");
  assertEquals(result.definiteRoles["gina"], "GUARD_DUTY");
  assertEquals(result.definiteRoles["comet"], "GUARD_DUTY");
  assertEquals(result.definiteRoles["shigemichi"], "DOCTOR");

  // 4人のグノーシア確定: ラキオ, ジョナス, レムナン, シピ
  assertEquals(result.definiteRoles["raqio"], "GNOSIA");
  assertEquals(result.definiteRoles["jonas"], "GNOSIA");
  assertEquals(result.definiteRoles["remnan"], "GNOSIA");
  assertEquals(result.definiteRoles["chipie"], "GNOSIA");

  // グノーシア確率 1.0
  assertEquals(result.gnosiaProbabilities["raqio"], 1.0);
  assertEquals(result.gnosiaProbabilities["jonas"], 1.0);
  assertEquals(result.gnosiaProbabilities["remnan"], 1.0);
  assertEquals(result.gnosiaProbabilities["chipie"], 1.0);

  // 非グノーシア
  assertEquals(result.gnosiaProbabilities["player"], 0.0);
  assertEquals(result.gnosiaProbabilities["setsu"], 0.0);
  assertEquals(result.gnosiaProbabilities["otome"], 0.0);
  assertEquals(result.gnosiaProbabilities["yuriko"], 0.0);
});

Deno.test("GnosiaSolver - note例題: エンジニアとドクターの対応（嘘つき5人の配役特定）", () => {
  // https://note.com/hnghyk110164/n/n81bc7270a35c
  // 「オーソドックスルール」で主人公は一般乗員
  const settings: GameSettings = {
    players: [
      { id: "player", name: "主人公" },
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
  };

  const events: ReadonlyArray<GameEvent> = [
    // 1日目: ククルシカ・レムナンがエンジニアCO、ジョナス・夕里子がドクターCO。セツが冷凍。
    {
      id: "1",
      day: 1,
      type: "CO",
      playerId: "kukrushka",
      claimedRole: "ENGINEER",
    },
    {
      id: "2",
      day: 1,
      type: "CO",
      playerId: "remnan",
      claimedRole: "ENGINEER",
    },
    { id: "3", day: 1, type: "CO", playerId: "jonas", claimedRole: "DOCTOR" },
    { id: "4", day: 1, type: "CO", playerId: "yuriko", claimedRole: "DOCTOR" },
    { id: "5", day: 1, type: "VOTE", frozenPlayerId: "setsu" },

    // 2日目: 消失無し。ククルシカ「沙明は人間」、レムナン「ジナは人間」。ジョナス「セツはグノーシア」、夕里子「セツは人間」。ジナが冷凍。
    { id: "6", day: 1, type: "DISAPPEARANCE", disappearedPlayerIds: [] },
    {
      id: "7",
      day: 2,
      type: "INVESTIGATION",
      investigatorId: "kukrushka",
      targetId: "sha_ming",
      result: "HUMAN",
    },
    {
      id: "8",
      day: 2,
      type: "INVESTIGATION",
      investigatorId: "remnan",
      targetId: "gina",
      result: "HUMAN",
    },
    {
      id: "9",
      day: 2,
      type: "DOCTOR_REPORT",
      reporterId: "jonas",
      targetId: "setsu",
      result: "GNOSIA",
    },
    {
      id: "10",
      day: 2,
      type: "DOCTOR_REPORT",
      reporterId: "yuriko",
      targetId: "setsu",
      result: "HUMAN",
    },
    { id: "11", day: 2, type: "VOTE", frozenPlayerId: "gina" },

    // 3日目: 沙明が消失。ククルシカ「レムナンはグノーシア」、レムナン「沙明は人間」。ジョナス「ジナは人間」、夕里子「ジナはグノーシア」。主人公がステラの嘘看破。ステラが冷凍。夜SQがジョナス密告。
    {
      id: "12",
      day: 2,
      type: "DISAPPEARANCE",
      disappearedPlayerIds: ["sha_ming"],
    },
    {
      id: "13",
      day: 3,
      type: "INVESTIGATION",
      investigatorId: "kukrushka",
      targetId: "remnan",
      result: "GNOSIA",
    },
    {
      id: "14",
      day: 3,
      type: "INVESTIGATION",
      investigatorId: "remnan",
      targetId: "sha_ming",
      result: "HUMAN",
    },
    {
      id: "15",
      day: 3,
      type: "DOCTOR_REPORT",
      reporterId: "jonas",
      targetId: "gina",
      result: "HUMAN",
    },
    {
      id: "16",
      day: 3,
      type: "DOCTOR_REPORT",
      reporterId: "yuriko",
      targetId: "gina",
      result: "GNOSIA",
    },
    {
      id: "17",
      day: 3,
      type: "DEFINITE_LIE",
      targetId: "stella",
      witnessId: "player",
    },
    { id: "18", day: 3, type: "VOTE", frozenPlayerId: "stella" },
    {
      id: "19",
      day: 3,
      type: "DEFINITE_LIE",
      targetId: "jonas",
      witnessId: "sq",
    },

    // 4日目: ラキオが消失。ククルシカ「ジョナスは人間」、レムナン「オトメはグノーシア」。ジョナス「ステラはグノーシア」、夕里子「ステラは人間」。夜シピがククルシカ密告。
    {
      id: "20",
      day: 3,
      type: "DISAPPEARANCE",
      disappearedPlayerIds: ["raqio"],
    },
    {
      id: "21",
      day: 4,
      type: "INVESTIGATION",
      investigatorId: "kukrushka",
      targetId: "jonas",
      result: "HUMAN",
    },
    {
      id: "22",
      day: 4,
      type: "INVESTIGATION",
      investigatorId: "remnan",
      targetId: "otome",
      result: "GNOSIA",
    },
    {
      id: "23",
      day: 4,
      type: "DOCTOR_REPORT",
      reporterId: "jonas",
      targetId: "stella",
      result: "GNOSIA",
    },
    {
      id: "24",
      day: 4,
      type: "DOCTOR_REPORT",
      reporterId: "yuriko",
      targetId: "stella",
      result: "HUMAN",
    },
    {
      id: "25",
      day: 4,
      type: "DEFINITE_LIE",
      targetId: "kukrushka",
      witnessId: "chipie",
    },
  ];

  const solver = new GnosiaSolver(settings, events);
  const result = solver.solve({
    perspectivePlayerId: "player",
    perspectiveRole: "CREW",
  });

  // 1. 破綻しないこと
  assertEquals(result.hasContradiction, false);
  assertEquals(result.totalPossibleWorlds > 0, true);

  // 2. 記事の解答と完全一致すること:
  // グノーシア: ジナ・シピ・レムナン
  assertEquals(result.definiteRoles["gina"], "GNOSIA");
  assertEquals(result.definiteRoles["chipie"], "GNOSIA");
  assertEquals(result.definiteRoles["remnan"], "GNOSIA");
  assertEquals(result.gnosiaProbabilities["gina"], 1.0);
  assertEquals(result.gnosiaProbabilities["chipie"], 1.0);
  assertEquals(result.gnosiaProbabilities["remnan"], 1.0);

  // AC主義者: ジョナス
  assertEquals(result.definiteRoles["jonas"], "AC_FOLLOWER");
  assertEquals(result.roleProbabilities["jonas"]?.["AC_FOLLOWER"], 1.0);

  // バグ: ステラ
  assertEquals(result.definiteRoles["stella"], "BUG");
  assertEquals(result.roleProbabilities["stella"]?.["BUG"], 1.0);

  // 真役職: ククルシカ（エンジニア）、夕里子（ドクター）
  assertEquals(result.definiteRoles["kukrushka"], "ENGINEER");
  assertEquals(result.definiteRoles["yuriko"], "DOCTOR");
});

Deno.test("GnosiaSolver - 自分がグノーシア視点で仲間グノーシアを指定した場合の推論", () => {
  const settings: GameSettings = {
    players: [
      { id: "player", name: "自分" },
      { id: "setsu", name: "セツ" },
      { id: "gina", name: "ジナ" },
      { id: "sq", name: "SQ" },
      { id: "raqio", name: "ラキオ" },
    ],
    roles: {
      gnosiaCount: 2,
      hasEngineer: true,
      hasDoctor: false,
      hasGuardianAngel: false,
      hasGuardDuty: false,
      hasACFollower: false,
      hasBug: false,
    },
    allowHiddenRoles: false,
  };

  const solver = new GnosiaSolver(settings, []);
  const result = solver.solve({
    perspectivePlayerId: "player",
    perspectiveRole: "GNOSIA",
    gnosiaComrades: ["setsu"],
  });

  // 1. 破綻しないこと
  assertEquals(result.hasContradiction, false);
  assertEquals(result.totalPossibleWorlds > 0, true);

  // 2. 自分とセツがGNOSIA確定
  assertEquals(result.definiteRoles["player"], "GNOSIA");
  assertEquals(result.definiteRoles["setsu"], "GNOSIA");
  assertEquals(result.gnosiaProbabilities["player"], 1.0);
  assertEquals(result.gnosiaProbabilities["setsu"], 1.0);

  // 3. グノーシア定員2人（自分＋セツ）のため、他全員（ジナ、SQ、ラキオ）のGNOSIA確率は0%
  assertEquals(result.gnosiaProbabilities["gina"], 0);
  assertEquals(result.gnosiaProbabilities["sq"], 0);
  assertEquals(result.gnosiaProbabilities["raqio"], 0);
});

Deno.test("GnosiaSolver - 仲間グノーシアが人間確定（エンジニア判定等）と矛盾する場合に破綻すること", () => {
  const settings: GameSettings = {
    players: [
      { id: "player", name: "自分" },
      { id: "setsu", name: "セツ" },
      { id: "gina", name: "ジナ" },
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

  // 自分視点でジナがエンジニアCOし、セツを人間判定
  // しかし自分視点でセツを仲間グノーシアに指定した場合、あるいは定員1人なのに自分グノーシア＋セツ仲間で定員オーバーになる
  const solver = new GnosiaSolver(settings, []);
  const result = solver.solve({
    perspectivePlayerId: "player",
    perspectiveRole: "GNOSIA",
    gnosiaComrades: ["setsu"],
  });

  // グノーシア定員1人に対して自分がグノーシア＋セツもグノーシアなので世界が存在せず破綻
  assertEquals(result.hasContradiction, true);
  assertEquals(result.totalPossibleWorlds, 0);
});

Deno.test("GnosiaSolver - 仲間グノーシア視点でも自分(player)がグノーシア100%になること", () => {
  const settings: GameSettings = {
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
  };

  const events: ReadonlyArray<GameEvent> = [
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
  ];

  // グノーシアチーム: player, remnan, jonas
  // レムナン視点 (perspectivePlayerId: "remnan") から見た仲間: player, jonas
  const solver = new GnosiaSolver(settings, events);
  const result = solver.solve({
    perspectivePlayerId: "remnan",
    perspectiveRole: "GNOSIA",
    gnosiaComrades: ["player", "jonas"],
  });

  assertEquals(result.hasContradiction, false);
  assertEquals(result.totalPossibleWorlds > 0, true);

  // player, remnan, jonas はグノーシア100%
  assertEquals(result.definiteRoles["player"], "GNOSIA");
  assertEquals(result.gnosiaProbabilities["player"], 1.0);
  assertEquals(result.definiteRoles["remnan"], "GNOSIA");
  assertEquals(result.gnosiaProbabilities["remnan"], 1.0);
  assertEquals(result.definiteRoles["jonas"], "GNOSIA");
  assertEquals(result.gnosiaProbabilities["jonas"], 1.0);

  // 他全員はGNOSIA確率0%
  for (const p of settings.players) {
    if (p.id !== "player" && p.id !== "remnan" && p.id !== "jonas") {
      assertEquals(result.gnosiaProbabilities[p.id], 0);
    }
  }
});
