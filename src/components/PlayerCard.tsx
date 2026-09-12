import { AlertTriangle, ShieldAlert, Skull, Snowflake, User } from "lucide-preact";
import {
  PlayerStatus,
  Role,
  ROLE_DEFINITIONS,
  SolverResult,
} from "../types.ts";

interface PlayerCardProps {
  player: { id: string; name: string };
  status: PlayerStatus;
  claimedRoles: ("ENGINEER" | "DOCTOR" | "GUARD_DUTY")[];
  definiteLieReasons?: string[];
  isCurrentPerspective: boolean;
  solverResult: SolverResult;
  onQuickLie: (playerId: string) => void;
  onQuickFreeze: (playerId: string) => void;
  onQuickAttack: (playerId: string) => void;
  onQuickInvestigate: (playerId: string) => void;
}

export function PlayerCard({
  player,
  status,
  claimedRoles,
  definiteLieReasons,
  isCurrentPerspective,
  solverResult,
  onQuickLie,
  onQuickFreeze,
  onQuickAttack,
  onQuickInvestigate,
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
        return <span className="player-status-badge status-attacked">消滅</span>;
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
            color={isCurrentPerspective ? "var(--text-accent)" : "var(--text-muted)"}
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
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginBottom: "0.6rem" }}>
        {claimedRoles.map((r) => (
          <span key={r} className={`badge ${ROLE_DEFINITIONS[r].badgeClass}`}>
            {ROLE_DEFINITIONS[r].name}CO
          </span>
        ))}

        {definiteRole && (
          <span className={`badge ${ROLE_DEFINITIONS[definiteRole].badgeClass}`} style={{ boxShadow: "0 0 8px currentColor" }}>
            確定: {ROLE_DEFINITIONS[definiteRole].name}
          </span>
        )}

        {definiteLieReasons && definiteLieReasons.length > 0 && (
          <span className="badge" style={{ background: "rgba(244, 63, 94, 0.3)", color: "#fb7185", border: "1px solid #f43f5e" }}>
            <AlertTriangle size={12} />
            嘘つき確定
          </span>
        )}
      </div>

      {/* グノーシア確率メーター */}
      <div className="meter-container">
        <div className="meter-labels">
          <span className="meter-val-gnosia">
            G確率: {gnosiaPct}%
          </span>
          <span className="meter-val-enemy">
            敵対確率: {enemyPct}%
          </span>
        </div>
        <div className="meter-track">
          <div
            className="meter-fill-gnosia"
            style={{ width: `${gnosiaPct}%` }}
          />
        </div>
      </div>

      {/* 役職内訳確率 */}
      <div className="role-distribution">
        {Object.entries(roleProbs)
          .filter(([_, prob]) => prob > 0)
          .sort((a, b) => b[1] - a[1])
          .map(([role, prob]) => {
            const r = role as Role;
            const def = ROLE_DEFINITIONS[r];
            const pct = Math.round(prob * 100);
            return (
              <div
                key={role}
                className="role-pill"
                style={{ borderColor: def.color, color: def.color }}
                title={`${def.name}: ${pct}%`}
              >
                <span>{def.shortName}</span>
                <strong>{pct}%</strong>
              </div>
            );
          })}
      </div>

      {/* クイックアクション */}
      <div className="player-quick-actions">
        {!isCurrentPerspective ? (
          <button
            className="quick-btn"
            style={{ color: "var(--text-accent)", borderColor: "rgba(56, 189, 248, 0.4)" }}
            onClick={() => onQuickInvestigate(player.id)} // 調査は別ボタン
            title="視点切り替えや調査"
          >
            調査
          </button>
        ) : (
          <button
            className="quick-btn"
            onClick={() => onQuickInvestigate(player.id)}
            title="調査結果を入力"
          >
            調査
          </button>
        )}
        <button
          className="quick-btn quick-btn-lie"
          onClick={() => onQuickLie(player.id)}
          title="このプレイヤーが嘘をついているとマーク"
        >
          嘘看破
        </button>
        {status === "ALIVE" && (
          <>
            <button
              className="quick-btn"
              onClick={() => onQuickFreeze(player.id)}
              title="投票でコールドスリープ"
            >
              冷凍
            </button>
            <button
              className="quick-btn"
              onClick={() => onQuickAttack(player.id)}
              title="夜間に消滅"
            >
              消滅
            </button>
          </>
        )}
      </div>

    </div>
  );
}
