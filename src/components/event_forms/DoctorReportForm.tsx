import { useMemo, useState } from "preact/hooks";
import {
  DoctorReportEvent,
  GameSettings,
  NewGameEvent,
  PlayerStatus,
  ReportJudgement,
  Role,
} from "../../types.ts";

type DoctorReportFormProps = {
  editingEvent?: DoctorReportEvent | undefined;
  settings: GameSettings;
  playerStatuses: Record<string, PlayerStatus>;
  claimedRoles: Record<string, ReadonlyArray<Role>>;
  myRole?: Role | undefined;
  initialPlayerId?: string | undefined;
  onSubmit: (eventData: NewGameEvent) => void;
  onCancel: () => void;
};

export function DoctorReportForm({
  editingEvent,
  settings,
  playerStatuses,
  claimedRoles,
  myRole,
  initialPlayerId,
  onSubmit,
  onCancel,
}: DoctorReportFormProps) {
  const alivePlayers = useMemo(() => {
    return settings.players.filter((p) =>
      (playerStatuses[p.id] || "ALIVE") === "ALIVE"
    );
  }, [settings.players, playerStatuses]);

  const frozenPlayers = useMemo(() => {
    return settings.players.filter((p) => playerStatuses[p.id] === "FROZEN");
  }, [settings.players, playerStatuses]);

  // ドクターCOしたプレイヤー（または自分=真ドクターの場合の自分）
  const doctorCandidates = useMemo(() => {
    return settings.players.filter((p) => {
      const cos = claimedRoles[p.id] || [];
      if (cos.includes("DOCTOR")) return true;
      if (p.id === "player" && myRole === "DOCTOR") return true;
      return false;
    });
  }, [settings.players, claimedRoles, myRole]);

  const [selectedPlayer, setSelectedPlayer] = useState<string>(() => {
    if (editingEvent) return editingEvent.reporterId;
    if (initialPlayerId) return initialPlayerId;
    return doctorCandidates[0]?.id || alivePlayers[0]?.id || "";
  });

  const [targetPlayer, setTargetPlayer] = useState<string>(() => {
    if (editingEvent) return editingEvent.targetId;
    return frozenPlayers[0]?.id || "";
  });

  const [reportResult, setReportResult] = useState<ReportJudgement>(() => {
    if (editingEvent) return editingEvent.result;
    return "HUMAN";
  });

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    if (!selectedPlayer || !targetPlayer) return;
    onSubmit({
      type: "DOCTOR_REPORT",
      reporterId: selectedPlayer,
      targetId: targetPlayer,
      result: reportResult,
    });
  };

  const isSubmitDisabled = frozenPlayers.length === 0 || !selectedPlayer ||
    !targetPlayer;

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">
            報告したドクター (CO者のみ)
          </label>
          <select
            className="form-select"
            value={selectedPlayer}
            onChange={(e) =>
              setSelectedPlayer((e.target as HTMLSelectElement).value)}
          >
            {doctorCandidates.length > 0
              ? (
                doctorCandidates.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.id === "player" && myRole === "DOCTOR"
                      ? "(真ドクター)"
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
            診察した冷凍対象 (冷凍された乗員のみ)
          </label>
          {frozenPlayers.length > 0
            ? (
              <select
                className="form-select"
                value={targetPlayer}
                onChange={(e) =>
                  setTargetPlayer((e.target as HTMLSelectElement).value)}
              >
                {frozenPlayers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (コールドスリープ済)
                  </option>
                ))}
              </select>
            )
            : (
              <select className="form-select" disabled>
                <option value="">
                  (コールドスリープされた乗員がいません)
                </option>
              </select>
            )}
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
