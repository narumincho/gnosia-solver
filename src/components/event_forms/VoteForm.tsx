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
    return alivePlayers[0]?.id || "";
  });

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    if (!selectedPlayer) return;
    onSubmit({
      type: "VOTE",
      frozenPlayerId: selectedPlayer,
    });
  };

  const isSubmitDisabled = !selectedPlayer || alivePlayers.length === 0;

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label className="form-label">
          コールドスリープされた人物 (生存者のみ)
        </label>
        <select
          className="form-select"
          value={selectedPlayer}
          onChange={(e) =>
            setSelectedPlayer((e.target as HTMLSelectElement).value)}
        >
          {alivePlayers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

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
