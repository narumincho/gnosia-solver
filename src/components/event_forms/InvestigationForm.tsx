import { useMemo, useState } from "preact/hooks";
import {
  GameSettings,
  InvestigationEvent,
  NewGameEvent,
  PlayerStatus,
  ReportJudgement,
  Role,
} from "../../types.ts";

type InvestigationFormProps = {
  editingEvent?: InvestigationEvent | undefined;
  settings: GameSettings;
  playerStatuses: Record<string, PlayerStatus>;
  claimedRoles: Record<string, ReadonlyArray<Role>>;
  myRole?: Role | undefined;
  initialPlayerId?: string | undefined;
  onSubmit: (eventData: NewGameEvent) => void;
  onCancel: () => void;
};

export function InvestigationForm({
  editingEvent,
  settings,
  playerStatuses,
  claimedRoles,
  myRole,
  initialPlayerId,
  onSubmit,
  onCancel,
}: InvestigationFormProps) {
  const alivePlayers = useMemo(() => {
    return settings.players.filter((p) =>
      (playerStatuses[p.id] || "ALIVE") === "ALIVE"
    );
  }, [settings.players, playerStatuses]);

  // エンジニアCOしたプレイヤー（または自分=真エンジニアの場合の自分）
  const engineerCandidates = useMemo(() => {
    return settings.players.filter((p) => {
      const cos = claimedRoles[p.id] || [];
      if (cos.includes("ENGINEER")) return true;
      if (p.id === "player" && myRole === "ENGINEER") return true;
      return false;
    });
  }, [settings.players, claimedRoles, myRole]);

  const [selectedPlayer, setSelectedPlayer] = useState<string>(() => {
    if (editingEvent) return editingEvent.investigatorId;
    if (initialPlayerId) return initialPlayerId;
    return engineerCandidates[0]?.id || alivePlayers[0]?.id || "";
  });

  const [targetPlayer, setTargetPlayer] = useState<string>(() => {
    if (editingEvent) return editingEvent.targetId;
    const inv = initialPlayerId || engineerCandidates[0]?.id ||
      alivePlayers[0]?.id || "";
    const cand = settings.players.find((p) => p.id !== inv);
    return cand?.id || "";
  });

  const [reportResult, setReportResult] = useState<ReportJudgement>(() => {
    if (editingEvent) return editingEvent.result;
    return "HUMAN";
  });

  // 調査対象候補（調査者本人以外の全プレイヤー）
  const investigationTargetCandidates = useMemo(() => {
    return settings.players.filter((p) => p.id !== selectedPlayer);
  }, [settings.players, selectedPlayer]);

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    if (!selectedPlayer || !targetPlayer || selectedPlayer === targetPlayer) {
      return;
    }
    onSubmit({
      type: "INVESTIGATION",
      investigatorId: selectedPlayer,
      targetId: targetPlayer,
      result: reportResult,
    });
  };

  const isSubmitDisabled = !selectedPlayer || !targetPlayer ||
    selectedPlayer === targetPlayer;

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">
            調査したエンジニア (CO者のみ)
          </label>
          <select
            className="form-select"
            value={selectedPlayer}
            onChange={(e) => {
              const newInv = (e.target as HTMLSelectElement).value;
              setSelectedPlayer(newInv);
              if (targetPlayer === newInv) {
                setTargetPlayer(
                  alivePlayers.find((p) => p.id !== newInv)?.id || "",
                );
              }
            }}
          >
            {engineerCandidates.length > 0
              ? (
                engineerCandidates.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.id === "player" && myRole === "ENGINEER"
                      ? "(真エンジニア)"
                      : "(CO者)"}
                  </option>
                ))
              )
              : (
                alivePlayers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (※未CO)
                  </option>
                ))
              )}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">
            調査対象 (生存者 / 今朝消滅した乗員)
          </label>
          <select
            className="form-select"
            value={targetPlayer}
            onChange={(e) =>
              setTargetPlayer((e.target as HTMLSelectElement).value)}
          >
            <option value="">-- 調査対象を選択 --</option>
            <optgroup label="生存している乗員">
              {investigationTargetCandidates
                .filter((p) => (playerStatuses[p.id] || "ALIVE") === "ALIVE")
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </optgroup>
            {investigationTargetCandidates.some(
              (p) => (playerStatuses[p.id] || "ALIVE") !== "ALIVE",
            ) && (
              <optgroup label="消滅・冷凍された乗員 (バグ蒸発・昨夜襲撃など)">
                {investigationTargetCandidates
                  .filter((p) => (playerStatuses[p.id] || "ALIVE") !== "ALIVE")
                  .map((p) => {
                    const status = playerStatuses[p.id];
                    const statusLabel = status === "FROZEN" ? "冷凍" : "消滅";
                    return (
                      <option key={p.id} value={p.id}>
                        {p.name} ({statusLabel})
                      </option>
                    );
                  })}
              </optgroup>
            )}
          </select>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">判定結果</label>
        <select
          className="form-select"
          value={reportResult}
          onChange={(e) =>
            setReportResult(
              (e.target as HTMLSelectElement).value as ReportJudgement,
            )}
        >
          <option value="HUMAN">人間 (白)</option>
          <option value="GNOSIA">グノーシア (黒)</option>
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
