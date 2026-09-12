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
import { EventType, GameEvent, Role } from "./types.ts";

export function App() {
  const {
    settings,
    setSettings,
    events,
    currentDay,
    setCurrentDay,
    perspective,
    selectPerspective,
    updatePerspectiveRole,
    myRole,
    setMyRole,
    playerStatuses,
    solverResult,
    claimedRoles,
    definiteLies,
    addEvent,
    updateEvent,
    removeEvent,
    moveEvent,
    advanceDay,
    resetGame,
    exportSession,
    importSession,
  } = useGameStore();

  // モーダル管理
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [isWorldsOpen, setIsWorldsOpen] = useState(false);
  const [isExportImportOpen, setIsExportImportOpen] = useState(false);
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<GameEvent | undefined>(
    undefined,
  );

  const [addEventInitialType, setAddEventInitialType] = useState<EventType>(
    "DEFINITE_LIE",
  );
  const [addEventInitialPlayerId, setAddEventInitialPlayerId] = useState<
    string | undefined
  >(undefined);

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
        onSelectPerspective={selectPerspective}
        onSelectRole={updatePerspectiveRole}
        onSetMyRole={setMyRole}
      />

      <div className="main-grid">
        <main className="main-content">
          <div className="section-header">
            <h2 className="section-title">
              乗員一覧・推定確率
            </h2>
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              {settings.players.length}名中 生存:{" "}
              <strong style={{ color: "#34d399" }}>
                {Object.values(playerStatuses).filter((s) => s === "ALIVE")
                  .length}名
              </strong>
            </span>
          </div>

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
                onQuickLie={handleQuickLie}
                onQuickFreeze={handleQuickFreeze}
                onQuickAttack={handleQuickAttack}
                onQuickGnosiaAttack={handleQuickGnosiaAttack}
                onQuickInvestigate={handleQuickInvestigate}
                onQuickDoctorReport={handleQuickDoctorReport}
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
            onOpenAddEvent={(type, id) => {
              setEditingEvent(undefined);
              setAddEventInitialType(type || "CO");
              setAddEventInitialPlayerId(id);
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
        initialType={addEventInitialType}
        initialPlayerId={addEventInitialPlayerId}
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

      <ExportImportModal
        isOpen={isExportImportOpen}
        onClose={() => setIsExportImportOpen(false)}
        onExport={exportSession}
        onImport={importSession}
      />
    </div>
  );
}
