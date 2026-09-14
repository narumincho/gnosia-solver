import { useMemo, useState } from "preact/hooks";
import {
  DisappearanceEvent,
  GameSettings,
  NewGameEvent,
  PlayerStatus,
} from "../../types.ts";

type DisappearanceFormProps = {
  editingEvent?: DisappearanceEvent | undefined;
  settings: GameSettings;
  playerStatuses: Record<string, PlayerStatus>;
  onSubmit: (eventData: NewGameEvent) => void;
  onCancel: () => void;
};

export function DisappearanceForm({
  editingEvent,
  settings,
  playerStatuses,
  onSubmit,
  onCancel,
}: DisappearanceFormProps) {
  const alivePlayers = useMemo(() => {
    return settings.players.filter((p) =>
      (playerStatuses[p.id] || "ALIVE") === "ALIVE"
    );
  }, [settings.players, playerStatuses]);

  const [isMultiMode, setIsMultiMode] = useState<boolean>(
    editingEvent ? editingEvent.disappearedPlayerIds.length > 1 : false,
  );

  const [disappearedPlayerIds, setDisappearedPlayerIds] = useState<
    ReadonlyArray<string>
  >(() => {
    if (editingEvent) return editingEvent.disappearedPlayerIds;
    return [];
  });

  // 犠牲者ゼロ (平和) の1クリック作成
  const handlePeaceClick = () => {
    if (editingEvent) {
      setDisappearedPlayerIds([]);
      return;
    }
    onSubmit({
      type: "DISAPPEARANCE",
      disappearedPlayerIds: [],
      guardedPlayerId: editingEvent?.guardedPlayerId,
    });
  };

  // 乗員タイルクリック
  const handlePlayerClick = (playerId: string) => {
    if (isMultiMode || editingEvent) {
      // 複数選択モード
      if (disappearedPlayerIds.includes(playerId)) {
        setDisappearedPlayerIds((prev) => prev.filter((id) => id !== playerId));
      } else if (disappearedPlayerIds.length < 2) {
        setDisappearedPlayerIds((prev) => [...prev, playerId]);
      }
      return;
    }

    // 通常モード: 1クリックで1人消滅を即登録！
    onSubmit({
      type: "DISAPPEARANCE",
      disappearedPlayerIds: [playerId],
      guardedPlayerId: editingEvent?.guardedPlayerId,
    });
  };

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    onSubmit({
      type: "DISAPPEARANCE",
      disappearedPlayerIds,
      guardedPlayerId: editingEvent?.guardedPlayerId,
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
          {!editingEvent && (
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => {
                setIsMultiMode(!isMultiMode);
                setDisappearedPlayerIds([]);
              }}
              style={{
                fontSize: "0.75rem",
                color: isMultiMode
                  ? "var(--color-gnosia)"
                  : "var(--text-muted)",
              }}
            >
              {isMultiMode ? "← 通常モードに戻す" : "2人消滅(バグ蒸発等)を入力"}
            </button>
          )}
        </div>

        {/* 犠牲者ゼロ (平和) ボタン */}
        <div style={{ marginBottom: "0.75rem" }}>
          <button
            type="button"
            className={`player-tile ${
              disappearedPlayerIds.length === 0 && (isMultiMode || editingEvent)
                ? "selected"
                : ""
            }`}
            style={{
              padding: "0.75rem",
              background: "rgba(34, 197, 94, 0.15)",
              borderColor: "rgba(34, 197, 94, 0.35)",
              color: "#4ade80",
            }}
            onClick={handlePeaceClick}
          >
            <span style={{ fontSize: "0.95rem" }}>🕊️ 犠牲者ゼロ (平和)</span>
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
              {isMultiMode
                ? "（クリックで犠牲者ゼロに設定）"
                : "タップして犠牲者なしで即登録"}
            </span>
          </button>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">
            {isMultiMode
              ? "消滅した乗員を最大2人選択してください (選択中: " +
                disappearedPlayerIds.length + "人)"
              : "消滅した乗員をタップしてください (1タップで即登録)"}
          </label>
          <div className="player-tile-grid">
            {alivePlayers.map((p) => {
              const isSelected = disappearedPlayerIds.includes(p.id);
              const isMaxReached = isMultiMode &&
                disappearedPlayerIds.length >= 2 && !isSelected;
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={isMaxReached}
                  className={`player-tile ${isSelected ? "selected" : ""}`}
                  onClick={() => handlePlayerClick(p.id)}
                >
                  <span>{isSelected ? "💀 " : ""}{p.name}</span>
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
        {(isMultiMode || editingEvent) && (
          <button
            type="submit"
            className="btn btn-primary"
          >
            {disappearedPlayerIds.length === 0
              ? "犠牲者ゼロで記録する"
              : `${disappearedPlayerIds.length}人消滅で記録する`}
          </button>
        )}
      </div>
    </form>
  );
}
