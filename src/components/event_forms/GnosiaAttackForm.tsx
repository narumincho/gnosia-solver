import { useMemo, useState } from "preact/hooks";
import { Target } from "lucide-preact";
import {
  GameSettings,
  getAttackerId,
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

  // 襲撃したグノーシア。既定は主人公、主人公がいない・死亡しているときは生存者の先頭
  const [attackerId, setAttackerId] = useState<string>(() => {
    if (editingEvent) return getAttackerId(editingEvent);
    if (alivePlayers.some((p) => p.id === "player")) return "player";
    return alivePlayers[0]?.id ?? "";
  });

  // 襲撃者の候補 (編集時は死亡者も含めて元の値を選べるようにする)
  const attackerCandidates = editingEvent ? settings.players : alivePlayers;

  // 襲撃対象の候補 (襲撃者以外の生存プレイヤー)
  const attackCandidates = useMemo(() => {
    return alivePlayers.filter((p) => p.id !== attackerId);
  }, [alivePlayers, attackerId]);

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
      attackerId,
      targetId: playerId,
    });
  };

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    if (!selectedPlayer || selectedPlayer === attackerId) return;
    onSubmit({
      type: "GNOSIA_ATTACK",
      attackerId,
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
          <span>グノーシアの襲撃 (誰が誰を襲撃したか)</span>
        </div>
        <p
          style={{
            fontSize: "0.75rem",
            color: "var(--text-muted)",
            marginBottom: "0.75rem",
            lineHeight: "1.4",
          }}
        >
          襲撃先はグノーシア陣営しか知らない情報なので、推論には<strong>
            襲撃したグノーシア本人と仲間のグノーシアの視点
          </strong>で見ているときだけ使います（客観視点では使いません）。<br />
          襲撃対象と異なる人物が朝に消滅した場合、その消滅者は<strong>
            【バグ確定】
          </strong>となり、守護天使が生存して襲撃対象を守った世界のみが導出されます。
        </p>

        <div className="form-group">
          <label className="form-label" htmlFor="attacker-select">
            襲撃したグノーシア
          </label>
          <select
            id="attacker-select"
            className="form-select"
            value={attackerId}
            onChange={(e) => {
              const next = (e.target as HTMLSelectElement).value;
              setAttackerId(next);
              if (selectedPlayer === next) setSelectedPlayer("");
            }}
          >
            {attackerCandidates.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">
            襲撃された人をタップしてください
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
            disabled={!selectedPlayer || selectedPlayer === attackerId}
          >
            変更を保存する
          </button>
        )}
      </div>
    </form>
  );
}
