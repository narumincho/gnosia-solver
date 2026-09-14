import { assertEquals } from "@std/assert";
import { GnosiaSolver } from "./solver.ts";
import { FULL_MATCH_3_SESSION } from "../data/sample_sessions/fullMatch3.ts";

Deno.test("GnosiaSolver - 実戦検証3（守護天使視点・15人・3グノーシア・Day 1〜Day 5）", () => {
  const sessionData = FULL_MATCH_3_SESSION.data;
  const solver = new GnosiaSolver(
    sessionData.settings,
    sessionData.events,
  );

  // 1. 客観視点（神視点）での計算
  const objectiveResult = solver.solve();
  assertEquals(
    objectiveResult.hasContradiction,
    false,
    "客観視点で矛盾が発生してはならない",
  );
  assertEquals(
    objectiveResult.totalPossibleWorlds > 0,
    true,
    "客観視点で可能世界が存在すること",
  );

  // 2. 主人公（守護天使）視点での計算
  const gaResult = solver.solve({
    perspectivePlayerId: "player",
    perspectiveRole: "GUARDIAN_ANGEL",
  });

  assertEquals(
    gaResult.hasContradiction,
    false,
    "守護天使視点で矛盾が発生してはならない",
  );
  assertEquals(
    gaResult.totalPossibleWorlds > 0,
    true,
    "守護天使視点で可能世界が存在すること",
  );

  // 主人公はGUARDIAN_ANGEL確定
  assertEquals(gaResult.definiteRoles["player"], "GUARDIAN_ANGEL");

  // ジナとコメットは留守番確定
  assertEquals(gaResult.definiteRoles["gina"], "GUARD_DUTY");
  assertEquals(gaResult.definiteRoles["comet"], "GUARD_DUTY");

  // 人間（乗員）確定
  assertEquals(gaResult.definiteRoles["setsu"], "CREW");
  assertEquals(gaResult.definiteRoles["stella"], "CREW");
  assertEquals(gaResult.definiteRoles["chipie"], "CREW");
  assertEquals(gaResult.definiteRoles["sha_ming"], "CREW");
  assertEquals(gaResult.definiteRoles["yuriko"], "CREW");

  // 可能世界数が15通りまで絞り込まれていること
  assertEquals(gaResult.totalPossibleWorlds, 15);

  // 非グノーシア確定者 (グノーシア確率 0%)
  const nonGnosia = [
    "player",
    "setsu",
    "gina",
    "stella",
    "chipie",
    "comet",
    "remnan",
    "sha_ming",
    "yuriko",
  ];
  for (const pid of nonGnosia) {
    assertEquals(
      gaResult.gnosiaProbabilities[pid],
      0,
      `${pid} は非グノーシア確定であるべき`,
    );
  }

  // しげみちは嘘看破されており人間陣営除外（CREW確率 0%）
  assertEquals(
    gaResult.roleProbabilities["shigemichi"]?.["CREW"] ?? 0,
    0,
  );

  // グノーシア候補（オトメ、ジョナス、ククルシカ、SQ、しげみち、ラキオ）の確率確認
  assertEquals((gaResult.gnosiaProbabilities["otome"] ?? 0) > 0.7, true);
  assertEquals((gaResult.gnosiaProbabilities["jonas"] ?? 0) > 0.6, true);
  assertEquals((gaResult.gnosiaProbabilities["kukrushka"] ?? 0) > 0.6, true);
  assertEquals((gaResult.gnosiaProbabilities["sq"] ?? 0) > 0.4, true);
  assertEquals((gaResult.gnosiaProbabilities["shigemichi"] ?? 0) > 0.3, true);
});
