import { useState, useEffect, useMemo } from "preact/hooks";
import { X, AlertTriangle, ShieldCheck, UserCheck, Search, Activity, Skull } from "lucide-preact";
import { EventType, GameEvent, NewGameEvent, GameSettings, PlayerStatus, ReportJudgement, Role } from "../types.ts";

interface AddEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddEvent: (ev: NewGameEvent) => void;
  onUpdateEvent?: (ev: GameEvent) => void;
  editingEvent?: GameEvent;
  settings: GameSettings;
  currentDay?: number;
  initialType?: EventType;
  initialPlayerId?: string;
  playerStatuses: Record<string, PlayerStatus>;
  claimedRoles: Record<string, ("ENGINEER" | "DOCTOR" | "GUARD_DUTY")[]>;
  myRole?: Role;
}

export function AddEventModal({
  isOpen,
  onClose,
  onAddEvent,
  onUpdateEvent,
  editingEvent,
  settings,
  initialType = "DEFINITE_LIE",
  initialPlayerId,
  playerStatuses,
  claimedRoles,
  myRole,
}: AddEventModalProps) {
  if (!isOpen) return null;

  const [eventType, setEventType] = useState<EventType>(editingEvent ? editingEvent.type : initialType);

  // プレイヤー群のフィルタリング
  const alivePlayers = useMemo(() => {
    return settings.players.filter((p) => (playerStatuses[p.id] || "ALIVE") === "ALIVE");
  }, [settings.players, playerStatuses]);

  const frozenPlayers = useMemo(() => {
    return settings.players.filter((p) => playerStatuses[p.id] === "FROZEN");
  }, [settings.players, playerStatuses]);

  // CO可能な乗員（未CO者、または編集中イベントでCOしている本人）
  const coCandidates = useMemo(() => {
    return alivePlayers.filter((p) => {
      const alreadyClaimed = (claimedRoles[p.id]?.length ?? 0) > 0;
      if (editingEvent && editingEvent.type === "CO" && editingEvent.playerId === p.id) {
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

  // フォーム用入力ステート
  const [selectedPlayer, setSelectedPlayer] = useState<string>("");
  const [targetPlayer, setTargetPlayer] = useState<string>("");
  const [claimedRole, setClaimedRole] = useState<"ENGINEER" | "DOCTOR" | "GUARD_DUTY">("ENGINEER");
  const [reportResult, setReportResult] = useState<ReportJudgement>("HUMAN");
  const [lieReason, setLieReason] = useState<string>("直感スキル発動 / 人間だと言え");

  // 初期値の自動調整
  useEffect(() => {
    if (editingEvent) {
      setEventType(editingEvent.type);
      switch (editingEvent.type) {
        case "CO":
          setSelectedPlayer(editingEvent.playerId);
          setClaimedRole(editingEvent.claimedRole);
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
          setLieReason(editingEvent.reason || "");
          break;
        case "VOTE":
          setSelectedPlayer(editingEvent.frozenPlayerId);
          break;
        case "ATTACK":
          setSelectedPlayer(editingEvent.attackedPlayerId);
          break;
        case "NO_ATTACK":
          setSelectedPlayer(editingEvent.guardedPlayerId || "");
          setLieReason(editingEvent.note || "");
          break;
      }
      return;
    }

    // 新規登録時の初期化
    if (initialType) setEventType(initialType);

    if (initialType === "CO") {
      const defaultCandidate =
        initialPlayerId && coCandidates.some((p) => p.id === initialPlayerId)
          ? initialPlayerId
          : coCandidates[0]?.id || "";
      setSelectedPlayer(defaultCandidate);
    } else if (initialType === "INVESTIGATION") {
      const defaultInv =
        (initialPlayerId && engineerCandidates.some((p) => p.id === initialPlayerId))
          ? initialPlayerId
          : engineerCandidates[0]?.id || alivePlayers[0]?.id || "";
      setSelectedPlayer(defaultInv);

      // 対象は調査者以外の生存者
      const defaultTarget =
        alivePlayers.find((p) => p.id !== defaultInv)?.id || settings.players[0]?.id || "";
      setTargetPlayer(defaultTarget);
    } else if (initialType === "DOCTOR_REPORT") {
      const defaultDoc =
        (initialPlayerId && doctorCandidates.some((p) => p.id === initialPlayerId))
          ? initialPlayerId
          : doctorCandidates[0]?.id || alivePlayers[0]?.id || "";
      setSelectedPlayer(defaultDoc);
      setTargetPlayer(frozenPlayers[0]?.id || settings.players[0]?.id || "");
    } else if (initialType === "VOTE" || initialType === "ATTACK") {
      setSelectedPlayer(initialPlayerId || alivePlayers[0]?.id || settings.players[0]?.id || "");
    } else if (initialType === "NO_ATTACK") {
      setSelectedPlayer("");
      setLieReason("夜間の犠牲者なし (天使護衛成功 または バグ襲撃)");
    } else {
      setSelectedPlayer(initialPlayerId || alivePlayers[0]?.id || settings.players[0]?.id || "");
    }
  }, [editingEvent, initialType, initialPlayerId]);

  const handleSubmit = (e: Event) => {
    e.preventDefault();

    let eventData: Omit<GameEvent, "id" | "day">;
    switch (eventType) {
      case "CO":
        eventData = {
          type: "CO",
          playerId: selectedPlayer,
          claimedRole,
        };
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
          reason: lieReason,
        };
        break;
      case "VOTE":
        eventData = {
          type: "VOTE",
          frozenPlayerId: selectedPlayer,
        };
        break;
      case "ATTACK":
        eventData = {
          type: "ATTACK",
          attackedPlayerId: selectedPlayer,
        };
        break;
      case "NO_ATTACK":
        eventData = {
          type: "NO_ATTACK",
          guardedPlayerId: selectedPlayer ? selectedPlayer : undefined,
          note: lieReason,
        };
        break;
      default:
        return;
    }

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
          <button className="modal-close-btn" onClick={onClose}>
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
                if (val === "CO") {
                  if (!coCandidates.some((p) => p.id === selectedPlayer)) {
                    setSelectedPlayer(coCandidates[0]?.id || "");
                  }
                } else if (val === "INVESTIGATION") {
                  const inv = engineerCandidates[0]?.id || alivePlayers[0]?.id || "";
                  setSelectedPlayer(inv);
                  setTargetPlayer(alivePlayers.find((p) => p.id !== inv)?.id || "");
                } else if (val === "DOCTOR_REPORT") {
                  setSelectedPlayer(doctorCandidates[0]?.id || alivePlayers[0]?.id || "");
                  setTargetPlayer(frozenPlayers[0]?.id || "");
                } else if (val === "NO_ATTACK") {
                  setSelectedPlayer("");
                  setLieReason("夜間の犠牲者なし (天使護衛成功 または バグ襲撃)");
                } else if (val === "VOTE" || val === "ATTACK") {
                  setSelectedPlayer(alivePlayers[0]?.id || "");
                }
              }}
            >
              <option value="DEFINITE_LIE">【重要】嘘をついていることが確定</option>
              <option value="CO">役職名乗り出 (CO)</option>
              <option value="INVESTIGATION">エンジニア調査報告</option>
              <option value="DOCTOR_REPORT">ドクター医療報告</option>
              <option value="VOTE">コールドスリープ (投票)</option>
              <option value="ATTACK">夜間に消滅 (襲撃死)</option>
              <option value="NO_ATTACK">夜間の襲撃なし (犠牲者ゼロ / 護衛・バグ)</option>
            </select>
          </div>

          {/* 嘘をついていることが確定 */}
          {eventType === "DEFINITE_LIE" && (
            <div style={{ background: "rgba(244, 63, 94, 0.08)", padding: "1rem", borderRadius: "8px", border: "1px solid rgba(244, 63, 94, 0.3)", marginBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#fb7185", marginBottom: "0.75rem", fontSize: "0.85rem", fontWeight: "bold" }}>
                <AlertTriangle size={16} />
                <span>嘘つき確定の人物は【グノーシア / AC主義者 / バグ】のいずれかになります（人間陣営から除外）</span>
              </div>
              <div className="form-group">
                <label className="form-label">嘘をついた人物</label>
                <select
                  className="form-select"
                  value={selectedPlayer}
                  onChange={(e) => setSelectedPlayer((e.target as HTMLSelectElement).value)}
                >
                  {settings.players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {playerStatuses[p.id] === "FROZEN" ? "(冷凍済)" : playerStatuses[p.id] === "ATTACKED" ? "(消滅済)" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">看破の理由・メモ</label>
                <input
                  type="text"
                  className="form-input"
                  value={lieReason}
                  onInput={(e) => setLieReason((e.target as HTMLInputElement).value)}
                  placeholder="例: 直感スキルで看破 / 人間だと言えで沈黙 / 留守番騙り発覚"
                />
              </div>
            </div>
          )}

          {/* 役職名乗り出 (CO) */}
          {eventType === "CO" && (
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">名乗り出た人物 (未CO者のみ)</label>
                <select
                  className="form-select"
                  value={selectedPlayer}
                  onChange={(e) => setSelectedPlayer((e.target as HTMLSelectElement).value)}
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
                  <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginTop: "0.25rem", display: "block" }}>
                    ※ 生存している全員がすでに役職CO済みです
                  </span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">宣言役職</label>
                <select
                  className="form-select"
                  value={claimedRole}
                  onChange={(e) => setClaimedRole((e.target as HTMLSelectElement).value as any)}
                >
                  <option value="ENGINEER">エンジニア</option>
                  <option value="DOCTOR">ドクター</option>
                  <option value="GUARD_DUTY">留守番 (2人)</option>
                </select>
              </div>
            </div>
          )}

          {/* エンジニア調査報告 */}
          {eventType === "INVESTIGATION" && (
            <div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">調査したエンジニア (CO者のみ)</label>
                  <select
                    className="form-select"
                    value={selectedPlayer}
                    onChange={(e) => {
                      const newInv = (e.target as HTMLSelectElement).value;
                      setSelectedPlayer(newInv);
                      if (targetPlayer === newInv) {
                        setTargetPlayer(alivePlayers.find((p) => p.id !== newInv)?.id || "");
                      }
                    }}
                  >
                    {engineerCandidates.length > 0 ? (
                      engineerCandidates.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} {p.id === "player" && myRole === "ENGINEER" ? "(真エンジニア)" : "(CO者)"}
                        </option>
                      ))
                    ) : (
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
                  <label className="form-label">調査対象 (生存者)</label>
                  <select
                    className="form-select"
                    value={targetPlayer}
                    onChange={(e) => setTargetPlayer((e.target as HTMLSelectElement).value)}
                  >
                    {alivePlayers
                      .filter((p) => p.id !== selectedPlayer)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">判定結果</label>
                <select
                  className="form-select"
                  value={reportResult}
                  onChange={(e) => setReportResult((e.target as HTMLSelectElement).value as ReportJudgement)}
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
                  <label className="form-label">報告したドクター (CO者のみ)</label>
                  <select
                    className="form-select"
                    value={selectedPlayer}
                    onChange={(e) => setSelectedPlayer((e.target as HTMLSelectElement).value)}
                  >
                    {doctorCandidates.length > 0 ? (
                      doctorCandidates.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} {p.id === "player" && myRole === "DOCTOR" ? "(真ドクター)" : "(CO者)"}
                        </option>
                      ))
                    ) : (
                      alivePlayers.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (※未CO)
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">診察した冷凍対象 (冷凍された乗員のみ)</label>
                  {frozenPlayers.length > 0 ? (
                    <select
                      className="form-select"
                      value={targetPlayer}
                      onChange={(e) => setTargetPlayer((e.target as HTMLSelectElement).value)}
                    >
                      {frozenPlayers.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (コールドスリープ済)
                        </option>
                      ))}
                    </select>
                  ) : (
                    <select className="form-select" disabled>
                      <option value="">(コールドスリープされた乗員がいません)</option>
                    </select>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">判定結果</label>
                <select
                  className="form-select"
                  value={reportResult}
                  onChange={(e) => setReportResult((e.target as HTMLSelectElement).value as ReportJudgement)}
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
              <label className="form-label">コールドスリープされた人物 (生存者のみ)</label>
              <select
                className="form-select"
                value={selectedPlayer}
                onChange={(e) => setSelectedPlayer((e.target as HTMLSelectElement).value)}
              >
                {alivePlayers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 消滅 (ATTACK) */}
          {eventType === "ATTACK" && (
            <div className="form-group">
              <label className="form-label">夜間に消滅した人物 (生存者のみ / 非グノーシア確定)</label>
              <select
                className="form-select"
                value={selectedPlayer}
                onChange={(e) => setSelectedPlayer((e.target as HTMLSelectElement).value)}
              >
                {alivePlayers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 襲撃なし (NO_ATTACK) */}
          {eventType === "NO_ATTACK" && (
            <div style={{ background: "rgba(168, 85, 247, 0.08)", padding: "1rem", borderRadius: "8px", border: "1px solid rgba(168, 85, 247, 0.3)", marginBottom: "1rem" }}>
              <div style={{ color: "#c084fc", fontSize: "0.85rem", fontWeight: "bold", marginBottom: "0.75rem" }}>
                夜間に誰も消滅しませんでした (犠牲者ゼロ)
              </div>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.75rem" }}>
                守護天使が護衛に成功したか、またはグノーシアがバグを襲撃した可能性があります。
              </p>

              <div className="form-group">
                <label className="form-label">護衛対象の人物 (守護天使視点などで分かっている場合、任意)</label>
                <select
                  className="form-select"
                  value={selectedPlayer}
                  onChange={(e) => setSelectedPlayer((e.target as HTMLSelectElement).value)}
                >
                  <option value="">(不明・指定なし: 単に犠牲者なし)</option>
                  {alivePlayers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (護衛されたため非グノーシア確定)
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">メモ</label>
                <input
                  type="text"
                  className="form-input"
                  value={lieReason}
                  onInput={(e) => setLieReason((e.target as HTMLInputElement).value)}
                  placeholder="例: 天使護衛成功？ / バグ襲撃？"
                />
              </div>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.5rem" }}>
            <button type="button" className="btn" onClick={onClose}>
              キャンセル
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={
                (eventType === "CO" && coCandidates.length === 0) ||
                (eventType === "DOCTOR_REPORT" && frozenPlayers.length === 0) ||
                (eventType === "INVESTIGATION" && alivePlayers.length === 0) ||
                ((eventType === "VOTE" || eventType === "ATTACK") && alivePlayers.length === 0)
              }
            >
              {editingEvent ? "変更を保存する" : "イベントを記録する"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
