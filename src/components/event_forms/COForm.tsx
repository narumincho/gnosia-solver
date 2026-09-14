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
    return "";
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

  // 単一CO (エンジニア / ドクター) の乗員タイルクリック
  const handleSinglePlayerClick = (playerId: string) => {
    if (editingEvent) {
      setSelectedPlayer(playerId);
      return;
    }
    // 1クリックで即座に作成！
    onSubmit({
      type: "CO",
      playerId,
      claimedRole,
    });
  };

  // 留守番CO (2人組) の乗員タイルクリック
  const handleGuardDutyPlayerClick = (playerId: string) => {
    if (selectedGuardDuty.includes(playerId)) {
      setSelectedGuardDuty((prev) => prev.filter((id) => id !== playerId));
      return;
    }

    if (selectedGuardDuty.length === 0) {
      setSelectedGuardDuty([playerId]);
    } else if (selectedGuardDuty.length === 1) {
      const p1 = selectedGuardDuty[0]!;
      const p2 = playerId;
      setSelectedGuardDuty([p1, p2]);

      // 新規作成時は2人目クリックで自動確定！
      if (!editingEvent) {
        onSubmit({
          type: "CO",
          playerId: p1,
          partnerPlayerId: p2,
          claimedRole: "GUARD_DUTY",
        });
      }
    }
  };

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
                名乗り出た留守番 (2人をタップ)
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
              留守番COは2人組で行われます。名乗り出た2人をタップしてください（2人目で自動登録されます）。
            </p>
            <div className="player-tile-grid">
              {(coCandidates.length >= 2 ? coCandidates : alivePlayers).map(
                (p) => {
                  const isSelected = selectedGuardDuty.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      className={`player-tile ${isSelected ? "selected" : ""}`}
                      onClick={() => handleGuardDutyPlayerClick(p.id)}
                    >
                      <span>{isSelected ? "🛡️ " : ""}{p.name}</span>
                    </button>
                  );
                },
              )}
            </div>
            {selectedGuardDuty.length > 0 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  marginTop: "0.4rem",
                }}
              >
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => setSelectedGuardDuty([])}
                  style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}
                >
                  選択をリセット
                </button>
              </div>
            )}
          </div>
        )
        : (
          <div className="form-group">
            <label className="form-label">
              名乗り出た人物をタップしてください
            </label>
            <div className="player-tile-grid">
              {coCandidates.map((p) => {
                const isSelected = editingEvent && selectedPlayer === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    className={`player-tile ${isSelected ? "selected" : ""}`}
                    onClick={() => handleSinglePlayerClick(p.id)}
                  >
                    <span>{p.name}</span>
                  </button>
                );
              })}
              {coCandidates.length === 0 && (
                <span
                  style={{
                    color: "var(--text-muted)",
                    fontSize: "0.8rem",
                    padding: "0.5rem",
                  }}
                >
                  ※ 生存している全員がすでに役職CO済みです
                </span>
              )}
            </div>
          </div>
        )}

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: "0.75rem",
          marginTop: "1.2rem",
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
        {editingEvent && (
          <button
            type="submit"
            className="btn btn-primary"
            disabled={claimedRole === "GUARD_DUTY"
              ? selectedGuardDuty.length !== 2
              : !selectedPlayer}
          >
            変更を保存する
          </button>
        )}
      </div>
    </form>
  );
}
