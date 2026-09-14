import { useRef, useState } from "preact/hooks";
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
  readonly shortName: string;
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
  const [mousePos, setMousePos] = useState<{
    readonly x: number;
    readonly y: number;
  }>({
    x: 0,
    y: 0,
  });
  const wrapperRef = useRef<HTMLDivElement>(null);

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
      shortName: ROLE_DEFINITIONS[role].shortName,
    }));

  const size = 74;
  const cx = size / 2;
  const cy = size / 2;
  const r = 35;

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
  const computedSlices = activeSlices.map((slice) => {
    const angle = slice.prob * 2 * Math.PI;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;
    const midAngle = startAngle + angle / 2;
    return {
      ...slice,
      startAngle,
      endAngle,
      midAngle,
      angle,
    };
  });

  const updateMousePos = (e: MouseEvent) => {
    if (!wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div
      ref={wrapperRef}
      className="role-pie-wrapper"
      title={tooltip}
      onMouseMove={updateMousePos}
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
        {computedSlices.length === 1 && (
          <g>
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill={computedSlices[0]?.color}
              className={`role-pie-slice ${
                hovered?.role === computedSlices[0]?.role ? "is-hovered" : ""
              }`}
              onMouseEnter={(e: MouseEvent) => {
                setHovered(computedSlices[0]);
                updateMousePos(e);
              }}
            />
            <text
              x={cx}
              y={cy}
              textAnchor="middle"
              dominantBaseline="central"
              fill="#ffffff"
              stroke="rgba(0, 0, 0, 0.85)"
              strokeWidth="1.3"
              paintOrder="stroke fill"
              fontSize={centerLabel
                ? (centerLabel.length >= 3 ? "10" : "11")
                : "11"}
              fontWeight="800"
              fontFamily="var(--font-display)"
              style={{
                pointerEvents: "none",
                userSelect: "none",
                filter: "drop-shadow(0 1px 2px rgba(0, 0, 0, 0.8))",
              }}
            >
              {centerLabel || computedSlices[0]?.shortName}
            </text>
          </g>
        )}

        {/* 複数ロールの場合: SVG扇形パス + 確率大の頭文字表示 */}
        {computedSlices.length > 1 &&
          computedSlices.map((slice) => {
            const x1 = cx + r * Math.cos(slice.startAngle);
            const y1 = cy + r * Math.sin(slice.startAngle);
            const x2 = cx + r * Math.cos(slice.endAngle);
            const y2 = cy + r * Math.sin(slice.endAngle);
            const largeArc = slice.angle > Math.PI ? 1 : 0;

            const d = `M ${cx} ${cy} L ${x1.toFixed(2)} ${
              y1.toFixed(2)
            } A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;

            // 扇形内に文字が絶対に収まる条件：
            // 2文字（AC, バグ）は20%以上、1文字（乗, グ等）は14%以上
            const isMultiChar = slice.shortName.length >= 2;
            const showInitial = isMultiChar
              ? slice.prob >= 0.20
              : slice.prob >= 0.14;

            // スライス内での文字配置半径（外周にも中心にも飛び出さない位置）
            const labelR = 21;
            const lx = cx + labelR * Math.cos(slice.midAngle);
            const ly = cy + labelR * Math.sin(slice.midAngle);

            const fontSize = isMultiChar
              ? "7.5"
              : slice.prob >= 0.25
              ? "9"
              : "8";

            return (
              <g key={slice.role}>
                <path
                  d={d}
                  fill={slice.color}
                  className={`role-pie-slice ${
                    hovered?.role === slice.role ? "is-hovered" : ""
                  }`}
                  onMouseEnter={(e: MouseEvent) => {
                    setHovered(slice);
                    updateMousePos(e);
                  }}
                />
                {showInitial && (
                  <text
                    x={lx.toFixed(2)}
                    y={ly.toFixed(2)}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="#ffffff"
                    stroke="rgba(0, 0, 0, 0.9)"
                    strokeWidth="1.2"
                    paintOrder="stroke fill"
                    fontSize={fontSize}
                    fontWeight="800"
                    fontFamily="var(--font-display)"
                    style={{
                      pointerEvents: "none",
                      userSelect: "none",
                      filter: "drop-shadow(0 1px 1px rgba(0, 0, 0, 0.8))",
                    }}
                  >
                    {slice.shortName}
                  </text>
                )}
              </g>
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
      </svg>

      {/* ホバー時: マウスカーソル右下に表示してグラフと被らないツールチップ */}
      {hovered && (
        <div
          className="role-pie-tooltip"
          style={{
            left: `${mousePos.x + 12}px`,
            top: `${mousePos.y + 12}px`,
          }}
        >
          <span
            className="role-pie-tooltip-name"
            style={{ color: hovered.color }}
          >
            {hovered.name}
          </span>
          <span className="role-pie-tooltip-pct">
            {`${Math.round(hovered.prob * 100)}%`}
          </span>
        </div>
      )}
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
