import { Eye, Shield } from "lucide-preact";
import {
  GameSettings,
  PerspectiveOption,
  Role,
  ROLE_DEFINITIONS,
} from "../types.ts";

interface PerspectiveBarProps {
  settings: GameSettings;
  perspective: PerspectiveOption;
  myRole?: Role | undefined;
  gnosiaComrades?: ReadonlyArray<string> | undefined;
  onSelectPerspective: (id: string, name: string) => void;
  onSelectRole: (role?: Role | undefined) => void;
  onSetMyRole: (role?: Role | undefined) => void;
  onToggleGnosiaComrade?: ((playerId: string) => void) | undefined;
}

export function PerspectiveBar({
  settings,
  perspective,
  myRole,
  gnosiaComrades = [],
  onSelectPerspective,
  onSelectRole,
  onSetMyRole,
  onToggleGnosiaComrade,
}: PerspectiveBarProps) {
  const isObjective = perspective.id === "objective";

  const availableRoles: ReadonlyArray<Role> = [
    "CREW",
    ...(settings.roles.gnosiaCount > 0 ? ["GNOSIA" as Role] : []),
    ...(settings.roles.hasEngineer ? ["ENGINEER" as Role] : []),
    ...(settings.roles.hasDoctor ? ["DOCTOR" as Role] : []),
    ...(settings.roles.hasGuardianAngel ? ["GUARDIAN_ANGEL" as Role] : []),
    ...(settings.roles.hasGuardDuty ? ["GUARD_DUTY" as Role] : []),
    ...(settings.roles.hasACFollower ? ["AC_FOLLOWER" as Role] : []),
    ...(settings.roles.hasBug ? ["BUG" as Role] : []),
  ];

  return (
    <div className="perspective-panel">
      <div className="perspective-header">
        <div className="perspective-title">
          <Eye size={18} />
          <span>推論視点 (Perspective)</span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1.2rem",
            flexWrap: "wrap",
          }}
        >
          {/* 自分の役職（常設設定） */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              background: "rgba(56, 189, 248, 0.1)",
              padding: "0.25rem 0.6rem",
              borderRadius: "6px",
              border: "1px solid rgba(56, 189, 248, 0.25)",
            }}
          >
            <Shield size={14} color="var(--text-accent)" />
            <span
              style={{
                fontSize: "0.8rem",
                color: "var(--text-accent)",
                fontWeight: "bold",
              }}
            >
              自分の本当の役職:
            </span>
            <select
              className="role-lock-select"
              style={{ padding: "0.25rem 0.5rem" }}
              value={myRole || ""}
              onChange={(e) => {
                const val = (e.target as HTMLSelectElement).value;
                onSetMyRole(val ? (val as Role) : undefined);
              }}
            >
              <option value="">(未定・指定なし)</option>
              {availableRoles.map((r) => (
                <option key={r} value={r}>
                  {ROLE_DEFINITIONS[r].name}
                </option>
              ))}
            </select>
          </div>

          {/* 選択中キャラの仮定役職 */}
          {!isObjective && (
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                {perspective.name} の仮定役職:
              </span>
              <select
                className="role-lock-select"
                value={perspective.role || ""}
                onChange={(e) => {
                  const val = (e.target as HTMLSelectElement).value;
                  onSelectRole(val ? (val as Role) : undefined);
                }}
              >
                <option value="">(指定なし・候補すべて)</option>
                {availableRoles.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_DEFINITIONS[r].name}{" "}
                    ({ROLE_DEFINITIONS[r].side === "HUMAN" ? "人間" : "敵対"})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="perspective-selector-row">
        <button
          type="button"
          className={`perspective-btn ${isObjective ? "active" : ""}`}
          onClick={() => onSelectPerspective("objective", "全体 (客観神視点)")}
        >
          全体 (客観神視点)
        </button>

        {settings.players.map((p) => {
          const isMe = p.id === "player";
          return (
            <button
              key={p.id}
              type="button"
              className={`perspective-btn ${
                perspective.id === p.id ? "active" : ""
              }`}
              onClick={() => onSelectPerspective(p.id, p.name)}
            >
              {p.name} 視点
              {isMe && myRole ? ` (${ROLE_DEFINITIONS[myRole].name})` : ""}
            </button>
          );
        })}
      </div>

      {myRole === "GNOSIA" && settings.roles.gnosiaCount > 1 && (
        <div className="gnosia-comrades-panel">
          <span className="gnosia-comrades-label">
            😈 仲間グノーシア指定 (最大{" "}
            {settings.roles.gnosiaCount - 1}人 / 選択中:{" "}
            {gnosiaComrades.length}人):
          </span>
          <div className="gnosia-comrades-chips">
            {settings.players
              .filter((p) => p.id !== "player")
              .map((p) => {
                const isSelected = gnosiaComrades.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    className={`gnosia-comrade-chip ${
                      isSelected ? "selected" : ""
                    }`}
                    onClick={() => onToggleGnosiaComrade?.(p.id)}
                  >
                    {isSelected ? "😈 " : ""}
                    {p.name}
                  </button>
                );
              })}
          </div>
        </div>
      )}

      <div className="status-summary">
        <div className="summary-item">
          参加人数: <strong>{settings.players.length}人</strong>
        </div>
        <div className="summary-item">
          グノーシア: <strong>{settings.roles.gnosiaCount}人</strong>
        </div>
        <div className="summary-item">
          現在視点:{" "}
          <strong style={{ color: "var(--text-accent)" }}>
            {perspective.name}
            {perspective.role
              ? ` [${ROLE_DEFINITIONS[perspective.role].name}固定]`
              : ""}
          </strong>
        </div>
      </div>
    </div>
  );
}
