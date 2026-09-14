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
  const isSelfWitness = !editingEvent &&
    (initialWitnessId === "player" || !initialWitnessId);

  const [witnessPlayer, setWitnessPlayer] = useState<string>(() => {
    if (editingEvent) return editingEvent.witnessId || "player";
    return initialWitnessId || "player";
  });

  const [selectedPlayer, setSelectedPlayer] = useState<string>(() => {
    if (editingEvent) return editingEvent.targetId;
    return "";
  });

  // 嘘をついた乗員タイルをクリック
  const handleTargetPlayerClick = (targetId: string) => {
    if (editingEvent) {
      setSelectedPlayer(targetId);
      return;
    }
    // 1クリックで即登録！
    onSubmit({
      type: "DEFINITE_LIE",
      targetId,
      witnessId: witnessPlayer,
    });
  };

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    if (!selectedPlayer || selectedPlayer === witnessPlayer) return;
    onSubmit({
      type: "DEFINITE_LIE",
      targetId: selectedPlayer,
      witnessId: witnessPlayer,
    });
  };

  const targetCandidates = settings.players.filter((p) =>
    p.id !== witnessPlayer
  );

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

        {!isSelfWitness && (
          <div className="form-group" style={{ marginBottom: "1rem" }}>
            <label className="form-label">
              1. 嘘に気づいた / 共有した人物 (密告者)
            </label>
            <select
              className="form-select"
              value={witnessPlayer}
              onChange={(e) => {
                const newWitness = (e.target as HTMLSelectElement).value;
                setWitnessPlayer(newWitness);
                if (selectedPlayer === newWitness) {
                  setSelectedPlayer("");
                }
              }}
            >
              {(editingEvent
                ? settings.players
                : settings.players.filter((p) =>
                  p.id !== "player"
                )).map((
                  p,
                ) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.id === "player"
                      ? "(直感で看破)"
                      : "(夜の自室で密告・共有)"}
                  </option>
                ))}
            </select>
          </div>
        )}

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">
            {isSelfWitness
              ? "嘘をついた人物をタップしてください"
              : "2. 嘘をついた人物をタップしてください"}
          </label>
          <div className="player-tile-grid">
            {targetCandidates.map((p) => {
              const isSelected = editingEvent && selectedPlayer === p.id;
              const status = playerStatuses[p.id];
              return (
                <button
                  key={p.id}
                  type="button"
                  className={`player-tile ${isSelected ? "selected" : ""}`}
                  onClick={() => handleTargetPlayerClick(p.id)}
                >
                  <span>{p.name}</span>
                  {status && status !== "ALIVE" && (
                    <span className="player-tile-status">
                      ({status === "FROZEN" ? "冷凍" : "消滅"})
                    </span>
                  )}
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
            disabled={!selectedPlayer || selectedPlayer === witnessPlayer}
          >
            変更を保存する
          </button>
        )}
      </div>
    </form>
  );
}
