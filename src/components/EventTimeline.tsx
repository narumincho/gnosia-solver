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
} from "../types.ts";
import { EventDescription } from "./timeline/EventDescription.tsx";
import { TimelineCheckpoint } from "./timeline/TimelineCheckpoint.tsx";

export type OpenAddEventOptions = {
  readonly type: EventType;
  readonly playerId?: string | undefined;
  readonly claimedRole?: "ENGINEER" | "DOCTOR" | "GUARD_DUTY" | undefined;
  readonly witnessId?: string | undefined;
};

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
  inspectedEventIndex?: number | null | undefined;
  onSelectCheckpoint?: ((index: number | null) => void) | undefined;
  onOpenAddEvent: (
    initialType?: EventType | OpenAddEventOptions | undefined,
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
  inspectedEventIndex = null,
  onSelectCheckpoint,
  onOpenAddEvent,
  onQuickDoctorReport,
  onEditEvent,
  onRemoveEvent,
  onMoveEvent,
  hasContradiction,
  contradictionReason,
}: EventTimelineProps) {
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

        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span
            className="badge"
            style={{
              fontSize: "0.75rem",
              background: "rgba(56, 189, 248, 0.1)",
              color: "var(--accent-primary, #38bdf8)",
              border: "1px solid rgba(56, 189, 248, 0.3)",
            }}
          >
            {events.length} イベント
          </span>
        </div>
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
              const isFuture = inspectedEventIndex !== null &&
                index > inspectedEventIndex;
              return (
                <Fragment key={ev.id}>
                  {index === 0 && onSelectCheckpoint && (
                    <TimelineCheckpoint
                      checkpointIndex={-1}
                      isActive={inspectedEventIndex === -1}
                      onSelect={onSelectCheckpoint}
                      label="初期状態 (イベント0件)"
                    />
                  )}
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
                    className={`event-card ${getEventClass(ev.type)} ${
                      isFuture ? "future-card" : ""
                    }`}
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
                      <EventDescription event={ev} players={settings.players} />
                    </div>
                  </div>
                  {onSelectCheckpoint && (
                    <TimelineCheckpoint
                      checkpointIndex={index}
                      isActive={inspectedEventIndex === index}
                      onSelect={onSelectCheckpoint}
                    />
                  )}
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
          <div className="add-event-grid">
            <button
              type="button"
              className="btn btn-add-event btn-add-engineer-co"
              command="show-modal"
              commandfor="add-event-dialog"
              onClick={() =>
                onOpenAddEvent({
                  type: "CO",
                  claimedRole: "ENGINEER",
                })}
              title="エンジニアCO (名乗り出) を記録"
            >
              <Plus size={13} />
              <span>エンジニアCO</span>
            </button>

            <button
              type="button"
              className="btn btn-add-event btn-add-doctor-co"
              command="show-modal"
              commandfor="add-event-dialog"
              onClick={() =>
                onOpenAddEvent({
                  type: "CO",
                  claimedRole: "DOCTOR",
                })}
              title="ドクターCO (名乗り出) を記録"
            >
              <Plus size={13} />
              <span>ドクターCO</span>
            </button>

            <button
              type="button"
              className="btn btn-add-event btn-add-guard-duty"
              command="show-modal"
              commandfor="add-event-dialog"
              onClick={() =>
                onOpenAddEvent({
                  type: "CO",
                  claimedRole: "GUARD_DUTY",
                })}
              title="留守番CO (2人組名乗り出) を記録"
            >
              <Plus size={13} />
              <span>留守番CO</span>
            </button>

            <button
              type="button"
              className="btn btn-add-event btn-add-lie"
              command="show-modal"
              commandfor="add-event-dialog"
              onClick={() =>
                onOpenAddEvent({
                  type: "DEFINITE_LIE",
                  witnessId: "player",
                })}
              title="主人公が直感で気づいた嘘を記録"
            >
              <Plus size={13} />
              <span>嘘に気づいた</span>
            </button>

            <button
              type="button"
              className="btn btn-add-event btn-add-vote"
              command="show-modal"
              commandfor="add-event-dialog"
              onClick={() =>
                onOpenAddEvent({
                  type: "VOTE",
                })}
              title="投票結果 (コールドスリープ) を記録"
            >
              <Plus size={13} />
              <span>投票結果</span>
            </button>

            <button
              type="button"
              className="btn btn-add-event btn-add-share-lie"
              command="show-modal"
              commandfor="add-event-dialog"
              onClick={() => {
                const firstOther =
                  settings.players.find((p) => p.id !== "player")
                    ?.id || "";
                onOpenAddEvent({
                  type: "DEFINITE_LIE",
                  witnessId: firstOther,
                });
              }}
              title="他の乗員からの密告・嘘の共有を記録"
            >
              <Plus size={13} />
              <span>嘘に気づいたのを共有</span>
            </button>

            <button
              type="button"
              className="btn btn-add-event btn-add-investigation"
              command="show-modal"
              commandfor="add-event-dialog"
              onClick={() =>
                onOpenAddEvent({
                  type: "INVESTIGATION",
                })}
              title="エンジニアの調査結果を記録"
            >
              <Plus size={13} />
              <span>エンジニアの調査</span>
            </button>

            <button
              type="button"
              className="btn btn-add-event btn-add-guard"
              command="show-modal"
              commandfor="add-event-dialog"
              onClick={() =>
                onOpenAddEvent({
                  type: "GUARDIAN_GUARD",
                })}
              title="守護天使の護衛先を記録"
            >
              <Plus size={13} />
              <span>守護天使の護衛</span>
            </button>

            <button
              type="button"
              className="btn btn-add-event btn-add-attack"
              command="show-modal"
              commandfor="add-event-dialog"
              onClick={() =>
                onOpenAddEvent({
                  type: "GNOSIA_ATTACK",
                })}
              title="グノーシアの襲撃先を記録"
            >
              <Plus size={13} />
              <span>グノーシアの襲撃</span>
            </button>

            <button
              type="button"
              className="btn btn-add-event btn-add-disappearance"
              command="show-modal"
              commandfor="add-event-dialog"
              onClick={() =>
                onOpenAddEvent({
                  type: "DISAPPEARANCE",
                })}
              title="夜の消滅 (犠牲者なし または 1〜2人消滅) を記録"
            >
              <Plus size={13} />
              <span>夜の消滅</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
