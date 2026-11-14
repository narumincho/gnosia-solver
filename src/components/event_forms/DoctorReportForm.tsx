import { useMemo, useState } from "preact/hooks";
import {
  DoctorReportEvent,
  GameEvent,
  GameSettings,
  NewGameEvent,
  PlayerStatus,
  ReportJudgement,
  Role,
} from "../../types.ts";

type DoctorReportFormProps = {
  editingEvent?: DoctorReportEvent | undefined;
  settings: GameSettings;
  events: ReadonlyArray<GameEvent>;
  currentDay: number;
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
  events,
  currentDay,
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

  // 冷凍された順 (新しい順) に並べる。直近の冷凍者が先頭に来るので、通常はそのままタップできる
  const frozenPlayers = useMemo(() => {
    const voteOrder: Array<string> = [];
    for (const ev of events) {
      if (ev.type === "VOTE") voteOrder.push(ev.frozenPlayerId);
    }
    const orderOf = (id: string) => voteOrder.lastIndexOf(id);
    return settings.players
      .filter((p) => playerStatuses[p.id] === "FROZEN")
      .toSorted((a, b) => orderOf(b.id) - orderOf(a.id));
  }, [settings.players, playerStatuses, events]);

  // ドクターCOしたプレイヤー（または自分=真ドクターの場合の自分）
  // 新規入力時は、すでに冷凍・消滅したCO者は診察できないので除外する
  const doctorCandidates = useMemo(() => {
    return settings.players.filter((p) => {
      if (
        !editingEvent && (playerStatuses[p.id] || "ALIVE") !== "ALIVE"
      ) {
        return false;
      }
      const cos = claimedRoles[p.id] || [];
      if (cos.includes("DOCTOR")) return true;
      if (p.id === "player" && myRole === "DOCTOR") return true;
      return false;
    });
  }, [settings.players, claimedRoles, myRole, playerStatuses, editingEvent]);

  const [selectedDoctor, setSelectedDoctor] = useState<string>(() => {
    if (editingEvent) return editingEvent.reporterId;
    if (initialPlayerId) return initialPlayerId;
    return doctorCandidates[0]?.id || alivePlayers[0]?.id || "";
  });

  const [targetPlayer, setTargetPlayer] = useState<string>(() => {
    if (editingEvent) return editingEvent.targetId;
    return "";
  });

  const [reportResult, setReportResult] = useState<ReportJudgement>(() => {
    if (editingEvent) return editingEvent.result;
    return "HUMAN";
  });

  // このドクターがすでに報告済みの対象
  const alreadyReported: ReadonlySet<string> = useMemo(() => {
    return new Set(
      events.flatMap((ev) =>
        ev.type === "DOCTOR_REPORT" && ev.reporterId === selectedDoctor &&
          ev.id !== editingEvent?.id
          ? [ev.targetId]
          : []
      ),
    );
  }, [events, selectedDoctor, editingEvent]);

  // 同じドクターが同じ日にすでに報告している場合は警告する (1日に診察できるのは1人)
  const duplicateReport = useMemo(() => {
    const targetDay = editingEvent?.day ?? currentDay;
    return events.find(
      (ev): ev is DoctorReportEvent =>
        ev.type === "DOCTOR_REPORT" &&
        ev.reporterId === selectedDoctor &&
        ev.day === targetDay &&
        ev.id !== editingEvent?.id,
    );
  }, [events, selectedDoctor, currentDay, editingEvent]);

  // 1クリックで判定と対象を確定
  const handleReportClick = (targetId: string, result: ReportJudgement) => {
    if (editingEvent) {
      setTargetPlayer(targetId);
      setReportResult(result);
      return;
    }
    onSubmit({
      type: "DOCTOR_REPORT",
      reporterId: selectedDoctor,
      targetId,
      result,
    });
  };

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    if (!selectedDoctor || !targetPlayer) return;
    onSubmit({
      type: "DOCTOR_REPORT",
      reporterId: selectedDoctor,
      targetId: targetPlayer,
      result: reportResult,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group" style={{ marginBottom: "1rem" }}>
        <label className="form-label">
          報告したドクター
        </label>
        {doctorCandidates.length <= 1 && !editingEvent
          ? (
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              <span
                className="badge badge-doctor"
                style={{ fontSize: "0.85rem", padding: "0.25rem 0.55rem" }}
              >
                {settings.players.find((p) => p.id === selectedDoctor)?.name ||
                  "ドクター"}
              </span>
            </div>
          )
          : (
            <select
              className="form-select"
              value={selectedDoctor}
              onChange={(e) =>
                setSelectedDoctor((e.target as HTMLSelectElement).value)}
            >
              {(doctorCandidates.length > 0 ? doctorCandidates : alivePlayers)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.id === "player" && myRole === "DOCTOR"
                      ? "(真ドクター)"
                      : "(CO者)"}
                  </option>
                ))}
            </select>
          )}
      </div>

      {duplicateReport && (
        <div className="alert-box" role="alert">
          ⚠️ {settings.players.find((p) => p.id === selectedDoctor)?.name}{" "}
          は{duplicateReport.day}日目にすでに{" "}
          {settings.players.find((p) => p.id === duplicateReport.targetId)
            ?.name}{" "}
          の診察を報告しています。ドクターが1日に診察できるのは1人だけです。
        </div>
      )}

      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label">
          診察した冷凍対象と判定結果をタップしてください
        </label>
        {frozenPlayers.length === 0
          ? (
            <div
              style={{
                padding: "1rem",
                background: "var(--bg-secondary)",
                borderRadius: "8px",
                color: "var(--text-muted)",
                fontSize: "0.85rem",
                textAlign: "center",
              }}
            >
              ※ コールドスリープされた乗員がいません
            </div>
          )
          : (
            <div className="player-report-list">
              {frozenPlayers.map((p, index) => {
                const isSelected = editingEvent && targetPlayer === p.id;
                const note = alreadyReported.has(p.id)
                  ? "(報告済み)"
                  : index === 0
                  ? "(直近の冷凍)"
                  : undefined;
                return (
                  <div
                    key={p.id}
                    className="player-report-tile"
                    style={{
                      background: isSelected
                        ? "rgba(52, 211, 153, 0.15)"
                        : undefined,
                      borderColor: isSelected ? "#34d399" : undefined,
                    }}
                  >
                    <span className="player-report-name">
                      ❄️ {p.name}
                      {note && (
                        <span
                          style={{
                            fontSize: "0.72rem",
                            color: "var(--text-muted)",
                            fontWeight: "normal",
                            marginLeft: "0.3rem",
                          }}
                        >
                          {note}
                        </span>
                      )}
                    </span>
                    <div className="player-report-actions">
                      <button
                        type="button"
                        className="btn-report-human"
                        onClick={() => handleReportClick(p.id, "HUMAN")}
                      >
                        ⚪ 人間 (白)
                      </button>
                      <button
                        type="button"
                        className="btn-report-gnosia"
                        onClick={() => handleReportClick(p.id, "GNOSIA")}
                      >
                        ⚫ グノーシア (黒)
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
            disabled={!selectedDoctor || !targetPlayer}
          >
            変更を保存する
          </button>
        )}
      </div>
    </form>
  );
}
