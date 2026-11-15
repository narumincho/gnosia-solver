import { SampleSession } from "./common.ts";

/**
 * 動画「ラキオ先生の補習授業～絶対に敵だ講座～」
 * (https://www.youtube.com/watch?v=wdzOgyXSLSY) の状況を再現した観戦データ。
 * 主人公はおらず、14人・3G・守護天使なし。
 */
export const VIDEO_MATCH_1_SESSION: SampleSession = {
  id: "video-match-1",
  title:
    "ラキオ先生の補習授業～絶対に敵だ講座～ (客観視点・14人・3G・守護天使なし・Day 1〜7)",
  badge: "動画観戦",
  description:
    "動画の状況を再現した観戦データです。エンジニア2CO・ドクター2COで、守護天使がいないのに6日目の夜が平和だったことから、生存中のバグが襲撃されたと分かり、ジョナスが真ドクター・ラキオが偽ドクターと確定します。",
  source: {
    title: "ラキオ先生の補習授業～絶対に敵だ講座～",
    url: "https://www.youtube.com/watch?v=wdzOgyXSLSY",
  },
  data: {
    "version": 1,
    "exportedAt": "2026-11-14T00:54:12.697Z",
    "settings": {
      "players": [
        {
          "id": "setsu",
          "name": "セツ",
        },
        {
          "id": "gina",
          "name": "ジナ",
        },
        {
          "id": "sq",
          "name": "SQ",
        },
        {
          "id": "raqio",
          "name": "ラキオ",
        },
        {
          "id": "stella",
          "name": "ステラ",
        },
        {
          "id": "shigemichi",
          "name": "しげみち",
        },
        {
          "id": "chipie",
          "name": "シピ",
        },
        {
          "id": "comet",
          "name": "コメット",
        },
        {
          "id": "jonas",
          "name": "ジョナス",
        },
        {
          "id": "kukrushka",
          "name": "ククルシカ",
        },
        {
          "id": "otome",
          "name": "オトメ",
        },
        {
          "id": "remnan",
          "name": "レムナン",
        },
        {
          "id": "sha_ming",
          "name": "沙明",
        },
        {
          "id": "yuriko",
          "name": "夕里子",
        },
      ],
      "roles": {
        "gnosiaCount": 3,
        "hasEngineer": true,
        "hasDoctor": true,
        "hasGuardianAngel": false,
        "hasGuardDuty": false,
        "hasACFollower": true,
        "hasBug": true,
      },
      "allowHiddenRoles": false,
    },
    "events": [
      {
        "type": "CO",
        "playerId": "kukrushka",
        "claimedRole": "ENGINEER",
        "id": "1818d9c5-91a8-488a-b13a-dae949117f89",
        "day": 1,
      },
      {
        "type": "CO",
        "playerId": "sha_ming",
        "claimedRole": "ENGINEER",
        "id": "e695561d-239f-47b3-9223-40641fbed052",
        "day": 1,
      },
      {
        "type": "CO",
        "playerId": "raqio",
        "claimedRole": "DOCTOR",
        "id": "dbc85f98-fc1a-43d1-a8ff-c897d07defe6",
        "day": 1,
      },
      {
        "type": "CO",
        "playerId": "jonas",
        "claimedRole": "DOCTOR",
        "id": "cc2c43fc-c4ab-415d-bded-2361843b2460",
        "day": 1,
      },
      {
        "type": "VOTE",
        "frozenPlayerId": "shigemichi",
        "id": "a5c3fb86-6401-474e-aa62-7d1e42d37523",
        "day": 1,
      },
      {
        "type": "DISAPPEARANCE",
        "disappearedPlayerIds": [
          "kukrushka",
        ],
        "id": "d282064c-1011-4849-bcbe-ef36bff7bbe3",
        "day": 1,
      },
      {
        "type": "INVESTIGATION",
        "investigatorId": "sha_ming",
        "targetId": "remnan",
        "result": "GNOSIA",
        "id": "3e3b0017-869d-4f57-9e73-1b3ed44190e4",
        "day": 2,
      },
      {
        "type": "DOCTOR_REPORT",
        "reporterId": "raqio",
        "targetId": "shigemichi",
        "result": "GNOSIA",
        "id": "47e0ed11-222e-429d-8129-bec831f89d7f",
        "day": 2,
      },
      {
        "type": "DOCTOR_REPORT",
        "reporterId": "jonas",
        "targetId": "shigemichi",
        "result": "HUMAN",
        "id": "372f6eac-370d-48e5-8143-a88b47466558",
        "day": 2,
      },
      {
        "type": "VOTE",
        "frozenPlayerId": "remnan",
        "id": "8f950572-0365-4456-90af-aa443a4617ad",
        "day": 2,
      },
      {
        "type": "DISAPPEARANCE",
        "disappearedPlayerIds": [
          "chipie",
        ],
        "id": "d27db5ad-8bcd-4de0-b970-a09950e33f80",
        "day": 2,
      },
      {
        "type": "INVESTIGATION",
        "investigatorId": "sha_ming",
        "targetId": "comet",
        "result": "HUMAN",
        "id": "5308555b-c6c3-4072-9bd2-65b46fc256f9",
        "day": 3,
      },
      {
        "type": "DOCTOR_REPORT",
        "reporterId": "raqio",
        "targetId": "remnan",
        "result": "HUMAN",
        "id": "669a8777-57f7-46fc-a538-72ac22ead763",
        "day": 3,
      },
      {
        "type": "DOCTOR_REPORT",
        "reporterId": "jonas",
        "targetId": "remnan",
        "result": "HUMAN",
        "id": "2eed54ac-d606-4d41-9d0d-da9dbff66518",
        "day": 3,
      },
      {
        "type": "VOTE",
        "frozenPlayerId": "sha_ming",
        "id": "72deb14f-ea4a-40f4-ab80-12782c2d20ae",
        "day": 3,
      },
      {
        "type": "DISAPPEARANCE",
        "disappearedPlayerIds": [
          "yuriko",
        ],
        "id": "0332f57c-d140-413d-b7e5-d7964b45f456",
        "day": 3,
      },
      {
        "type": "DOCTOR_REPORT",
        "reporterId": "raqio",
        "targetId": "sha_ming",
        "result": "HUMAN",
        "id": "ae9d3903-059a-4003-ae3a-4cdcc7196011",
        "day": 4,
      },
      {
        "type": "DOCTOR_REPORT",
        "reporterId": "jonas",
        "targetId": "sha_ming",
        "result": "GNOSIA",
        "id": "43f11fee-a568-4e23-9c32-54344a14699a",
        "day": 4,
      },
      {
        "type": "VOTE",
        "frozenPlayerId": "stella",
        "id": "ab405bfe-f5b4-4922-a6a6-c042357e223b",
        "day": 4,
      },
      {
        "type": "DISAPPEARANCE",
        "disappearedPlayerIds": [
          "setsu",
        ],
        "id": "24f55035-b25b-4871-86ee-7d04938a4bd6",
        "day": 4,
      },
      {
        "type": "DOCTOR_REPORT",
        "reporterId": "raqio",
        "targetId": "stella",
        "result": "HUMAN",
        "id": "18a4725d-5d91-4050-9e02-78e165afd6fe",
        "day": 5,
      },
      {
        "type": "DOCTOR_REPORT",
        "reporterId": "jonas",
        "targetId": "stella",
        "result": "GNOSIA",
        "id": "f90846e4-67a8-4088-92b5-8da85e4957a6",
        "day": 5,
      },
      {
        "type": "VOTE",
        "frozenPlayerId": "gina",
        "id": "587670ac-808f-4f3c-b094-887b0c2e29ff",
        "day": 5,
      },
      {
        "type": "DISAPPEARANCE",
        "disappearedPlayerIds": [
          "jonas",
        ],
        "id": "53f85da4-cfaa-442b-a93f-b51c5fcb2122",
        "day": 5,
      },
      {
        "type": "DOCTOR_REPORT",
        "reporterId": "raqio",
        "targetId": "gina",
        "result": "GNOSIA",
        "id": "ac77b29c-792d-42c2-9533-9e0837dfad76",
        "day": 6,
      },
      {
        "type": "VOTE",
        "frozenPlayerId": "sq",
        "id": "4a8ea888-bb83-4337-a099-93746c3d7212",
        "day": 6,
      },
      {
        "type": "DISAPPEARANCE",
        "disappearedPlayerIds": [],
        "id": "03508eb1-6457-48a0-a064-bb66692abfbc",
        "day": 6,
      },
      {
        "type": "DOCTOR_REPORT",
        "reporterId": "raqio",
        "targetId": "sq",
        "result": "HUMAN",
        "id": "df84b852-56ef-4498-be14-a2b04626572c",
        "day": 7,
      },
    ],
    "currentDay": 7,
    "perspective": {
      "id": "objective",
      "name": "全体 (客観神視点)",
    },
    "perspectiveRoles": {},
    "playerStatuses": {},
    "gnosiaComrades": [],
  },
};
