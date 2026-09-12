import { Eye, UserCheck } from "lucide-preact";
import { GameSettings, PerspectiveOption, Role, ROLE_DEFINITIONS } from "../types.ts";

interface PerspectiveBarProps {
  settings: GameSettings;
  perspective: PerspectiveOption;
  onSelectPerspective: (opt: PerspectiveOption) => void;
  onSelectRole: (role?: Role) => void;
}

export function PerspectiveBar({
  settings,
  perspective,
  onSelectPerspective,
  onSelectRole,
}: PerspectiveBarProps) {
  const isObjective = perspective.id === "objective";

  const availableRoles: Role[] = [
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

        {!isObjective && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
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
              <option value="">(役職を指定しない・候補すべて)</option>
              {availableRoles.map((r) => (
                <option key={r} value={r}>
                  {ROLE_DEFINITIONS[r].name} ({ROLE_DEFINITIONS[r].side === "HUMAN" ? "人間" : "敵対"})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="perspective-selector-row">
        <button
          className={`perspective-btn ${isObjective ? "active" : ""}`}
          onClick={() =>
            onSelectPerspective({ id: "objective", name: "全体 (客観神視点)" })
          }
        >
          全体 (客観神視点)
        </button>

        {settings.players.map((p) => (
          <button
            key={p.id}
            className={`perspective-btn ${
              perspective.id === p.id ? "active" : ""
            }`}
            onClick={() =>
              onSelectPerspective({
                id: p.id,
                name: p.name,
                role: perspective.id === p.id ? perspective.role : undefined,
              })
            }
          >
            {p.name} 視点
          </button>
        ))}
      </div>

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
