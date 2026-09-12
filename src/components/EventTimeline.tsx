import { Plus, Trash2, Calendar, AlertOctagon, Pencil } from "lucide-preact";
import { GameEvent, GameSettings, ROLE_DEFINITIONS } from "../types.ts";

interface EventTimelineProps {
  events: GameEvent[];
  settings: GameSettings;
  currentDay: number;
  onSetDay: (day: number) => void;
  onOpenAddEvent: () => void;
  onEditEvent: (event: GameEvent) => void;
  onRemoveEvent: (id: string) => void;
  hasContradiction: boolean;
  contradictionReason?: string;
}

export function EventTimeline({
  events,
  settings,
  currentDay,
  onSetDay,
  onOpenAddEvent,
  onEditEvent,
  onRemoveEvent,
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
            <strong style={{ color: isGnosia ? "var(--color-gnosia)" : "var(--color-crew)" }}>
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
            <strong style={{ color: isGnosia ? "var(--color-gnosia)" : "var(--color-crew)" }}>
              {isGnosia ? "【グノーシア】" : "【人間】"}
            </strong>
          </span>
        );
      }
      case "DEFINITE_LIE": {
        return (
          <span>
            <strong style={{ color: "var(--color-gnosia)" }}>
              {getPlayerName(ev.targetId)}
            </strong>{" "}
            が<strong>【嘘をついたことが確定】</strong>
            {ev.reason && (
              <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", display: "block" }}>
                ({ev.reason})
              </span>
            )}
          </span>
        );
      }
      case "VOTE": {
        return (
          <span>
            投票により <strong>{getPlayerName(ev.frozenPlayerId)}</strong> が{" "}
            <span style={{ color: "var(--color-crew)" }}>コールドスリープ</span>
          </span>
        );
      }
      case "ATTACK": {
        return (
          <span>
            夜間に <strong>{getPlayerName(ev.attackedPlayerId)}</strong> が{" "}
            <span style={{ color: "var(--color-gnosia)" }}>消滅</span> (非グノーシア確定)
          </span>
        );
      }
      case "NO_ATTACK": {
        return (
          <span>
            夜間の<strong>【襲撃なし】</strong> (犠牲者ゼロ)
            {ev.guardedPlayerId && (
              <span style={{ display: "block", color: "var(--color-angel)", fontSize: "0.75rem" }}>
                護衛対象: <strong>{getPlayerName(ev.guardedPlayerId)}</strong> (非グノーシア確定)
              </span>
            )}
            {ev.note && (
              <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", display: "block" }}>
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
      case "ATTACK":
        return "event-attack";
      case "NO_ATTACK":
        return "event-angel";
      case "VOTE":
        return "event-vote";
      default:
        return "";
    }
  };


  return (
    <div className="sidebar-panel">
      <div className="timeline-header">
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Calendar size={18} color="var(--text-accent)" />
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem" }}>
            Day {currentDay} 進行状況
          </h2>
        </div>

        <button className="btn btn-primary btn-sm" onClick={onOpenAddEvent}>
          <Plus size={14} />
          <span>イベント追加</span>
        </button>
      </div>

      {hasContradiction && (
        <div className="alert-box">
          <AlertOctagon size={24} />
          <div>
            <strong>破綻検知（矛盾が発生）</strong>
            <p style={{ fontSize: "0.75rem", marginTop: "0.2rem" }}>
              {contradictionReason || "現在のイベントを満たす役職配置が存在しません。"}
            </p>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: "0.4rem", marginBottom: "1rem", overflowX: "auto", paddingBottom: "0.3rem" }}>
        {[1, 2, 3, 4, 5, 6, 7].map((d) => (
          <button
            key={d}
            className={`btn btn-sm ${currentDay === d ? "btn-primary" : ""}`}
            onClick={() => onSetDay(d)}
            style={{ padding: "0.25rem 0.6rem" }}
          >
            Day {d}
          </button>
        ))}
      </div>

      <div className="timeline-list">
        {events.length === 0 ? (
          <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center", padding: "2rem 0" }}>
            イベントがまだ登録されていません。<br />
            上部の「イベント追加」または各プレイヤーカードのクイックボタンから入力してください。
          </div>
        ) : (
          events
            .slice()
            .reverse()
            .map((ev) => (
              <div key={ev.id} className={`event-card ${getEventClass(ev.type)}`}>
                <div className="event-meta">
                  <span className="event-day">DAY {ev.day}</span>
                  <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                    <button
                      className="event-edit-btn"
                      onClick={() => onEditEvent(ev)}
                      title="イベントを編集"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      className="event-delete-btn"
                      onClick={() => onRemoveEvent(ev.id)}
                      title="イベントを削除"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <div className="event-body">{renderEventDescription(ev)}</div>
              </div>
            ))
        )}
      </div>
    </div>
  );
}
