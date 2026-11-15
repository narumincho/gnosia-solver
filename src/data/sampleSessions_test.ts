import { assertEquals } from "@std/assert";
import { SAMPLE_SESSIONS } from "./sampleSessions.ts";
import { GnosiaSolver } from "../solver/solver.ts";

Deno.test("SAMPLE_SESSIONS - 全てのサンプルセッションが矛盾なく計算できること", () => {
  for (const sample of SAMPLE_SESSIONS) {
    const data = sample.data;
    const solver = new GnosiaSolver(data.settings, data.events);
    const result = solver.solve({
      perspectivePlayerId: data.perspective.id,
      perspectiveRole: data.perspective.role,
      gnosiaComrades: data.gnosiaComrades,
    });

    assertEquals(
      result.hasContradiction,
      false,
      `サンプル ${sample.title} (${sample.id}) で予期しない矛盾が発生しました`,
    );
    assertEquals(
      result.totalPossibleWorlds > 0,
      true,
      `サンプル ${sample.title} (${sample.id}) で可能世界数が0になりました`,
    );
  }
});

Deno.test("SAMPLE_SESSIONS - 動画観戦 1 (守護天使なし): 平和な夜からジョナスが真ドクター・ラキオが偽ドクターと確定する", () => {
  const sample = SAMPLE_SESSIONS.find((s) => s.id === "video-match-1");
  if (!sample) throw new Error("video-match-1 が見つかりません");
  const { settings, events } = sample.data;

  const result = new GnosiaSolver(settings, events).solve();
  assertEquals(result.hasContradiction, false);
  assertEquals(result.roleProbabilities["jonas"]?.DOCTOR, 1);
  assertEquals(result.roleProbabilities["kukrushka"]?.ENGINEER, 1);
  assertEquals(result.enemyProbabilities["raqio"], 1);
  assertEquals(result.roleProbabilities["sha_ming"]?.GNOSIA, 1);
  assertEquals(result.roleProbabilities["stella"]?.GNOSIA, 1);

  // ラキオを真ドクターと仮定すると、守護天使がいないため6日目の平和な夜を説明できず破綻する
  const asRaqioDoctor = new GnosiaSolver(settings, events).solve({
    perspectivePlayerId: "raqio",
    perspectiveRole: "DOCTOR",
  });
  assertEquals(asRaqioDoctor.hasContradiction, true);
});
