import { useMemo, useState } from "preact/hooks";
import {
  GameSettings,
  NewGameEvent,
  PlayerStatus,
  VoteEvent,
} from "../../types.ts";

type VoteFormProps = {
  editingEvent?: VoteEvent | undefined;
  settings: GameSettings;
  playerStatuses: Record<string, PlayerStatus>;
  initialPlayerId?: string | undefined;
  onSubmit: (eventData: NewGameEvent) => void;
  onCancel: () => void;
};

export function VoteForm({
  editingEvent,
  settings,
  playerStatuses,
  initialPlayerId,
  onSubmit,
  onCancel,
}: VoteFormProps) {
  const alivePlayers = useMemo(() => {
    return settings.players.filter((p) =>
      (playerStatuses[p.id] || "ALIVE") === "ALIVE"
    );
  }, [settings.players, playerStatuses]);

  const [selectedPlayer, setSelectedPlayer] = useState<string>(() => {
    if (editingEvent) return editingEvent.frozenPlayerId;
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
      type: "VOTE",
      frozenPlayerId: playerId,
    });
  };

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    if (!selectedPlayer) return;
    onSubmit({
      type: "VOTE",
      frozenPlayerId: selectedPlayer,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label className="form-label">
          コールドスリープされた人物をタップしてください
        </label>
        <div className="player-tile-grid">
          {alivePlayers.map((p) => {
            const isSelected = editingEvent && selectedPlayer === p.id;
            return (
              <button
                key={p.id}
                type="button"
                className={`player-tile ${isSelected ? "selected" : ""}`}
                onClick={() => handlePlayerClick(p.id)}
              >
                <span>❄️ {p.name}</span>
              </button>
            );
          })}
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
