import { useState, useMemo } from "preact/hooks";
import {
  GameEvent,
  GameSettings,
  Role,
  DEFAULT_CHARACTERS,
  PlayerStatus,
  PerspectiveOption,
  SessionData,
} from "../types.ts";

import { GnosiaSolver } from "../solver/solver.ts";

export const DEFAULT_SETTINGS: GameSettings = {
  players: DEFAULT_CHARACTERS.map((c) => ({ id: c.id, name: c.name })),
  roles: {
    gnosiaCount: 3,
    hasEngineer: true,
    hasDoctor: true,
    hasGuardianAngel: true,
    hasGuardDuty: true,
    hasACFollower: true,
    hasBug: true,
  },
  allowHiddenRoles: false,
};

export function useGameStore() {
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [currentDay, setCurrentDay] = useState<number>(1);
  const [perspective, setPerspective] = useState<PerspectiveOption>({
    id: "objective",
    name: "全体 (客観神視点)",
  });
  const [playerStatuses, setPlayerStatuses] = useState<Record<string, PlayerStatus>>({});

  // プレイヤーの生存/状態計算 (イベントから自動推定 or 手動オーバーライド)
  const computedStatuses = useMemo(() => {
    const statuses: Record<string, PlayerStatus> = {};
    for (const p of settings.players) {
      statuses[p.id] = playerStatuses[p.id] || "ALIVE";
    }

    for (const ev of events) {
      if (ev.type === "VOTE") {
        statuses[ev.frozenPlayerId] = "FROZEN";
      } else if (ev.type === "ATTACK") {
        statuses[ev.attackedPlayerId] = "ATTACKED";
      }
    }
    return statuses;
  }, [settings.players, events, playerStatuses]);

  // ソルバー実行結果のメモ化
  const solverResult = useMemo(() => {
    const solver = new GnosiaSolver(settings, events);
    return solver.solve({
      perspectivePlayerId:
        perspective.id === "objective" ? undefined : perspective.id,
      perspectiveRole: perspective.role,
    });
  }, [settings, events, perspective]);

  // COしている役職のマップ (playerId -> Role[])
  const claimedRoles = useMemo(() => {
    const map: Record<string, ("ENGINEER" | "DOCTOR" | "GUARD_DUTY")[]> = {};
    for (const ev of events) {
      if (ev.type === "CO") {
        if (!map[ev.playerId]) map[ev.playerId] = [];
        if (!map[ev.playerId].includes(ev.claimedRole)) {
          map[ev.playerId].push(ev.claimedRole);
        }
      }
    }
    return map;
  }, [events]);

  // 各プレイヤーが嘘をついたと確定しているか (targetId -> reasons[])
  const definiteLies = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const ev of events) {
      if (ev.type === "DEFINITE_LIE") {
        if (!map[ev.targetId]) map[ev.targetId] = [];
        map[ev.targetId].push(ev.reason || "嘘が看破された");
      }
    }
    return map;
  }, [events]);

  // イベント追加
  const addEvent = (event: Omit<GameEvent, "id">) => {
    const newEvent: GameEvent = {
      ...event,
      id: crypto.randomUUID(),
    } as GameEvent;
    setEvents((prev) => [...prev, newEvent]);
  };

  // イベント削除
  const removeEvent = (id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  };

  // セッション全体リセット
  const resetGame = () => {
    if (confirm("全てのイベントと状態をリセットしますか？")) {
      setEvents([]);
      setCurrentDay(1);
      setPlayerStatuses({});
      setPerspective({ id: "objective", name: "全体 (客観神視点)" });
    }
  };

  // エクスポート用データ生成
  const exportSession = (): SessionData => {
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      settings,
      events,
      currentDay,
      perspective,
      playerStatuses,
    };
  };

  // インポート実行
  const importSession = (data: any): { success: boolean; error?: string } => {
    try {
      if (!data || typeof data !== "object") {
        return { success: false, error: "無効なデータ形式です。" };
      }

      if (!data.settings || !Array.isArray(data.settings.players) || !data.settings.roles) {
        return { success: false, error: "ゲーム設定 (settings) が正しく含まれていません。" };
      }

      if (!Array.isArray(data.events)) {
        return { success: false, error: "イベント一覧 (events) が正しく含まれていません。" };
      }

      setSettings(data.settings);
      setEvents(data.events);
      if (typeof data.currentDay === "number") {
        setCurrentDay(data.currentDay);
      }
      if (data.perspective && typeof data.perspective.id === "string") {
        setPerspective(data.perspective);
      }
      if (data.playerStatuses && typeof data.playerStatuses === "object") {
        setPlayerStatuses(data.playerStatuses);
      }

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || "インポート中にエラーが発生しました。" };
    }
  };

  return {
    settings,
    setSettings,
    events,
    setEvents,
    currentDay,
    setCurrentDay,
    perspective,
    setPerspective,
    playerStatuses: computedStatuses,
    setPlayerStatuses,
    solverResult,
    claimedRoles,
    definiteLies,
    addEvent,
    removeEvent,
    resetGame,
    exportSession,
    importSession,
  };
}

