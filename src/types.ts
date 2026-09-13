// 役職の定義
export type Role =
  | "CREW" // 乗員 (人間陣営)
  | "GNOSIA" // グノーシア (グノーシア陣営)
  | "ENGINEER" // エンジニア (人間陣営)
  | "DOCTOR" // ドクター (人間陣営)
  | "GUARDIAN_ANGEL" // 守護天使 (人間陣営)
  | "GUARD_DUTY" // 留守番 (人間陣営・2人ペア)
  | "AC_FOLLOWER" // AC主義者 (グノーシア陣営・人間判定)
  | "BUG"; // バグ (第3陣営・人間判定・調査で蒸発)

export interface RoleInfo {
  id: Role;
  name: string;
  shortName: string;
  side: "HUMAN" | "GNOSIA" | "BUG";
  color: string;
  badgeClass: string;
  description: string;
}

export const ROLE_DEFINITIONS: Record<Role, RoleInfo> = {
  CREW: {
    id: "CREW",
    name: "乗員",
    shortName: "乗",
    side: "HUMAN",
    color: "#60a5fa",
    badgeClass: "badge-crew",
    description: "能力を持たない一般乗員。人間陣営。",
  },
  GNOSIA: {
    id: "GNOSIA",
    name: "グノーシア",
    shortName: "グ",
    side: "GNOSIA",
    color: "#f43f5e",
    badgeClass: "badge-gnosia",
    description: "人間を消滅させる敵。嘘をつくことができる。",
  },
  ENGINEER: {
    id: "ENGINEER",
    name: "エンジニア",
    shortName: "エ",
    side: "HUMAN",
    color: "#06b6d4",
    badgeClass: "badge-engineer",
    description: "毎晩1人を調査し、人間かグノーシアかを判別できる。",
  },
  DOCTOR: {
    id: "DOCTOR",
    name: "ドクター",
    shortName: "ド",
    side: "HUMAN",
    color: "#a855f7",
    badgeClass: "badge-doctor",
    description: "冷凍された人物が人間かグノーシアかを判別できる。",
  },
  GUARDIAN_ANGEL: {
    id: "GUARDIAN_ANGEL",
    name: "守護天使",
    shortName: "守",
    side: "HUMAN",
    color: "#eab308",
    badgeClass: "badge-angel",
    description: "毎晩1人を襲撃から守る。COはできない。",
  },
  GUARD_DUTY: {
    id: "GUARD_DUTY",
    name: "留守番",
    shortName: "留",
    side: "HUMAN",
    color: "#10b981",
    badgeClass: "badge-guard",
    description: "必ず2人で名乗り出る。絶対に人間であることが確定する。",
  },
  AC_FOLLOWER: {
    id: "AC_FOLLOWER",
    name: "AC主義者",
    shortName: "AC",
    side: "GNOSIA",
    color: "#f97316",
    badgeClass: "badge-ac",
    description: "グノーシアの勝利を望む人間。誰がグノーシアかは知らない。",
  },
  BUG: {
    id: "BUG",
    name: "バグ",
    shortName: "バ",
    side: "BUG",
    color: "#5b5b5b",
    badgeClass: "badge-bug",
    description: "単独生存勝利を目指す。襲撃耐性あり、調査されると消滅する。",
  },
};

// 登場キャラクターのデフォルトプリセット
export interface CharacterPreset {
  id: string;
  name: string;
  defaultIncluded: boolean;
}

export const DEFAULT_CHARACTERS: ReadonlyArray<CharacterPreset> = [
  { id: "player", name: "主人公", defaultIncluded: true },
  { id: "setsu", name: "セツ", defaultIncluded: true },
  { id: "gina", name: "ジナ", defaultIncluded: true },
  { id: "sq", name: "SQ", defaultIncluded: true },
  { id: "raqio", name: "ラキオ", defaultIncluded: true },
  { id: "stella", name: "ステラ", defaultIncluded: true },
  { id: "shigemichi", name: "しげみち", defaultIncluded: true },
  { id: "chipie", name: "シピ", defaultIncluded: true },
  { id: "comet", name: "コメット", defaultIncluded: true },
  { id: "jonas", name: "ジョナス", defaultIncluded: true },
  { id: "kukrushka", name: "ククルシカ", defaultIncluded: true },
  { id: "otome", name: "オトメ", defaultIncluded: true },
  { id: "remnan", name: "レムナン", defaultIncluded: true },
  { id: "sha_ming", name: "沙明", defaultIncluded: true },
  { id: "yuriko", name: "夕里子", defaultIncluded: true },
];

// ゲーム設定
export interface GameSettings {
  players: ReadonlyArray<{ id: string; name: string }>;
  roles: {
    gnosiaCount: number;
    hasEngineer: boolean;
    hasDoctor: boolean;
    hasGuardianAngel: boolean;
    hasGuardDuty: boolean;
    hasACFollower: boolean;
    hasBug: boolean;
  };
  allowHiddenRoles: boolean; // 真エンジニア/真ドクターがCOしない潜伏を許容するか
}

// プレイヤーの状態
export type PlayerStatus = "ALIVE" | "FROZEN" | "ATTACKED" | "DISAPPEARED";

// イベント種別
export type EventType =
  | "CO" // 役職名乗り出 (ENGINEER, DOCTOR, GUARD_DUTY)
  | "INVESTIGATION" // エンジニア調査結果
  | "DOCTOR_REPORT" // ドクター判定結果
  | "DEFINITE_LIE" // 嘘をついていることが確定
  | "VOTE" // コールドスリープ (投票)
  | "DISAPPEARANCE" // 消滅もしくは平和 (夜の出来事: 0〜2人消滅)
  | "GNOSIA_ATTACK" // グノーシア夜間襲撃対象指定 (自分G視点)
  | "ATTACK" // 襲撃・消滅 (夜) - 後方互換用
  | "NO_ATTACK" // 襲撃なし (守護天使護衛 / バグ襲撃) - 後方互換用
  | "DAY_CHANGE" // 翌日へ進行 (日付切り替え)
  | "NOTE"; // メモ・その他

// 調査・ドクター判定結果
export type ReportJudgement = "HUMAN" | "GNOSIA";

export interface BaseGameEvent {
  id: string;
  day: number;
  type: EventType;
}

export interface COEvent extends BaseGameEvent {
  type: "CO";
  playerId: string;
  partnerPlayerId?: string | undefined; // 留守番CO時の2人目 (留守番COは2人ペア)
  claimedRole: "ENGINEER" | "DOCTOR" | "GUARD_DUTY";
}

export interface InvestigationEvent extends BaseGameEvent {
  type: "INVESTIGATION";
  investigatorId: string;
  targetId: string;
  result: ReportJudgement;
}

export interface DoctorReportEvent extends BaseGameEvent {
  type: "DOCTOR_REPORT";
  reporterId: string;
  targetId: string;
  result: ReportJudgement;
}

export interface DefiniteLieEvent extends BaseGameEvent {
  type: "DEFINITE_LIE";
  targetId: string; // 嘘をついた（とされる）人
  witnessId: string; // 嘘に気づいた人 (自分 = "player", または夜の密告者)
  reason?: string | undefined; // 理由メモ (後方互換用)
}

export interface VoteEvent extends BaseGameEvent {
  type: "VOTE";
  frozenPlayerId: string;
  votes?: Record<string, string> | undefined; // voterId -> targetId
}

// 消滅もしくは平和 (夜の出来事: 0〜2人消滅)
export interface DisappearanceEvent extends BaseGameEvent {
  type: "DISAPPEARANCE";
  disappearedPlayerIds: ReadonlyArray<string>; // 0人(平和/犠牲者なし), 1人消滅, 2人消滅
}

// グノーシア夜間襲撃対象指定 (自分がグノーシアの場合の視点入力)
export interface GnosiaAttackEvent extends BaseGameEvent {
  type: "GNOSIA_ATTACK";
  targetId: string; // 襲撃対象
}

export interface AttackEvent extends BaseGameEvent {
  type: "ATTACK";
  attackedPlayerId: string; // 消滅したプレイヤー (後方互換用)
}

export interface NoAttackEvent extends BaseGameEvent {
  type: "NO_ATTACK";
  guardedPlayerId?: string | undefined; // 守護天使が護衛した対象（任意） (後方互換用)
  note?: string | undefined; // メモ (後方互換用)
}

export interface DayChangeEvent extends BaseGameEvent {
  type: "DAY_CHANGE";
  note?: string | undefined; // メモ（「翌日へ」「夜の経過」など）
}

export type GameEvent =
  | COEvent
  | InvestigationEvent
  | DoctorReportEvent
  | DefiniteLieEvent
  | VoteEvent
  | DisappearanceEvent
  | GnosiaAttackEvent
  | AttackEvent
  | NoAttackEvent
  | DayChangeEvent;

export type NewGameEvent =
  | (Omit<COEvent, "id" | "day"> & { day?: number | undefined })
  | (Omit<InvestigationEvent, "id" | "day"> & { day?: number | undefined })
  | (Omit<DoctorReportEvent, "id" | "day"> & { day?: number | undefined })
  | (Omit<DefiniteLieEvent, "id" | "day"> & { day?: number | undefined })
  | (Omit<VoteEvent, "id" | "day"> & { day?: number | undefined })
  | (Omit<DisappearanceEvent, "id" | "day"> & { day?: number | undefined })
  | (Omit<GnosiaAttackEvent, "id" | "day"> & { day?: number | undefined })
  | (Omit<AttackEvent, "id" | "day"> & { day?: number | undefined })
  | (Omit<NoAttackEvent, "id" | "day"> & { day?: number | undefined })
  | (Omit<DayChangeEvent, "id" | "day"> & { day?: number | undefined });

// 1つの配役パターン (World)
export type RoleAssignment = Record<string, Role>;

export interface SolverResult {
  totalPossibleWorlds: number;
  // 各プレイヤーの各役職確率 (0.0 - 1.0)
  roleProbabilities: Record<string, Record<Role, number>>;
  // 各プレイヤーのグノーシア確率 (0.0 - 1.0)
  gnosiaProbabilities: Record<string, number>;
  // 各プレイヤーの敵対確率 (グノーシア + AC主義者 + バグ)
  enemyProbabilities: Record<string, number>;
  // 確定情報
  definiteRoles: Record<string, Role>;
  // 矛盾・破綻しているか
  hasContradiction: boolean;
  contradictionReason?: string | undefined;
  // 有効な配役一覧（上位100件など）
  sampleWorlds: ReadonlyArray<RoleAssignment>;
}

// プレイヤー視点
export interface PerspectiveOption {
  id: string; // "objective" (全体) または playerId
  name: string;
  role?: Role | undefined; // その視点での自身の役職（指定時）
}

// エクスポート / インポート用セッションデータ
export interface SessionData {
  version: number;
  exportedAt: string;
  settings: GameSettings;
  events: ReadonlyArray<GameEvent>;
  currentDay: number;
  perspective: PerspectiveOption;
  myRole?: Role | undefined;
  perspectiveRoles?: Record<string, Role> | undefined;
  playerStatuses?: Record<string, PlayerStatus> | undefined;
  gnosiaComrades?: ReadonlyArray<string> | undefined;
}
