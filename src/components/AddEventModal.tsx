import { useEffect, useMemo, useState } from "preact/hooks";
import { AlertTriangle, Target, X } from "lucide-preact";
import {
  EventType,
  GameEvent,
  GameSettings,
  NewGameEvent,
  PlayerStatus,
  ReportJudgement,
  Role,
} from "../types.ts";

interface AddEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddEvent: (ev: NewGameEvent) => void;
  onUpdateEvent?: ((ev: GameEvent) => void) | undefined;
  editingEvent?: GameEvent | undefined;
  settings: GameSettings;
  currentDay?: number | undefined;
  initialType?: EventType | undefined;
  initialPlayerId?: string | undefined;
  playerStatuses: Record<string, PlayerStatus>;
  claimedRoles: Record<string, ReadonlyArray<Role>>;
  myRole?: Role | undefined;
}

export function AddEventModal({
  isOpen,
  onClose,
  onAddEvent,
  onUpdateEvent,
  editingEvent,
  settings,
  currentDay: _currentDay = 1,
  initialType = "DEFINITE_LIE",
  initialPlayerId,
  playerStatuses,
  claimedRoles,
  myRole,
}: AddEventModalProps) {
  if (!isOpen) return null;

  const [eventType, setEventType] = useState<EventType>(
    editingEvent ? editingEvent.type : initialType,
  );

  // プレイヤー群のフィルタリング
  const alivePlayers = useMemo(() => {
    return settings.players.filter((p) =>
      (playerStatuses[p.id] || "ALIVE") === "ALIVE"
    );
  }, [settings.players, playerStatuses]);

  const frozenPlayers = useMemo(() => {
    return settings.players.filter((p) => playerStatuses[p.id] === "FROZEN");
  }, [settings.players, playerStatuses]);

  // CO可能な乗員（未CO者、または編集中イベントでCOしている本人）
  const coCandidates = useMemo(() => {
    return alivePlayers.filter((p) => {
      const alreadyClaimed = (claimedRoles[p.id]?.length ?? 0) > 0;
      if (
        editingEvent && editingEvent.type === "CO" &&
        (editingEvent.playerId === p.id ||
          editingEvent.partnerPlayerId === p.id)
      ) {
        return true;
      }
      return !alreadyClaimed;
    });
  }, [alivePlayers, claimedRoles, editingEvent]);

  // エンジニアCOしたプレイヤー（または自分=真エンジニアの場合の自分）
  const engineerCandidates = useMemo(() => {
    return settings.players.filter((p) => {
      const cos = claimedRoles[p.id] || [];
      if (cos.includes("ENGINEER")) return true;
      if (p.id === "player" && myRole === "ENGINEER") return true;
      return false;
    });
  }, [settings.players, claimedRoles, myRole]);

  // ドクターCOしたプレイヤー（または自分=真ドクターの場合の自分）
  const doctorCandidates = useMemo(() => {
    return settings.players.filter((p) => {
      const cos = claimedRoles[p.id] || [];
      if (cos.includes("DOCTOR")) return true;
      if (p.id === "player" && myRole === "DOCTOR") return true;
      return false;
    });
  }, [settings.players, claimedRoles, myRole]);

  // 設定上登場するCO役職の一覧
  const availableCORoles = useMemo(() => {
    const list: Array<"ENGINEER" | "DOCTOR" | "GUARD_DUTY"> = [];
    if (settings.roles.hasEngineer) list.push("ENGINEER");
    if (settings.roles.hasDoctor) list.push("DOCTOR");
    if (settings.roles.hasGuardDuty) list.push("GUARD_DUTY");
    return list;
  }, [settings.roles]);

  // フォーム用入力ステート
  const [selectedPlayer, setSelectedPlayer] = useState<string>("");
  const [selectedGuardDuty, setSelectedGuardDuty] = useState<Array<string>>([]);
  const [targetPlayer, setTargetPlayer] = useState<string>("");

  // 調査対象候補（調査者本人以外の全プレイヤー。生存者を優先し、今朝消滅した乗員や過去の消滅・冷凍者も選択可能）
  const investigationTargetCandidates = useMemo(() => {
    return settings.players.filter((p) => p.id !== selectedPlayer);
  }, [settings.players, selectedPlayer]);
  const [claimedRole, setClaimedRole] = useState<
    "ENGINEER" | "DOCTOR" | "GUARD_DUTY"
  >(
    settings.roles.hasEngineer
      ? "ENGINEER"
      : settings.roles.hasDoctor
      ? "DOCTOR"
      : settings.roles.hasGuardDuty
      ? "GUARD_DUTY"
      : "ENGINEER",
  );
  const [reportResult, setReportResult] = useState<ReportJudgement>("HUMAN");
  const [witnessPlayer, setWitnessPlayer] = useState<string>("player");
  const [disappearedPlayerIds, setDisappearedPlayerIds] = useState<
    ReadonlyArray<string>
  >(
    [],
  );

  // 初期値の自動調整
  useEffect(() => {
    if (editingEvent) {
      setEventType(editingEvent.type);
      switch (editingEvent.type) {
        case "CO":
          setSelectedPlayer(editingEvent.playerId);
          setClaimedRole(editingEvent.claimedRole);
          if (editingEvent.claimedRole === "GUARD_DUTY") {
            const list = [editingEvent.playerId];
            if (editingEvent.partnerPlayerId) {
              list.push(editingEvent.partnerPlayerId);
            }
            setSelectedGuardDuty(list);
          } else {
            setSelectedGuardDuty([]);
          }
          break;
        case "INVESTIGATION":
          setSelectedPlayer(editingEvent.investigatorId);
          setTargetPlayer(editingEvent.targetId);
          setReportResult(editingEvent.result);
          break;
        case "DOCTOR_REPORT":
          setSelectedPlayer(editingEvent.reporterId);
          setTargetPlayer(editingEvent.targetId);
          setReportResult(editingEvent.result);
          break;
        case "DEFINITE_LIE":
          setSelectedPlayer(editingEvent.targetId);
          setWitnessPlayer(editingEvent.witnessId || "player");
          break;
        case "VOTE":
          setSelectedPlayer(editingEvent.frozenPlayerId);
          break;
        case "DISAPPEARANCE":
          setDisappearedPlayerIds(editingEvent.disappearedPlayerIds);
          break;
        case "GNOSIA_ATTACK":
          setSelectedPlayer(editingEvent.targetId);
          break;
        case "ATTACK":
          setDisappearedPlayerIds([editingEvent.attackedPlayerId]);
          break;
        case "NO_ATTACK":
          setDisappearedPlayerIds([]);
          break;
        default:
          break;
      }
    } else {
      setEventType(initialType);
      if (initialPlayerId) {
        setSelectedPlayer(initialPlayerId);
      }
      setSelectedGuardDuty([]);
      setTargetPlayer("");
      setReportResult("HUMAN");
      setWitnessPlayer("player");
      setDisappearedPlayerIds([]);
    }
  }, [editingEvent, initialType, initialPlayerId]);

  const handleSubmit = (e: Event) => {
    e.preventDefault();

    let eventData: NewGameEvent | null = null;
    switch (eventType) {
      case "CO":
        if (claimedRole === "GUARD_DUTY") {
          const p1 = selectedGuardDuty[0];
          const p2 = selectedGuardDuty[1];
          if (!p1 || !p2) return;
          eventData = {
            type: "CO",
            playerId: p1,
            partnerPlayerId: p2,
            claimedRole: "GUARD_DUTY",
          };
        } else {
          eventData = {
            type: "CO",
            playerId: selectedPlayer,
            claimedRole,
          };
        }
        break;
      case "INVESTIGATION":
        eventData = {
          type: "INVESTIGATION",
          investigatorId: selectedPlayer,
          targetId: targetPlayer,
          result: reportResult,
        };
        break;
      case "DOCTOR_REPORT":
        eventData = {
          type: "DOCTOR_REPORT",
          reporterId: selectedPlayer,
          targetId: targetPlayer,
          result: reportResult,
        };
        break;
      case "DEFINITE_LIE":
        eventData = {
          type: "DEFINITE_LIE",
          targetId: selectedPlayer,
          witnessId: witnessPlayer,
        };
        break;
      case "VOTE":
        eventData = {
          type: "VOTE",
          frozenPlayerId: selectedPlayer,
        };
        break;
      case "DISAPPEARANCE":
        eventData = {
          type: "DISAPPEARANCE",
          disappearedPlayerIds,
        };
        break;
      case "GNOSIA_ATTACK":
        eventData = {
          type: "GNOSIA_ATTACK",
          targetId: selectedPlayer,
        };
        break;
      default:
        return;
    }

    if (!eventData) return;

    if (editingEvent && onUpdateEvent) {
      onUpdateEvent({
        ...eventData,
        id: editingEvent.id,
        day: editingEvent.day,
      } as GameEvent);
    } else {
      onAddEvent(eventData);
    }

    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">
            {editingEvent ? "イベントの編集" : "イベントの記録"}
          </h3>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">イベント種類</label>
            <select
              className="form-select"
              value={eventType}
              onChange={(e) => {
                const val = (e.target as HTMLSelectElement).value as EventType;
                setEventType(val);
                if (val === "DISAPPEARANCE") {
                  setDisappearedPlayerIds(
                    selectedPlayer ? [selectedPlayer] : [],
                  );
                } else if (val === "GNOSIA_ATTACK") {
                  const defaultTarget =
                    alivePlayers.find((p) => p.id !== "player")?.id ||
                    settings.players[0]?.id || "";
                  setSelectedPlayer(defaultTarget);
                } else if (val === "DEFINITE_LIE") {
                  setWitnessPlayer("player");
                  if (!selectedPlayer || selectedPlayer === "player") {
                    const defaultTarget = settings.players.find((p) =>
                      p.id !== "player"
                    )?.id ||
                      settings.players[0]?.id || "";
                    setSelectedPlayer(defaultTarget);
                  }
                } else if (val === "CO") {
                  if (!coCandidates.some((p) => p.id === selectedPlayer)) {
                    setSelectedPlayer(coCandidates[0]?.id || "");
                  }
                } else if (val === "INVESTIGATION") {
                  const inv = engineerCandidates[0]?.id ||
                    alivePlayers[0]?.id || "";
                  setSelectedPlayer(inv);
                  setTargetPlayer(
                    alivePlayers.find((p) => p.id !== inv)?.id || "",
                  );
                } else if (val === "DOCTOR_REPORT") {
                  setSelectedPlayer(
                    doctorCandidates[0]?.id || alivePlayers[0]?.id || "",
                  );
                  setTargetPlayer(frozenPlayers[0]?.id || "");
                } else if (val === "VOTE") {
                  setSelectedPlayer(alivePlayers[0]?.id || "");
                }
              }}
            >
              <option value="DISAPPEARANCE">
                消滅もしくは平和 (夜の出来事: 0〜2人)
              </option>
              {myRole === "GNOSIA" && (
                <option value="GNOSIA_ATTACK">
                  【グノーシア視点】夜の襲撃対象指定
                </option>
              )}
              <option value="DEFINITE_LIE">嘘に気づいた</option>
              {availableCORoles.length > 0 && (
                <option value="CO">役職名乗り出 (CO)</option>
              )}
              {settings.roles.hasEngineer && (
                <option value="INVESTIGATION">エンジニア調査報告</option>
              )}
              {settings.roles.hasDoctor && (
                <option value="DOCTOR_REPORT">ドクター医療報告</option>
              )}
              <option value="VOTE">コールドスリープ (投票)</option>
            </select>
          </div>

          {/* 嘘をついていることが確定 */}
          {eventType === "DEFINITE_LIE" && (
            <div
              style={{
                background: "rgba(244, 63, 94, 0.08)",
                padding: "1rem",
                borderRadius: "8px",
                border: "1px solid rgba(244, 63, 94, 0.3)",
                marginBottom: "1rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  color: "#fb7185",
                  marginBottom: "0.75rem",
                  fontSize: "0.85rem",
                  fontWeight: "bold",
                }}
              >
                <AlertTriangle size={16} />
                <span>
                  {witnessPlayer === "player"
                    ? "【自分が看破】対象は確実に【グノーシア / AC主義者 / バグ】です (人間陣営から除外)"
                    : "【他者の密告】密告者が人間なら対象は敵確定。密告者が敵なら濡れ衣の可能性あり (両者人間は除外)"}
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">
                  嘘に気づいた / 密告した人物
                </label>
                <select
                  className="form-select"
                  value={witnessPlayer}
                  onChange={(e) => {
                    const newWitness = (e.target as HTMLSelectElement).value;
                    setWitnessPlayer(newWitness);
                    if (selectedPlayer === newWitness) {
                      const other = settings.players.find((p) =>
                        p.id !== newWitness
                      );
                      if (other) setSelectedPlayer(other.id);
                    }
                  }}
                >
                  {settings.players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}{" "}
                      {p.id === "player" ? "(直感で看破)" : "(夜の自室で密告)"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">嘘をついた人物</label>
                <select
                  className="form-select"
                  value={selectedPlayer}
                  onChange={(e) =>
                    setSelectedPlayer((e.target as HTMLSelectElement).value)}
                >
                  {settings.players
                    .filter((p) =>
                      p.id !== witnessPlayer
                    )
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {playerStatuses[p.id] === "FROZEN"
                          ? "(冷凍済)"
                          : playerStatuses[p.id] === "ATTACKED"
                          ? "(消滅済)"
                          : ""}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          )}

          {/* 役職名乗り出 (CO) */}
          {eventType === "CO" && (
            <div>
              <div className="form-group" style={{ marginBottom: "1rem" }}>
                <label className="form-label">宣言役職</label>
                <select
                  className="form-select"
                  value={claimedRole}
                  onChange={(e) =>
                    setClaimedRole(
                      (e.target as HTMLSelectElement).value as
                        | "ENGINEER"
                        | "DOCTOR"
                        | "GUARD_DUTY",
                    )}
                >
                  {settings.roles.hasEngineer && (
                    <option value="ENGINEER">エンジニア</option>
                  )}
                  {settings.roles.hasDoctor && (
                    <option value="DOCTOR">ドクター</option>
                  )}
                  {settings.roles.hasGuardDuty && (
                    <option value="GUARD_DUTY">留守番 (2人組・白確定)</option>
                  )}
                </select>
              </div>

              {claimedRole === "GUARD_DUTY"
                ? (
                  <div className="form-group">
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "0.4rem",
                      }}
                    >
                      <label className="form-label" style={{ marginBottom: 0 }}>
                        名乗り出た留守番 (2人をチェック)
                      </label>
                      <span
                        className={`badge ${
                          selectedGuardDuty.length === 2
                            ? "badge-human"
                            : "badge-enemy"
                        }`}
                        style={{ fontSize: "0.75rem" }}
                      >
                        {selectedGuardDuty.length} / 2人 選択中
                      </span>
                    </div>
                    <p
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--text-muted)",
                        marginBottom: "0.6rem",
                      }}
                    >
                      ※
                      留守番COは必ず2人同時に行われます。名乗り出た2人にチェックを入れてください。
                    </p>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fill, minmax(130px, 1fr))",
                        gap: "0.5rem",
                        background: "var(--bg-secondary)",
                        padding: "0.75rem",
                        borderRadius: "8px",
                        border: "1px solid var(--border-color)",
                        maxHeight: "220px",
                        overflowY: "auto",
                      }}
                    >
                      {(coCandidates.length >= 2 ? coCandidates : alivePlayers)
                        .map((p) => {
                          const isChecked = selectedGuardDuty.includes(p.id);
                          const isDisabled = !isChecked &&
                            selectedGuardDuty.length >= 2;
                          return (
                            <label
                              key={p.id}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem",
                                padding: "0.45rem 0.65rem",
                                borderRadius: "6px",
                                background: isChecked
                                  ? "rgba(56, 189, 248, 0.15)"
                                  : "var(--bg-tertiary)",
                                border: isChecked
                                  ? "1px solid var(--accent-primary, #38bdf8)"
                                  : "1px solid transparent",
                                cursor: isDisabled ? "not-allowed" : "pointer",
                                opacity: isDisabled ? 0.5 : 1,
                                fontSize: "0.85rem",
                                userSelect: "none",
                                transition: "all 0.15s ease",
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={isDisabled}
                                onChange={() => {
                                  if (isChecked) {
                                    setSelectedGuardDuty(
                                      selectedGuardDuty.filter((id) =>
                                        id !== p.id
                                      ),
                                    );
                                  } else if (selectedGuardDuty.length < 2) {
                                    setSelectedGuardDuty([
                                      ...selectedGuardDuty,
                                      p.id,
                                    ]);
                                  }
                                }}
                                style={{
                                  cursor: isDisabled
                                    ? "not-allowed"
                                    : "pointer",
                                }}
                              />
                              <span
                                style={{
                                  fontWeight: isChecked ? 600 : "normal",
                                  color: isChecked
                                    ? "var(--accent-primary, #38bdf8)"
                                    : "inherit",
                                }}
                              >
                                {p.name}
                              </span>
                            </label>
                          );
                        })}
                    </div>
                    {selectedGuardDuty.length !== 2 && (
                      <span
                        style={{
                          color: "var(--color-gnosia)",
                          fontSize: "0.75rem",
                          marginTop: "0.35rem",
                          display: "block",
                        }}
                      >
                        ※ 留守番は必ず2人選択してください
                      </span>
                    )}
                  </div>
                )
                : (
                  <div className="form-group">
                    <label className="form-label">
                      名乗り出た人物 (未CO者のみ)
                    </label>
                    <select
                      className="form-select"
                      value={selectedPlayer}
                      onChange={(e) =>
                        setSelectedPlayer(
                          (e.target as HTMLSelectElement).value,
                        )}
                      disabled={coCandidates.length === 0}
                    >
                      {coCandidates.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                      {coCandidates.length === 0 && (
                        <option value="">(全員すでにCO済みです)</option>
                      )}
                    </select>
                    {coCandidates.length === 0 && (
                      <span
                        style={{
                          color: "var(--text-muted)",
                          fontSize: "0.75rem",
                          marginTop: "0.25rem",
                          display: "block",
                        }}
                      >
                        ※ 生存している全員がすでに役職CO済みです
                      </span>
                    )}
                  </div>
                )}
            </div>
          )}

          {/* エンジニア調査報告 */}
          {eventType === "INVESTIGATION" && (
            <div>
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
                        // フォールバック
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
                        .filter((p) =>
                          (playerStatuses[p.id] || "ALIVE") === "ALIVE"
                        )
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
                          .filter((p) =>
                            (playerStatuses[p.id] || "ALIVE") !== "ALIVE"
                          )
                          .map((p) => {
                            const status = playerStatuses[p.id];
                            const statusLabel = status === "FROZEN"
                              ? "冷凍"
                              : "消滅";
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
            </div>
          )}

          {/* ドクター医療報告 */}
          {eventType === "DOCTOR_REPORT" && (
            <div>
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
                          setTargetPlayer(
                            (e.target as HTMLSelectElement).value,
                          )}
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
            </div>
          )}

          {/* コールドスリープ (VOTE) */}
          {eventType === "VOTE" && (
            <div className="form-group">
              <label className="form-label">
                コールドスリープされた人物 (生存者のみ)
              </label>
              <select
                className="form-select"
                value={selectedPlayer}
                onChange={(e) =>
                  setSelectedPlayer((e.target as HTMLSelectElement).value)}
              >
                {alivePlayers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 消滅もしくは平和 (DISAPPEARANCE) */}
          {eventType === "DISAPPEARANCE" && (
            <div
              style={{
                background: "rgba(168, 85, 247, 0.08)",
                padding: "1rem",
                borderRadius: "8px",
                border: "1px solid rgba(168, 85, 247, 0.3)",
                marginBottom: "1rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "0.75rem",
                }}
              >
                <div
                  style={{
                    color: "#c084fc",
                    fontSize: "0.9rem",
                    fontWeight: "bold",
                  }}
                >
                  夜の出来事 (消滅もしくは平和)
                </div>
                <span
                  className="badge"
                  style={{
                    background: disappearedPlayerIds.length === 0
                      ? "rgba(34, 197, 94, 0.2)"
                      : "rgba(244, 63, 94, 0.2)",
                    color: disappearedPlayerIds.length === 0
                      ? "#4ade80"
                      : "#fb7185",
                    fontWeight: "bold",
                  }}
                >
                  {disappearedPlayerIds.length === 0
                    ? "🕊️ 犠牲者ゼロ (平和)"
                    : `💀 ${disappearedPlayerIds.length}人消滅`}
                </span>
              </div>
              <p
                style={{
                  fontSize: "0.8rem",
                  color: "var(--text-muted)",
                  marginBottom: "0.75rem",
                  lineHeight: "1.4",
                }}
              >
                夜間に消滅した乗員を <strong>0〜2人</strong>{" "}
                選択してください。<br />
                ※誰も選ばない（0人）場合は「犠牲者なし（平和）」となります。
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
                  gap: "0.5rem",
                }}
              >
                {alivePlayers.map((p) => {
                  const isSelected = disappearedPlayerIds.includes(p.id);
                  const isMaxReached = disappearedPlayerIds.length >= 2 &&
                    !isSelected;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={isMaxReached}
                      onClick={() => {
                        if (isSelected) {
                          setDisappearedPlayerIds((prev) =>
                            prev.filter((id) => id !== p.id)
                          );
                        } else {
                          if (disappearedPlayerIds.length < 2) {
                            setDisappearedPlayerIds((prev) => [...prev, p.id]);
                          }
                        }
                      }}
                      style={{
                        padding: "0.6rem 0.5rem",
                        borderRadius: "6px",
                        border: isSelected
                          ? "2px solid #f43f5e"
                          : "1px solid var(--border-color)",
                        background: isSelected
                          ? "rgba(244, 63, 94, 0.25)"
                          : "var(--bg-secondary)",
                        color: isSelected
                          ? "#fff"
                          : isMaxReached
                          ? "var(--text-muted)"
                          : "var(--text-main)",
                        cursor: isMaxReached ? "not-allowed" : "pointer",
                        fontSize: "0.85rem",
                        fontWeight: isSelected ? "bold" : "normal",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.35rem",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {isSelected ? "💀 " : ""}
                      {p.name}
                    </button>
                  );
                })}
              </div>

              {disappearedPlayerIds.length > 0 && (
                <div
                  style={{
                    marginTop: "0.75rem",
                    display: "flex",
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => setDisappearedPlayerIds([])}
                    style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}
                  >
                    選択をクリア (犠牲者ゼロにする)
                  </button>
                </div>
              )}
            </div>
          )}

          {/* グノーシア襲撃対象 (GNOSIA_ATTACK) */}
          {eventType === "GNOSIA_ATTACK" && (
            <div
              style={{
                background: "rgba(244, 63, 94, 0.08)",
                padding: "1rem",
                borderRadius: "8px",
                border: "1px solid rgba(244, 63, 94, 0.3)",
                marginBottom: "1rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  color: "#fb7185",
                  marginBottom: "0.5rem",
                  fontSize: "0.85rem",
                  fontWeight: "bold",
                }}
              >
                <Target size={16} />
                <span>自分がグノーシア陣営の場合の襲撃先指定</span>
              </div>
              <p
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-muted)",
                  marginBottom: "0.75rem",
                  lineHeight: "1.4",
                }}
              >
                襲撃対象と異なる人物が朝に消滅した場合、その消滅者は<strong>
                  【バグ確定】
                </strong>となり、守護天使が生存して襲撃対象を守った世界のみが導出されます。
              </p>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">襲撃対象 (生存者)</label>
                <select
                  className="form-select"
                  value={selectedPlayer}
                  onChange={(e) =>
                    setSelectedPlayer((e.target as HTMLSelectElement).value)}
                >
                  {alivePlayers
                    .filter((p) => p.id !== "player")
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "0.75rem",
              marginTop: "1.5rem",
            }}
          >
            <button type="button" className="btn" onClick={onClose}>
              キャンセル
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={(eventType === "CO" &&
                (claimedRole === "GUARD_DUTY"
                  ? selectedGuardDuty.length !== 2
                  : (!selectedPlayer || coCandidates.length === 0))) ||
                (eventType === "DOCTOR_REPORT" && frozenPlayers.length === 0) ||
                (eventType === "INVESTIGATION" &&
                  (!selectedPlayer || !targetPlayer)) ||
                (eventType === "VOTE" && alivePlayers.length === 0) ||
                (eventType === "GNOSIA_ATTACK" &&
                  alivePlayers.filter((p) => p.id !== "player").length === 0)}
            >
              {editingEvent ? "変更を保存する" : "イベントを記録する"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
