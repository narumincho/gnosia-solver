import {
  GameEvent,
  GameSettings,
  Role,
  SolverResult,
  RoleAssignment,
} from "../types.ts";

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
        if (!candidateRoles[options.perspectivePlayerId].has(options.perspectiveRole)) {
          return {
            totalPossibleWorlds: 0,
            roleProbabilities: {},
            gnosiaProbabilities: {},
            enemyProbabilities: {},
            definiteRoles: {},
            hasContradiction: true,
            contradictionReason: `視点プレイヤーの役職「${options.perspectiveRole}」は現在のゲーム設定で無効です。`,
            sampleWorlds: [],
          };
        }
        candidateRoles[options.perspectivePlayerId] = new Set([
          options.perspectiveRole,
        ]);
      }
    }

    // イベントの事前反映
    const guardDutyCOs = new Set<string>();
    const engineerCOs = new Set<string>();
    const doctorCOs = new Set<string>();
    const attackedPlayers = new Set<string>();
    const definiteLiars = new Set<string>();

    for (const ev of this.events) {
      if (ev.type === "CO") {
        if (ev.claimedRole === "GUARD_DUTY") guardDutyCOs.add(ev.playerId);
        if (ev.claimedRole === "ENGINEER") engineerCOs.add(ev.playerId);
        if (ev.claimedRole === "DOCTOR") doctorCOs.add(ev.playerId);
      } else if (ev.type === "ATTACK") {
        attackedPlayers.add(ev.attackedPlayerId);
      } else if (ev.type === "DEFINITE_LIE") {
        // 視点フィルタ: witnessId が指定されていて、かつ視点プレイヤーが別人の場合どう扱うか
        // プレイヤー自身が視点の場合で自分以外の目撃で共有されてないなら除外できるが、
        // グノーシアでは「嘘をついている」が全体周知されたイベントとして記録されることが多いため、デフォルトで適用
        definiteLiars.add(ev.targetId);
      }
    }

    // 襲撃されたプレイヤーは GNOSIA ではない
    for (const pid of attackedPlayers) {
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
    if (this.settings.roles.hasGuardDuty) {
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
          contradictionReason: `プレイヤー「${pid}」の割り当て可能な役職候補が存在しません。`,
          sampleWorlds: [],
        };
      }
    }

    // バックトラッキングによる世界探索
    const validWorlds: RoleAssignment[] = [];
    const currentAssignment: RoleAssignment = {};
    const remainingRoleCounts = { ...(targetRoleCounts as Record<Role, number>) };

    // 探索順序: 候補役職数が少ないプレイヤー順 (MRVヒューリスティック)
    const sortedPlayerIds = [...playerIds].sort(
      (a, b) => candidateRoles[a].size - candidateRoles[b].size
    );

    const checkEventConsistency = (assignment: RoleAssignment): boolean => {
      // 役職が確定しているプレイヤー間でのイベント整合性をチェック
      for (const ev of this.events) {
        if (ev.type === "INVESTIGATION") {
          const invRole = assignment[ev.investigatorId];
          const targetRole = assignment[ev.targetId];
          // 調査者が真エンジニアの場合
          if (invRole === "ENGINEER" && targetRole !== undefined) {
            const isTargetGnosia = targetRole === "GNOSIA";
            if (ev.result === "GNOSIA" && !isTargetGnosia) {
              return false; // 真エンジニアが人間/バグをグノーシアと誤報した
            }
            if (ev.result === "HUMAN" && isTargetGnosia) {
              return false; // 真エンジニアがグノーシアを人間と誤報した
            }
          }
        } else if (ev.type === "DOCTOR_REPORT") {
          const docRole = assignment[ev.reporterId];
          const targetRole = assignment[ev.targetId];
          // 報告者が真ドクターの場合
          if (docRole === "DOCTOR" && targetRole !== undefined) {
            const isTargetGnosia = targetRole === "GNOSIA";
            if (ev.result === "GNOSIA" && !isTargetGnosia) {
              return false;
            }
            if (ev.result === "HUMAN" && isTargetGnosia) {
              return false;
            }
          }
        } else if (ev.type === "DEFINITE_LIE") {
          const liarRole = assignment[ev.targetId];
          if (liarRole !== undefined && isHumanSide(liarRole)) {
            return false; // 人間陣営が嘘をつくことはない
          }
        }
      }
      return true;
    };

    const backtrack = (index: number) => {
      if (index === sortedPlayerIds.length) {
        // 全員割り当て完了。最終整合性チェック
        if (checkEventConsistency(currentAssignment)) {
          validWorlds.push({ ...currentAssignment });
        }
        return;
      }

      const pid = sortedPlayerIds[index];
      const candidates = candidateRoles[pid];

      for (const role of candidates) {
        if ((remainingRoleCounts[role] ?? 0) <= 0) continue;

        currentAssignment[pid] = role;
        remainingRoleCounts[role]--;

        // 途中チェック（枝刈り）
        if (checkEventConsistency(currentAssignment)) {
          backtrack(index + 1);
        }

        delete currentAssignment[pid];
        remainingRoleCounts[role]++;
      }
    };

    backtrack(0);

    const totalWorlds = validWorlds.length;
    if (totalWorlds === 0) {
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

    // 確率計算の集計
    const roleProbabilities: Record<string, Record<Role, number>> = {};
    const gnosiaProbabilities: Record<string, number> = {};
    const enemyProbabilities: Record<string, number> = {};
    const definiteRoles: Record<string, Role> = {};

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

    for (const pid of playerIds) {
      roleProbabilities[pid] = {} as Record<Role, number>;
      for (const r of allRoles) {
        roleProbabilities[pid][r] = 0;
      }
      gnosiaProbabilities[pid] = 0;
      enemyProbabilities[pid] = 0;
    }

    for (const world of validWorlds) {
      for (const pid of playerIds) {
        const role = world[pid];
        roleProbabilities[pid][role] = (roleProbabilities[pid][role] || 0) + 1;
        if (role === "GNOSIA") {
          gnosiaProbabilities[pid]++;
        }
        if (role === "GNOSIA" || role === "AC_FOLLOWER" || role === "BUG") {
          enemyProbabilities[pid]++;
        }
      }
    }

    for (const pid of playerIds) {
      for (const r of allRoles) {
        roleProbabilities[pid][r] /= totalWorlds;
        if (roleProbabilities[pid][r] === 1) {
          definiteRoles[pid] = r;
        }
      }
      gnosiaProbabilities[pid] /= totalWorlds;
      enemyProbabilities[pid] /= totalWorlds;
    }

    return {
      totalPossibleWorlds: totalWorlds,
      roleProbabilities,
      gnosiaProbabilities,
      enemyProbabilities,
      definiteRoles,
      hasContradiction: false,
      sampleWorlds: validWorlds.slice(0, 50),
    };
  }
}
