import { useEffect, useRef } from "preact/hooks";
import { X } from "lucide-preact";
import {
  EventType,
  GameEvent,
  GameSettings,
  NewGameEvent,
  PlayerStatus,
  Role,
} from "../types.ts";
import { handleDialogBackdropClick } from "../utils/dialog.ts";
import { COForm } from "./event_forms/COForm.tsx";
import { DefiniteLieForm } from "./event_forms/DefiniteLieForm.tsx";
import { VoteForm } from "./event_forms/VoteForm.tsx";
import { InvestigationForm } from "./event_forms/InvestigationForm.tsx";
import { DoctorReportForm } from "./event_forms/DoctorReportForm.tsx";
import { DisappearanceForm } from "./event_forms/DisappearanceForm.tsx";
import { GnosiaAttackForm } from "./event_forms/GnosiaAttackForm.tsx";
import { GuardianGuardForm } from "./event_forms/GuardianGuardForm.tsx";

type AddEventModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onAddEvent: (ev: NewGameEvent) => void;
  onUpdateEvent?: ((ev: GameEvent) => void) | undefined;
  editingEvent?: GameEvent | undefined;
  settings: GameSettings;
  events?: ReadonlyArray<GameEvent> | undefined;
  currentDay?: number | undefined;
  initialType?: EventType | undefined;
  initialPlayerId?: string | undefined;
  initialClaimedRole?: "ENGINEER" | "DOCTOR" | "GUARD_DUTY" | undefined;
  initialWitnessId?: string | undefined;
  playerStatuses: Record<string, PlayerStatus>;
  claimedRoles: Record<string, ReadonlyArray<Role>>;
  myRole?: Role | undefined;
};

export function AddEventModal({
  isOpen,
  onClose,
  onAddEvent,
  onUpdateEvent,
  editingEvent,
  settings,
  events = [],
  currentDay = 1,
  initialType = "DEFINITE_LIE",
  initialPlayerId,
  initialClaimedRole,
  initialWitnessId,
  playerStatuses,
  claimedRoles,
  myRole,
}: AddEventModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const eventType = editingEvent ? editingEvent.type : initialType;

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

  const handleFormSubmit = (eventData: NewGameEvent) => {
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

  const getModalTitle = () => {
    if (editingEvent) {
      return "イベントの編集";
    }
    switch (eventType) {
      case "CO":
        if (initialClaimedRole === "ENGINEER") return "エンジニアCO の記録";
        if (initialClaimedRole === "DOCTOR") return "ドクターCO の記録";
        if (initialClaimedRole === "GUARD_DUTY") return "留守番CO の記録";
        return "役職名乗り出 (CO) の記録";
      case "DEFINITE_LIE":
        if (initialWitnessId === "player" || !initialWitnessId) {
          return "嘘に気づいた の記録";
        }
        return "嘘に気づいたのを共有 の記録";
      case "VOTE":
        return "投票結果 (コールドスリープ) の記録";
      case "INVESTIGATION":
        return "エンジニアの調査 の記録";
      case "GUARDIAN_GUARD":
        return "守護天使の護衛 の記録";
      case "GNOSIA_ATTACK":
        return "グノーシアの襲撃 の記録";
      case "DOCTOR_REPORT":
        return "ドクター医療報告 の記録";
      case "DISAPPEARANCE":
        return "夜の消滅 (消滅もしくは平和) の記録";
      default:
        return "イベントの記録";
    }
  };

  return (
    <dialog
      id="add-event-dialog"
      ref={dialogRef}
      className="modal-dialog"
      onClose={onClose}
      onClick={handleDialogBackdropClick}
    >
      <div className="modal-header">
        <h3 className="modal-title">
          {getModalTitle()}
        </h3>
        <button
          type="button"
          className="modal-close-btn"
          command="close"
          commandfor="add-event-dialog"
          onClick={onClose}
          aria-label="閉じる"
        >
          <X size={20} />
        </button>
      </div>

      {isOpen && eventType === "CO" && (
        <COForm
          editingEvent={editingEvent?.type === "CO" ? editingEvent : undefined}
          settings={settings}
          playerStatuses={playerStatuses}
          claimedRoles={claimedRoles}
          initialPlayerId={initialPlayerId}
          initialClaimedRole={initialClaimedRole}
          onSubmit={handleFormSubmit}
          onCancel={onClose}
        />
      )}

      {isOpen && eventType === "DEFINITE_LIE" && (
        <DefiniteLieForm
          editingEvent={editingEvent?.type === "DEFINITE_LIE"
            ? editingEvent
            : undefined}
          settings={settings}
          playerStatuses={playerStatuses}
          initialWitnessId={initialWitnessId}
          onSubmit={handleFormSubmit}
          onCancel={onClose}
        />
      )}

      {isOpen && eventType === "VOTE" && (
        <VoteForm
          editingEvent={editingEvent?.type === "VOTE"
            ? editingEvent
            : undefined}
          settings={settings}
          playerStatuses={playerStatuses}
          initialPlayerId={initialPlayerId}
          onSubmit={handleFormSubmit}
          onCancel={onClose}
        />
      )}

      {isOpen && eventType === "INVESTIGATION" && (
        <InvestigationForm
          editingEvent={editingEvent?.type === "INVESTIGATION"
            ? editingEvent
            : undefined}
          settings={settings}
          events={events}
          currentDay={currentDay}
          playerStatuses={playerStatuses}
          claimedRoles={claimedRoles}
          myRole={myRole}
          initialPlayerId={initialPlayerId}
          onSubmit={handleFormSubmit}
          onCancel={onClose}
        />
      )}

      {isOpen && eventType === "DOCTOR_REPORT" && (
        <DoctorReportForm
          editingEvent={editingEvent?.type === "DOCTOR_REPORT"
            ? editingEvent
            : undefined}
          settings={settings}
          playerStatuses={playerStatuses}
          claimedRoles={claimedRoles}
          myRole={myRole}
          initialPlayerId={initialPlayerId}
          onSubmit={handleFormSubmit}
          onCancel={onClose}
        />
      )}

      {isOpen && eventType === "DISAPPEARANCE" && (
        <DisappearanceForm
          editingEvent={editingEvent?.type === "DISAPPEARANCE"
            ? editingEvent
            : undefined}
          settings={settings}
          playerStatuses={playerStatuses}
          onSubmit={handleFormSubmit}
          onCancel={onClose}
        />
      )}

      {isOpen && eventType === "GNOSIA_ATTACK" && (
        <GnosiaAttackForm
          editingEvent={editingEvent?.type === "GNOSIA_ATTACK"
            ? editingEvent
            : undefined}
          settings={settings}
          playerStatuses={playerStatuses}
          initialPlayerId={initialPlayerId}
          onSubmit={handleFormSubmit}
          onCancel={onClose}
        />
      )}

      {isOpen && eventType === "GUARDIAN_GUARD" && (
        <GuardianGuardForm
          editingEvent={editingEvent?.type === "GUARDIAN_GUARD"
            ? editingEvent
            : undefined}
          settings={settings}
          playerStatuses={playerStatuses}
          initialPlayerId={initialPlayerId}
          onSubmit={handleFormSubmit}
          onCancel={onClose}
        />
      )}
    </dialog>
  );
}
