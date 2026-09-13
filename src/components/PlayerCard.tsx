import { User } from "lucide-preact";
import {
  PlayerStatus,
  Role,
  ROLE_DEFINITIONS,
  SolverResult,
} from "../types.ts";

interface PlayerCardProps {
  readonly player: { readonly id: string; readonly name: string };
  readonly status: PlayerStatus;
  readonly claimedRoles: ReadonlyArray<"ENGINEER" | "DOCTOR" | "GUARD_DUTY">;
  readonly definiteLieReasons?: ReadonlyArray<string> | undefined;
  readonly isCurrentPerspective: boolean;
  readonly solverResult: SolverResult;
  readonly myRole?: Role | undefined;
  readonly isGnosiaComrade?: boolean | undefined;
  readonly onToggleGnosiaComrade?: ((playerId: string) => void) | undefined;
  readonly onQuickLie: (playerId: string) => void;
  readonly onQuickFreeze: (playerId: string) => void;
  readonly onQuickAttack: (playerId: string) => void;
  readonly onQuickGnosiaAttack?: ((playerId: string) => void) | undefined;
  readonly onQuickInvestigate: (playerId: string) => void;
  readonly onQuickDoctorReport?: ((playerId: string) => void) | undefined;
}

interface DonutSlice {
  readonly role: Role;
  readonly prob: number;
  readonly color: string;
  readonly name: string;
}

interface RoleChip {
  readonly id: string;
  readonly text: string;
  readonly badgeClass: string;
  readonly title: string;
}

function getRoleChips(
  claimedRoles: ReadonlyArray<"ENGINEER" | "DOCTOR" | "GUARD_DUTY">,
  definiteRole: Role | undefined,
  roleProbs: Partial<Record<Role, number>>,
  definiteLieReasons?: ReadonlyArray<string> | undefined,
): ReadonlyArray<RoleChip> {
  const chips: Array<RoleChip> = [];

  // 1. CO役職の真偽判定
  for (const claimed of claimedRoles) {
    const roleDef = ROLE_DEFINITIONS[claimed];
    if (definiteRole === claimed) {
      chips.push({
        id: `claimed-${claimed}`,
        text: claimed === "GUARD_DUTY" ? "留守番" : `真${roleDef.name}`,
        badgeClass: roleDef.badgeClass,
        title: `${roleDef.name}確定 (真)`,
      });
    } else if ((roleProbs[claimed] ?? 0) === 0) {
      chips.push({
        id: `claimed-${claimed}`,
        text: claimed === "GUARD_DUTY" ? "偽留守番" : `偽${roleDef.name}`,
        badgeClass: "badge-fake",
        title: `${roleDef.name}ではないことが確定 (偽)`,
      });
    } else {
      chips.push({
        id: `claimed-${claimed}`,
        text: `${roleDef.name}CO`,
        badgeClass: roleDef.badgeClass,
        title: `${roleDef.name}名乗り (真偽未確定)`,
      });
    }
  }

  // 2. 確定役職の表示（真COとして既に表示されている場合を除く）
  if (definiteRole) {
    const isAlreadyShownAsTrueCO = claimedRoles.includes(
      definiteRole as "ENGINEER" | "DOCTOR" | "GUARD_DUTY",
    );
    if (!isAlreadyShownAsTrueCO) {
      const def = ROLE_DEFINITIONS[definiteRole];
      chips.push({
        id: `definite-${definiteRole}`,
        text: def.name,
        badgeClass: def.badgeClass,
        title: `役職確定: ${def.name}`,
      });
    }
  }

  // 3. 嘘確定 / 密告
  if (definiteLieReasons && definiteLieReasons.length > 0) {
    const isSelf = definiteLieReasons.some((r) => r.includes("自分"));
    chips.push({
      id: "lie",
      text: isSelf ? "嘘確定" : "密告",
      badgeClass: "badge-lie",
      title: definiteLieReasons.join("\n"),
    });
  }

  return chips;
}

function RoleDonutChart({
  roleProbs,
  definiteRole,
  gnosiaPct,
  enemyPct,
  tooltip,
}: {
  readonly roleProbs: Partial<Record<Role, number>>;
  readonly definiteRole?: Role | undefined;
  readonly gnosiaPct: number;
  readonly enemyPct: number;
  readonly tooltip: string;
}) {
  const size = 56;
  const strokeWidth = 7.5;
  const radius = 20;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  const activeSlices: ReadonlyArray<DonutSlice> = (
    Object.entries(roleProbs) as ReadonlyArray<[Role, number]>
  )
    .filter(([_, prob]) => prob > 0.005)
    .sort((a, b) => b[1] - a[1])
    .map(([role, prob]) => ({
      role,
      prob,
      color: ROLE_DEFINITIONS[role].color,
      name: ROLE_DEFINITIONS[role].name,
    }));

  let accumulatedPercent = 0;

  const getCenterLabel = () => {
    if (definiteRole) {
      switch (definiteRole) {
        case "ENGINEER":
          return "真工";
        case "DOCTOR":
          return "真医";
        case "GUARD_DUTY":
          return "留";
        case "GUARDIAN_ANGEL":
          return "守";
        case "CREW":
          return "乗";
        case "GNOSIA":
          return "グ";
        case "AC_FOLLOWER":
          return "AC";
        case "BUG":
          return "バグ";
        default:
          return ROLE_DEFINITIONS[definiteRole].shortName;
      }
    }
    if (gnosiaPct > 0) return `${gnosiaPct}%`;
    if (enemyPct > 0) return `敵${enemyPct}%`;
    return "0%";
  };

  const centerLabel = getCenterLabel();

  return (
    <div className="role-donut-wrapper" title={tooltip}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="role-donut-svg"
      >
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth={strokeWidth}
        />
        <g transform={`rotate(-90 ${center} ${center})`}>
          {activeSlices.map((slice) => {
            const dash = slice.prob * circumference;
            const offset = accumulatedPercent * circumference;
            accumulatedPercent += slice.prob;

            return (
              <circle
                key={slice.role}
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={slice.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
                className="role-donut-slice"
              />
            );
          })}
        </g>
        <text
          x={center}
          y={center}
          textAnchor="middle"
          dominantBaseline="central"
          className="role-donut-center-text"
          style={{
            fill: definiteRole
              ? ROLE_DEFINITIONS[definiteRole].color
              : gnosiaPct > 0
              ? "var(--color-gnosia)"
              : "var(--text-muted)",
            fontSize: centerLabel.length >= 4
              ? "0.6rem"
              : centerLabel.length === 3
              ? "0.68rem"
              : "0.75rem",
            fontWeight: "bold",
            fontFamily: "var(--font-display)",
          }}
        >
          {centerLabel}
        </text>
      </svg>
    </div>
  );
}

export function PlayerCard({
  player,
  status,
  claimedRoles,
  definiteLieReasons,
  isCurrentPerspective,
  solverResult,
}: PlayerCardProps) {
  const gnosiaProb = solverResult.gnosiaProbabilities[player.id] ?? 0;
  const enemyProb = solverResult.enemyProbabilities[player.id] ?? 0;
  const roleProbs = solverResult.roleProbabilities[player.id] ?? {};
  const definiteRole = solverResult.definiteRoles[player.id];

  const gnosiaPct = Math.round(gnosiaProb * 100);
  const enemyPct = Math.round(enemyProb * 100);

  // ステータスクラス
  const cardClass = [
    "player-card",
    status === "FROZEN" ? "frozen" : "",
    status === "ATTACKED" ? "attacked" : "",
    isCurrentPerspective ? "is-perspective" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const getStatusBadge = () => {
    switch (status) {
      case "FROZEN":
        return <span className="player-status-badge status-frozen">冷凍</span>;
      case "ATTACKED":
        return (
          <span className="player-status-badge status-attacked">
            消滅
          </span>
        );
      default:
        return <span className="player-status-badge status-alive">生存</span>;
    }
  };

  const sortedRoles: ReadonlyArray<DonutSlice> = (
    Object.entries(roleProbs) as ReadonlyArray<[Role, number]>
  )
    .filter(([_, prob]) => prob > 0.005)
    .sort((a, b) => b[1] - a[1])
    .map(([role, prob]) => ({
      role,
      prob,
      color: ROLE_DEFINITIONS[role].color,
      name: ROLE_DEFINITIONS[role].name,
    }));

  const tooltipText = sortedRoles.length > 0
    ? sortedRoles
      .map((s) => `${s.name}: ${Math.round(s.prob * 100)}%`)
      .join("\n")
    : "確率データなし";

  const chips = getRoleChips(
    claimedRoles,
    definiteRole,
    roleProbs,
    definiteLieReasons,
  );

  return (
    <div className={cardClass}>
      {/* 上部: 名前 + 視点 + ステータス */}
      <div className="player-card-header">
        <div className="player-name-row">
          <User
            size={14}
            color={isCurrentPerspective
              ? "var(--text-accent)"
              : "var(--text-muted)"}
          />
          <span className="player-name">{player.name}</span>
          {isCurrentPerspective && (
            <span className="perspective-badge">(視点)</span>
          )}
        </div>
        {getStatusBadge()}
      </div>

      {/* 中央: 円グラフ (ドーナツチャート) */}
      <RoleDonutChart
        roleProbs={roleProbs}
        definiteRole={definiteRole}
        gnosiaPct={gnosiaPct}
        enemyPct={enemyPct}
        tooltip={tooltipText}
      />

      {/* 下部: チップ一覧 */}
      {chips.length > 0 && (
        <div className="player-badges-row">
          {chips.map((chip) => (
            <span
              key={chip.id}
              className={`badge badge-compact ${chip.badgeClass}`}
              title={chip.title}
            >
              {chip.text}
            </span>
          ))}
        </div>
      )}

      {/* 未確定時の確率概要 */}
      {!definiteRole && (
        <div className="player-meta-row">
          <span className="meter-val-enemy">
            敵:{" "}
            <strong
              style={{
                color: enemyPct > 50
                  ? "var(--color-gnosia)"
                  : "var(--text-main)",
              }}
            >
              {enemyPct}%
            </strong>
          </span>
          <span className="meter-val-gnosia">
            G: <strong>{gnosiaPct}%</strong>
          </span>
        </div>
      )}
    </div>
  );
}
