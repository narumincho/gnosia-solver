import { useState } from "preact/hooks";
import { Eye } from "lucide-preact";
import {
  PlayerStatus,
  Role,
  ROLE_DEFINITIONS,
  SolverResult,
} from "../types.ts";

type PlayerCardProps = {
  readonly player: { readonly id: string; readonly name: string };
  readonly status: PlayerStatus;
  readonly claimedRoles: ReadonlyArray<"ENGINEER" | "DOCTOR" | "GUARD_DUTY">;
  readonly definiteLieReasons?: ReadonlyArray<string> | undefined;
  readonly isCurrentPerspective: boolean;
  readonly solverResult: SolverResult;
  readonly myRole?: Role | undefined;
  readonly isGnosiaComrade?: boolean | undefined;
  readonly onToggleGnosiaComrade?: ((playerId: string) => void) | undefined;
  readonly onTogglePerspective?: (
    playerId: string,
    playerName: string,
  ) => void;
  readonly onQuickLie: (playerId: string) => void;
  readonly onQuickFreeze: (playerId: string) => void;
  readonly onQuickAttack: (playerId: string) => void;
  readonly onQuickGnosiaAttack?: ((playerId: string) => void) | undefined;
  readonly onQuickInvestigate: (playerId: string) => void;
  readonly onQuickDoctorReport?: ((playerId: string) => void) | undefined;
};

type DonutSlice = {
  readonly role: Role;
  readonly prob: number;
  readonly color: string;
  readonly name: string;
};

function RolePieChart({
  roleProbs,
  definiteRole,
  tooltip,
}: {
  readonly roleProbs: Partial<Record<Role, number>>;
  readonly definiteRole?: Role | undefined;
  readonly tooltip: string;
}) {
  const [hovered, setHovered] = useState<DonutSlice | undefined>(undefined);

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

  const size = 74;
  const cx = size / 2;
  const cy = size / 2;
  const r = 50;

  const getCenterLabel = () => {
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
        return "";
    }
  };

  const centerLabel = getCenterLabel();

  // 扇形スライスの計算
  let currentAngle = -Math.PI / 2; // 12 o'clock

  return (
    <div
      className="role-pie-wrapper"
      title={tooltip}
      onMouseLeave={() => setHovered(undefined)}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="role-pie-svg"
      >
        {/* 背景ベース */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="rgba(255, 255, 255, 0.08)"
        />

        {/* 単一ロール (100%) の場合 */}
        {activeSlices.length === 1 && (
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill={activeSlices[0]?.color}
            className="role-pie-slice"
            onMouseEnter={() => setHovered(activeSlices[0])}
          >
            <title>{`${activeSlices[0]?.name}: 100%`}</title>
          </circle>
        )}

        {/* 複数ロールの場合: SVG扇形パス */}
        {activeSlices.length > 1 &&
          activeSlices.map((slice) => {
            const angle = slice.prob * 2 * Math.PI;
            const startAngle = currentAngle;
            const endAngle = currentAngle + angle;
            currentAngle = endAngle;

            const x1 = cx + r * Math.cos(startAngle);
            const y1 = cy + r * Math.sin(startAngle);
            const x2 = cx + r * Math.cos(endAngle);
            const y2 = cy + r * Math.sin(endAngle);
            const largeArc = angle > Math.PI ? 1 : 0;

            const d = `M ${cx} ${cy} L ${x1.toFixed(2)} ${
              y1.toFixed(2)
            } A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
            const pct = Math.round(slice.prob * 100);

            return (
              <path
                key={slice.role}
                d={d}
                fill={slice.color}
                className="role-pie-slice"
                onMouseEnter={() => setHovered(slice)}
              >
                <title>{`${slice.name}: ${pct}%`}</title>
              </path>
            );
          })}

        {/* 外枠境界線 (クリーンな円周) */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="rgba(255, 255, 255, 0.2)"
          strokeWidth="1"
          style={{ pointerEvents: "none" }}
        />

        {/* 中央テキスト: ホバー時は役職名と%、非ホバー時は確定役職略称 */}
        {hovered
          ? (
            <g style={{ pointerEvents: "none" }}>
              <text
                x={cx}
                y={cy - 4}
                textAnchor="middle"
                dominantBaseline="central"
                fill={hovered.color}
                fontSize="8.5"
                fontWeight="700"
                fontFamily="var(--font-body)"
              >
                {hovered.name}
              </text>
              <text
                x={cx}
                y={cy + 6}
                textAnchor="middle"
                dominantBaseline="central"
                fill="var(--text-main)"
                fontSize="10"
                fontWeight="800"
                fontFamily="var(--font-display)"
              >
                {`${Math.round(hovered.prob * 100)}%`}
              </text>
            </g>
          )
          : centerLabel
          ? (
            <text
              x={cx}
              y={cy}
              textAnchor="middle"
              dominantBaseline="central"
              fill={definiteRole
                ? ROLE_DEFINITIONS[definiteRole].color
                : "var(--text-main)"}
              fontSize={centerLabel.length >= 3 ? "10" : "12"}
              fontWeight="800"
              fontFamily="var(--font-display)"
              style={{ pointerEvents: "none" }}
            >
              {centerLabel}
            </text>
          )
          : null}
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
  onTogglePerspective,
}: PlayerCardProps) {
  const roleProbs = solverResult.roleProbabilities[player.id] ?? {};
  const definiteRole = solverResult.definiteRoles[player.id];

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

  const probSummary = sortedRoles.length > 0
    ? sortedRoles
      .map((s) => `${s.name}: ${Math.round(s.prob * 100)}%`)
      .join("\n")
    : "確率データなし";

  const lieSummary = definiteLieReasons && definiteLieReasons.length > 0
    ? `\n【嘘・密告情報】\n${definiteLieReasons.join("\n")}`
    : "";

  const tooltipText = `${probSummary}${lieSummary}`;

  return (
    <div className={cardClass}>
      {/* 上部: 名前 + 視点切り替え目のアイコン + 右上: COバッジ・ステータス */}
      <div className="player-card-header">
        <div className="player-name-row">
          <button
            type="button"
            className={`perspective-eye-btn ${
              isCurrentPerspective ? "active" : ""
            }`}
            onClick={(e) => {
              e.stopPropagation();
              onTogglePerspective?.(player.id, player.name);
            }}
            title={isCurrentPerspective
              ? "視点を解除（全体俯瞰に戻す）"
              : `${player.name} の視点に切り替える`}
            aria-label={isCurrentPerspective
              ? `${player.name} の視点を解除して全体俯瞰に戻す`
              : `${player.name} の視点に切り替える`}
          >
            <Eye
              size={15}
              color={isCurrentPerspective
                ? "var(--accent-primary, #38bdf8)"
                : "var(--text-muted)"}
            />
          </button>
          <span className="player-name">{player.name}</span>
          {isCurrentPerspective && (
            <span className="perspective-badge">(視点)</span>
          )}
        </div>
        <div className="player-header-badges">
          {claimedRoles.map((role) => (
            <span
              key={role}
              className={`badge badge-co ${ROLE_DEFINITIONS[role].badgeClass}`}
              title={`${ROLE_DEFINITIONS[role].name}名乗り (CO)`}
            >
              {role === "GUARD_DUTY"
                ? "留守番CO"
                : `${ROLE_DEFINITIONS[role].name}CO`}
            </span>
          ))}
          {getStatusBadge()}
        </div>
      </div>

      {/* 中央: 拡大円グラフ (各スライスホバーで役職名と%を表示) */}
      <RolePieChart
        roleProbs={roleProbs}
        definiteRole={definiteRole}
        tooltip={tooltipText}
      />
    </div>
  );
}
