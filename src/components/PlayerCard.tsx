import { AlertTriangle, User } from "lucide-preact";
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

function RoleDonutChart({
  roleProbs,
  definiteRole,
  gnosiaPct,
  tooltip,
}: {
  readonly roleProbs: Partial<Record<Role, number>>;
  readonly definiteRole?: Role | undefined;
  readonly gnosiaPct: number;
  readonly tooltip: string;
}) {
  const size = 52;
  const strokeWidth = 7;
  const radius = 18;
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
            fontSize: definiteRole
              ? (ROLE_DEFINITIONS[definiteRole].shortName.length > 2
                ? "0.65rem"
                : "0.75rem")
              : (gnosiaPct >= 100 ? "0.65rem" : "0.72rem"),
            fontWeight: "bold",
            fontFamily: "var(--font-display)",
          }}
        >
          {definiteRole
            ? ROLE_DEFINITIONS[definiteRole].shortName
            : `${gnosiaPct}%`}
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

  return (
    <div className={cardClass}>
      <div className="player-card-header">
        <div className="player-name-row">
          <User
            size={16}
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

      <div className="player-card-body">
        {/* 円グラフ (ドーナツチャート) */}
        <RoleDonutChart
          roleProbs={roleProbs}
          definiteRole={definiteRole}
          gnosiaPct={gnosiaPct}
          tooltip={tooltipText}
        />

        {/* 右側情報ブロック */}
        <div className="player-card-info">
          {/* COバッジや嘘確定・役職確定バッジ */}
          <div className="player-badges-row">
            {claimedRoles.map((r) => (
              <span
                key={r}
                className={`badge badge-compact ${
                  ROLE_DEFINITIONS[r].badgeClass
                }`}
              >
                {ROLE_DEFINITIONS[r].name}CO
              </span>
            ))}

            {definiteRole && (
              <span
                className={`badge badge-compact ${
                  ROLE_DEFINITIONS[definiteRole].badgeClass
                }`}
                style={{ boxShadow: "0 0 6px currentColor" }}
              >
                確定: {ROLE_DEFINITIONS[definiteRole].name}
              </span>
            )}

            {definiteLieReasons && definiteLieReasons.length > 0 && (
              <span
                className="badge badge-compact"
                style={{
                  background: "rgba(244, 63, 94, 0.3)",
                  color: "#fb7185",
                  border: "1px solid #f43f5e",
                }}
                title={definiteLieReasons.join("\n")}
              >
                <AlertTriangle size={11} />
                {definiteLieReasons.some((r) => r.includes("自分"))
                  ? "嘘確定"
                  : "密告"}
              </span>
            )}
          </div>

          {/* 敵対・G確率 */}
          <div className="player-meta-row">
            <span className="meter-val-enemy">
              敵対:{" "}
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

          {/* 内訳ミニピル (上位2件) */}
          <div className="role-mini-list">
            {sortedRoles.slice(0, 2).map((slice) => (
              <span
                key={slice.role}
                className="role-mini-pill"
                title={`${slice.name}: ${Math.round(slice.prob * 100)}%`}
              >
                <span
                  className="role-mini-dot"
                  style={{ backgroundColor: slice.color }}
                />
                {slice.name} {Math.round(slice.prob * 100)}%
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
