import { assertEquals } from "@std/assert";
import { GnosiaSolver } from "./solver.ts";
import { DEFAULT_SETTINGS } from "../state/store.ts";
import { GameEvent } from "../types.ts";

Deno.test("再現テスト - 自分と沙明がエンジニアCOしたとき、しげみちがグノーシア100%になるか", () => {
  const events: Array<GameEvent> = [
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
      type: "CO",
      playerId: "sha_ming",
      claimedRole: "ENGINEER",
    },
  ];

  const solver = new GnosiaSolver(DEFAULT_SETTINGS, events);
  // 自分視点 (自分 = ENGINEER)
  const result = solver.solve({
    perspectivePlayerId: "player",
    perspectiveRole: "ENGINEER",
  });

  console.log("totalPossibleWorlds:", result.totalPossibleWorlds);
  console.log(
    "shigemichi gnosia prob:",
    result.gnosiaProbabilities["shigemichi"],
  );
  console.log("sha_ming gnosia prob:", result.gnosiaProbabilities["sha_ming"]);
  console.log("sha_ming role probs:", result.roleProbabilities["sha_ming"]);
  console.log("sample worlds count:", result.sampleWorlds.length);
  if (result.sampleWorlds.length > 0) {
    console.log("sample world 0:", result.sampleWorlds[0]);
  }

  // 客観視点も見てみる
  const objResult = solver.solve();
  console.log(
    "Objective shigemichi gnosia prob:",
    objResult.gnosiaProbabilities["shigemichi"],
  );
  console.log(
    "Objective sha_ming role probs:",
    objResult.roleProbabilities["sha_ming"],
  );
});
