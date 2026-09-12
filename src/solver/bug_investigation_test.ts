import { assertEquals } from "@std/assert";
import { GnosiaSolver } from "./solver.ts";
import { GameSettings, GameEvent } from "../types.ts";

Deno.test("再現テスト - エンジニアが調査して生存している対象はバグ確率0%になるべき", () => {
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

  const events: GameEvent[] = [
    { day: 1, type: "CO", playerId: "player", claimedRole: "ENGINEER", id: "1" },
    { day: 1, type: "CO", playerId: "sha_ming", claimedRole: "ENGINEER", id: "2" },
    { day: 1, type: "CO", playerId: "raqio", claimedRole: "ENGINEER", id: "3" },
    { day: 1, type: "VOTE", frozenPlayerId: "raqio", id: "4" },
    { day: 1, type: "NO_ATTACK", note: "夜間の犠牲者なし", id: "5" },
    {
      day: 2,
      type: "INVESTIGATION",
      investigatorId: "player",
      targetId: "yuriko",
      result: "HUMAN",
      id: "6",
    },
  ];

  const solver = new GnosiaSolver(settings, events);
  // 自分視点 (自分 = ENGINEER)
  const result = solver.solve({
    perspectivePlayerId: "player",
    perspectiveRole: "ENGINEER",
  });

  console.log("夕里子の役職確率:", result.roleProbabilities["yuriko"]);
  console.log("夕里子のバグ確率:", result.roleProbabilities["yuriko"]?.BUG);

  assertEquals(result.hasContradiction, false);
  // 自分視点で、調査して消滅していない夕里子はバグ確率 0% でなければならない！
  assertEquals(result.roleProbabilities["yuriko"]?.BUG, 0);
});
