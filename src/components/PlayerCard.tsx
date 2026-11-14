import { useRef, useState } from "preact/hooks";
import { Eye } from "lucide-preact";
import {
  PlayerStatus,
  Role,
  ROLE_DEFINITIONS,
  SolverResult,
} from "../types.ts";
import { Conclusion, getConclusion } from "../solver/explain.ts";
import { conclusionLabel } from "./ExplanationModal.tsx";

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
  readonly onExplain?:
    | ((playerId: string, conclusion: Conclusion) => void)
    | undefined;
};

type DonutSlice = {
  readonly role: Role;
  readonly prob: number;
  readonly color: string;
  readonly name: string;
  readonly shortName: string;
};

function RolePieChart({
  slices,
  definiteRole,
  enemyProb,
  tooltip,
}: {
  readonly slices: ReadonlyArray<DonutSlice>;
  readonly definiteRole?: Role | undefined;
  readonly enemyProb: number | undefined;
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

  const size = 70;
  const cx = size / 2;
  const cy = size / 2;
  const r = 35;
  const innerR = 22;

  // 中央表示: 役職確定ならその役職、未確定なら敵陣営確率
  const centerMain = definiteRole
    ? CENTER_LABELS[definiteRole]
    : enemyProb === undefined
    ? "-"
    : `${Math.round(enemyProb * 100)}%`;
  const centerSub = definiteRole ? "確定" : "敵";

  // ドーナツのスライス計算
  let currentAngle = -Math.PI / 2; // 12 o'clock
  const computedSlices = slices.map((slice) => {
    const angle = slice.prob * 2 * Math.PI;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;
    return { ...slice, startAngle, endAngle, angle };
  });

  const updateMousePos = (e: MouseEvent) => {
    if (!wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  // 円環全体 (外周の円から内周の円をくり抜く)
  const ringPath = `M ${cx - r} ${cy} a ${r} ${r} 0 1 0 ${
    2 * r
  } 0 a ${r} ${r} 0 1 0 ${-2 * r} 0 Z M ${
    cx - innerR
  } ${cy} a ${innerR} ${innerR} 0 1 0 ${
    2 * innerR
  } 0 a ${innerR} ${innerR} 0 1 0 ${-2 * innerR} 0 Z`;

  const point = (radius: number, angle: number) =>
    `${(cx + radius * Math.cos(angle)).toFixed(2)} ${
      (cy + radius * Math.sin(angle)).toFixed(2)
    }`;

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
        role="img"
        aria-label={tooltip}
      >
        {/* 背景ベース */}
        <path
          d={ringPath}
          fill="rgba(255, 255, 255, 0.08)"
          fill-rule="evenodd"
        />

        {computedSlices.map((slice) => {
          const isHovered = hovered?.role === slice.role;
          const onEnter = (e: MouseEvent) => {
            setHovered(slice);
            updateMousePos(e);
          };
          // 100% のときは円弧で描けないので円で描く
          if (slice.angle >= 2 * Math.PI - 1e-6) {
            return (
              <path
                key={slice.role}
                d={ringPath}
                fill={slice.color}
                fill-rule="evenodd"
                className={`role-pie-slice ${isHovered ? "is-hovered" : ""}`}
                onMouseEnter={onEnter}
              />
            );
          }
          const largeArc = slice.angle > Math.PI ? 1 : 0;
          const d = `M ${
            point(r, slice.startAngle)
          } A ${r} ${r} 0 ${largeArc} 1 ${point(r, slice.endAngle)} L ${
            point(innerR, slice.endAngle)
          } A ${innerR} ${innerR} 0 ${largeArc} 0 ${
            point(innerR, slice.startAngle)
          } Z`;
          return (
            <path
              key={slice.role}
              d={d}
              fill={slice.color}
              className={`role-pie-slice ${isHovered ? "is-hovered" : ""}`}
              onMouseEnter={onEnter}
            />
          );
        })}

        {/* 中央テキスト */}
        <text
          x={cx}
          y={cy - 1}
          text-anchor="middle"
          dominant-baseline="central"
          className="role-pie-center-main"
          fontSize={centerMain.length >= 4
            ? "9"
            : centerMain.length === 3
            ? "10.5"
            : "12"}
        >
          {centerMain}
        </text>
        <text
          x={cx}
          y={cy + 11}
          text-anchor="middle"
          dominant-baseline="central"
          className="role-pie-center-sub"
        >
          {centerSub}
        </text>
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

/** 確定役職のときにドーナツ中央に出す短い表記 */
const CENTER_LABELS: Record<Role, string> = {
  ENGINEER: "真エ",
  DOCTOR: "真ド",
  GUARD_DUTY: "留守",
  GUARDIAN_ANGEL: "守護",
  CREW: "乗員",
  GNOSIA: "グノ",
  AC_FOLLOWER: "AC",
  BUG: "バグ",
};

/** 確率の高い役職を上位から最大 3 件、テキストで表示する */
function RoleProbList(
  { slices }: { readonly slices: ReadonlyArray<DonutSlice> },
) {
  if (slices.length <= 1) return null;
  const top = slices.slice(0, 3);
  const rest = slices.length - top.length;
  return (
    <ul className="role-prob-list">
      {top.map((s) => (
        <li key={s.role}>
          <span className="role-prob-dot" style={{ background: s.color }} />
          <span className="role-prob-name">{s.name}</span>
          <span className="role-prob-pct">{Math.round(s.prob * 100)}%</span>
        </li>
      ))}
      {rest > 0 && <li className="role-prob-rest">ほか{rest}役職</li>}
    </ul>
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
  onExplain,
}: PlayerCardProps) {
  const roleProbs = solverResult.roleProbabilities[player.id] ?? {};
  const definiteRole = solverResult.definiteRoles[player.id];
  const conclusion = getConclusion(solverResult, player.id);

  // ステータスクラス
  const cardClass = [
    "player-card",
    status === "FROZEN" ? "frozen" : "",
    status === "ATTACKED" ? "attacked" : "",
    status !== "ALIVE" ? "is-dead" : "",
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
      shortName: ROLE_DEFINITIONS[role].shortName,
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
      {/* 上段: 視点切り替え目のアイコン + 名前 */}
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
          <span className="player-name" title={player.name}>
            {player.name}
          </span>
          {isCurrentPerspective && (
            <span className="perspective-badge">(視点)</span>
          )}
        </div>
      </div>

      {/* 下段: COバッジ・ステータス (名前が省略されないよう別の行に置く) */}
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

      {/* 中央: 拡大円グラフ (各スライスホバーで役職名と%を表示) */}
      <RolePieChart
        slices={sortedRoles}
        definiteRole={definiteRole}
        enemyProb={solverResult.enemyProbabilities[player.id]}
        tooltip={tooltipText}
      />

      <RoleProbList slices={sortedRoles} />

      {/* 視点人物は役職を前提として固定しているので根拠は出さない */}
      {conclusion && onExplain && !isCurrentPerspective && (
        <button
          type="button"
          className="explain-btn"
          onClick={() => onExplain(player.id, conclusion)}
          title={`${player.name} が${
            conclusionLabel(conclusion)
          }になった根拠を表示`}
        >
          根拠
        </button>
      )}
    </div>
  );
}
