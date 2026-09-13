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
