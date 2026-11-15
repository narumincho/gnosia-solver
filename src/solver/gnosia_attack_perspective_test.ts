import { assertEquals } from "@std/assert";
import { GnosiaSolver } from "./solver.ts";
import { GameEvent, GameSettings } from "../types.ts";

const settings: GameSettings = {
  players: [
    { id: "player", name: "主人公" },
    { id: "setsu", name: "セツ" },
    { id: "gina", name: "ジナ" },
    { id: "sq", name: "SQ" },
    { id: "raqio", name: "ラキオ" },
    { id: "stella", name: "ステラ" },
  ],
  roles: {
    gnosiaCount: 2,
    hasEngineer: false,
    hasDoctor: false,
    hasGuardianAngel: true,
    hasGuardDuty: false,
    hasACFollower: false,
    hasBug: false,
  },
  allowHiddenRoles: false,
};

// 主人公がセツを襲撃したが平和 → グノーシア視点ではセツが守護天使に守られた (= 非グノーシア)
const events: ReadonlyArray<GameEvent> = [
  { id: "1", day: 1, type: "VOTE", frozenPlayerId: "stella" },
  {
    id: "2",
    day: 1,
    type: "GNOSIA_ATTACK",
    attackerId: "player",
    targetId: "setsu",
  },
  { id: "3", day: 1, type: "DISAPPEARANCE", disappearedPlayerIds: [] },
];

Deno.test("GNOSIA_ATTACK - 客観視点では襲撃先を使わない", () => {
  const result = new GnosiaSolver(settings, events).solve();
  assertEquals(result.hasContradiction, false);
  // 主人公がグノーシアとは決まらず、セツも非グノーシアとは決まらない
  assertEquals((result.roleProbabilities["player"]?.GNOSIA ?? 0) < 1, true);
  assertEquals((result.gnosiaProbabilities["setsu"] ?? 0) > 0, true);
});

Deno.test("GNOSIA_ATTACK - 襲撃者本人の視点では襲撃者がグノーシア、襲撃先が非グノーシア", () => {
  const result = new GnosiaSolver(settings, events).solve({
    perspectivePlayerId: "player",
  });
  assertEquals(result.hasContradiction, false);
  assertEquals(result.roleProbabilities["player"]?.GNOSIA, 1);
  assertEquals(result.gnosiaProbabilities["setsu"], 0);
});

Deno.test("GNOSIA_ATTACK - 仲間のグノーシアの視点でも使う", () => {
  const result = new GnosiaSolver(settings, events).solve({
    perspectivePlayerId: "gina",
    perspectiveRole: "GNOSIA",
    gnosiaComrades: ["player"],
  });
  assertEquals(result.hasContradiction, false);
  assertEquals(result.roleProbabilities["player"]?.GNOSIA, 1);
  assertEquals(result.gnosiaProbabilities["setsu"], 0);
});

Deno.test("GNOSIA_ATTACK - グノーシア陣営以外の視点では使わない", () => {
  const result = new GnosiaSolver(settings, events).solve({
    perspectivePlayerId: "sq",
  });
  assertEquals(result.hasContradiction, false);
  assertEquals((result.gnosiaProbabilities["setsu"] ?? 0) > 0, true);
});

Deno.test("GNOSIA_ATTACK - 自分自身を襲撃した記録は破綻", () => {
  const selfAttack: ReadonlyArray<GameEvent> = [
    {
      id: "1",
      day: 1,
      type: "GNOSIA_ATTACK",
      attackerId: "gina",
      targetId: "gina",
    },
  ];
  const result = new GnosiaSolver(settings, selfAttack).solve();
  assertEquals(result.hasContradiction, true);
});
