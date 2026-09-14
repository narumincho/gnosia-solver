import { useEffect, useRef } from "preact/hooks";
import { Globe, X } from "lucide-preact";
import { GameSettings, ROLE_DEFINITIONS, RoleAssignment } from "../types.ts";
import { handleDialogBackdropClick } from "../utils/dialog.ts";

type WorldListModalProps = {
  isOpen: boolean;
  onClose: () => void;
  sampleWorlds: ReadonlyArray<RoleAssignment>;
  totalWorlds: number;
  settings: GameSettings;
};

export function WorldListModal({
  isOpen,
  onClose,
  sampleWorlds,
  totalWorlds,
  settings,
}: WorldListModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen]);

  return (
    <dialog
      id="world-list-dialog"
      ref={dialogRef}
      className="modal-dialog"
      style={{ maxWidth: "900px" }}
      onClose={onClose}
      onClick={handleDialogBackdropClick}
    >
      <div className="modal-header">
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Globe size={20} color="var(--text-accent)" />
          <h3 className="modal-title">
            可能世界 ({totalWorlds} 通り)
          </h3>
        </div>
        <button
          type="button"
          className="modal-close-btn"
          command="close"
          commandfor="world-list-dialog"
          onClick={onClose}
          aria-label="閉じる"
        >
          <X size={20} />
        </button>
      </div>

      {totalWorlds === 0
        ? (
          <div
            style={{
              padding: "2rem",
              textAlign: "center",
              color: "var(--color-gnosia)",
            }}
          >
            矛盾が発生しているため、成立する世界が存在しません。
          </div>
        )
        : (
          <div style={{ overflowX: "auto", maxHeight: "60vh" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.8rem",
                textAlign: "left",
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid var(--border-color)",
                    color: "var(--text-muted)",
                  }}
                >
                  <th style={{ padding: "0.5rem" }}>#</th>
                  {settings.players.map((p) => (
                    <th
                      key={p.id}
                      style={{ padding: "0.5rem", whiteSpace: "nowrap" }}
                    >
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sampleWorlds.map((world, idx) => (
                  <tr
                    key={idx}
                    style={{
                      borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                      background: idx % 2 === 0
                        ? "rgba(255, 255, 255, 0.02)"
                        : "transparent",
                    }}
                  >
                    <td
                      style={{
                        padding: "0.5rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      W{idx + 1}
                    </td>
                    {settings.players.map((p) => {
                      const role = world[p.id];
                      const def = role ? ROLE_DEFINITIONS[role] : null;
                      if (!def) return <td key={p.id}>-</td>;

                      return (
                        <td
                          key={p.id}
                          style={{ padding: "0.5rem", whiteSpace: "nowrap" }}
                        >
                          <span
                            className={`badge ${def.badgeClass}`}
                            style={{
                              fontSize: "0.65rem",
                              padding: "0.1rem 0.3rem",
                            }}
                          >
                            {def.name}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            {totalWorlds > sampleWorlds.length && (
              <p
                style={{
                  textAlign: "center",
                  color: "var(--text-muted)",
                  fontSize: "0.75rem",
                  marginTop: "0.75rem",
                }}
              >
                ※ 上位 {sampleWorlds.length} パターンを表示しています（全{" "}
                {totalWorlds} 通り）
              </p>
            )}
          </div>
        )}

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginTop: "1.2rem",
        }}
      >
        <button
          type="button"
          className="btn"
          command="close"
          commandfor="world-list-dialog"
          onClick={onClose}
        >
          閉じる
        </button>
      </div>
    </dialog>
  );
}
