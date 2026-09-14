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
    return guardianGuardCandidates[0]?.id || "";
  });

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    if (!selectedPlayer) return;
    onSubmit({
      type: "GUARDIAN_GUARD",
      targetId: selectedPlayer,
    });
  };

  const isSubmitDisabled = !selectedPlayer ||
    guardianGuardCandidates.length === 0;

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
          護衛した夜に犠牲者ゼロ（平和）となった場合、護衛成功により護衛対象の<strong>
            【非グノーシア】
          </strong>が確定します。<br />
          ※守護天使は自分自身を守ることはできません。
        </p>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">護衛対象 (自分以外の生存者)</label>
          <select
            className="form-select"
            value={selectedPlayer}
            onChange={(e) =>
              setSelectedPlayer((e.target as HTMLSelectElement).value)}
          >
            {guardianGuardCandidates.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
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
