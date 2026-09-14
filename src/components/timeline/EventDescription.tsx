import { GameEvent, Player, ROLE_DEFINITIONS } from "../../types.ts";

type EventDescriptionProps = {
  readonly event: GameEvent;
  readonly players: ReadonlyArray<Player>;
};

export function EventDescription({ event, players }: EventDescriptionProps) {
  const getPlayerName = (id: string) => {
    return players.find((p) => p.id === id)?.name || id;
  };

  switch (event.type) {
    case "CO": {
      const roleDef = ROLE_DEFINITIONS[event.claimedRole];
      if (event.claimedRole === "GUARD_DUTY" && event.partnerPlayerId) {
        return (
          <span>
            <strong>{getPlayerName(event.playerId)}</strong> と{" "}
            <strong>{getPlayerName(event.partnerPlayerId)}</strong> が{" "}
            <span style={{ color: roleDef.color, fontWeight: "bold" }}>
              {roleDef.name}
            </span>{" "}
            と名乗り出た (CO)
          </span>
        );
      }
      return (
        <span>
          <strong>{getPlayerName(event.playerId)}</strong> が{" "}
          <span style={{ color: roleDef.color, fontWeight: "bold" }}>
            {roleDef.name}
          </span>{" "}
          と名乗り出た (CO)
        </span>
      );
    }
    case "INVESTIGATION": {
      const isGnosia = event.result === "GNOSIA";
      return (
        <span>
          <strong>{getPlayerName(event.investigatorId)}</strong> の調査:{" "}
          <strong>{getPlayerName(event.targetId)}</strong> は{" "}
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
      const isGnosia = event.result === "GNOSIA";
      return (
        <span>
          <strong>{getPlayerName(event.reporterId)}</strong> の医療報告:{" "}
          <strong>{getPlayerName(event.targetId)}</strong> は{" "}
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
      const isSelf = event.witnessId === "player" || !event.witnessId;
      const witnessName = isSelf ? "自分" : getPlayerName(event.witnessId);
      return (
        <span>
          {isSelf
            ? (
              <>
                <strong>自分</strong> が{" "}
                <strong style={{ color: "var(--color-gnosia)" }}>
                  {getPlayerName(event.targetId)}
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
                  {getPlayerName(event.targetId)}
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
          投票により <strong>{getPlayerName(event.frozenPlayerId)}</strong> が
          {" "}
          <span style={{ color: "var(--color-crew)" }}>コールドスリープ</span>
        </span>
      );
    }
    case "DISAPPEARANCE": {
      let content;
      if (event.disappearedPlayerIds.length === 0) {
        content = (
          <span>
            夜間に{" "}
            <strong style={{ color: "var(--color-crew)" }}>
              犠牲者なし (平和)
            </strong>
          </span>
        );
      } else if (event.disappearedPlayerIds.length === 1) {
        content = (
          <span>
            夜間に{" "}
            <strong>
              {getPlayerName(event.disappearedPlayerIds[0] ?? "")}
            </strong>{" "}
            が <span style={{ color: "var(--color-gnosia)" }}>消滅</span>{" "}
            (非グノーシア確定)
          </span>
        );
      } else {
        content = (
          <span>
            夜間に{" "}
            <strong>
              {getPlayerName(event.disappearedPlayerIds[0] ?? "")}
            </strong>{" "}
            と{" "}
            <strong>
              {getPlayerName(event.disappearedPlayerIds[1] ?? "")}
            </strong>{" "}
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
          {event.guardedPlayerId && (
            <span
              style={{
                display: "block",
                color: "var(--color-angel, #eab308)",
                fontSize: "0.75rem",
                marginTop: "0.2rem",
              }}
            >
              🛡️ 護衛対象:{" "}
              <strong>{getPlayerName(event.guardedPlayerId)}</strong>
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
            {getPlayerName(event.targetId)}
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
            {getPlayerName(event.targetId)}
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
          夜間に <strong>{getPlayerName(event.attackedPlayerId)}</strong> が
          {" "}
          <span style={{ color: "var(--color-gnosia)" }}>消滅</span>{" "}
          (非グノーシア確定)
        </span>
      );
    }
    case "NO_ATTACK": {
      return (
        <span>
          夜間の<strong>【襲撃なし】</strong> (犠牲者ゼロ)
          {event.guardedPlayerId && (
            <span
              style={{
                display: "block",
                color: "var(--color-angel)",
                fontSize: "0.75rem",
              }}
            >
              護衛対象: <strong>{getPlayerName(event.guardedPlayerId)}</strong>
              {" "}
              (非グノーシア確定)
            </span>
          )}
          {event.note && (
            <span
              style={{
                color: "var(--text-muted)",
                fontSize: "0.75rem",
                display: "block",
              }}
            >
              ({event.note})
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
          🌅 翌日へ進行 (Day {event.day + 1} へ)
          {event.note && (
            <span
              style={{
                color: "var(--text-muted)",
                fontSize: "0.75rem",
                display: "block",
              }}
            >
              ({event.note})
            </span>
          )}
        </span>
      );
    }
    default:
      return <span>不明なイベント</span>;
  }
}
