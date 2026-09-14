type TimelineCheckpointProps = {
  readonly checkpointIndex: number;
  readonly isActive: boolean;
  readonly onSelect: (index: number | null) => void;
  readonly label?: string | undefined;
};

export function TimelineCheckpoint({
  checkpointIndex,
  isActive,
  onSelect,
  label,
}: TimelineCheckpointProps) {
  const displayLabel = label ||
    (checkpointIndex < 0
      ? "初期状態 (イベント0件)"
      : `#${checkpointIndex + 1} 完了時点`);

  return (
    <div
      className={`timeline-checkpoint ${isActive ? "active" : ""}`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(isActive ? null : checkpointIndex);
      }}
      role="button"
      tabIndex={0}
      title={isActive
        ? "最新時点に戻る"
        : `${displayLabel}の確率・推論結果を確認`}
    >
      <div className="checkpoint-line" />
      <div className="checkpoint-badge">
        {isActive
          ? (
            <>
              <span>📍 {displayLabel} を表示中</span>
              <button
                type="button"
                className="checkpoint-reset-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(null);
                }}
                title="最新時点に戻る"
              >
                ✕
              </button>
            </>
          )
          : (
            <span className="checkpoint-hint">
              📍 {displayLabel} の確率を確認
            </span>
          )}
      </div>
      <div className="checkpoint-line" />
    </div>
  );
}
