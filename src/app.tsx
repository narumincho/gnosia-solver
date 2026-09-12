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
import { EventType, Role } from "./types.ts";

export function App() {
  const {
    settings,
    setSettings,
    events,
    currentDay,
    setCurrentDay,
    perspective,
    setPerspective,
    playerStatuses,
    solverResult,
    claimedRoles,
    definiteLies,
    addEvent,
    removeEvent,
    resetGame,
    exportSession,
    importSession,
  } = useGameStore();

  // モーダル管理
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [isWorldsOpen, setIsWorldsOpen] = useState(false);
  const [isExportImportOpen, setIsExportImportOpen] = useState(false);
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);

  const [addEventInitialType, setAddEventInitialType] = useState<EventType>("DEFINITE_LIE");
  const [addEventInitialPlayerId, setAddEventInitialPlayerId] = useState<string | undefined>(undefined);

  // クイックアクション用ハンドラ
  const handleQuickLie = (playerId: string) => {
    setAddEventInitialType("DEFINITE_LIE");
    setAddEventInitialPlayerId(playerId);
    setIsAddEventOpen(true);
  };

  const handleQuickInvestigate = (playerId: string) => {
    setAddEventInitialType("INVESTIGATION");
    setAddEventInitialPlayerId(playerId);
    setIsAddEventOpen(true);
  };

  const handleQuickFreeze = (playerId: string) => {
    addEvent({
      day: currentDay,
      type: "VOTE",
      frozenPlayerId: playerId,
    });
  };

  const handleQuickAttack = (playerId: string) => {
    addEvent({
      day: currentDay,
      type: "ATTACK",
      attackedPlayerId: playerId,
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
        onSelectPerspective={setPerspective}
        onSelectRole={(role) => setPerspective((prev) => ({ ...prev, role }))}
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
                {
                  Object.values(playerStatuses).filter((s) => s === "ALIVE")
                    .length
                }名
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
                onQuickLie={handleQuickLie}
                onQuickFreeze={handleQuickFreeze}
                onQuickAttack={handleQuickAttack}
                onQuickInvestigate={handleQuickInvestigate}
              />
            ))}
          </div>
        </main>

        <aside className="sidebar">
          <EventTimeline
            events={events}
            settings={settings}
            currentDay={currentDay}
            onSetDay={setCurrentDay}
            onOpenAddEvent={() => {
              setAddEventInitialType("CO");
              setAddEventInitialPlayerId(undefined);
              setIsAddEventOpen(true);
            }}
            onRemoveEvent={removeEvent}
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
        onClose={() => setIsAddEventOpen(false)}
        onAddEvent={addEvent}
        settings={settings}
        currentDay={currentDay}
        initialType={addEventInitialType}
        initialPlayerId={addEventInitialPlayerId}
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

