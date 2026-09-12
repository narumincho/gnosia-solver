import { useState, useEffect } from "preact/hooks";
import { X, AlertTriangle, ShieldCheck, UserCheck, Search, Activity, Skull } from "lucide-preact";
import { EventType, GameEvent, GameSettings, ReportJudgement, Role } from "../types.ts";

interface AddEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddEvent: (ev: Omit<GameEvent, "id">) => void;
  settings: GameSettings;
  currentDay: number;
  initialType?: EventType;
  initialPlayerId?: string;
}

export function AddEventModal({
  isOpen,
  onClose,
  onAddEvent,
  settings,
  currentDay,
  initialType = "DEFINITE_LIE",
  initialPlayerId,
}: AddEventModalProps) {
  if (!isOpen) return null;

  const [eventType, setEventType] = useState<EventType>(initialType);
  const [day, setDay] = useState<number>(currentDay);

  // フォーム用入力ステート
  const [selectedPlayer, setSelectedPlayer] = useState<string>(
    initialPlayerId || settings.players[0]?.id || ""
  );
  const [targetPlayer, setTargetPlayer] = useState<string>(
    settings.players[1]?.id || ""
  );
  const [claimedRole, setClaimedRole] = useState<"ENGINEER" | "DOCTOR" | "GUARD_DUTY">("ENGINEER");
  const [reportResult, setReportResult] = useState<ReportJudgement>("HUMAN");
  const [lieReason, setLieReason] = useState<string>("直感スキル発動 / 人間だと言え");

  useEffect(() => {
    if (initialType) setEventType(initialType);
    if (initialPlayerId) setSelectedPlayer(initialPlayerId);
  }, [initialType, initialPlayerId]);

  const handleSubmit = (e: Event) => {
    e.preventDefault();

    switch (eventType) {
      case "CO":
        onAddEvent({
          day,
          type: "CO",
          playerId: selectedPlayer,
          claimedRole,
        });
        break;
      case "INVESTIGATION":
        onAddEvent({
          day,
          type: "INVESTIGATION",
          investigatorId: selectedPlayer,
          targetId: targetPlayer,
          result: reportResult,
        });
        break;
      case "DOCTOR_REPORT":
        onAddEvent({
          day,
          type: "DOCTOR_REPORT",
          reporterId: selectedPlayer,
          targetId: targetPlayer,
          result: reportResult,
        });
        break;
      case "DEFINITE_LIE":
        onAddEvent({
          day,
          type: "DEFINITE_LIE",
          targetId: selectedPlayer,
          reason: lieReason,
        });
        break;
      case "VOTE":
        onAddEvent({
          day,
          type: "VOTE",
          frozenPlayerId: selectedPlayer,
        });
        break;
      case "ATTACK":
        onAddEvent({
          day,
          type: "ATTACK",
          attackedPlayerId: selectedPlayer,
        });
        break;
      case "NO_ATTACK":
        onAddEvent({
          day,
          type: "NO_ATTACK",
          guardedPlayerId: selectedPlayer ? selectedPlayer : undefined,
          note: lieReason,
        });
        break;
    }

    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">イベントの記録</h3>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">発生日 (Day)</label>
              <select
                className="form-select"
                value={day}
                onChange={(e) => setDay(Number((e.target as HTMLSelectElement).value))}
              >
                {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                  <option key={d} value={d}>
                    Day {d}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">イベント種類</label>
              <select
                className="form-select"
                value={eventType}
                onChange={(e) => {
                  const val = (e.target as HTMLSelectElement).value as EventType;
                  setEventType(val);
                  if (val === "NO_ATTACK") {
                    setSelectedPlayer("");
                    setLieReason("夜間の犠牲者なし (天使護衛成功 または バグ襲撃)");
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
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
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
                <label className="form-label">名乗り出た人物</label>
                <select
                  className="form-select"
                  value={selectedPlayer}
                  onChange={(e) => setSelectedPlayer((e.target as HTMLSelectElement).value)}
                >
                  {settings.players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
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
                  <label className="form-label">調査したエンジニア</label>
                  <select
                    className="form-select"
                    value={selectedPlayer}
                    onChange={(e) => setSelectedPlayer((e.target as HTMLSelectElement).value)}
                  >
                    {settings.players.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">調査対象</label>
                  <select
                    className="form-select"
                    value={targetPlayer}
                    onChange={(e) => setTargetPlayer((e.target as HTMLSelectElement).value)}
                  >
                    {settings.players.map((p) => (
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
                  <label className="form-label">報告したドクター</label>
                  <select
                    className="form-select"
                    value={selectedPlayer}
                    onChange={(e) => setSelectedPlayer((e.target as HTMLSelectElement).value)}
                  >
                    {settings.players.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">冷凍された対象</label>
                  <select
                    className="form-select"
                    value={targetPlayer}
                    onChange={(e) => setTargetPlayer((e.target as HTMLSelectElement).value)}
                  >
                    {settings.players.map((p) => (
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

          {/* コールドスリープ (VOTE) */}
          {eventType === "VOTE" && (
            <div className="form-group">
              <label className="form-label">コールドスリープされた人物</label>
              <select
                className="form-select"
                value={selectedPlayer}
                onChange={(e) => setSelectedPlayer((e.target as HTMLSelectElement).value)}
              >
                {settings.players.map((p) => (
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
              <label className="form-label">夜間に消滅した人物 (グノーシアではないことが確定)</label>
              <select
                className="form-select"
                value={selectedPlayer}
                onChange={(e) => setSelectedPlayer((e.target as HTMLSelectElement).value)}
              >
                {settings.players.map((p) => (
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
                  {settings.players.map((p) => (
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
            <button type="submit" className="btn btn-primary">
              イベントを記録する
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
