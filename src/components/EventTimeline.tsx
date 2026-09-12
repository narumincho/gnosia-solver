import { Fragment } from "preact";
import { useMemo } from "preact/hooks";
import {
  AlertOctagon,
  ArrowDown,
  ArrowUp,
  Calendar,
  GripVertical,
  Pencil,
  Plus,
  Trash2,
} from "lucide-preact";
import {
  EventType,
  GameEvent,
  GameSettings,
  PlayerStatus,
  ReportJudgement,
  Role,
  ROLE_DEFINITIONS,
} from "../types.ts";

interface EventTimelineProps {
  events: GameEvent[];
  settings: GameSettings;
  currentDay: number;
  playerStatuses: Record<string, PlayerStatus>;
  claimedRoles: Record<string, ("ENGINEER" | "DOCTOR" | "GUARD_DUTY")[]>;
  myRole?: Role;
  onOpenAddEvent: (initialType?: EventType, initialPlayerId?: string) => void;
  onQuickDoctorReport: (
    reporterId: string,
    targetId: string,
    result: ReportJudgement,
  ) => void;
  onEditEvent: (event: GameEvent) => void;
  onRemoveEvent: (id: string) => void;
  onMoveEvent: (fromIndex: number, toIndex: number) => void;
  hasContradiction: boolean;
  contradictionReason?: string;
}

export function EventTimeline({
  events,
  settings,
  currentDay,
  playerStatuses,
  claimedRoles,
  myRole,
  onOpenAddEvent,
  onQuickDoctorReport,
  onEditEvent,
  onRemoveEvent,
  onMoveEvent,
  hasContradiction,
  contradictionReason,
}: EventTimelineProps) {
  const getPlayerName = (id: string) => {
    return settings.players.find((p) => p.id === id)?.name || id;
  };

  const renderEventDescription = (ev: GameEvent) => {
    switch (ev.type) {
      case "CO": {
        const roleDef = ROLE_DEFINITIONS[ev.claimedRole];
        if (ev.claimedRole === "GUARD_DUTY" && ev.partnerPlayerId) {
          return (
            <span>
              <strong>{getPlayerName(ev.playerId)}</strong> と{" "}
              <strong>{getPlayerName(ev.partnerPlayerId)}</strong> が{" "}
              <span style={{ color: roleDef.color, fontWeight: "bold" }}>
                {roleDef.name}
              </span>{" "}
              と名乗り出た (CO)
            </span>
          );
        }
        return (
          <span>
            <strong>{getPlayerName(ev.playerId)}</strong> が{" "}
            <span style={{ color: roleDef.color, fontWeight: "bold" }}>
              {roleDef.name}
            </span>{" "}
            と名乗り出た (CO)
          </span>
        );
      }
      case "INVESTIGATION": {
        const isGnosia = ev.result === "GNOSIA";
        return (
          <span>
            <strong>{getPlayerName(ev.investigatorId)}</strong> の調査:{" "}
            <strong>{getPlayerName(ev.targetId)}</strong> は{" "}
            <strong
              style={{
                color: isGnosia ? "var(--color-gnosia)" : "var(--color-crew)",
              }}
            >
              {isGnosia ? "【グノーシア】" : "【人間】"}
            </strong>
          </span>
        );
      }
      case "DOCTOR_REPORT": {
        const isGnosia = ev.result === "GNOSIA";
        return (
          <span>
            <strong>{getPlayerName(ev.reporterId)}</strong> の医療報告:{" "}
            <strong>{getPlayerName(ev.targetId)}</strong> は{" "}
            <strong
              style={{
                color: isGnosia ? "var(--color-gnosia)" : "var(--color-crew)",
              }}
            >
              {isGnosia ? "【グノーシア】" : "【人間】"}
            </strong>
          </span>
        );
      }
      case "DEFINITE_LIE": {
        const isSelf = ev.witnessId === "player" || !ev.witnessId;
        const witnessName = isSelf ? "自分" : getPlayerName(ev.witnessId);
        return (
          <span>
            {isSelf
              ? (
                <>
                  <strong>自分</strong> が{" "}
                  <strong style={{ color: "var(--color-gnosia)" }}>
                    {getPlayerName(ev.targetId)}
                  </strong>{" "}
                  の嘘を看破{" "}
                  <span
                    className="badge badge-enemy"
                    style={{ fontSize: "0.7rem", padding: "1px 6px" }}
                  >
                    敵確定
                  </span>
                </>
              )
              : (
                <>
                  <strong>{witnessName}</strong> が{" "}
                  <strong style={{ color: "var(--color-gnosia)" }}>
                    {getPlayerName(ev.targetId)}
                  </strong>{" "}
                  の嘘を密告{" "}
                  <span
                    className="badge"
                    style={{
                      fontSize: "0.7rem",
                      padding: "1px 6px",
                      background: "rgba(244, 63, 94, 0.2)",
                      color: "#fb7185",
                    }}
                  >
                    密告
                  </span>
                </>
              )}
          </span>
        );
      }
      case "VOTE": {
        return (
          <span>
            投票により <strong>{getPlayerName(ev.frozenPlayerId)}</strong> が
            {" "}
            <span style={{ color: "var(--color-crew)" }}>コールドスリープ</span>
          </span>
        );
      }
      case "DISAPPEARANCE": {
        if (ev.disappearedPlayerIds.length === 0) {
          return (
            <span>
              夜間に{" "}
              <strong style={{ color: "var(--color-crew)" }}>
                犠牲者なし (平和)
              </strong>
            </span>
          );
        } else if (ev.disappearedPlayerIds.length === 1) {
          return (
            <span>
              夜間に{" "}
              <strong>{getPlayerName(ev.disappearedPlayerIds[0])}</strong> が
              {" "}
              <span style={{ color: "var(--color-gnosia)" }}>消滅</span>{" "}
              (非グノーシア確定)
            </span>
          );
        } else {
          return (
            <span>
              夜間に{" "}
              <strong>{getPlayerName(ev.disappearedPlayerIds[0])}</strong> と
              {" "}
              <strong>{getPlayerName(ev.disappearedPlayerIds[1])}</strong> が
              {" "}
              <span style={{ color: "var(--color-gnosia)" }}>消滅</span>{" "}
              <span
                className="badge"
                style={{
                  fontSize: "0.7rem",
                  padding: "1px 6px",
                  background: "rgba(168, 85, 247, 0.2)",
                  color: "#c084fc",
                }}
              >
                2人消滅
              </span>
            </span>
          );
        }
      }
      case "GNOSIA_ATTACK": {
        return (
          <span>
            夜間に{" "}
            <strong style={{ color: "var(--color-gnosia)" }}>
              {getPlayerName(ev.targetId)}
            </strong>{" "}
            を <strong>【襲撃対象に指定】</strong>{" "}
            <span
              className="badge badge-enemy"
              style={{ fontSize: "0.7rem", padding: "1px 6px" }}
            >
              G視点
            </span>
          </span>
        );
      }
      case "ATTACK": {
        return (
          <span>
            夜間に <strong>{getPlayerName(ev.attackedPlayerId)}</strong> が{" "}
            <span style={{ color: "var(--color-gnosia)" }}>消滅</span>{" "}
            (非グノーシア確定)
          </span>
        );
      }
      case "NO_ATTACK": {
        return (
          <span>
            夜間の<strong>【襲撃なし】</strong> (犠牲者ゼロ)
            {ev.guardedPlayerId && (
              <span
                style={{
                  display: "block",
                  color: "var(--color-angel)",
                  fontSize: "0.75rem",
                }}
              >
                護衛対象: <strong>{getPlayerName(ev.guardedPlayerId)}</strong>
                {" "}
                (非グノーシア確定)
              </span>
            )}
            {ev.note && (
              <span
                style={{
                  color: "var(--text-muted)",
                  fontSize: "0.75rem",
                  display: "block",
                }}
              >
                ({ev.note})
              </span>
            )}
          </span>
        );
      }
      case "DAY_CHANGE": {
        return (
          <span
            style={{ color: "var(--accent-primary, #38bdf8)", fontWeight: 600 }}
          >
            🌅 翌日へ進行 (Day {ev.day + 1} へ)
            {ev.note && (
              <span
                style={{
                  color: "var(--text-muted)",
                  fontSize: "0.75rem",
                  display: "block",
                }}
              >
                ({ev.note})
              </span>
            )}
          </span>
        );
      }
      default:
        return <span>不明なイベント</span>;
    }
  };

  const getEventClass = (type: GameEvent["type"]) => {
    switch (type) {
      case "DEFINITE_LIE":
        return "event-lie";
      case "CO":
        return "event-co";
      case "INVESTIGATION":
      case "DOCTOR_REPORT":
        return "event-investigate";
      case "DISAPPEARANCE":
      case "ATTACK":
        return "event-attack";
      case "GNOSIA_ATTACK":
        return "event-lie";
      case "NO_ATTACK":
        return "event-angel";
      case "VOTE":
        return "event-vote";
      case "DAY_CHANGE":
        return "event-day-change";
      default:
        return "";
    }
  };

  // 生存しているエンジニアCO者
  const aliveEngineers = useMemo(() => {
    return settings.players.filter((p) => {
      const isAlive = (playerStatuses[p.id] || "ALIVE") === "ALIVE";
      if (!isAlive) return false;
      const cos = claimedRoles[p.id] || [];
      return cos.includes("ENGINEER") ||
        (p.id === "player" && myRole === "ENGINEER");
    });
  }, [settings.players, playerStatuses, claimedRoles, myRole]);

  // 生存しているドクターCO者
  const aliveDoctors = useMemo(() => {
    return settings.players.filter((p) => {
      const isAlive = (playerStatuses[p.id] || "ALIVE") === "ALIVE";
      if (!isAlive) return false;
      const cos = claimedRoles[p.id] || [];
      return cos.includes("DOCTOR") ||
        (p.id === "player" && myRole === "DOCTOR");
    });
  }, [settings.players, playerStatuses, claimedRoles, myRole]);

  // 直近で投票により冷凍された乗員（ドクターの報告対象）
  const lastFrozenPlayer = useMemo(() => {
    for (let i = events.length - 1; i >= 0; i--) {
      if (events[i].type === "VOTE") {
        const frozenId = (events[i] as any).frozenPlayerId;
        const player = settings.players.find((p) => p.id === frozenId);
        if (player) return player;
      }
    }
    return undefined;
  }, [events, settings.players]);

  // タイムラインに存在する日の一覧
  const recordedDays = Array.from(
    new Set(events.map((e) => e.day).concat([currentDay])),
  ).sort((a, b) => a - b);

  return (
    <div className="sidebar-panel">
      <div className="timeline-header">
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Calendar size={18} color="var(--text-accent)" />
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem" }}>
            Day {currentDay} 進行中
          </h2>
        </div>

        <div style={{ display: "flex", gap: "0.4rem" }}>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => onOpenAddEvent()}
            title="任意のイベントを追加"
          >
            <Plus size={14} />
            <span>イベント追加</span>
          </button>
        </div>
      </div>

      {/* 生存エンジニア・ドクターのクイック報告パネル */}
      {(aliveEngineers.length > 0 || aliveDoctors.length > 0) && (
        <div className="quick-report-panel">
          <div className="quick-report-header">
            <span>⚡ 朝の報告クイック作成</span>
          </div>

          {aliveEngineers.length > 0 && (
            <div
              className="quick-report-section"
              style={{ marginTop: 0, paddingTop: 0, borderTop: "none" }}
            >
              <span className="quick-report-label">🔍 エンジニア調査報告:</span>
              <div className="quick-report-buttons">
                {aliveEngineers.map((p) => (
                  <button
                    key={p.id}
                    className="quick-report-btn-engineer"
                    onClick={() => onOpenAddEvent("INVESTIGATION", p.id)}
                    title={`${p.name} の調査結果を記録（調査者が自動選択されます）`}
                  >
                    {p.name}の調査
                  </button>
                ))}
              </div>
            </div>
          )}

          {aliveDoctors.length > 0 && (
            <div className="quick-report-section">
              <span className="quick-report-label">
                🩺 ドクター医療報告{" "}
                {lastFrozenPlayer ? `(対象: ${lastFrozenPlayer.name})` : ""}:
              </span>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.35rem",
                }}
              >
                {aliveDoctors.map((p) => (
                  <div key={p.id} className="quick-doc-row">
                    <span className="quick-doc-name">{p.name}:</span>
                    {lastFrozenPlayer
                      ? (
                        <div style={{ display: "flex", gap: "0.25rem" }}>
                          <button
                            className="btn-doc-human"
                            onClick={() =>
                              onQuickDoctorReport(
                                p.id,
                                lastFrozenPlayer.id,
                                "HUMAN",
                              )}
                            title={`${p.name} の医療報告: ${lastFrozenPlayer.name} は【人間】`}
                          >
                            人間
                          </button>
                          <button
                            className="btn-doc-gnosia"
                            onClick={() =>
                              onQuickDoctorReport(
                                p.id,
                                lastFrozenPlayer.id,
                                "GNOSIA",
                              )}
                            title={`${p.name} の医療報告: ${lastFrozenPlayer.name} は【グノーシア】`}
                          >
                            グノーシア
                          </button>
                        </div>
                      )
                      : (
                        <button
                          className="btn btn-xs btn-secondary"
                          onClick={() => onOpenAddEvent("DOCTOR_REPORT", p.id)}
                          title="ドクター報告モーダルを開く"
                        >
                          報告を入力
                        </button>
                      )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {hasContradiction && (
        <div className="alert-box">
          <AlertOctagon size={24} />
          <div>
            <strong>破綻検知（矛盾が発生）</strong>
            <p style={{ fontSize: "0.75rem", marginTop: "0.2rem" }}>
              {contradictionReason ||
                "現在のイベントを満たす役職配置が存在しません。"}
            </p>
          </div>
        </div>
      )}

      {recordedDays.length > 1 && (
        <div
          style={{
            display: "flex",
            gap: "0.4rem",
            marginBottom: "0.8rem",
            overflowX: "auto",
            paddingBottom: "0.2rem",
          }}
        >
          {recordedDays.map((d) => (
            <button
              key={d}
              className={`btn btn-sm ${currentDay === d ? "btn-primary" : ""}`}
              onClick={() => {
                const el = document.getElementById(`timeline-day-${d}`);
                if (el) {
                  el.scrollIntoView({ behavior: "smooth", block: "start" });
                }
              }}
              style={{ padding: "0.2rem 0.55rem", fontSize: "0.75rem" }}
            >
              Day {d}
            </button>
          ))}
        </div>
      )}

      <div className="timeline-list">
        {events.length === 0
          ? (
            <div
              style={{
                color: "var(--text-muted)",
                fontSize: "0.85rem",
                textAlign: "center",
                padding: "2rem 0",
              }}
            >
              イベントがまだ登録されていません。<br />
              上部の「イベント追加」または各プレイヤーカードのクイックボタンから入力してください。<br />
              <span
                style={{
                  fontSize: "0.75rem",
                  marginTop: "0.5rem",
                  display: "inline-block",
                }}
              >
                ※ 襲撃や投票の並び順からDayが自動計算されます
              </span>
            </div>
          )
          : (
            events.map((ev, index) => {
              const isFirstOfDay = index === 0 ||
                events[index - 1].day !== ev.day;
              return (
                <Fragment key={ev.id}>
                  {isFirstOfDay && (
                    <div
                      id={`timeline-day-${ev.day}`}
                      className="timeline-day-separator"
                    >
                      <span className="timeline-day-badge">Day {ev.day}</span>
                      <div className="timeline-day-line" />
                    </div>
                  )}
                  <div
                    className={`event-card ${getEventClass(ev.type)}`}
                    draggable={true}
                    onDragStart={(e) => {
                      e.dataTransfer?.setData("text/plain", String(index));
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const from = Number(
                        e.dataTransfer?.getData("text/plain"),
                      );
                      if (!isNaN(from) && from !== index) {
                        onMoveEvent(from, index);
                      }
                    }}
                  >
                    <div className="event-meta">
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.35rem",
                        }}
                      >
                        <GripVertical
                          size={13}
                          color="var(--text-muted)"
                          style={{ cursor: "grab", opacity: 0.6 }}
                        />
                        <span className="event-order-badge">#{index + 1}</span>
                        <span className="event-day">DAY {ev.day}</span>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: "0.25rem",
                          alignItems: "center",
                        }}
                      >
                        <button
                          className="event-action-btn"
                          disabled={index === 0}
                          onClick={() => onMoveEvent(index, index - 1)}
                          title="1つ前（上）へ並び替え"
                        >
                          <ArrowUp size={13} />
                        </button>
                        <button
                          className="event-action-btn"
                          disabled={index === events.length - 1}
                          onClick={() => onMoveEvent(index, index + 1)}
                          title="1つ後（下）へ並び替え"
                        >
                          <ArrowDown size={13} />
                        </button>
                        {ev.type !== "DAY_CHANGE" && (
                          <button
                            className="event-edit-btn"
                            onClick={() => onEditEvent(ev)}
                            title="イベントを編集"
                          >
                            <Pencil size={13} />
                          </button>
                        )}
                        <button
                          className="event-delete-btn"
                          onClick={() => onRemoveEvent(ev.id)}
                          title="イベントを削除"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    <div className="event-body">
                      {renderEventDescription(ev)}
                    </div>
                  </div>
                </Fragment>
              );
            })
          )}
      </div>
    </div>
  );
}
