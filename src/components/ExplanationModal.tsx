import { useEffect, useRef, useState } from "preact/hooks";
import { Lightbulb, X } from "lucide-preact";
import { GameEvent, GameSettings, ROLE_DEFINITIONS } from "../types.ts";
import { SolverOptions } from "../solver/solver.ts";
import { Conclusion, isReasonEvent } from "../solver/explain.ts";
import { EventDescription } from "./timeline/EventDescription.tsx";
import { handleDialogBackdropClick } from "../utils/dialog.ts";

export type ExplanationTarget = {
  readonly playerId: string;
  readonly conclusion: Conclusion;
};

type ExplanationModalProps = {
  readonly target: ExplanationTarget | undefined;
  readonly onClose: () => void;
  readonly settings: GameSettings;
  readonly events: ReadonlyArray<GameEvent>;
  readonly solverOptions: SolverOptions;
};

export function conclusionLabel(conclusion: Conclusion): string {
  switch (conclusion.kind) {
    case "ROLE":
      return `${ROLE_DEFINITIONS[conclusion.role].name}確定`;
    case "ENEMY":
      return "敵陣営確定";
    case "NOT_ENEMY":
      return "人間陣営確定";
  }
}

type Progress =
  | { readonly state: "running"; readonly done: number }
  | { readonly state: "done"; readonly reasons: ReadonlyArray<GameEvent> };

/**
 * 確定結論の根拠となったイベントを表示するモーダル。
 * イベントを1つずつ除いて解き直すため、UI が固まらないようにイベントごとに分割して計算する
 */
export function ExplanationModal({
  target,
  onClose,
  settings,
  events,
  solverOptions,
}: ExplanationModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [progress, setProgress] = useState<Progress>({
    state: "running",
    done: 0,
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (target) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [target]);

  useEffect(() => {
    if (!target) return;
    let cancelled = false;
    setProgress({ state: "running", done: 0 });
    const reasons: Array<GameEvent> = [];
    const step = (index: number) => {
      if (cancelled) return;
      if (index >= events.length) {
        setProgress({ state: "done", reasons });
        return;
      }
      const ev = events[index];
      if (
        ev &&
        isReasonEvent(
          settings,
          events,
          solverOptions,
          target.playerId,
          target.conclusion,
          index,
        )
      ) {
        reasons.push(ev);
      }
      setProgress({ state: "running", done: index + 1 });
      setTimeout(() => step(index + 1), 0);
    };
    setTimeout(() => step(0), 0);
    return () => {
      cancelled = true;
    };
  }, [target, settings, events, solverOptions]);

  const playerName = target
    ? settings.players.find((p) => p.id === target.playerId)?.name ??
      target.playerId
    : "";
  const perspectiveName = solverOptions.perspectivePlayerId
    ? settings.players.find((p) => p.id === solverOptions.perspectivePlayerId)
      ?.name
    : undefined;

  return (
    <dialog
      id="explanation-dialog"
      ref={dialogRef}
      className="modal-dialog"
      style={{ maxWidth: "640px" }}
      closedby="any"
      onClose={onClose}
      onClick={handleDialogBackdropClick}
    >
      <div className="modal-header">
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Lightbulb size={20} color="var(--text-accent)" />
          <h3 className="modal-title">
            {playerName} が{target ? conclusionLabel(target.conclusion) : ""}
            {" "}
            の根拠
          </h3>
        </div>
        <button
          type="button"
          className="modal-close-btn"
          command="close"
          commandfor="explanation-dialog"
          onClick={onClose}
          aria-label="閉じる"
        >
          <X size={20} />
        </button>
      </div>

      <p className="explanation-note">
        以下のイベントは、1つでも取り除くとこの結論が成り立たなくなります。
        {perspectiveName && (
          <>
            <br />
            ※ {perspectiveName} 視点
            {solverOptions.perspectiveRole
              ? ` (${ROLE_DEFINITIONS[solverOptions.perspectiveRole].name})`
              : ""} を前提とした結論です。
          </>
        )}
      </p>

      {progress.state === "running"
        ? (
          <div className="explanation-progress" role="status">
            計算中… ({progress.done} / {events.length})
          </div>
        )
        : progress.reasons.length === 0
        ? (
          <div className="explanation-progress">
            単独で結論を左右するイベントはありません
            (ゲーム設定や視点だけから決まる、または複数のイベントが互いに補い合っています)。
          </div>
        )
        : (
          <ol className="explanation-list">
            {progress.reasons.map((ev) => (
              <li key={ev.id}>
                <span className="explanation-day">{ev.day}日目</span>
                <EventDescription event={ev} players={settings.players} />
              </li>
            ))}
          </ol>
        )}
    </dialog>
  );
}
