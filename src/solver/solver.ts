import {
  GameEvent,
  GameSettings,
  GnosiaAttackEvent,
  Role,
  RoleAssignment,
  SolverResult,
} from "../types.ts";

export const ALL_ROLES: Role[] = [
  "CREW",
  "GNOSIA",
  "ENGINEER",
  "DOCTOR",
  "GUARDIAN_ANGEL",
  "GUARD_DUTY",
  "AC_FOLLOWER",
  "BUG",
];

export interface SolverOptions {
  perspectivePlayerId?: string; // 視点プレイヤー (指定なし = 客観・神視点)
  perspectiveRole?: Role; // 視点プレイヤーの役職固定
}

/**
 * 役職ごとの陣営判定ヘルパー
 */
export function isHumanSide(role: Role): boolean {
  return (
    role === "CREW" ||
    role === "ENGINEER" ||
    role === "DOCTOR" ||
    role === "GUARDIAN_ANGEL" ||
    role === "GUARD_DUTY"
  );
}

export function isGnosiaSide(role: Role): boolean {
  return role === "GNOSIA" || role === "AC_FOLLOWER";
}

/**
 * グノーシア人狼ソルバー
 */
export class GnosiaSolver {
  private settings: GameSettings;
  private events: GameEvent[];

  constructor(settings: GameSettings, events: GameEvent[]) {
    this.settings = settings;
    this.events = events;
  }

  /**
   * 制約を解いて確率と成立する世界（配役パターン）を計算する
   */
  public solve(options: SolverOptions = {}): SolverResult {
    const players = this.settings.players;
    const playerIds = players.map((p) => p.id);
    const totalCount = playerIds.length;

    // 各役職の必要人数を計算
    const targetRoleCounts: Partial<Record<Role, number>> = {
      GNOSIA: this.settings.roles.gnosiaCount,
      ENGINEER: this.settings.roles.hasEngineer ? 1 : 0,
      DOCTOR: this.settings.roles.hasDoctor ? 1 : 0,
      GUARDIAN_ANGEL: this.settings.roles.hasGuardianAngel ? 1 : 0,
      GUARD_DUTY: this.settings.roles.hasGuardDuty ? 2 : 0,
      AC_FOLLOWER: this.settings.roles.hasACFollower ? 1 : 0,
      BUG: this.settings.roles.hasBug ? 1 : 0,
    };

    let specialSum = 0;
    for (const count of Object.values(targetRoleCounts)) {
      specialSum += count ?? 0;
    }
    const crewCount = totalCount - specialSum;
    if (crewCount < 0) {
      return {
        totalPossibleWorlds: 0,
        roleProbabilities: {},
        gnosiaProbabilities: {},
        enemyProbabilities: {},
        definiteRoles: {},
        hasContradiction: true,
        contradictionReason: "役職の合計人数が参加人数を超えています。",
        sampleWorlds: [],
      };
    }
    targetRoleCounts.CREW = crewCount;

    // 各プレイヤーの候補役職 (Candidate Roles) を事前フィルタリング
    const candidateRoles: Record<string, Set<Role>> = {};
    for (const pid of playerIds) {
      candidateRoles[pid] = new Set<Role>([
        "CREW",
        ...(this.settings.roles.gnosiaCount > 0 ? ["GNOSIA" as Role] : []),
        ...(this.settings.roles.hasEngineer ? ["ENGINEER" as Role] : []),
        ...(this.settings.roles.hasDoctor ? ["DOCTOR" as Role] : []),
        ...(this.settings.roles.hasGuardianAngel
          ? ["GUARDIAN_ANGEL" as Role]
          : []),
        ...(this.settings.roles.hasGuardDuty ? ["GUARD_DUTY" as Role] : []),
        ...(this.settings.roles.hasACFollower ? ["AC_FOLLOWER" as Role] : []),
        ...(this.settings.roles.hasBug ? ["BUG" as Role] : []),
      ]);
    }

    // 視点による自己役職の固定
    if (options.perspectivePlayerId && options.perspectiveRole) {
      if (candidateRoles[options.perspectivePlayerId]) {
        if (
          !candidateRoles[options.perspectivePlayerId].has(
            options.perspectiveRole,
          )
        ) {
          return {
            totalPossibleWorlds: 0,
            roleProbabilities: {},
            gnosiaProbabilities: {},
            enemyProbabilities: {},
            definiteRoles: {},
            hasContradiction: true,
            contradictionReason:
              `視点プレイヤーの役職「${options.perspectiveRole}」は現在のゲーム設定で無効です。`,
            sampleWorlds: [],
          };
        }
        candidateRoles[options.perspectivePlayerId] = new Set([
          options.perspectiveRole,
        ]);
      }
    }

    // イベントが0件の場合の高速パス (計算量 O(N) で即座に正確な確率を算出)
    if (this.events.length === 0) {
      const allRoles: Role[] = [
        "CREW",
        "GNOSIA",
        "ENGINEER",
        "DOCTOR",
        "GUARDIAN_ANGEL",
        "GUARD_DUTY",
        "AC_FOLLOWER",
        "BUG",
      ];

      const roleProbabilities: Record<string, Record<Role, number>> = {};
      const gnosiaProbabilities: Record<string, number> = {};
      const enemyProbabilities: Record<string, number> = {};
      const definiteRoles: Record<string, Role> = {};

      const fixedPid = options.perspectivePlayerId;
      const fixedRole = options.perspectiveRole;

      // 視点プレイヤーで役職が固定されている場合
      if (fixedPid && fixedRole) {
        definiteRoles[fixedPid] = fixedRole;
        const otherPlayerCount = totalCount - 1;
        const remainingCounts = { ...targetRoleCounts };
        remainingCounts[fixedRole] = Math.max(
          0,
          (remainingCounts[fixedRole] || 0) - 1,
        );

        for (const pid of playerIds) {
          roleProbabilities[pid] = {} as Record<Role, number>;
          if (pid === fixedPid) {
            for (const r of allRoles) {
              roleProbabilities[pid][r] = r === fixedRole ? 1.0 : 0.0;
            }
            gnosiaProbabilities[pid] = fixedRole === "GNOSIA" ? 1.0 : 0.0;
            enemyProbabilities[pid] =
              fixedRole === "GNOSIA" || fixedRole === "AC_FOLLOWER" ||
                fixedRole === "BUG"
                ? 1.0
                : 0.0;
          } else {
            for (const r of allRoles) {
              roleProbabilities[pid][r] = otherPlayerCount > 0
                ? (remainingCounts[r] || 0) / otherPlayerCount
                : 0;
            }
            gnosiaProbabilities[pid] = otherPlayerCount > 0
              ? (remainingCounts.GNOSIA || 0) / otherPlayerCount
              : 0;
            enemyProbabilities[pid] = otherPlayerCount > 0
              ? ((remainingCounts.GNOSIA || 0) +
                (remainingCounts.AC_FOLLOWER || 0) +
                (remainingCounts.BUG || 0)) /
                otherPlayerCount
              : 0;
          }
        }
      } else {
        // 全員フラットな客観視点
        for (const pid of playerIds) {
          roleProbabilities[pid] = {} as Record<Role, number>;
          for (const r of allRoles) {
            roleProbabilities[pid][r] = (targetRoleCounts[r] || 0) / totalCount;
          }
          gnosiaProbabilities[pid] = (targetRoleCounts.GNOSIA || 0) /
            totalCount;
          enemyProbabilities[pid] = ((targetRoleCounts.GNOSIA || 0) +
            (targetRoleCounts.AC_FOLLOWER || 0) +
            (targetRoleCounts.BUG || 0)) /
            totalCount;
        }
      }

      // サンプル世界を1つ生成
      const sampleWorld: RoleAssignment = {};
      const rolePool: Role[] = [];
      for (const [r, count] of Object.entries(targetRoleCounts)) {
        for (let i = 0; i < (count || 0); i++) {
          rolePool.push(r as Role);
        }
      }
      if (fixedPid && fixedRole) {
        sampleWorld[fixedPid] = fixedRole;
        const idx = rolePool.indexOf(fixedRole);
        if (idx !== -1) rolePool.splice(idx, 1);
        let pIdx = 0;
        for (const pid of playerIds) {
          if (pid !== fixedPid) {
            sampleWorld[pid] = rolePool[pIdx++];
          }
        }
      } else {
        playerIds.forEach((pid, idx) => {
          sampleWorld[pid] = rolePool[idx];
        });
      }

      // 正確な全組み合わせ数 (多項係数) の計算
      const factorial = (n: number): number => {
        let res = 1;
        for (let i = 2; i <= n; i++) res *= i;
        return res;
      };

      let totalComb = 0;
      if (fixedPid && fixedRole) {
        const remainingCounts = { ...targetRoleCounts };
        remainingCounts[fixedRole] = Math.max(
          0,
          (remainingCounts[fixedRole] || 0) - 1,
        );
        let num = factorial(totalCount - 1);
        let denom = 1;
        for (const count of Object.values(remainingCounts)) {
          denom *= factorial(count || 0);
        }
        totalComb = Math.round(num / denom);
      } else {
        let num = factorial(totalCount);
        let denom = 1;
        for (const count of Object.values(targetRoleCounts)) {
          denom *= factorial(count || 0);
        }
        totalComb = Math.round(num / denom);
      }

      return {
        totalPossibleWorlds: totalComb,
        roleProbabilities,
        gnosiaProbabilities,
        enemyProbabilities,
        definiteRoles,
        hasContradiction: false,
        sampleWorlds: [sampleWorld],
      };
    }

    // イベントの事前反映

    const guardDutyCOs = new Set<string>();
    const engineerCOs = new Set<string>();
    const doctorCOs = new Set<string>();
    const attackedPlayers = new Set<string>();
    const guardedTargetPlayers = new Set<string>();
    let hasNoAttackEvent = false;
    const definiteLiars = new Set<string>();
    const disappearedPlayers = new Set<string>();
    let hasZeroDisappearedEvent = false;
    let hasTwoDisappearedEvent = false;

    for (const ev of this.events) {
      if (ev.type === "CO") {
        if (ev.claimedRole === "GUARD_DUTY") {
          guardDutyCOs.add(ev.playerId);
          if (ev.partnerPlayerId) guardDutyCOs.add(ev.partnerPlayerId);
        }
        if (ev.claimedRole === "ENGINEER") engineerCOs.add(ev.playerId);
        if (ev.claimedRole === "DOCTOR") doctorCOs.add(ev.playerId);
      } else if (ev.type === "DISAPPEARANCE") {
        if (ev.disappearedPlayerIds.length === 0) {
          hasZeroDisappearedEvent = true;
        } else if (ev.disappearedPlayerIds.length === 2) {
          hasTwoDisappearedEvent = true;
          for (const pid of ev.disappearedPlayerIds) {
            disappearedPlayers.add(pid);
          }
        } else {
          for (const pid of ev.disappearedPlayerIds) {
            disappearedPlayers.add(pid);
          }
        }
      } else if (ev.type === "GNOSIA_ATTACK") {
        // グノーシアは仲間を襲撃しないため非グノーシア
        candidateRoles[ev.targetId]?.delete("GNOSIA");
      } else if (ev.type === "ATTACK") {
        disappearedPlayers.add(ev.attackedPlayerId);
      } else if (ev.type === "NO_ATTACK") {
        hasZeroDisappearedEvent = true;
        if (ev.guardedPlayerId) {
          guardedTargetPlayers.add(ev.guardedPlayerId);
        }
      } else if (ev.type === "DEFINITE_LIE") {
        const witnessId = ev.witnessId || "player";
        if (witnessId === "player") {
          definiteLiars.add(ev.targetId);
        }
      }
    }

    // 襲撃なし（犠牲者ゼロ / 平和）の可能性チェック
    if (
      hasZeroDisappearedEvent && !this.settings.roles.hasGuardianAngel &&
      !this.settings.roles.hasBug
    ) {
      return {
        totalPossibleWorlds: 0,
        roleProbabilities: {},
        gnosiaProbabilities: {},
        enemyProbabilities: {},
        definiteRoles: {},
        hasContradiction: true,
        contradictionReason:
          "守護天使もバグも存在しない設定のため、夜間に犠牲者が出ない（平和）状況は発生し得ません。",
        sampleWorlds: [],
      };
    }

    // 一晩に2人消滅の可能性チェック (襲撃死＋バグ調査死)
    if (hasTwoDisappearedEvent && !this.settings.roles.hasBug) {
      return {
        totalPossibleWorlds: 0,
        roleProbabilities: {},
        gnosiaProbabilities: {},
        enemyProbabilities: {},
        definiteRoles: {},
        hasContradiction: true,
        contradictionReason:
          "バグが存在しない設定のため、一晩に2人が消滅することはあり得ません。",
        sampleWorlds: [],
      };
    }

    // グノーシア襲撃対象と消滅者の関係からの事前演繹
    for (const ev of this.events) {
      if (ev.type === "DISAPPEARANCE") {
        const gAttack = this.events.find(
          (e): e is GnosiaAttackEvent =>
            e.type === "GNOSIA_ATTACK" &&
            (e.day === ev.day || e.day === ev.day - 1),
        );
        if (gAttack) {
          const target = gAttack.targetId;
          candidateRoles[target]?.delete("GNOSIA");

          if (
            ev.disappearedPlayerIds.length === 1 &&
            !ev.disappearedPlayerIds.includes(target)
          ) {
            // 襲撃対象と違う人物が1人消滅 -> その消滅者は確実にバグ！
            const bugPid = ev.disappearedPlayerIds[0];
            if (!this.settings.roles.hasBug) {
              return {
                totalPossibleWorlds: 0,
                roleProbabilities: {},
                gnosiaProbabilities: {},
                enemyProbabilities: {},
                definiteRoles: {},
                hasContradiction: true,
                contradictionReason:
                  "襲撃対象と異なる人物が消滅しましたが、バグが存在しない設定です。",
                sampleWorlds: [],
              };
            }
            if (!this.settings.roles.hasGuardianAngel) {
              return {
                totalPossibleWorlds: 0,
                roleProbabilities: {},
                gnosiaProbabilities: {},
                enemyProbabilities: {},
                definiteRoles: {},
                hasContradiction: true,
                contradictionReason:
                  "襲撃対象が生き残りましたが、守護天使が存在しない設定です。",
                sampleWorlds: [],
              };
            }

            // bugPid は BUG 確定
            if (candidateRoles[bugPid]) {
              for (const r of ALL_ROLES) {
                if (r !== "BUG") candidateRoles[bugPid].delete(r);
              }
            }
            for (const pid of playerIds) {
              if (pid !== bugPid) candidateRoles[pid]?.delete("BUG");
            }
            // 襲撃対象はバグではない（守護天使に守られた）
            candidateRoles[target]?.delete("BUG");
          } else if (ev.disappearedPlayerIds.length === 2) {
            if (!ev.disappearedPlayerIds.includes(target)) {
              return {
                totalPossibleWorlds: 0,
                roleProbabilities: {},
                gnosiaProbabilities: {},
                enemyProbabilities: {},
                definiteRoles: {},
                hasContradiction: true,
                contradictionReason:
                  "2人消滅しましたが、どちらもグノーシアの襲撃対象ではありません。",
                sampleWorlds: [],
              };
            }
            // もう片方がバグ確定！
            const bugPid = ev.disappearedPlayerIds.find((p) => p !== target)!;
            if (candidateRoles[bugPid]) {
              for (const r of ALL_ROLES) {
                if (r !== "BUG") candidateRoles[bugPid].delete(r);
              }
            }
            for (const pid of playerIds) {
              if (pid !== bugPid) candidateRoles[pid]?.delete("BUG");
            }
            candidateRoles[target]?.delete("BUG");
          }
        }
      }
    }

    // 消滅したプレイヤーは GNOSIA ではない (襲撃死またはバグ調査死のため)
    for (const pid of disappearedPlayers) {
      if (candidateRoles[pid]) {
        candidateRoles[pid].delete("GNOSIA");
      }
    }

    // 護衛された襲撃対象プレイヤーは GNOSIA ではない
    for (const pid of guardedTargetPlayers) {
      if (candidateRoles[pid]) {
        candidateRoles[pid].delete("GNOSIA");
      }
    }

    // 嘘つき確定者は人間陣営（CREW, ENGINEER, DOCTOR, GUARDIAN_ANGEL, GUARD_DUTY）ではない
    for (const pid of definiteLiars) {
      if (candidateRoles[pid]) {
        candidateRoles[pid].delete("CREW");
        candidateRoles[pid].delete("ENGINEER");
        candidateRoles[pid].delete("DOCTOR");
        candidateRoles[pid].delete("GUARDIAN_ANGEL");
        candidateRoles[pid].delete("GUARD_DUTY");
      }
    }

    // 留守番の制約
    if (this.settings.roles.hasGuardDuty && guardDutyCOs.size > 0) {
      // 留守番COしていないプレイヤーは真留守番にはなれない
      for (const pid of playerIds) {
        if (!guardDutyCOs.has(pid) && candidateRoles[pid]) {
          candidateRoles[pid].delete("GUARD_DUTY");
        }
      }
      // 留守番COしたプレイヤーは、真留守番か敵陣営（GNOSIA, AC, BUG）。一般乗員や他役職は留守番騙りをしない
      for (const pid of guardDutyCOs) {
        if (candidateRoles[pid]) {
          candidateRoles[pid].delete("CREW");
          candidateRoles[pid].delete("ENGINEER");
          candidateRoles[pid].delete("DOCTOR");
          candidateRoles[pid].delete("GUARDIAN_ANGEL");
        }
      }
    }

    // エンジニアCOしたプレイヤーは、真エンジニアか敵陣営（GNOSIA, AC, BUG）
    for (const pid of engineerCOs) {
      if (candidateRoles[pid]) {
        candidateRoles[pid].delete("CREW");
        candidateRoles[pid].delete("DOCTOR");
        candidateRoles[pid].delete("GUARDIAN_ANGEL");
        candidateRoles[pid].delete("GUARD_DUTY");
      }
    }

    // ドクターCOしたプレイヤーは、真ドクターか敵陣営（GNOSIA, AC, BUG）
    for (const pid of doctorCOs) {
      if (candidateRoles[pid]) {
        candidateRoles[pid].delete("CREW");
        candidateRoles[pid].delete("ENGINEER");
        candidateRoles[pid].delete("GUARDIAN_ANGEL");
        candidateRoles[pid].delete("GUARD_DUTY");
      }
    }

    // 視点プレイヤー自身が真エンジニアの場合の調査結果事前反映
    if (
      options.perspectivePlayerId &&
      options.perspectiveRole === "ENGINEER"
    ) {
      for (const ev of this.events) {
        if (
          ev.type === "INVESTIGATION" &&
          ev.investigatorId === options.perspectivePlayerId
        ) {
          if (candidateRoles[ev.targetId]) {
            if (ev.result === "HUMAN") {
              candidateRoles[ev.targetId].delete("GNOSIA");
            } else if (ev.result === "GNOSIA") {
              candidateRoles[ev.targetId] = new Set(["GNOSIA"]);
            }

            // バグ調査消滅の判定:
            // その夜に targetId が消滅していないなら、対象はバグではあり得ない
            const disappearedThatNight = this.events.some(
              (other) =>
                other.type === "ATTACK" &&
                (other.day === ev.day || other.day === ev.day - 1) &&
                other.attackedPlayerId === ev.targetId,
            );
            if (!disappearedThatNight) {
              candidateRoles[ev.targetId].delete("BUG");
            }
          }
        }
      }
    }

    // 潜伏なし設定の場合: COしていないプレイヤーは真ENGINEER/真DOCTORになれない
    if (!this.settings.allowHiddenRoles) {
      if (this.settings.roles.hasEngineer && engineerCOs.size > 0) {
        for (const pid of playerIds) {
          if (!engineerCOs.has(pid) && candidateRoles[pid]) {
            // 視点プレイヤー自身が真エンジニア潜伏と指定している場合を除く
            if (
              options.perspectivePlayerId === pid &&
              options.perspectiveRole === "ENGINEER"
            ) {
              continue;
            }
            candidateRoles[pid].delete("ENGINEER");
          }
        }
      }
      if (this.settings.roles.hasDoctor && doctorCOs.size > 0) {
        for (const pid of playerIds) {
          if (!doctorCOs.has(pid) && candidateRoles[pid]) {
            if (
              options.perspectivePlayerId === pid &&
              options.perspectiveRole === "DOCTOR"
            ) {
              continue;
            }
            candidateRoles[pid].delete("DOCTOR");
          }
        }
      }
    }

    // 候補が0になったプレイヤーがいれば即破綻
    for (const pid of playerIds) {
      if (candidateRoles[pid].size === 0) {
        return {
          totalPossibleWorlds: 0,
          roleProbabilities: {},
          gnosiaProbabilities: {},
          enemyProbabilities: {},
          definiteRoles: {},
          hasContradiction: true,
          contradictionReason:
            `プレイヤー「${pid}」の割り当て可能な役職候補が存在しません。`,
          sampleWorlds: [],
        };
      }
    }

    // --- 対称性縮約 & 高速厳密解エンジン ---
    // イベントや個別制約に関与しているキーパーソン（制約あり）を抽出
    const involvedPlayerIds = new Set<string>();
    if (options.perspectivePlayerId) {
      involvedPlayerIds.add(options.perspectivePlayerId);
    }
    for (const ev of this.events) {
      if (ev.type === "CO") {
        involvedPlayerIds.add(ev.playerId);
        if (ev.partnerPlayerId) involvedPlayerIds.add(ev.partnerPlayerId);
      } else if (ev.type === "INVESTIGATION") {
        involvedPlayerIds.add(ev.investigatorId);
        involvedPlayerIds.add(ev.targetId);
      } else if (ev.type === "DOCTOR_REPORT") {
        involvedPlayerIds.add(ev.reporterId);
        involvedPlayerIds.add(ev.targetId);
      } else if (ev.type === "DEFINITE_LIE") {
        involvedPlayerIds.add(ev.targetId);
        involvedPlayerIds.add(ev.witnessId || "player");
      } else if (ev.type === "DISAPPEARANCE") {
        for (const pid of ev.disappearedPlayerIds) {
          involvedPlayerIds.add(pid);
        }
      } else if (ev.type === "GNOSIA_ATTACK") {
        involvedPlayerIds.add(ev.targetId);
      } else if (ev.type === "ATTACK") {
        involvedPlayerIds.add(ev.attackedPlayerId);
      } else if (ev.type === "NO_ATTACK") {
        if (ev.guardedPlayerId) involvedPlayerIds.add(ev.guardedPlayerId);
      } else if (ev.type === "VOTE") {
        involvedPlayerIds.add(ev.frozenPlayerId);
      }
    }

    // candidateRolesのサイズが最大のグループ（無制約のデフォルト乗員候補）を特定
    let maxCandidateSize = 0;
    for (const pid of playerIds) {
      if (candidateRoles[pid].size > maxCandidateSize) {
        maxCandidateSize = candidateRoles[pid].size;
      }
    }

    const constrainedPlayerIds: string[] = [];
    const unconstrainedPlayerIds: string[] = [];

    for (const pid of playerIds) {
      if (
        involvedPlayerIds.has(pid) ||
        candidateRoles[pid].size < maxCandidateSize
      ) {
        constrainedPlayerIds.push(pid);
      } else {
        unconstrainedPlayerIds.push(pid);
      }
    }

    // 階乗計算
    const factorial = (n: number): number => {
      let res = 1;
      for (let i = 2; i <= n; i++) res *= i;
      return res;
    };

    const allRoles: Role[] = [
      "CREW",
      "GNOSIA",
      "ENGINEER",
      "DOCTOR",
      "GUARDIAN_ANGEL",
      "GUARD_DUTY",
      "AC_FOLLOWER",
      "BUG",
    ];

    let totalWorldsCount = 0;
    const sampleWorlds: RoleAssignment[] = [];

    // 重み付きカウント集計（厳密解）
    const roleWeightedCounts: Record<string, Record<Role, number>> = {};
    const gnosiaWeightedCounts: Record<string, number> = {};
    const enemyWeightedCounts: Record<string, number> = {};

    for (const pid of playerIds) {
      roleWeightedCounts[pid] = {} as Record<Role, number>;
      for (const r of allRoles) {
        roleWeightedCounts[pid][r] = 0;
      }
      gnosiaWeightedCounts[pid] = 0;
      enemyWeightedCounts[pid] = 0;
    }

    const currentAssignment: RoleAssignment = {};
    const remainingRoleCounts = {
      ...(targetRoleCounts as Record<Role, number>),
    };

    // キーパーソンをMRV順にソート
    constrainedPlayerIds.sort(
      (a, b) => candidateRoles[a].size - candidateRoles[b].size,
    );

    const checkEventConsistency = (
      assignment: RoleAssignment,
      isComplete: boolean = false,
    ): boolean => {
      for (const ev of this.events) {
        if (ev.type === "INVESTIGATION") {
          const invRole = assignment[ev.investigatorId];
          const targetRole = assignment[ev.targetId];
          if (invRole === "ENGINEER" && targetRole !== undefined) {
            const isTargetGnosia = targetRole === "GNOSIA";
            if (ev.result === "GNOSIA" && !isTargetGnosia) return false;
            if (ev.result === "HUMAN" && isTargetGnosia) return false;

            // バグ蒸発ルール:
            // 真エンジニアが調査した相手がバグなら、その夜に消滅していなければならない
            if (targetRole === "BUG") {
              const disappearedThatNight = this.events.some(
                (other) =>
                  (other.type === "ATTACK" &&
                    (other.day === ev.day || other.day === ev.day - 1) &&
                    other.attackedPlayerId === ev.targetId) ||
                  (other.type === "DISAPPEARANCE" &&
                    (other.day === ev.day || other.day === ev.day - 1) &&
                    other.disappearedPlayerIds.includes(ev.targetId)),
              );
              if (!disappearedThatNight) return false;
            }
          }
        } else if (ev.type === "DOCTOR_REPORT") {
          const docRole = assignment[ev.reporterId];
          const targetRole = assignment[ev.targetId];
          if (docRole === "DOCTOR" && targetRole !== undefined) {
            const isTargetGnosia = targetRole === "GNOSIA";
            if (ev.result === "GNOSIA" && !isTargetGnosia) return false;
            if (ev.result === "HUMAN" && isTargetGnosia) return false;
          }
        } else if (ev.type === "DEFINITE_LIE") {
          const witnessId = ev.witnessId || "player";
          const liarRole = assignment[ev.targetId];
          if (witnessId === "player") {
            if (liarRole !== undefined && isHumanSide(liarRole)) {
              return false;
            }
          } else {
            const witnessRole = assignment[witnessId];
            if (witnessRole !== undefined && liarRole !== undefined) {
              if (isHumanSide(witnessRole) && isHumanSide(liarRole)) {
                return false;
              }
            }
          }
        } else if (ev.type === "DISAPPEARANCE") {
          // 該当の夜までに死亡（冷凍・消滅）したプレイヤーを抽出
          const deadBefore = new Set<string>();
          for (const other of this.events) {
            if (other === ev) break;
            if (other.type === "VOTE") deadBefore.add(other.frozenPlayerId);
            else if (other.type === "DISAPPEARANCE") {
              for (const pid of other.disappearedPlayerIds) deadBefore.add(pid);
            } else if (other.type === "ATTACK") {
              deadBefore.add(other.attackedPlayerId);
            }
          }

          // 同夜のグノーシア襲撃対象を取得
          const gAttack = this.events.find(
            (e): e is GnosiaAttackEvent =>
              e.type === "GNOSIA_ATTACK" &&
              (e.day === ev.day || e.day === ev.day - 1),
          );

          if (ev.disappearedPlayerIds.length === 0) {
            // 平和（犠牲者ゼロ）
            if (gAttack) {
              const targetRole = assignment[gAttack.targetId];
              if (isComplete) {
                const isTargetBug = targetRole === "BUG";
                let canBeGuardedByGA = false;
                if (this.settings.roles.hasGuardianAngel) {
                  for (const [pid, r] of Object.entries(assignment)) {
                    if (
                      r === "GUARDIAN_ANGEL" && !deadBefore.has(pid) &&
                      pid !== gAttack.targetId
                    ) {
                      canBeGuardedByGA = true;
                      break;
                    }
                  }
                  if (
                    !canBeGuardedByGA &&
                    remainingRoleCounts["GUARDIAN_ANGEL"] > 0
                  ) {
                    canBeGuardedByGA = true;
                  }
                }
                if (!isTargetBug && !canBeGuardedByGA) return false;
              }
            }

            // 平和な夜に真エンジニアがバグを調査していたら消滅が発生するはずなので矛盾
            for (const invEv of this.events) {
              if (
                invEv.type === "INVESTIGATION" &&
                (invEv.day === ev.day || invEv.day === ev.day - 1)
              ) {
                if (
                  assignment[invEv.investigatorId] === "ENGINEER" &&
                  assignment[invEv.targetId] === "BUG"
                ) {
                  return false;
                }
              }
            }
          } else if (ev.disappearedPlayerIds.length === 1) {
            const P = ev.disappearedPlayerIds[0];
            const pRole = assignment[P];
            if (gAttack) {
              const target = gAttack.targetId;
              if (P === target) {
                // 襲撃対象が順当に消滅
                for (const invEv of this.events) {
                  if (
                    invEv.type === "INVESTIGATION" &&
                    (invEv.day === ev.day || invEv.day === ev.day - 1)
                  ) {
                    if (
                      assignment[invEv.investigatorId] === "ENGINEER" &&
                      assignment[invEv.targetId] === "BUG"
                    ) {
                      return false;
                    }
                  }
                }
              } else {
                // 襲撃対象と異なる人物 P が消滅 -> P はバグ確定！
                if (pRole !== undefined && pRole !== "BUG") return false;

                const targetRole = assignment[target];
                if (
                  targetRole !== undefined &&
                  (targetRole === "BUG" || targetRole === "GNOSIA")
                ) {
                  return false;
                }

                if (isComplete) {
                  if (assignment[P] !== "BUG") return false;

                  let canBeGuardedByGA = false;
                  if (this.settings.roles.hasGuardianAngel) {
                    for (const [pid, r] of Object.entries(assignment)) {
                      if (
                        r === "GUARDIAN_ANGEL" && !deadBefore.has(pid) &&
                        pid !== target
                      ) {
                        canBeGuardedByGA = true;
                        break;
                      }
                    }
                    if (
                      !canBeGuardedByGA &&
                      remainingRoleCounts["GUARDIAN_ANGEL"] > 0
                    ) {
                      canBeGuardedByGA = true;
                    }
                  }
                  if (!canBeGuardedByGA) return false;

                  // 真エンジニアが P を調査した世界のみ有効
                  for (const invEv of this.events) {
                    if (
                      invEv.type === "INVESTIGATION" &&
                      (invEv.day === ev.day || invEv.day === ev.day - 1)
                    ) {
                      if (
                        assignment[invEv.investigatorId] === "ENGINEER" &&
                        invEv.targetId !== P
                      ) {
                        return false;
                      }
                    }
                  }
                }
              }
            } else {
              if (pRole !== undefined && pRole !== "BUG") {
                for (const invEv of this.events) {
                  if (
                    invEv.type === "INVESTIGATION" &&
                    (invEv.day === ev.day || invEv.day === ev.day - 1)
                  ) {
                    if (
                      assignment[invEv.investigatorId] === "ENGINEER" &&
                      assignment[invEv.targetId] === "BUG"
                    ) {
                      return false;
                    }
                  }
                }
              }
            }
          } else if (ev.disappearedPlayerIds.length === 2) {
            // 2人消滅: 1人は襲撃死、もう1人はバグ蒸発死
            const [p1, p2] = ev.disappearedPlayerIds;
            const r1 = assignment[p1];
            const r2 = assignment[p2];

            if (r1 !== undefined && r2 !== undefined) {
              const isP1Bug = r1 === "BUG";
              const isP2Bug = r2 === "BUG";
              if (!isP1Bug && !isP2Bug) return false;
              if (isP1Bug && isP2Bug) return false;
            }

            if (isComplete) {
              const isP1Bug = assignment[p1] === "BUG";
              const isP2Bug = assignment[p2] === "BUG";
              if (!isP1Bug && !isP2Bug) return false;
              if (isP1Bug && isP2Bug) return false;

              const bugPid = isP1Bug ? p1 : p2;
              const attackDeadPid = isP1Bug ? p2 : p1;

              if (gAttack && gAttack.targetId !== attackDeadPid) {
                return false;
              }

              for (const invEv of this.events) {
                if (
                  invEv.type === "INVESTIGATION" &&
                  (invEv.day === ev.day || invEv.day === ev.day - 1)
                ) {
                  if (
                    assignment[invEv.investigatorId] === "ENGINEER" &&
                    invEv.targetId !== bugPid
                  ) {
                    return false;
                  }
                }
              }
            }
          }
        } else if (ev.type === "NO_ATTACK") {
          if (ev.guardedPlayerId) {
            const targetRole = assignment[ev.guardedPlayerId];
            if (targetRole === "GNOSIA") return false;
          }
        }
      }
      return true;
    };

    const backtrackConstrained = (index: number) => {
      if (index === constrainedPlayerIds.length) {
        // キーパーソン割り当て完了
        if (!checkEventConsistency(currentAssignment, true)) return;

        // 残りの無制約プレイヤーへの役職プール割り当て（多項係数）
        const unconstrainedCount = unconstrainedPlayerIds.length;
        let weight = 1;

        if (unconstrainedCount > 0) {
          // 残っている役職が、無制約プレイヤーの候補に含まれているかチェック
          const samplePid = unconstrainedPlayerIds[0];
          const allowedCandidates = candidateRoles[samplePid];
          for (const [r, count] of Object.entries(remainingRoleCounts)) {
            if ((count || 0) > 0 && !allowedCandidates.has(r as Role)) {
              return; // unconstrainedプレイヤーがなれない役職が余っているため破綻
            }
          }

          let denom = 1;
          for (const count of Object.values(remainingRoleCounts)) {
            denom *= factorial(count || 0);
          }
          weight = Math.round(factorial(unconstrainedCount) / denom);
          if (weight <= 0) return;
        }

        totalWorldsCount += weight;

        // サンプル世界の生成（上位50件）
        if (sampleWorlds.length < 50) {
          const fullSample = { ...currentAssignment };
          if (unconstrainedCount > 0) {
            const pool: Role[] = [];
            for (const [r, cnt] of Object.entries(remainingRoleCounts)) {
              for (let i = 0; i < (cnt || 0); i++) {
                pool.push(r as Role);
              }
            }
            unconstrainedPlayerIds.forEach((pid, idx) => {
              fullSample[pid] = pool[idx];
            });
          }
          sampleWorlds.push(fullSample);
        }

        // キーパーソンたちの集計
        for (const pid of constrainedPlayerIds) {
          const r = currentAssignment[pid];
          roleWeightedCounts[pid][r] += weight;
          if (r === "GNOSIA") {
            gnosiaWeightedCounts[pid] += weight;
          }
          if (r === "GNOSIA" || r === "AC_FOLLOWER" || r === "BUG") {
            enemyWeightedCounts[pid] += weight;
          }
        }

        // 無制約プレイヤーたちの集計（残りの役職枠を均等配分）
        if (unconstrainedCount > 0) {
          for (const pid of unconstrainedPlayerIds) {
            for (const r of allRoles) {
              const rCount = remainingRoleCounts[r] || 0;
              const probFraction = rCount / unconstrainedCount;
              roleWeightedCounts[pid][r] += probFraction * weight;
              if (r === "GNOSIA") {
                gnosiaWeightedCounts[pid] += probFraction * weight;
              }
              if (r === "GNOSIA" || r === "AC_FOLLOWER" || r === "BUG") {
                enemyWeightedCounts[pid] += probFraction * weight;
              }
            }
          }
        }
        return;
      }

      const pid = constrainedPlayerIds[index];
      const candidates = candidateRoles[pid];

      for (const role of candidates) {
        if ((remainingRoleCounts[role] ?? 0) <= 0) continue;

        currentAssignment[pid] = role;
        remainingRoleCounts[role]--;

        if (checkEventConsistency(currentAssignment)) {
          backtrackConstrained(index + 1);
        }

        delete currentAssignment[pid];
        remainingRoleCounts[role]++;
      }
    };

    backtrackConstrained(0);

    if (totalWorldsCount === 0) {
      return {
        totalPossibleWorlds: 0,
        roleProbabilities: {},
        gnosiaProbabilities: {},
        enemyProbabilities: {},
        definiteRoles: {},
        hasContradiction: true,
        contradictionReason:
          "入力されたイベント条件（調査結果や嘘確定など）を満たす役職の組み合わせが存在しません（破綻）。",
        sampleWorlds: [],
      };
    }

    // 確率計算の正規化
    const roleProbabilities: Record<string, Record<Role, number>> = {};
    const gnosiaProbabilities: Record<string, number> = {};
    const enemyProbabilities: Record<string, number> = {};
    const definiteRoles: Record<string, Role> = {};

    for (const pid of playerIds) {
      roleProbabilities[pid] = {} as Record<Role, number>;
      for (const r of allRoles) {
        const prob = roleWeightedCounts[pid][r] / totalWorldsCount;
        roleProbabilities[pid][r] = prob;
        if (prob >= 0.999999) {
          definiteRoles[pid] = r;
        }
      }
      gnosiaProbabilities[pid] = gnosiaWeightedCounts[pid] / totalWorldsCount;
      enemyProbabilities[pid] = enemyWeightedCounts[pid] / totalWorldsCount;
    }

    return {
      totalPossibleWorlds: totalWorldsCount,
      roleProbabilities,
      gnosiaProbabilities,
      enemyProbabilities,
      definiteRoles,
      hasContradiction: false,
      sampleWorlds,
    };
  }
}
