import { ListOrdered, Users } from "lucide-preact";
import { useState } from "preact/hooks";
import { useGameStore } from "./state/store.ts";
import { Header } from "./components/Header.tsx";
import { PerspectiveBar } from "./components/PerspectiveBar.tsx";
import { PlayerCard } from "./components/PlayerCard.tsx";
import { EventTimeline } from "./components/EventTimeline.tsx";
import { AddEventModal } from "./components/AddEventModal.tsx";
import { GameSetupModal } from "./components/GameSetupModal.tsx";
import { WorldListModal } from "./components/WorldListModal.tsx";
import { ExportImportModal } from "./components/ExportImportModal.tsx";
import {
  ExplanationModal,
  ExplanationTarget,
} from "./components/ExplanationModal.tsx";
import { EventType, GameEvent } from "./types.ts";

export function App() {
  const {
    settings,
    setSettings,
    events,
    currentDay,
    inspectedEventIndex,
    setInspectedEventIndex,
    perspective,
    selectPerspective,
    updatePerspectiveRole,
    myRole,
    setMyRole,
    playerStatuses,
    gnosiaComrades,
    toggleGnosiaComrade,
    solverResult,
    solverOptions,
    effectiveEvents,
    claimedRoles,
    definiteLies,
    addEvent,
    updateEvent,
    removeEvent,
    moveEvent,
    resetGame,
    exportSession,
    importSession,
  } = useGameStore();

  // モーダル管理
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [isWorldsOpen, setIsWorldsOpen] = useState(false);
  const [isExportImportOpen, setIsExportImportOpen] = useState(false);
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  // スマホ・タブレットで表示する画面 (広い画面では両方表示)
  const [view, setView] = useState<"players" | "timeline">("players");
  const [explanationTarget, setExplanationTarget] = useState<
    ExplanationTarget | undefined
  >(undefined);
  const [editingEvent, setEditingEvent] = useState<GameEvent | undefined>(
    undefined,
  );

  const [addEventInitialType, setAddEventInitialType] = useState<EventType>(
    "DEFINITE_LIE",
  );
  const [addEventInitialPlayerId, setAddEventInitialPlayerId] = useState<
    string | undefined
  >(undefined);
  const [addEventInitialClaimedRole, setAddEventInitialClaimedRole] = useState<
    "ENGINEER" | "DOCTOR" | "GUARD_DUTY" | undefined
  >(undefined);
  const [addEventInitialWitnessId, setAddEventInitialWitnessId] = useState<
    string | undefined
  >(undefined);

  // 視点トグルハンドラ（同一プレイヤーを再度クリックで全体俯瞰に解除）
  const handleTogglePerspective = (playerId: string, playerName: string) => {
    if (perspective.id === playerId) {
      selectPerspective("objective", "全体 (客観神視点)");
    } else {
      selectPerspective(playerId, playerName);
    }
  };

  // クイックアクション用ハンドラ
  const handleQuickLie = (playerId: string) => {
    setEditingEvent(undefined);
    setAddEventInitialType("DEFINITE_LIE");
    setAddEventInitialPlayerId(playerId);
    setIsAddEventOpen(true);
  };

  const handleQuickInvestigate = (playerId: string) => {
    setEditingEvent(undefined);
    setAddEventInitialType("INVESTIGATION");
    setAddEventInitialPlayerId(playerId);
    setIsAddEventOpen(true);
  };

  const handleQuickDoctorReport = (playerId: string) => {
    setEditingEvent(undefined);
    setAddEventInitialType("DOCTOR_REPORT");
    setAddEventInitialPlayerId(playerId);
    setIsAddEventOpen(true);
  };

  const handleQuickFreeze = (playerId: string) => {
    addEvent({
      type: "VOTE",
      frozenPlayerId: playerId,
    });
  };

  const handleQuickAttack = (playerId: string) => {
    addEvent({
      type: "DISAPPEARANCE",
      disappearedPlayerIds: [playerId],
    });
  };

  const handleQuickGnosiaAttack = (playerId: string) => {
    addEvent({
      type: "GNOSIA_ATTACK",
      targetId: playerId,
    });
  };

  return (
    <div className="app-container">
      <Header
        onOpenSettings={() => setIsSetupOpen(true)}
        onReset={resetGame}
        onOpenWorlds={() => setIsWorldsOpen(true)}
        onOpenExportImport={() => setIsExportImportOpen(true)}
        possibleWorldsCount={solverResult.totalPossibleWorlds}
      />

      <PerspectiveBar
        settings={settings}
        perspective={perspective}
        myRole={myRole}
        gnosiaComrades={gnosiaComrades}
        onSelectPerspective={selectPerspective}
        onSelectRole={updatePerspectiveRole}
        onSetMyRole={setMyRole}
        onToggleGnosiaComrade={toggleGnosiaComrade}
      />

      <div className="view-tabs" role="tablist" aria-label="表示切り替え">
        <button
          type="button"
          role="tab"
          className="view-tab"
          aria-selected={view === "players"}
          onClick={() => setView("players")}
        >
          <Users size={16} />
          プレイヤー
        </button>
        <button
          type="button"
          role="tab"
          className="view-tab"
          aria-selected={view === "timeline"}
          onClick={() => setView("timeline")}
        >
          <ListOrdered size={16} />
          タイムライン
          <span className="view-tab-count">{events.length}件</span>
        </button>
      </div>

      <div className="main-grid" data-view={view}>
        <main className="main-content">
          <div className="player-grid">
            {settings.players.map((p) => (
              <PlayerCard
                key={p.id}
                player={p}
                status={playerStatuses[p.id] || "ALIVE"}
                claimedRoles={claimedRoles[p.id] || []}
                definiteLieReasons={definiteLies[p.id]}
                isCurrentPerspective={perspective.id === p.id}
                solverResult={solverResult}
                myRole={myRole}
                isGnosiaComrade={gnosiaComrades.includes(p.id)}
                onToggleGnosiaComrade={toggleGnosiaComrade}
                onQuickLie={handleQuickLie}
                onQuickFreeze={handleQuickFreeze}
                onQuickAttack={handleQuickAttack}
                onQuickGnosiaAttack={handleQuickGnosiaAttack}
                onQuickInvestigate={handleQuickInvestigate}
                onQuickDoctorReport={handleQuickDoctorReport}
                onTogglePerspective={handleTogglePerspective}
                onExplain={(playerId, conclusion) =>
                  setExplanationTarget({ playerId, conclusion })}
              />
            ))}
          </div>
        </main>

        <aside className="sidebar">
          <EventTimeline
            events={events}
            settings={settings}
            currentDay={currentDay}
            playerStatuses={playerStatuses}
            claimedRoles={claimedRoles}
            myRole={myRole}
            inspectedEventIndex={inspectedEventIndex}
            onSelectCheckpoint={setInspectedEventIndex}
            onOpenAddEvent={(arg, id) => {
              setEditingEvent(undefined);
              if (typeof arg === "object" && arg !== null) {
                setAddEventInitialType(arg.type);
                setAddEventInitialPlayerId(arg.playerId);
                setAddEventInitialClaimedRole(arg.claimedRole);
                setAddEventInitialWitnessId(arg.witnessId);
              } else {
                setAddEventInitialType(arg || "CO");
                setAddEventInitialPlayerId(id);
                setAddEventInitialClaimedRole(undefined);
                setAddEventInitialWitnessId(undefined);
              }
              setIsAddEventOpen(true);
            }}
            onQuickDoctorReport={(reporterId, targetId, result) => {
              addEvent({
                type: "DOCTOR_REPORT",
                reporterId,
                targetId,
                result,
              });
            }}
            onEditEvent={(ev) => {
              setEditingEvent(ev);
              setIsAddEventOpen(true);
            }}
            onRemoveEvent={removeEvent}
            onMoveEvent={moveEvent}
            hasContradiction={solverResult.hasContradiction}
            contradictionReason={solverResult.contradictionReason}
          />
        </aside>
      </div>

      {/* モーダル群 */}
      <GameSetupModal
        isOpen={isSetupOpen}
        onClose={() => setIsSetupOpen(false)}
        currentSettings={settings}
        onSaveSettings={setSettings}
      />

      <AddEventModal
        isOpen={isAddEventOpen}
        onClose={() => {
          setIsAddEventOpen(false);
          setEditingEvent(undefined);
        }}
        onAddEvent={addEvent}
        onUpdateEvent={updateEvent}
        editingEvent={editingEvent}
        settings={settings}
        events={events}
        currentDay={currentDay}
        initialType={addEventInitialType}
        initialPlayerId={addEventInitialPlayerId}
        initialClaimedRole={addEventInitialClaimedRole}
        initialWitnessId={addEventInitialWitnessId}
        playerStatuses={playerStatuses}
        claimedRoles={claimedRoles}
        myRole={myRole}
      />

      <WorldListModal
        isOpen={isWorldsOpen}
        onClose={() => setIsWorldsOpen(false)}
        sampleWorlds={solverResult.sampleWorlds}
        totalWorlds={solverResult.totalPossibleWorlds}
        settings={settings}
      />

      <ExplanationModal
        target={explanationTarget}
        onClose={() => setExplanationTarget(undefined)}
        settings={settings}
        events={effectiveEvents}
        solverOptions={solverOptions}
      />

      <ExportImportModal
        isOpen={isExportImportOpen}
        onClose={() => setIsExportImportOpen(false)}
        onExport={exportSession}
        onImport={importSession}
      />
    </div>
  );
}
