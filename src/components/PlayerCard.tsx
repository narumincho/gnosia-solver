import { AlertTriangle, User } from "lucide-preact";
import {
  PlayerStatus,
  Role,
  ROLE_DEFINITIONS,
  SolverResult,
} from "../types.ts";

interface PlayerCardProps {
  player: { id: string; name: string };
  status: PlayerStatus;
  claimedRoles: ReadonlyArray<"ENGINEER" | "DOCTOR" | "GUARD_DUTY">;
  definiteLieReasons?: ReadonlyArray<string> | undefined;
  isCurrentPerspective: boolean;
  solverResult: SolverResult;
  myRole?: Role | undefined;
  isGnosiaComrade?: boolean | undefined;
  onToggleGnosiaComrade?: ((playerId: string) => void) | undefined;
  onQuickLie: (playerId: string) => void;
  onQuickFreeze: (playerId: string) => void;
  onQuickAttack: (playerId: string) => void;
  onQuickGnosiaAttack?: ((playerId: string) => void) | undefined;
  onQuickInvestigate: (playerId: string) => void;
  onQuickDoctorReport?: ((playerId: string) => void) | undefined;
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

  return (
    <div className={cardClass}>
      <div className="player-card-header">
        <div className="player-name-row">
          <User
            size={18}
            color={isCurrentPerspective
              ? "var(--text-accent)"
              : "var(--text-muted)"}
          />
          <span className="player-name">{player.name}</span>
          {isCurrentPerspective && (
            <span style={{ fontSize: "0.7rem", color: "var(--text-accent)" }}>
              (視点)
            </span>
          )}
        </div>
        {getStatusBadge()}
      </div>

      {/* COバッジや嘘確定バッジ */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.35rem",
          marginBottom: "0.6rem",
        }}
      >
        {claimedRoles.map((r) => (
          <span key={r} className={`badge ${ROLE_DEFINITIONS[r].badgeClass}`}>
            {ROLE_DEFINITIONS[r].name}CO
          </span>
        ))}

        {definiteRole && (
          <span
            className={`badge ${ROLE_DEFINITIONS[definiteRole].badgeClass}`}
            style={{ boxShadow: "0 0 8px currentColor" }}
          >
            確定: {ROLE_DEFINITIONS[definiteRole].name}
          </span>
        )}

        {definiteLieReasons && definiteLieReasons.length > 0 && (
          <span
            className="badge"
            style={{
              background: "rgba(244, 63, 94, 0.3)",
              color: "#fb7185",
              border: "1px solid #f43f5e",
            }}
            title={definiteLieReasons.join("\n")}
          >
            <AlertTriangle size={12} />
            {definiteLieReasons.some((r) => r.includes("自分"))
              ? "嘘つき確定"
              : "密告あり"}
          </span>
        )}
      </div>

      {/* 役職の帯グラフ (Stacked Role Bar) */}
      <div className="role-stacked-bar-container">
        <div className="meter-labels">
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
            G確率: {gnosiaPct}%
          </span>
        </div>

        <div className="role-stacked-bar">
          {(Object.entries(roleProbs) as ReadonlyArray<[Role, number]>)
            .filter(([_, prob]) => prob > 0.005)
            .sort((a, b) => b[1] - a[1])
            .map(([role, prob]) => {
              const r = role;
              const def = ROLE_DEFINITIONS[r];
              const pct = Math.round(prob * 100);

              return (
                <div
                  key={role}
                  className="role-bar-segment"
                  style={{
                    width: `${prob * 100}%`,
                    backgroundColor: def.color,
                  }}
                  title={`${def.name}: ${pct}%`}
                >
                  {pct >= 14
                    ? `${def.shortName} ${pct}%`
                    : pct >= 7
                    ? def.shortName
                    : ""}
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
