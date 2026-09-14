import { useMemo, useState } from "preact/hooks";
import { Shield } from "lucide-preact";
import {
  GameSettings,
  GuardianGuardEvent,
  NewGameEvent,
  PlayerStatus,
} from "../../types.ts";

type GuardianGuardFormProps = {
  editingEvent?: GuardianGuardEvent | undefined;
  settings: GameSettings;
  playerStatuses: Record<string, PlayerStatus>;
  initialPlayerId?: string | undefined;
  onSubmit: (eventData: NewGameEvent) => void;
  onCancel: () => void;
};

export function GuardianGuardForm({
  editingEvent,
  settings,
  playerStatuses,
  initialPlayerId,
  onSubmit,
  onCancel,
}: GuardianGuardFormProps) {
  const alivePlayers = useMemo(() => {
    return settings.players.filter((p) =>
      (playerStatuses[p.id] || "ALIVE") === "ALIVE"
    );
  }, [settings.players, playerStatuses]);

  // 守護天使の護衛対象候補（自分 "player" 以外の生存プレイヤー）
  const guardianGuardCandidates = useMemo(() => {
    return alivePlayers.filter((p) => p.id !== "player");
  }, [alivePlayers]);

  const [selectedPlayer, setSelectedPlayer] = useState<string>(() => {
    if (editingEvent) return editingEvent.targetId;
    if (initialPlayerId) return initialPlayerId;
    return "";
  });

  const handlePlayerClick = (playerId: string) => {
    if (editingEvent) {
      setSelectedPlayer(playerId);
      return;
    }
    // 1クリックで即登録！
    onSubmit({
      type: "GUARDIAN_GUARD",
      targetId: playerId,
    });
  };

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    if (!selectedPlayer) return;
    onSubmit({
      type: "GUARDIAN_GUARD",
      targetId: selectedPlayer,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div
        style={{
          background: "rgba(234, 179, 8, 0.08)",
          padding: "1rem",
          borderRadius: "8px",
          border: "1px solid rgba(234, 179, 8, 0.3)",
          marginBottom: "1rem",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            color: "#facc15",
            marginBottom: "0.5rem",
            fontSize: "0.85rem",
            fontWeight: "bold",
          }}
        >
          <Shield size={16} />
          <span>【守護天使視点】夜に護衛する乗員を指定</span>
        </div>
        <p
          style={{
            fontSize: "0.75rem",
            color: "var(--text-muted)",
            marginBottom: "0.75rem",
            lineHeight: "1.4",
          }}
        >
          守護天使は毎晩1人をグノーシアの襲撃から護衛します。<br />
          護衛した夜に犠牲者ゼロ（平和）となった場合、護衛対象の<strong>
            【非グノーシア】
          </strong>が確定します（自分は護衛できません）。
        </p>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">
            護衛する乗員をタップしてください
          </label>
          <div className="player-tile-grid">
            {guardianGuardCandidates.map((p) => {
              const isSelected = editingEvent && selectedPlayer === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  className={`player-tile ${isSelected ? "selected" : ""}`}
                  onClick={() => handlePlayerClick(p.id)}
                >
                  <span>🛡️ {p.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

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
            disabled={!selectedPlayer}
          >
            変更を保存する
          </button>
        )}
      </div>
    </form>
  );
}
