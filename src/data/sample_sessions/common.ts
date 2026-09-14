import { GameSettings, SessionData } from "../../types.ts";

export type SampleSession = {
  readonly id: string;
  readonly title: string;
  readonly badge: string;
  readonly description: string;
  readonly data: SessionData;
};

// 15人標準メンバー
export const DEFAULT_15_PLAYERS = [
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
] as const;

// 15人フル役職 (4G)
export const SETTINGS_15P_4G: GameSettings = {
  players: [...DEFAULT_15_PLAYERS],
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

// 15人フル役職 (3G)
export const SETTINGS_15P_3G: GameSettings = {
  players: [...DEFAULT_15_PLAYERS],
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
