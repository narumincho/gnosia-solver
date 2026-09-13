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

type EventTimelineProps = {
  events: ReadonlyArray<GameEvent>;
  settings: GameSettings;
  currentDay: number;
  playerStatuses: Record<string, PlayerStatus>;
  claimedRoles: Record<
    string,
    ReadonlyArray<"ENGINEER" | "DOCTOR" | "GUARD_DUTY">
  >;
  myRole?: Role | undefined;
  onOpenAddEvent: (
    initialType?: EventType | undefined,
    initialPlayerId?: string | undefined,
  ) => void;
  onQuickDoctorReport: (
    reporterId: string,
    targetId: string,
    result: ReportJudgement,
  ) => void;
  onEditEvent: (event: GameEvent) => void;
  onRemoveEvent: (id: string) => void;
  onMoveEvent: (fromIndex: number, toIndex: number) => void;
  hasContradiction: boolean;
  contradictionReason?: string | undefined;
};

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
        let content;
        if (ev.disappearedPlayerIds.length === 0) {
          content = (
            <span>
              夜間に{" "}
              <strong style={{ color: "var(--color-crew)" }}>
                犠牲者なし (平和)
              </strong>
            </span>
          );
        } else if (ev.disappearedPlayerIds.length === 1) {
          content = (
            <span>
              夜間に{" "}
              <strong>{getPlayerName(ev.disappearedPlayerIds[0] ?? "")}</strong>
              {" "}
              が <span style={{ color: "var(--color-gnosia)" }}>消滅</span>{" "}
              (非グノーシア確定)
            </span>
          );
        } else {
          content = (
            <span>
              夜間に{" "}
              <strong>{getPlayerName(ev.disappearedPlayerIds[0] ?? "")}</strong>
              {" "}
              と{" "}
              <strong>{getPlayerName(ev.disappearedPlayerIds[1] ?? "")}</strong>
              {" "}
              が <span style={{ color: "var(--color-gnosia)" }}>消滅</span>{" "}
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
        return (
          <span>
            {content}
            {ev.guardedPlayerId && (
              <span
                style={{
                  display: "block",
                  color: "var(--color-angel, #eab308)",
                  fontSize: "0.75rem",
                  marginTop: "0.2rem",
                }}
              >
                🛡️ 護衛対象:{" "}
                <strong>{getPlayerName(ev.guardedPlayerId)}</strong>
              </span>
            )}
          </span>
        );
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
      case "GUARDIAN_GUARD": {
        return (
          <span>
            夜間に{" "}
            <strong style={{ color: "var(--color-angel, #eab308)" }}>
              {getPlayerName(ev.targetId)}
            </strong>{" "}
            を <strong>【護衛対象に指定】</strong>{" "}
            <span
              className="badge badge-angel"
              style={{ fontSize: "0.7rem", padding: "1px 6px" }}
            >
              守護天使視点
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
      case "GUARDIAN_GUARD":
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

  // 本日（currentDay）まだ調査報告していない生存エンジニア (Day 2以降)
  const pendingEngineers = useMemo(() => {
    if (currentDay < 2) return [];
    return aliveEngineers.filter((p) => {
      return !events.some(
        (e) =>
          e.day === currentDay &&
          e.type === "INVESTIGATION" &&
          e.investigatorId === p.id,
      );
    });
  }, [currentDay, aliveEngineers, events]);

  // 本日（currentDay）まだ医療報告していない生存ドクター (Day 2以降)
  const pendingDoctors = useMemo(() => {
    if (currentDay < 2) return [];
    return aliveDoctors.filter((p) => {
      return !events.some(
        (e) =>
          e.day === currentDay &&
          e.type === "DOCTOR_REPORT" &&
          e.reporterId === p.id,
      );
    });
  }, [currentDay, aliveDoctors, events]);

  // 直近で投票により冷凍された乗員（ドクターの報告対象）
  const lastFrozenPlayer = useMemo(() => {
    for (let i = events.length - 1; i >= 0; i--) {
      const ev = events[i];
      if (ev && ev.type === "VOTE") {
        const frozenId = ev.frozenPlayerId;
        const player = settings.players.find((p) => p.id === frozenId);
        if (player) return player;
      }
    }
    return undefined;
  }, [events, settings.players]);
  // タイムラインに存在する日の一覧
  const recordedDays = useMemo(() => {
    return Array.from(
      new Set(events.map((e) => e.day).concat([currentDay])),
    ).sort((a, b) => a - b);
  }, [events, currentDay]);

  return (
    <div className="sidebar-panel">
      <div className="timeline-header">
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Calendar size={18} color="var(--text-accent)" />
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem" }}>
            Day {currentDay} 進行中
          </h2>
        </div>

        <span
          className="badge"
          style={{
            fontSize: "0.75rem",
            background: "rgba(56, 189, 248, 0.1)",
            color: "var(--accent-primary, #38bdf8)",
            border: "1px solid rgba(56, 189, 248, 0.3)",
          }}
        >
          全 {events.length} イベント
        </span>
      </div>

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
              type="button"
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
              「イベント追加」または各プレイヤーカードのクイックボタンから入力してください。<br />
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
              const prevEv = events[index - 1];
              const isFirstOfDay = index === 0 ||
                (prevEv ? prevEv.day !== ev.day : true);
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
                    draggable
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
                          type="button"
                          className="event-action-btn"
                          disabled={index === 0}
                          onClick={() => onMoveEvent(index, index - 1)}
                          title="1つ前（上）へ並び替え"
                        >
                          <ArrowUp size={13} />
                        </button>
                        <button
                          type="button"
                          className="event-action-btn"
                          disabled={index === events.length - 1}
                          onClick={() => onMoveEvent(index, index + 1)}
                          title="1つ後（下）へ並び替え"
                        >
                          <ArrowDown size={13} />
                        </button>
                        {ev.type !== "DAY_CHANGE" && (
                          <button
                            type="button"
                            className="event-edit-btn"
                            command="show-modal"
                            commandfor="add-event-dialog"
                            onClick={() => onEditEvent(ev)}
                            title="イベントを編集"
                          >
                            <Pencil size={13} />
                          </button>
                        )}
                        <button
                          type="button"
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

        {/* 翌日に進行していてその日のイベントがまだない場合、進行中Dayのセパレータを表示 */}
        {events.length > 0 &&
          currentDay > (events[events.length - 1]?.day || 0) && (
          <div
            id={`timeline-day-${currentDay}`}
            className="timeline-day-separator"
          >
            <span className="timeline-day-badge">Day {currentDay}</span>
            <div className="timeline-day-line" />
          </div>
        )}

        {/* Day X 朝の未入力報告スロット (イベント一覧の枠内に直接配置) */}
        {currentDay >= 2 &&
          (pendingEngineers.length > 0 || pendingDoctors.length > 0) && (
          <div className="pending-reports-box">
            <div className="pending-reports-header">
              <span className="pending-reports-title">
                🌅 Day {currentDay} 朝の報告 (未入力: 残り{" "}
                {pendingEngineers.length + pendingDoctors.length} 件)
              </span>
            </div>

            {/* エンジニア調査報告スロット */}
            {pendingEngineers.map((p) => (
              <div key={`pending-eng-${p.id}`} className="pending-report-row">
                <div className="pending-report-info">
                  <span
                    className="badge badge-engineer"
                    style={{ fontSize: "0.7rem", padding: "1px 6px" }}
                  >
                    調査
                  </span>
                  <strong className="pending-report-name">{p.name}</strong>{" "}
                  の調査報告:
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-engineer-report"
                  command="show-modal"
                  commandfor="add-event-dialog"
                  onClick={() =>
                    onOpenAddEvent("INVESTIGATION", p.id)}
                  title={`${p.name} の調査結果を記録`}
                >
                  🔍 調査結果を入力
                </button>
              </div>
            ))}

            {/* ドクター医療報告スロット */}
            {pendingDoctors.map((p) => (
              <div key={`pending-doc-${p.id}`} className="pending-report-row">
                <div className="pending-report-info">
                  <span
                    className="badge badge-doctor"
                    style={{ fontSize: "0.7rem", padding: "1px 6px" }}
                  >
                    医療
                  </span>
                  <strong className="pending-report-name">{p.name}</strong>{" "}
                  の医療報告
                  {lastFrozenPlayer ? ` (${lastFrozenPlayer.name}):` : ":"}
                </div>
                {lastFrozenPlayer
                  ? (
                    <div style={{ display: "flex", gap: "0.3rem" }}>
                      <button
                        type="button"
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
                        type="button"
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
                      type="button"
                      className="btn btn-sm btn-doctor-report"
                      command="show-modal"
                      commandfor="add-event-dialog"
                      onClick={() => onOpenAddEvent("DOCTOR_REPORT", p.id)}
                      title={`${p.name} の医療報告を入力`}
                    >
                      🩺 報告を入力
                    </button>
                  )}
              </div>
            ))}
          </div>
        )}

        {/* タイムライン最下部のイベント追加アクションバー */}
        <div className="timeline-bottom-bar">
          <button
            type="button"
            className="btn btn-primary btn-add-event-bottom"
            command="show-modal"
            commandfor="add-event-dialog"
            onClick={() => onOpenAddEvent()}
            title="任意のイベント（投票、消滅、CO、看破など）を追加"
          >
            <Plus size={16} />
            <span>イベントを追加</span>
          </button>

          <div style={{ display: "flex", gap: "0.4rem", width: "100%" }}>
            <button
              type="button"
              className="btn btn-sm btn-night-action"
              style={{ flex: 1 }}
              command="show-modal"
              commandfor="add-event-dialog"
              onClick={() => onOpenAddEvent("DISAPPEARANCE")}
              title="夜の出来事 (消滅または平和) を記録"
            >
              <span>🌙 消滅 / 平和</span>
            </button>
            {myRole === "GNOSIA" && (
              <button
                type="button"
                className="btn btn-sm btn-gnosia-action"
                style={{ flex: 1 }}
                command="show-modal"
                commandfor="add-event-dialog"
                onClick={() => onOpenAddEvent("GNOSIA_ATTACK")}
                title="自分がグノーシアの際の襲撃対象を記録"
              >
                <span>🎯 襲撃先</span>
              </button>
            )}
            {myRole === "GUARDIAN_ANGEL" && (
              <button
                type="button"
                className="btn btn-sm btn-angel-action"
                style={{ flex: 1 }}
                command="show-modal"
                commandfor="add-event-dialog"
                onClick={() => onOpenAddEvent("GUARDIAN_GUARD")}
                title="自分が守護天使の際の護衛対象を記録"
              >
                <span>🛡️ 護衛先</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
