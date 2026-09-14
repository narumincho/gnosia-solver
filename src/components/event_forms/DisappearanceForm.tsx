import { useMemo, useState } from "preact/hooks";
import { Shield } from "lucide-preact";
import {
  DisappearanceEvent,
  GameSettings,
  NewGameEvent,
  PlayerStatus,
  Role,
} from "../../types.ts";

type DisappearanceFormProps = {
  editingEvent?: DisappearanceEvent | undefined;
  settings: GameSettings;
  playerStatuses: Record<string, PlayerStatus>;
  myRole?: Role | undefined;
  onSubmit: (eventData: NewGameEvent) => void;
  onCancel: () => void;
};

export function DisappearanceForm({
  editingEvent,
  settings,
  playerStatuses,
  myRole,
  onSubmit,
  onCancel,
}: DisappearanceFormProps) {
  const alivePlayers = useMemo(() => {
    return settings.players.filter((p) =>
      (playerStatuses[p.id] || "ALIVE") === "ALIVE"
    );
  }, [settings.players, playerStatuses]);

  // 守護天使の護衛対象候補（自分 "player" 以外の生存プレイヤー）
  const guardianGuardCandidates = useMemo(() => {
    return alivePlayers.filter((p) => p.id !== "player");
  }, [alivePlayers]);

  const [disappearedPlayerIds, setDisappearedPlayerIds] = useState<
    ReadonlyArray<string>
  >(() => {
    if (editingEvent) return editingEvent.disappearedPlayerIds;
    return [];
  });

  const [guardedPlayerId, setGuardedPlayerId] = useState<string>(() => {
    if (editingEvent) return editingEvent.guardedPlayerId || "";
    return "";
  });

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    onSubmit({
      type: "DISAPPEARANCE",
      disappearedPlayerIds,
      guardedPlayerId: guardedPlayerId || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div
        style={{
          background: "rgba(168, 85, 247, 0.08)",
          padding: "1rem",
          borderRadius: "8px",
          border: "1px solid rgba(168, 85, 247, 0.3)",
          marginBottom: "1rem",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "0.75rem",
          }}
        >
          <div
            style={{
              color: "#c084fc",
              fontSize: "0.9rem",
              fontWeight: "bold",
            }}
          >
            夜の出来事 (消滅もしくは平和)
          </div>
          <span
            className="badge"
            style={{
              background: disappearedPlayerIds.length === 0
                ? "rgba(34, 197, 94, 0.2)"
                : "rgba(244, 63, 94, 0.2)",
              color: disappearedPlayerIds.length === 0 ? "#4ade80" : "#fb7185",
              fontWeight: "bold",
            }}
          >
            {disappearedPlayerIds.length === 0
              ? "🕊️ 犠牲者ゼロ (平和)"
              : `💀 ${disappearedPlayerIds.length}人消滅`}
          </span>
        </div>
        <p
          style={{
            fontSize: "0.8rem",
            color: "var(--text-muted)",
            marginBottom: "0.75rem",
            lineHeight: "1.4",
          }}
        >
          夜間に消滅した乗員を <strong>0〜2人</strong> 選択してください。<br />
          ※誰も選ばない（0人）場合は「犠牲者なし（平和）」となります。
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
            gap: "0.5rem",
          }}
        >
          {alivePlayers.map((p) => {
            const isSelected = disappearedPlayerIds.includes(p.id);
            const isMaxReached = disappearedPlayerIds.length >= 2 &&
              !isSelected;
            return (
              <button
                key={p.id}
                type="button"
                disabled={isMaxReached}
                onClick={() => {
                  if (isSelected) {
                    setDisappearedPlayerIds((prev) =>
                      prev.filter((id) => id !== p.id)
                    );
                  } else {
                    if (disappearedPlayerIds.length < 2) {
                      setDisappearedPlayerIds((prev) => [...prev, p.id]);
                    }
                  }
                }}
                style={{
                  padding: "0.6rem 0.5rem",
                  borderRadius: "6px",
                  border: isSelected
                    ? "2px solid #f43f5e"
                    : "1px solid var(--border-color)",
                  background: isSelected
                    ? "rgba(244, 63, 94, 0.25)"
                    : "var(--bg-secondary)",
                  color: isSelected
                    ? "#fff"
                    : isMaxReached
                    ? "var(--text-muted)"
                    : "var(--text-main)",
                  cursor: isMaxReached ? "not-allowed" : "pointer",
                  fontSize: "0.85rem",
                  fontWeight: isSelected ? "bold" : "normal",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.35rem",
                  transition: "all 0.15s ease",
                }}
              >
                {isSelected ? "💀 " : ""}
                {p.name}
              </button>
            );
          })}
        </div>

        {disappearedPlayerIds.length > 0 && (
          <div
            style={{
              marginTop: "0.75rem",
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => setDisappearedPlayerIds([])}
              style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}
            >
              選択をクリア (犠牲者ゼロにする)
            </button>
          </div>
        )}

        {myRole === "GUARDIAN_ANGEL" && (
          <div
            style={{
              marginTop: "1rem",
              paddingTop: "0.75rem",
              borderTop: "1px solid rgba(168, 85, 247, 0.2)",
            }}
          >
            <label
              className="form-label"
              style={{
                color: "#facc15",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                fontWeight: "bold",
                fontSize: "0.85rem",
              }}
            >
              <Shield size={15} />
              <span>【守護天使】今夜護衛した乗員（任意）</span>
            </label>
            <select
              className="form-select"
              value={guardedPlayerId}
              onChange={(e) =>
                setGuardedPlayerId((e.target as HTMLSelectElement).value)}
            >
              <option value="">(未選択・指定なし)</option>
              {guardianGuardCandidates.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}
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
        >
          {editingEvent ? "変更を保存する" : "イベントを記録する"}
        </button>
      </div>
    </form>
  );
}
