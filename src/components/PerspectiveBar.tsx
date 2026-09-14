import { Eye, Shield } from "lucide-preact";
import {
  GameSettings,
  PerspectiveOption,
  Role,
  ROLE_DEFINITIONS,
} from "../types.ts";

type PerspectiveBarProps = {
  settings: GameSettings;
  perspective: PerspectiveOption;
  myRole?: Role | undefined;
  gnosiaComrades?: ReadonlyArray<string> | undefined;
  onSelectPerspective: (id: string, name: string) => void;
  onSelectRole: (role?: Role | undefined) => void;
  onSetMyRole: (role?: Role | undefined) => void;
  onToggleGnosiaComrade?: ((playerId: string) => void) | undefined;
};

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

  const isCurrentComrade = myRole === "GNOSIA" &&
    gnosiaComrades.includes(perspective.id);
  const effectivePerspectiveRole = perspective.role ||
    (isCurrentComrade ? ("GNOSIA" as Role) : undefined);

  return (
    <div className="perspective-panel">
      <div className="perspective-header">
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
                value={effectivePerspectiveRole || ""}
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
            {effectivePerspectiveRole
              ? ` [${ROLE_DEFINITIONS[effectivePerspectiveRole].name}固定]`
              : ""}
          </strong>
          {!isObjective && (
            <button
              type="button"
              className="btn btn-secondary"
              style={{
                marginLeft: "0.6rem",
                padding: "2px 8px",
                fontSize: "0.75rem",
                verticalAlign: "middle",
              }}
              onClick={() =>
                onSelectPerspective("objective", "全体 (客観神視点)")}
              title="全体 (客観神視点) に戻す"
            >
              全体俯瞰に戻す
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
