import { useState } from "preact/hooks";
import { AlertTriangle } from "lucide-preact";
import {
  DefiniteLieEvent,
  GameSettings,
  NewGameEvent,
  PlayerStatus,
} from "../../types.ts";

type DefiniteLieFormProps = {
  editingEvent?: DefiniteLieEvent | undefined;
  settings: GameSettings;
  playerStatuses: Record<string, PlayerStatus>;
  initialWitnessId?: string | undefined;
  onSubmit: (eventData: NewGameEvent) => void;
  onCancel: () => void;
};

export function DefiniteLieForm({
  editingEvent,
  settings,
  playerStatuses,
  initialWitnessId,
  onSubmit,
  onCancel,
}: DefiniteLieFormProps) {
  const [witnessPlayer, setWitnessPlayer] = useState<string>(() => {
    if (editingEvent) return editingEvent.witnessId || "player";
    return initialWitnessId || "player";
  });

  const [selectedPlayer, setSelectedPlayer] = useState<string>(() => {
    if (editingEvent) return editingEvent.targetId;
    const witness = initialWitnessId || "player";
    const cand = settings.players.find((p) => p.id !== witness);
    return cand?.id || "";
  });

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    if (!selectedPlayer || selectedPlayer === witnessPlayer) return;
    onSubmit({
      type: "DEFINITE_LIE",
      targetId: selectedPlayer,
      witnessId: witnessPlayer,
    });
  };

  const isSubmitDisabled = !selectedPlayer || selectedPlayer === witnessPlayer;

  return (
    <form onSubmit={handleSubmit}>
      <div
        style={{
          background: "rgba(244, 63, 94, 0.08)",
          padding: "1rem",
          borderRadius: "8px",
          border: "1px solid rgba(244, 63, 94, 0.3)",
          marginBottom: "1rem",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            color: "#fb7185",
            marginBottom: "0.75rem",
            fontSize: "0.85rem",
            fontWeight: "bold",
          }}
        >
          <AlertTriangle size={16} />
          <span>
            {witnessPlayer === "player"
              ? "【自分が看破】対象は確実に【グノーシア / AC主義者 / バグ】です (人間陣営から除外)"
              : "【他者の密告】密告者が人間なら対象は敵確定。密告者が敵なら濡れ衣の可能性あり (両者人間は除外)"}
          </span>
        </div>

        <div className="form-group">
          <label className="form-label">
            嘘に気づいた / 共有した人物
          </label>
          {!editingEvent && witnessPlayer === "player"
            ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <span
                  className="badge badge-crew"
                  style={{
                    fontSize: "0.85rem",
                    padding: "0.25rem 0.55rem",
                  }}
                >
                  自分 (直感で看破)
                </span>
              </div>
            )
            : (
              <select
                className="form-select"
                value={witnessPlayer}
                onChange={(e) => {
                  const newWitness = (e.target as HTMLSelectElement).value;
                  setWitnessPlayer(newWitness);
                  if (selectedPlayer === newWitness) {
                    const other = settings.players.find((p) =>
                      p.id !== newWitness
                    );
                    if (other) setSelectedPlayer(other.id);
                  }
                }}
              >
                {(editingEvent
                  ? settings.players
                  : settings.players.filter((p) => p.id !== "player")).map((
                    p,
                  ) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.id === "player"
                        ? "(直感で看破)"
                        : "(夜の自室で密告・共有)"}
                    </option>
                  ))}
              </select>
            )}
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">嘘をついた人物</label>
          <select
            className="form-select"
            value={selectedPlayer}
            onChange={(e) =>
              setSelectedPlayer((e.target as HTMLSelectElement).value)}
          >
            {settings.players
              .filter((p) => p.id !== witnessPlayer)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {playerStatuses[p.id] === "FROZEN"
                    ? "(冷凍済)"
                    : playerStatuses[p.id] === "ATTACKED"
                    ? "(消滅済)"
                    : ""}
                </option>
              ))}
          </select>
        </div>
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
