import { assertEquals } from "@std/assert";
import { GnosiaSolver } from "./solver.ts";
import { GameEvent, GameSettings } from "../types.ts";

// https://www.youtube.com/watch?v=wdzOgyXSLSY の状況を再現したもの
const settings: GameSettings = {
  "players": [
    { "id": "setsu", "name": "セツ" },
    { "id": "gina", "name": "ジナ" },
    { "id": "sq", "name": "SQ" },
    { "id": "raqio", "name": "ラキオ" },
    { "id": "stella", "name": "ステラ" },
    { "id": "shigemichi", "name": "しげみち" },
    { "id": "chipie", "name": "シピ" },
    { "id": "comet", "name": "コメット" },
    { "id": "jonas", "name": "ジョナス" },
    { "id": "kukrushka", "name": "ククルシカ" },
    { "id": "otome", "name": "オトメ" },
    { "id": "remnan", "name": "レムナン" },
    { "id": "sha_ming", "name": "沙明" },
    { "id": "yuriko", "name": "夕里子" },
  ],
  "roles": {
    "gnosiaCount": 3,
    "hasEngineer": true,
    "hasDoctor": true,
    "hasGuardianAngel": true,
    "hasGuardDuty": false,
    "hasACFollower": true,
    "hasBug": true,
  },
  "allowHiddenRoles": false,
};

const events: ReadonlyArray<GameEvent> = [
  {
    "type": "CO",
    "playerId": "kukrushka",
    "claimedRole": "ENGINEER",
    "id": "1",
    "day": 1,
  },
  {
    "type": "CO",
    "playerId": "sha_ming",
    "claimedRole": "ENGINEER",
    "id": "2",
    "day": 1,
  },
  {
    "type": "CO",
    "playerId": "raqio",
    "claimedRole": "DOCTOR",
    "id": "3",
    "day": 1,
  },
  {
    "type": "CO",
    "playerId": "jonas",
    "claimedRole": "DOCTOR",
    "id": "4",
    "day": 1,
  },
  { "type": "VOTE", "frozenPlayerId": "shigemichi", "id": "5", "day": 1 },
  {
    "type": "DISAPPEARANCE",
    "disappearedPlayerIds": ["kukrushka"],
    "id": "6",
    "day": 1,
  },
  {
    "type": "INVESTIGATION",
    "investigatorId": "sha_ming",
    "targetId": "remnan",
    "result": "GNOSIA",
    "id": "7",
    "day": 2,
  },
  {
    "type": "DOCTOR_REPORT",
    "reporterId": "raqio",
    "targetId": "shigemichi",
    "result": "GNOSIA",
    "id": "8",
    "day": 2,
  },
  {
    "type": "DOCTOR_REPORT",
    "reporterId": "jonas",
    "targetId": "shigemichi",
    "result": "HUMAN",
    "id": "9",
    "day": 2,
  },
  { "type": "VOTE", "frozenPlayerId": "remnan", "id": "10", "day": 2 },
  {
    "type": "DISAPPEARANCE",
    "disappearedPlayerIds": ["chipie"],
    "id": "11",
    "day": 2,
  },
  {
    "type": "INVESTIGATION",
    "investigatorId": "sha_ming",
    "targetId": "comet",
    "result": "HUMAN",
    "id": "12",
    "day": 3,
  },
  {
    "type": "DOCTOR_REPORT",
    "reporterId": "raqio",
    "targetId": "remnan",
    "result": "HUMAN",
    "id": "13",
    "day": 3,
  },
  {
    "type": "DOCTOR_REPORT",
    "reporterId": "jonas",
    "targetId": "remnan",
    "result": "HUMAN",
    "id": "14",
    "day": 3,
  },
  { "type": "VOTE", "frozenPlayerId": "sha_ming", "id": "15", "day": 3 },
  {
    "type": "DISAPPEARANCE",
    "disappearedPlayerIds": ["yuriko"],
    "id": "16",
    "day": 3,
  },
  {
    "type": "DOCTOR_REPORT",
    "reporterId": "raqio",
    "targetId": "sha_ming",
    "result": "HUMAN",
    "id": "17",
    "day": 4,
  },
  {
    "type": "DOCTOR_REPORT",
    "reporterId": "jonas",
    "targetId": "sha_ming",
    "result": "GNOSIA",
    "id": "18",
    "day": 4,
  },
  { "type": "VOTE", "frozenPlayerId": "stella", "id": "19", "day": 4 },
  {
    "type": "DISAPPEARANCE",
    "disappearedPlayerIds": ["setsu"],
    "id": "20",
    "day": 4,
  },
  {
    "type": "DOCTOR_REPORT",
    "reporterId": "raqio",
    "targetId": "stella",
    "result": "HUMAN",
    "id": "21",
    "day": 5,
  },
  {
    "type": "DOCTOR_REPORT",
    "reporterId": "jonas",
    "targetId": "stella",
    "result": "GNOSIA",
    "id": "22",
    "day": 5,
  },
  { "type": "VOTE", "frozenPlayerId": "gina", "id": "23", "day": 5 },
  {
    "type": "DISAPPEARANCE",
    "disappearedPlayerIds": ["jonas"],
    "id": "24",
    "day": 5,
  },
  {
    "type": "DOCTOR_REPORT",
    "reporterId": "raqio",
    "targetId": "gina",
    "result": "GNOSIA",
    "id": "25",
    "day": 6,
  },
  { "type": "VOTE", "frozenPlayerId": "sq", "id": "26", "day": 6 },
  { "type": "DISAPPEARANCE", "disappearedPlayerIds": [], "id": "27", "day": 6 },
  {
    "type": "DOCTOR_REPORT",
    "reporterId": "raqio",
    "targetId": "sq",
    "result": "HUMAN",
    "id": "28",
    "day": 7,
  },
];

Deno.test("真エンジニア消滅後に消滅した人物はバグではない (襲撃死)", () => {
  const result = new GnosiaSolver(settings, events).solve({
    perspectivePlayerId: "raqio",
    perspectiveRole: "DOCTOR",
  });
  assertEquals(result.hasContradiction, false);
  // ククルシカ(真エンジニア)は1日目に消滅しているので、5日目に消滅したジョナスはバグの蒸発ではなく襲撃死
  assertEquals(result.roleProbabilities["jonas"]?.AC_FOLLOWER, 1);
  assertEquals(result.roleProbabilities["sha_ming"]?.BUG, 1);
});

Deno.test("襲撃先不明の平和な夜は、生存中の守護天使かバグが必要", () => {
  const result = new GnosiaSolver(settings, events).solve({
    perspectivePlayerId: "raqio",
    perspectiveRole: "DOCTOR",
  });
  // 6日目夜の生存者はラキオ・コメット・オトメのみで、バグ(沙明)は冷凍済み
  // → コメットとオトメの片方が守護天使、もう片方がグノーシア
  assertEquals(result.totalPossibleWorlds, 2);
  assertEquals(result.roleProbabilities["comet"]?.GNOSIA, 0.5);
  assertEquals(result.roleProbabilities["comet"]?.GUARDIAN_ANGEL, 0.5);
  assertEquals(result.roleProbabilities["otome"]?.GNOSIA, 0.5);
  assertEquals(result.roleProbabilities["otome"]?.GUARDIAN_ANGEL, 0.5);
  assertEquals(result.roleProbabilities["setsu"]?.GUARDIAN_ANGEL, 0);
});
