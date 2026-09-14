import { useEffect, useMemo, useState } from "preact/hooks";
import {
  GameEvent,
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
  events: ReadonlyArray<GameEvent>;
  currentDay: number;
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
  events,
  currentDay,
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

  const [selectedInvestigator, setSelectedInvestigator] = useState<string>(
    () => {
      if (editingEvent) return editingEvent.investigatorId;
      if (initialPlayerId) return initialPlayerId;
      return engineerCandidates[0]?.id || alivePlayers[0]?.id || "";
    },
  );

  const [targetPlayer, setTargetPlayer] = useState<string>(() => {
    if (editingEvent) return editingEvent.targetId;
    return "";
  });

  const [reportResult, setReportResult] = useState<ReportJudgement>(() => {
    if (editingEvent) return editingEvent.result;
    return "HUMAN";
  });

  // 調査対象候補（生存しているか、昨晩に消滅した乗員で、かつこのエンジニア自身が未調査の乗員）
  const targetCandidates = useMemo(() => {
    const targetDay = editingEvent?.day ?? currentDay;

    // 昨晩（targetDay - 1）に消滅した乗員ID
    const lastNightDisappeared = new Set<string>();
    if (targetDay > 1) {
      for (const ev of events) {
        if (ev.day === targetDay - 1) {
          if (ev.type === "DISAPPEARANCE") {
            for (const pid of ev.disappearedPlayerIds) {
              lastNightDisappeared.add(pid);
            }
          } else if (ev.type === "ATTACK") {
            lastNightDisappeared.add(ev.attackedPlayerId);
          }
        }
      }
    }
    const lastNightDisappearedSet: ReadonlySet<string> = lastNightDisappeared;

    // 既にこのエンジニア自身が調査済みの対象ID（編集中イベントの対象は除外しない）
    const alreadyInvestigated = new Set<string>();
    for (const ev of events) {
      if (
        ev.type === "INVESTIGATION" &&
        ev.investigatorId === selectedInvestigator &&
        ev.id !== editingEvent?.id
      ) {
        alreadyInvestigated.add(ev.targetId);
      }
    }
    const alreadyInvestigatedSet: ReadonlySet<string> = alreadyInvestigated;

    return settings.players.filter((p) => {
      // 調査者本人は除外
      if (p.id === selectedInvestigator) return false;

      // 編集中のイベント自身の対象であれば常に含める
      if (editingEvent && p.id === editingEvent.targetId) return true;

      // 既にこのエンジニア自身が調査済みの乗員は除外
      if (alreadyInvestigatedSet.has(p.id)) return false;

      // 生存しているか、昨晩に消滅した乗員に限る
      const isAlive = (playerStatuses[p.id] || "ALIVE") === "ALIVE";
      const disappearedLastNight = lastNightDisappearedSet.has(p.id);

      return isAlive || disappearedLastNight;
    });
  }, [
    settings.players,
    selectedInvestigator,
    events,
    playerStatuses,
    currentDay,
    editingEvent,
  ]);

  // 調査者が切り替わった場合などに無効になった targetPlayer をリセット
  useEffect(() => {
    if (targetPlayer && !targetCandidates.some((p) => p.id === targetPlayer)) {
      setTargetPlayer("");
    }
  }, [targetCandidates, targetPlayer]);

  // 1クリックで判定と対象を確定
  const handleReportClick = (targetId: string, result: ReportJudgement) => {
    if (editingEvent) {
      setTargetPlayer(targetId);
      setReportResult(result);
      return;
    }
    onSubmit({
      type: "INVESTIGATION",
      investigatorId: selectedInvestigator,
      targetId,
      result,
    });
  };

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    if (
      !selectedInvestigator || !targetPlayer ||
      selectedInvestigator === targetPlayer
    ) {
      return;
    }
    onSubmit({
      type: "INVESTIGATION",
      investigatorId: selectedInvestigator,
      targetId: targetPlayer,
      result: reportResult,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group" style={{ marginBottom: "1rem" }}>
        <label className="form-label">
          調査したエンジニア
        </label>
        {engineerCandidates.length <= 1 && !editingEvent
          ? (
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              <span
                className="badge badge-engineer"
                style={{ fontSize: "0.85rem", padding: "0.25rem 0.55rem" }}
              >
                {settings.players.find((p) => p.id === selectedInvestigator)
                  ?.name || "エンジニア"}
              </span>
            </div>
          )
          : (
            <select
              className="form-select"
              value={selectedInvestigator}
              onChange={(e) =>
                setSelectedInvestigator((e.target as HTMLSelectElement).value)}
            >
              {(engineerCandidates.length > 0
                ? engineerCandidates
                : alivePlayers).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.id === "player" && myRole === "ENGINEER"
                      ? "(真エンジニア)"
                      : "(CO者)"}
                  </option>
                ))}
            </select>
          )}
      </div>

      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label">
          調査対象と判定結果をタップしてください (白または黒をタップで即登録)
        </label>
        <div className="player-report-list">
          {targetCandidates.length === 0
            ? (
              <div
                style={{
                  color: "var(--text-muted)",
                  fontSize: "0.85rem",
                  padding: "1.5rem",
                  textAlign: "center",
                  background: "rgba(255, 255, 255, 0.03)",
                  borderRadius: "8px",
                  border: "1px dashed var(--border-color)",
                }}
              >
                調査可能な乗員がいません（生存者・昨晩消滅者をすべて調査済み、または対象なし）
              </div>
            )
            : (
              targetCandidates.map((p) => {
                const status = playerStatuses[p.id];
                const isSelected = editingEvent && targetPlayer === p.id;
                return (
                  <div
                    key={p.id}
                    className="player-report-tile"
                    style={{
                      background: isSelected
                        ? "rgba(56, 189, 248, 0.15)"
                        : undefined,
                      borderColor: isSelected ? "#38bdf8" : undefined,
                    }}
                  >
                    <span className="player-report-name">
                      {p.name}
                      {status && status !== "ALIVE" && (
                        <span
                          style={{
                            fontSize: "0.72rem",
                            color: "var(--text-muted)",
                            fontWeight: "normal",
                            marginLeft: "0.3rem",
                          }}
                        >
                          (昨晩消滅)
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
              })
            )}
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
            disabled={!selectedInvestigator || !targetPlayer}
          >
            変更を保存する
          </button>
        )}
      </div>
    </form>
  );
}
