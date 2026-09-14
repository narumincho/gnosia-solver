import { useMemo, useState } from "preact/hooks";
import {
  COEvent,
  GameSettings,
  NewGameEvent,
  PlayerStatus,
  Role,
} from "../../types.ts";

type COFormProps = {
  editingEvent?: COEvent | undefined;
  settings: GameSettings;
  playerStatuses: Record<string, PlayerStatus>;
  claimedRoles: Record<string, ReadonlyArray<Role>>;
  initialPlayerId?: string | undefined;
  initialClaimedRole?: "ENGINEER" | "DOCTOR" | "GUARD_DUTY" | undefined;
  onSubmit: (eventData: NewGameEvent) => void;
  onCancel: () => void;
};

export function COForm({
  editingEvent,
  settings,
  playerStatuses,
  claimedRoles,
  initialPlayerId,
  initialClaimedRole,
  onSubmit,
  onCancel,
}: COFormProps) {
  const alivePlayers = useMemo(() => {
    return settings.players.filter((p) =>
      (playerStatuses[p.id] || "ALIVE") === "ALIVE"
    );
  }, [settings.players, playerStatuses]);

  const coCandidates = useMemo(() => {
    return alivePlayers.filter((p) => {
      const alreadyClaimed = (claimedRoles[p.id]?.length ?? 0) > 0;
      if (
        editingEvent &&
        (editingEvent.playerId === p.id ||
          editingEvent.partnerPlayerId === p.id)
      ) {
        return true;
      }
      return !alreadyClaimed;
    });
  }, [alivePlayers, claimedRoles, editingEvent]);

  const [claimedRole, setClaimedRole] = useState<
    "ENGINEER" | "DOCTOR" | "GUARD_DUTY"
  >(
    editingEvent ? editingEvent.claimedRole : initialClaimedRole ??
      (settings.roles.hasEngineer
        ? "ENGINEER"
        : settings.roles.hasDoctor
        ? "DOCTOR"
        : settings.roles.hasGuardDuty
        ? "GUARD_DUTY"
        : "ENGINEER"),
  );

  const [selectedPlayer, setSelectedPlayer] = useState<string>(() => {
    if (editingEvent) return editingEvent.playerId;
    if (initialPlayerId) return initialPlayerId;
    return coCandidates[0]?.id || alivePlayers[0]?.id || "";
  });

  const [selectedGuardDuty, setSelectedGuardDuty] = useState<
    ReadonlyArray<string>
  >(() => {
    if (editingEvent && editingEvent.claimedRole === "GUARD_DUTY") {
      const list = [editingEvent.playerId];
      if (editingEvent.partnerPlayerId) {
        list.push(editingEvent.partnerPlayerId);
      }
      return list;
    }
    return [];
  });

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    if (claimedRole === "GUARD_DUTY") {
      const p1 = selectedGuardDuty[0];
      const p2 = selectedGuardDuty[1];
      if (!p1 || !p2) return;
      onSubmit({
        type: "CO",
        playerId: p1,
        partnerPlayerId: p2,
        claimedRole: "GUARD_DUTY",
      });
    } else {
      if (!selectedPlayer) return;
      onSubmit({
        type: "CO",
        playerId: selectedPlayer,
        claimedRole,
      });
    }
  };

  const isSubmitDisabled = claimedRole === "GUARD_DUTY"
    ? selectedGuardDuty.length !== 2
    : !selectedPlayer || coCandidates.length === 0;

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group" style={{ marginBottom: "1rem" }}>
        <label className="form-label">宣言役職</label>
        {!editingEvent
          ? (
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              <span
                className={`badge ${
                  claimedRole === "ENGINEER"
                    ? "badge-engineer"
                    : claimedRole === "DOCTOR"
                    ? "badge-doctor"
                    : "badge-guard"
                }`}
                style={{ fontSize: "0.85rem", padding: "0.25rem 0.55rem" }}
              >
                {claimedRole === "ENGINEER"
                  ? "エンジニア"
                  : claimedRole === "DOCTOR"
                  ? "ドクター"
                  : "留守番"}
              </span>
            </div>
          )
          : (
            <select
              className="form-select"
              value={claimedRole}
              onChange={(e) =>
                setClaimedRole(
                  (e.target as HTMLSelectElement).value as
                    | "ENGINEER"
                    | "DOCTOR"
                    | "GUARD_DUTY",
                )}
            >
              {settings.roles.hasEngineer && (
                <option value="ENGINEER">エンジニア</option>
              )}
              {settings.roles.hasDoctor && (
                <option value="DOCTOR">ドクター</option>
              )}
              {settings.roles.hasGuardDuty && (
                <option value="GUARD_DUTY">留守番 (2人組・白確定)</option>
              )}
            </select>
          )}
      </div>

      {claimedRole === "GUARD_DUTY"
        ? (
          <div className="form-group">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.4rem",
              }}
            >
              <label className="form-label" style={{ marginBottom: 0 }}>
                名乗り出た留守番 (2人をチェック)
              </label>
              <span
                className={`badge ${
                  selectedGuardDuty.length === 2 ? "badge-human" : "badge-enemy"
                }`}
                style={{ fontSize: "0.75rem" }}
              >
                {selectedGuardDuty.length} / 2人 選択中
              </span>
            </div>
            <p
              style={{
                fontSize: "0.75rem",
                color: "var(--text-muted)",
                marginBottom: "0.6rem",
              }}
            >
              ※
              留守番COは必ず2人同時に行われます。名乗り出た2人にチェックを入れてください。
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
                gap: "0.5rem",
                background: "var(--bg-secondary)",
                padding: "0.75rem",
                borderRadius: "8px",
                border: "1px solid var(--border-color)",
                maxHeight: "220px",
                overflowY: "auto",
              }}
            >
              {(coCandidates.length >= 2 ? coCandidates : alivePlayers).map(
                (p) => {
                  const isChecked = selectedGuardDuty.includes(p.id);
                  const isDisabled = !isChecked &&
                    selectedGuardDuty.length >= 2;
                  return (
                    <label
                      key={p.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        padding: "0.45rem 0.65rem",
                        borderRadius: "6px",
                        background: isChecked
                          ? "rgba(56, 189, 248, 0.15)"
                          : "var(--bg-tertiary)",
                        border: isChecked
                          ? "1px solid var(--accent-primary, #38bdf8)"
                          : "1px solid transparent",
                        cursor: isDisabled ? "not-allowed" : "pointer",
                        opacity: isDisabled ? 0.5 : 1,
                        fontSize: "0.85rem",
                        userSelect: "none",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={isDisabled}
                        onChange={() => {
                          if (isChecked) {
                            setSelectedGuardDuty(
                              selectedGuardDuty.filter((id) => id !== p.id),
                            );
                          } else if (selectedGuardDuty.length < 2) {
                            setSelectedGuardDuty([
                              ...selectedGuardDuty,
                              p.id,
                            ]);
                          }
                        }}
                        style={{
                          cursor: isDisabled ? "not-allowed" : "pointer",
                        }}
                      />
                      <span
                        style={{
                          fontWeight: isChecked ? 600 : "normal",
                          color: isChecked
                            ? "var(--accent-primary, #38bdf8)"
                            : "inherit",
                        }}
                      >
                        {p.name}
                      </span>
                    </label>
                  );
                },
              )}
            </div>
            {selectedGuardDuty.length !== 2 && (
              <span
                style={{
                  color: "var(--color-gnosia)",
                  fontSize: "0.75rem",
                  marginTop: "0.35rem",
                  display: "block",
                }}
              >
                ※ 留守番は必ず2人選択してください
              </span>
            )}
          </div>
        )
        : (
          <div className="form-group">
            <label className="form-label">
              名乗り出た人物 (未CO者のみ)
            </label>
            <select
              className="form-select"
              value={selectedPlayer}
              onChange={(e) =>
                setSelectedPlayer((e.target as HTMLSelectElement).value)}
              disabled={coCandidates.length === 0}
            >
              {coCandidates.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
              {coCandidates.length === 0 && (
                <option value="">(全員すでにCO済みです)</option>
              )}
            </select>
            {coCandidates.length === 0 && (
              <span
                style={{
                  color: "var(--text-muted)",
                  fontSize: "0.75rem",
                  marginTop: "0.25rem",
                  display: "block",
                }}
              >
                ※ 生存している全員がすでに役職CO済みです
              </span>
            )}
          </div>
        )}

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: "0.75rem",
          marginTop: "1.5rem",
        }}
      >
        <button
          type="button"
          className="btn"
          command="close"
          commandfor="add-event-dialog"
          onClick={onCancel}
        >
          キャンセル
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={isSubmitDisabled}
        >
          {editingEvent ? "変更を保存する" : "イベントを記録する"}
        </button>
      </div>
    </form>
  );
}
