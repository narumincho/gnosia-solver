import { useMemo, useState } from "preact/hooks";
import {
  DEFAULT_CHARACTERS,
  GameEvent,
  GameSettings,
  NewGameEvent,
  PerspectiveOption,
  PlayerStatus,
  Role,
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

// イベントの並び順から各イベントの発生日 (day) を自動計算する
export function recalculateDays(
  events: ReadonlyArray<GameEvent>,
): ReadonlyArray<GameEvent> {
  let day = 1;
  let hasVote = false;

  return events.map((ev) => {
    if (ev.type === "VOTE" && hasVote) {
      day += 1;
      hasVote = false;
    }

    const assigned = { ...ev, day };

    if (ev.type === "VOTE") {
      hasVote = true;
    } else if (
      ev.type === "DISAPPEARANCE" ||
      ev.type === "ATTACK" ||
      ev.type === "NO_ATTACK" ||
      ev.type === "DAY_CHANGE"
    ) {
      day += 1;
      hasVote = false;
    }

    return assigned as GameEvent;
  });
}

export function useGameStore() {
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [events, setEvents] = useState<ReadonlyArray<GameEvent>>([]);
  const [perspectiveRoles, setPerspectiveRoles] = useState<
    Record<string, Role>
  >({});
  const [myRole, setMyRoleState] = useState<Role | undefined>(undefined);
  const [perspective, setPerspective] = useState<PerspectiveOption>({
    id: "objective",
    name: "全体 (客観神視点)",
  });
  const [playerStatuses, setPlayerStatuses] = useState<
    Record<string, PlayerStatus>
  >({});
  const [gnosiaComrades, setGnosiaComrades] = useState<ReadonlyArray<string>>(
    [],
  );

  const toggleGnosiaComrade = (playerId: string) => {
    if (playerId === "player") return;
    const maxComrades = Math.max(0, settings.roles.gnosiaCount - 1);
    setGnosiaComrades((prev) => {
      if (prev.includes(playerId)) {
        return prev.filter((id) => id !== playerId);
      }
      if (prev.length < maxComrades) {
        return [...prev, playerId];
      }
      return prev;
    });
  };

  // イベントの並び順から現在の日付 (currentDay) を算出
  const currentDay = useMemo(() => {
    if (events.length === 0) return 1;
    const last = events[events.length - 1];
    if (!last) return 1;
    if (
      last.type === "DISAPPEARANCE" ||
      last.type === "ATTACK" ||
      last.type === "NO_ATTACK" ||
      last.type === "DAY_CHANGE"
    ) {
      return last.day + 1;
    }
    return last.day;
  }, [events]);

  // 視点選択ハンドラ（保存されている役職を自動復元）
  const selectPerspective = (id: string, name: string) => {
    if (id === "objective") {
      setPerspective({ id: "objective", name: "全体 (客観神視点)" });
    } else {
      const isPlayerGnosia = myRole === "GNOSIA" ||
        perspectiveRoles["player"] === "GNOSIA";
      const isComrade = isPlayerGnosia && gnosiaComrades.includes(id);
      const savedRole = perspectiveRoles[id] ||
        (id === "player" ? myRole : isComrade ? "GNOSIA" : undefined);
      setPerspective({ id, name, role: savedRole });
    }
  };

  // 視点プレイヤーの役職変更
  const updatePerspectiveRole = (role?: Role) => {
    setPerspective((prev) => ({ ...prev, role }));
    if (perspective.id !== "objective") {
      setPerspectiveRoles((prev) => {
        const next = { ...prev };
        if (role) next[perspective.id] = role;
        else delete next[perspective.id];
        return next;
      });
      if (perspective.id === "player") {
        setMyRoleState(role);
      }
    }
  };

  // 自分の役職を直接設定
  const setMyRole = (role?: Role) => {
    setMyRoleState(role);
    setPerspectiveRoles((prev) => {
      const next = { ...prev };
      if (role) next["player"] = role;
      else delete next["player"];
      return next;
    });
    if (perspective.id === "player") {
      setPerspective((prev) => ({ ...prev, role }));
    }
  };

  // 過去時点検証用のインデックス (null = 最新, -1 = イベント0件, 0..N-1 = 各イベント完了時点)
  const [inspectedEventIndex, setInspectedEventIndex] = useState<number | null>(
    null,
  );

  // 過去時点を検証中かどうかに応じた実効イベントリスト
  const effectiveEvents = useMemo(() => {
    if (inspectedEventIndex === null) return events;
    if (inspectedEventIndex < 0) return [];
    return events.slice(0, inspectedEventIndex + 1);
  }, [events, inspectedEventIndex]);

  // 実効イベントから計算された Day
  const effectiveDay = useMemo(() => {
    if (effectiveEvents.length === 0) return 1;
    const last = effectiveEvents[effectiveEvents.length - 1];
    if (!last) return 1;
    if (
      last.type === "DISAPPEARANCE" ||
      last.type === "ATTACK" ||
      last.type === "NO_ATTACK" ||
      last.type === "DAY_CHANGE"
    ) {
      return last.day + 1;
    }
    return last.day;
  }, [effectiveEvents]);

  // プレイヤーの生存/状態計算 (イベントから自動推定 or 手動オーバーライド)
  const computedStatuses = useMemo(() => {
    const statuses: Record<string, PlayerStatus> = {};
    for (const p of settings.players) {
      statuses[p.id] = playerStatuses[p.id] || "ALIVE";
    }

    for (const ev of effectiveEvents) {
      if (ev.type === "VOTE") {
        statuses[ev.frozenPlayerId] = "FROZEN";
      } else if (ev.type === "DISAPPEARANCE") {
        for (const pid of ev.disappearedPlayerIds) {
          statuses[pid] = "ATTACKED";
        }
      } else if (ev.type === "ATTACK") {
        statuses[ev.attackedPlayerId] = "ATTACKED";
      }
    }
    return statuses;
  }, [settings.players, effectiveEvents, playerStatuses]);

  // ソルバー実行結果のメモ化
  const solverResult = useMemo(() => {
    const solver = new GnosiaSolver(settings, effectiveEvents);
    const isPlayerGnosia = myRole === "GNOSIA" ||
      perspectiveRoles["player"] === "GNOSIA";
    const gnosiaTeam: ReadonlyArray<string> = isPlayerGnosia
      ? ["player", ...gnosiaComrades]
      : [];

    const isPerspectiveInGnosiaTeam = perspective.id !== "objective" &&
      gnosiaTeam.includes(perspective.id);

    // 視点人物がグノーシアチームの場合、明示ロールが未指定でもGNOSIA扱いとする
    const effectivePerspectiveRole = perspective.role ||
      (isPerspectiveInGnosiaTeam ? "GNOSIA" : undefined);

    // 仲間グノーシアは、その視点人物から見た自分以外のグノーシアチーム全員
    const effectiveComrades = isPerspectiveInGnosiaTeam
      ? gnosiaTeam.filter((id) => id !== perspective.id)
      : undefined;

    return solver.solve({
      perspectivePlayerId: perspective.id === "objective"
        ? undefined
        : perspective.id,
      perspectiveRole: effectivePerspectiveRole,
      gnosiaComrades: effectiveComrades,
    });
  }, [
    settings,
    effectiveEvents,
    perspective,
    myRole,
    perspectiveRoles,
    gnosiaComrades,
  ]);

  // COしている役職のマップ (playerId -> Role[])
  const claimedRoles = useMemo(() => {
    const map: Record<string, Array<"ENGINEER" | "DOCTOR" | "GUARD_DUTY">> = {};
    for (const ev of effectiveEvents) {
      if (ev.type === "CO") {
        let pRoles = map[ev.playerId];
        if (!pRoles) {
          pRoles = [];
          map[ev.playerId] = pRoles;
        }
        if (!pRoles.includes(ev.claimedRole)) {
          pRoles.push(ev.claimedRole);
        }
        if (ev.partnerPlayerId) {
          let partnerRoles = map[ev.partnerPlayerId];
          if (!partnerRoles) {
            partnerRoles = [];
            map[ev.partnerPlayerId] = partnerRoles;
          }
          if (!partnerRoles.includes(ev.claimedRole)) {
            partnerRoles.push(ev.claimedRole);
          }
        }
      }
    }
    return map;
  }, [effectiveEvents]);

  // 各プレイヤーが嘘をついたと確定または密告されているか (targetId -> labels[])
  const definiteLies = useMemo(() => {
    const map: Record<string, Array<string>> = {};
    for (const ev of effectiveEvents) {
      if (ev.type === "DEFINITE_LIE") {
        let list = map[ev.targetId];
        if (!list) {
          list = [];
          map[ev.targetId] = list;
        }
        const isSelf = ev.witnessId === "player" || !ev.witnessId;
        const witnessName = isSelf
          ? "自分"
          : settings.players.find((p) => p.id === ev.witnessId)?.name ||
            ev.witnessId;
        const label = isSelf ? "嘘看破 (自分)" : `密告 (${witnessName})`;
        list.push(label);
      }
    }
    return map;
  }, [effectiveEvents, settings.players]);

  // イベント追加 (並び順に応じてDayを自動設定)
  const addEvent = (event: NewGameEvent) => {
    const newEvent: GameEvent = {
      ...event,
      id: crypto.randomUUID(),
      day: event.day ?? 1, // recalculateDaysで位置に応じた正しいDayが割り当てられる
    } as GameEvent;
    setEvents((prev) => recalculateDays([...prev, newEvent]));
    setInspectedEventIndex(null);
  };

  // イベント更新 (編集)
  const updateEvent = (updatedEvent: GameEvent) => {
    setEvents((prev) =>
      recalculateDays(
        prev.map((e) => (e.id === updatedEvent.id ? updatedEvent : e)),
      )
    );
    setInspectedEventIndex(null);
  };

  // イベント削除
  const removeEvent = (id: string) => {
    setEvents((prev) => recalculateDays(prev.filter((e) => e.id !== id)));
    setInspectedEventIndex(null);
  };

  // イベントの並び替え (fromIndex -> toIndex)
  const moveEvent = (fromIndex: number, toIndex: number) => {
    setEvents((prev) => {
      if (
        fromIndex < 0 ||
        fromIndex >= prev.length ||
        toIndex < 0 ||
        toIndex >= prev.length ||
        fromIndex === toIndex
      ) {
        return prev;
      }
      const next = [...prev];
      const [item] = next.splice(fromIndex, 1);
      if (item !== undefined) {
        next.splice(toIndex, 0, item);
      }
      return recalculateDays(next);
    });
    setInspectedEventIndex(null);
  };

  // 次の日へ進行 (明示的な日付変更イベントを追加)
  const advanceDay = () => {
    addEvent({
      type: "DAY_CHANGE",
      note: "翌日へ進行",
    });
  };

  // セッション全体リセット
  const resetGame = () => {
    if (confirm("全てのイベントと状態をリセットしますか？")) {
      setEvents([]);
      setPlayerStatuses({});
      setPerspective({ id: "objective", name: "全体 (客観神視点)" });
      setPerspectiveRoles({});
      setMyRoleState(undefined);
      setGnosiaComrades([]);
      setInspectedEventIndex(null);
    }
  };

  // エクスポート用データ生成
  const exportSession = (): SessionData => {
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      settings,
      events: [...events],
      currentDay,
      perspective,
      myRole,
      perspectiveRoles,
      playerStatuses,
      gnosiaComrades,
    };
  };

  // インポート実行
  const importSession = (
    data: unknown,
  ): { success: boolean; error?: string | undefined } => {
    try {
      if (!data || typeof data !== "object") {
        return { success: false, error: "無効なデータ形式です。" };
      }

      const session = data as Partial<SessionData>;

      if (
        !session.settings || !Array.isArray(session.settings.players) ||
        !session.settings.roles
      ) {
        return {
          success: false,
          error: "ゲーム設定 (settings) が正しく含まれていません。",
        };
      }

      if (!Array.isArray(session.events)) {
        return {
          success: false,
          error: "イベント一覧 (events) が正しく含まれていません。",
        };
      }

      setSettings(session.settings);
      setEvents(recalculateDays(session.events));
      setInspectedEventIndex(null);
      if (session.perspective && typeof session.perspective.id === "string") {
        setPerspective(session.perspective);
      }
      if (session.myRole) {
        setMyRoleState(session.myRole);
      }
      if (
        session.perspectiveRoles &&
        typeof session.perspectiveRoles === "object"
      ) {
        setPerspectiveRoles(session.perspectiveRoles);
      }
      if (
        session.playerStatuses && typeof session.playerStatuses === "object"
      ) {
        setPlayerStatuses(session.playerStatuses);
      }
      if (Array.isArray(session.gnosiaComrades)) {
        setGnosiaComrades(session.gnosiaComrades);
      }

      return { success: true };
    } catch (e: unknown) {
      return {
        success: false,
        error: e instanceof Error
          ? e.message
          : "インポート中にエラーが発生しました。",
      };
    }
  };

  return {
    settings,
    setSettings,
    events,
    setEvents,
    currentDay,
    effectiveDay,
    inspectedEventIndex,
    setInspectedEventIndex,
    isInspectingPast: inspectedEventIndex !== null,
    perspective,
    setPerspective,
    selectPerspective,
    updatePerspectiveRole,
    myRole,
    setMyRole,
    playerStatuses: computedStatuses,
    setPlayerStatuses,
    gnosiaComrades,
    toggleGnosiaComrade,
    setGnosiaComrades,
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
  };
}
