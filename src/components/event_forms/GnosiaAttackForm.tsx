import { useMemo, useState } from "preact/hooks";
import { Target } from "lucide-preact";
import {
  GameSettings,
  GnosiaAttackEvent,
  NewGameEvent,
  PlayerStatus,
} from "../../types.ts";

type GnosiaAttackFormProps = {
  editingEvent?: GnosiaAttackEvent | undefined;
  settings: GameSettings;
  playerStatuses: Record<string, PlayerStatus>;
  initialPlayerId?: string | undefined;
  onSubmit: (eventData: NewGameEvent) => void;
  onCancel: () => void;
};

export function GnosiaAttackForm({
  editingEvent,
  settings,
  playerStatuses,
  initialPlayerId,
  onSubmit,
  onCancel,
}: GnosiaAttackFormProps) {
  const alivePlayers = useMemo(() => {
    return settings.players.filter((p) =>
      (playerStatuses[p.id] || "ALIVE") === "ALIVE"
    );
  }, [settings.players, playerStatuses]);

  const attackCandidates = useMemo(() => {
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
      type: "GNOSIA_ATTACK",
      targetId: playerId,
    });
  };

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    if (!selectedPlayer) return;
    onSubmit({
      type: "GNOSIA_ATTACK",
      targetId: selectedPlayer,
    });
  };

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
            marginBottom: "0.5rem",
            fontSize: "0.85rem",
            fontWeight: "bold",
          }}
        >
          <Target size={16} />
          <span>自分がグノーシア陣営の場合の襲撃先指定</span>
        </div>
        <p
          style={{
            fontSize: "0.75rem",
            color: "var(--text-muted)",
            marginBottom: "0.75rem",
            lineHeight: "1.4",
          }}
        >
          襲撃対象と異なる人物が朝に消滅した場合、その消滅者は<strong>
            【バグ確定】
          </strong>となり、守護天使が生存して襲撃対象を守った世界のみが導出されます。
        </p>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">
            襲撃する乗員をタップしてください
          </label>
          <div className="player-tile-grid">
            {attackCandidates.map((p) => {
              const isSelected = editingEvent && selectedPlayer === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  className={`player-tile ${isSelected ? "selected" : ""}`}
                  onClick={() => handlePlayerClick(p.id)}
                >
                  <span>🎯 {p.name}</span>
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
