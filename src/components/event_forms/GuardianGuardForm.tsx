import { useMemo, useState } from "preact/hooks";
import { Shield } from "lucide-preact";
import {
  GameSettings,
  getGuarderId,
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

  // 守った人 (守護天使)。既定は主人公、主人公がいない・死亡しているときは生存者の先頭
  const [guarderId, setGuarderId] = useState<string>(() => {
    if (editingEvent) return getGuarderId(editingEvent);
    if (alivePlayers.some((p) => p.id === "player")) return "player";
    return alivePlayers[0]?.id ?? "";
  });

  // 守る人の候補 (編集時は死亡者も含めて元の値を選べるようにする)
  const guarderCandidates = editingEvent ? settings.players : alivePlayers;

  // 護衛対象の候補 (守った人以外の生存プレイヤー。守護天使は自分を護衛できない)
  const guardianGuardCandidates = useMemo(() => {
    return alivePlayers.filter((p) => p.id !== guarderId);
  }, [alivePlayers, guarderId]);

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
      guarderId,
      targetId: playerId,
    });
  };

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    if (!selectedPlayer || selectedPlayer === guarderId) return;
    onSubmit({
      type: "GUARDIAN_GUARD",
      guarderId,
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
          <span>守護天使の護衛 (誰が誰を守ったか)</span>
        </div>
        <p
          style={{
            fontSize: "0.75rem",
            color: "var(--text-muted)",
            marginBottom: "0.75rem",
            lineHeight: "1.4",
          }}
        >
          守護天使は毎晩1人をグノーシアの襲撃から護衛します（自分は護衛できません）。<br />
          護衛は守った本人しか知らない情報なので、推論には<strong>
            守った人の視点
          </strong>で見ているときだけ使います（客観視点では使いません）。
        </p>

        <div className="form-group">
          <label className="form-label" htmlFor="guarder-select">
            守った人 (守護天使)
          </label>
          <select
            id="guarder-select"
            className="form-select"
            value={guarderId}
            onChange={(e) => {
              const next = (e.target as HTMLSelectElement).value;
              setGuarderId(next);
              if (selectedPlayer === next) setSelectedPlayer("");
            }}
          >
            {guarderCandidates.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">
            守られた人をタップしてください
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
            disabled={!selectedPlayer || selectedPlayer === guarderId}
          >
            変更を保存する
          </button>
        )}
      </div>
    </form>
  );
}
