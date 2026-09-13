import { useMemo, useState } from "preact/hooks";
import { Sliders, X } from "lucide-preact";
import {
  DEFAULT_CHARACTERS,
  GameSettings,
  ROLE_DEFINITIONS,
} from "../types.ts";

type GameSetupModalProps = {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: GameSettings;
  onSaveSettings: (settings: GameSettings) => void;
};

export function GameSetupModal({
  isOpen,
  onClose,
  currentSettings,
  onSaveSettings,
}: GameSetupModalProps) {
  if (!isOpen) return null;

  const [settings, setSettings] = useState<GameSettings>({
    ...currentSettings,
  });
  const [selectedCharIds, setSelectedCharIds] = useState<Set<string>>(
    new Set(currentSettings.players.map((p) => p.id)),
  );

  // 役職人数の合計と一般乗員数の計算
  const roleSummary = useMemo(() => {
    let specialCount = settings.roles.gnosiaCount;
    if (settings.roles.hasEngineer) specialCount += 1;
    if (settings.roles.hasDoctor) specialCount += 1;
    if (settings.roles.hasGuardianAngel) specialCount += 1;
    if (settings.roles.hasGuardDuty) specialCount += 2;
    if (settings.roles.hasACFollower) specialCount += 1;
    if (settings.roles.hasBug) specialCount += 1;

    const totalPlayers = selectedCharIds.size;
    const crewCount = totalPlayers - specialCount;

    return {
      totalPlayers,
      specialCount,
      crewCount,
      isValid: crewCount >= 0,
    };
  }, [settings.roles, selectedCharIds]);

  const toggleChar = (id: string) => {
    const next = new Set(selectedCharIds);
    if (next.has(id)) {
      if (next.size <= 5) {
        alert("最低5人の参加者が必要です。");
        return;
      }
      next.delete(id);
    } else {
      if (next.size >= 15) {
        alert("参加者は最大15人です。");
        return;
      }
      next.add(id);
    }
    setSelectedCharIds(next);
  };

  const applyPreset = (type: "15_full" | "12_standard" | "8_simple") => {
    if (type === "15_full") {
      const allIds = new Set(DEFAULT_CHARACTERS.map((c) => c.id));
      setSelectedCharIds(allIds);
      setSettings((prev) => ({
        ...prev,
        roles: {
          gnosiaCount: 3,
          hasEngineer: true,
          hasDoctor: true,
          hasGuardianAngel: true,
          hasGuardDuty: true,
          hasACFollower: true,
          hasBug: true,
        },
      }));
    } else if (type === "12_standard") {
      const ids = new Set(DEFAULT_CHARACTERS.slice(0, 12).map((c) => c.id));
      setSelectedCharIds(ids);
      setSettings((prev) => ({
        ...prev,
        roles: {
          gnosiaCount: 2,
          hasEngineer: true,
          hasDoctor: true,
          hasGuardianAngel: true,
          hasGuardDuty: true,
          hasACFollower: true,
          hasBug: false,
        },
      }));
    } else if (type === "8_simple") {
      const ids = new Set(DEFAULT_CHARACTERS.slice(0, 8).map((c) => c.id));
      setSelectedCharIds(ids);
      setSettings((prev) => ({
        ...prev,
        roles: {
          gnosiaCount: 2,
          hasEngineer: true,
          hasDoctor: false,
          hasGuardianAngel: true,
          hasGuardDuty: false,
          hasACFollower: false,
          hasBug: false,
        },
      }));
    }
  };

  const handleSave = () => {
    if (!roleSummary.isValid) {
      alert(
        "役職の合計人数が参加人数を超えています。役職数または参加人数を調整してください。",
      );
      return;
    }

    const newPlayers = DEFAULT_CHARACTERS.filter((c) =>
      selectedCharIds.has(c.id)
    ).map((c) => ({ id: c.id, name: c.name }));

    onSaveSettings({
      ...settings,
      players: newPlayers,
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Sliders size={20} color="var(--text-accent)" />
            <h3 className="modal-title">ゲーム設定 (配役 & 参加者)</h3>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* プリセット選択 */}
        <div style={{ marginBottom: "1.2rem" }}>
          <label className="form-label">配役プリセット</label>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => applyPreset("15_full")}
            >
              15人 フル役職 (G:3, AC:1, バグ:1, 他全役職)
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => applyPreset("12_standard")}
            >
              12人 標準構成 (G:2, AC:1, バグなし)
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => applyPreset("8_simple")}
            >
              8人 シンプル (G:2, エンジニア, 天使)
            </button>
          </div>
        </div>

        {/* 役職の有無 */}
        <div style={{ marginBottom: "1.2rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <label className="form-label" style={{ marginBottom: 0 }}>
              役職構成
            </label>
            <span
              style={{
                fontSize: "0.8rem",
                color: roleSummary.isValid
                  ? "var(--text-muted)"
                  : "var(--color-gnosia)",
              }}
            >
              参加人数: <strong>{roleSummary.totalPlayers}人</strong> | 乗員枠:
              {" "}
              <strong
                style={{
                  color: roleSummary.isValid
                    ? "var(--color-crew)"
                    : "var(--color-gnosia)",
                }}
              >
                {roleSummary.crewCount}人
              </strong>
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1rem",
              marginTop: "0.5rem",
            }}
          >
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label
                className="form-label"
                style={{ color: "var(--color-gnosia)" }}
              >
                グノーシア人数: {settings.roles.gnosiaCount}人
              </label>
              <input
                type="range"
                min="1"
                max="6"
                value={settings.roles.gnosiaCount}
                onInput={(e) =>
                  setSettings({
                    ...settings,
                    roles: {
                      ...settings.roles,
                      gnosiaCount: Number((e.target as HTMLInputElement).value),
                    },
                  })}
                style={{ width: "100%" }}
              />
            </div>

            <div className="role-checkboxes-grid">
              <label className="role-checkbox-item">
                <input
                  type="checkbox"
                  checked={settings.roles.hasEngineer}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      roles: {
                        ...settings.roles,
                        hasEngineer: (e.target as HTMLInputElement).checked,
                      },
                    })}
                />
                <span style={{ color: ROLE_DEFINITIONS.ENGINEER.color }}>
                  エンジニア (1)
                </span>
              </label>

              <label className="role-checkbox-item">
                <input
                  type="checkbox"
                  checked={settings.roles.hasDoctor}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      roles: {
                        ...settings.roles,
                        hasDoctor: (e.target as HTMLInputElement).checked,
                      },
                    })}
                />
                <span style={{ color: ROLE_DEFINITIONS.DOCTOR.color }}>
                  ドクター (1)
                </span>
              </label>

              <label className="role-checkbox-item">
                <input
                  type="checkbox"
                  checked={settings.roles.hasGuardianAngel}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      roles: {
                        ...settings.roles,
                        hasGuardianAngel:
                          (e.target as HTMLInputElement).checked,
                      },
                    })}
                />
                <span style={{ color: ROLE_DEFINITIONS.GUARDIAN_ANGEL.color }}>
                  守護天使 (1)
                </span>
              </label>

              <label className="role-checkbox-item">
                <input
                  type="checkbox"
                  checked={settings.roles.hasGuardDuty}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      roles: {
                        ...settings.roles,
                        hasGuardDuty: (e.target as HTMLInputElement).checked,
                      },
                    })}
                />
                <span style={{ color: ROLE_DEFINITIONS.GUARD_DUTY.color }}>
                  留守番 (2)
                </span>
              </label>

              <label className="role-checkbox-item">
                <input
                  type="checkbox"
                  checked={settings.roles.hasACFollower}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      roles: {
                        ...settings.roles,
                        hasACFollower: (e.target as HTMLInputElement).checked,
                      },
                    })}
                />
                <span style={{ color: ROLE_DEFINITIONS.AC_FOLLOWER.color }}>
                  AC主義者 (1)
                </span>
              </label>

              <label className="role-checkbox-item">
                <input
                  type="checkbox"
                  checked={settings.roles.hasBug}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      roles: {
                        ...settings.roles,
                        hasBug: (e.target as HTMLInputElement).checked,
                      },
                    })}
                />
                <span style={{ color: ROLE_DEFINITIONS.BUG.color }}>
                  バグ (1)
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* 参加キャラクターの選択 */}
        <div style={{ marginBottom: "1.5rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.4rem",
            }}
          >
            <label className="form-label" style={{ marginBottom: 0 }}>
              参加キャラクター ({selectedCharIds.size}人選択中 / 最大15人)
            </label>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() =>
                  setSelectedCharIds(
                    new Set(DEFAULT_CHARACTERS.map((c) => c.id)),
                  )}
              >
                全員選択
              </button>
            </div>
          </div>

          <div className="character-selection-grid">
            {DEFAULT_CHARACTERS.map((char) => {
              const isSelected = selectedCharIds.has(char.id);
              return (
                <div
                  key={char.id}
                  className={`char-chip ${isSelected ? "selected" : ""}`}
                  onClick={() => toggleChar(char.id)}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    readOnly
                  />
                  <span>{char.name}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ルール詳細オプション */}
        <div style={{ marginBottom: "1.5rem" }}>
          <label className="role-checkbox-item">
            <input
              type="checkbox"
              checked={settings.allowHiddenRoles}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  allowHiddenRoles: (e.target as HTMLInputElement).checked,
                })}
            />
            <span style={{ fontSize: "0.85rem" }}>
              真役職（エンジニア/ドクター）の潜伏（未CO）を許容する
            </span>
          </label>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "0.75rem",
          }}
        >
          <button type="button" className="btn" onClick={onClose}>
            キャンセル
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={!roleSummary.isValid}
          >
            設定を保存して適用
          </button>
        </div>
      </div>
    </div>
  );
}
