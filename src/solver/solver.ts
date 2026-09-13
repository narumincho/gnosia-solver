import {
  GameEvent,
  GameSettings,
  GnosiaAttackEvent,
  Role,
  RoleAssignment,
  SolverResult,
} from "../types.ts";

export const ALL_ROLES: ReadonlyArray<Role> = [
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
  perspectivePlayerId?: string | undefined; // 視点プレイヤー (指定なし = 客観・神視点)
  perspectiveRole?: Role | undefined; // 視点プレイヤーの役職固定
  gnosiaComrades?: ReadonlyArray<string> | undefined; // 仲間グノーシアのプレイヤーID配列 (自分がグノーシアの時)
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
  private events: ReadonlyArray<GameEvent>;

  constructor(settings: GameSettings, events: ReadonlyArray<GameEvent>) {
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

    // 設定役職数の集計
    const targetRoleCounts: Record<Role, number> = {
      CREW: 0,
      GNOSIA: this.settings.roles.gnosiaCount,
      ENGINEER: this.settings.roles.hasEngineer ? 1 : 0,
      DOCTOR: this.settings.roles.hasDoctor ? 1 : 0,
      GUARDIAN_ANGEL: this.settings.roles.hasGuardianAngel ? 1 : 0,
      GUARD_DUTY: this.settings.roles.hasGuardDuty ? 2 : 0,
      AC_FOLLOWER: this.settings.roles.hasACFollower ? 1 : 0,
      BUG: this.settings.roles.hasBug ? 1 : 0,
    };

    let specialRolesCount = 0;
    for (
      const [r, count] of Object.entries(targetRoleCounts) as ReadonlyArray<
        [Role, number]
      >
    ) {
      if (r !== "CREW") {
        specialRolesCount += count;
      }
    }
    const crewCount = totalCount - specialRolesCount;
    if (crewCount < 0) {
      return {
        totalPossibleWorlds: 0,
        roleProbabilities: {},
        gnosiaProbabilities: {},
        enemyProbabilities: {},
        definiteRoles: {},
        hasContradiction: true,
        contradictionReason:
          "役職の合計人数が参加プレイヤー数を超過しています。",
        sampleWorlds: [],
      };
    }
    targetRoleCounts.CREW = crewCount;

    // 各プレイヤーの候補役職 (Candidate Roles) を事前フィルタリング
    const candidateRoles = new Map<string, Set<Role>>();
    for (const pid of playerIds) {
      candidateRoles.set(
        pid,
        new Set<Role>([
          "CREW",
          ...(this.settings.roles.gnosiaCount > 0 ? ["GNOSIA" as const] : []),
          ...(this.settings.roles.hasEngineer ? ["ENGINEER" as const] : []),
          ...(this.settings.roles.hasDoctor ? ["DOCTOR" as const] : []),
          ...(this.settings.roles.hasGuardianAngel
            ? ["GUARDIAN_ANGEL" as const]
            : []),
          ...(this.settings.roles.hasGuardDuty ? ["GUARD_DUTY" as const] : []),
          ...(this.settings.roles.hasACFollower
            ? ["AC_FOLLOWER" as const]
            : []),
          ...(this.settings.roles.hasBug ? ["BUG" as const] : []),
        ]),
      );
    }

    // 視点による自己役職の固定
    if (options.perspectivePlayerId && options.perspectiveRole) {
      const pCandidates = candidateRoles.get(options.perspectivePlayerId);
      if (pCandidates) {
        if (!pCandidates.has(options.perspectiveRole)) {
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
        candidateRoles.set(
          options.perspectivePlayerId,
          new Set([options.perspectiveRole]),
        );
      }
    }

    // 視点による仲間グノーシアの固定（自分がグノーシア視点の場合）
    if (
      options.perspectiveRole === "GNOSIA" &&
      options.gnosiaComrades &&
      options.gnosiaComrades.length > 0
    ) {
      for (const cid of options.gnosiaComrades) {
        if (cid === options.perspectivePlayerId) continue;
        const cCandidates = candidateRoles.get(cid);
        if (cCandidates) {
          if (!cCandidates.has("GNOSIA")) {
            return {
              totalPossibleWorlds: 0,
              roleProbabilities: {},
              gnosiaProbabilities: {},
              enemyProbabilities: {},
              definiteRoles: {},
              hasContradiction: true,
              contradictionReason: `仲間グノーシアに指定された「${
                players.find((p) => p.id === cid)?.name || cid
              }」は過去のイベントから非グノーシア確定しているため破綻します。`,
              sampleWorlds: [],
            };
          }
          candidateRoles.set(cid, new Set(["GNOSIA"]));
        }
      }

      // 自分を含めてグノーシア枠がすべて確定している場合、他プレイヤーからGNOSIAを除外
      const comrades = options.gnosiaComrades.filter((id) =>
        id !== options.perspectivePlayerId
      );
      const confirmedGnosiaCount = 1 + comrades.length;
      if (confirmedGnosiaCount >= targetRoleCounts.GNOSIA) {
        const gnosiaSet = new Set([
          options.perspectivePlayerId,
          ...comrades,
        ]);
        for (const pid of playerIds) {
          if (!gnosiaSet.has(pid)) {
            candidateRoles.get(pid)?.delete("GNOSIA");
          }
        }
      }
    }

    // イベントが0件の場合の高速パス (仲間指定もない場合のみ)
    if (
      this.events.length === 0 &&
      (!options.gnosiaComrades || options.gnosiaComrades.length === 0)
    ) {
      const allRoles: ReadonlyArray<Role> = [
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
          remainingCounts[fixedRole] - 1,
        );

        for (const pid of playerIds) {
          const probs = {} as Record<Role, number>;
          roleProbabilities[pid] = probs;
          if (pid === fixedPid) {
            for (const r of allRoles) {
              probs[r] = r === fixedRole ? 1.0 : 0.0;
            }
            gnosiaProbabilities[pid] = fixedRole === "GNOSIA" ? 1.0 : 0.0;
            enemyProbabilities[pid] =
              fixedRole === "GNOSIA" || fixedRole === "AC_FOLLOWER" ||
                fixedRole === "BUG"
                ? 1.0
                : 0.0;
          } else {
            for (const r of allRoles) {
              probs[r] = otherPlayerCount > 0
                ? remainingCounts[r] / otherPlayerCount
                : 0;
            }
            gnosiaProbabilities[pid] = otherPlayerCount > 0
              ? remainingCounts.GNOSIA / otherPlayerCount
              : 0;
            enemyProbabilities[pid] = otherPlayerCount > 0
              ? (remainingCounts.GNOSIA +
                remainingCounts.AC_FOLLOWER +
                remainingCounts.BUG) /
                otherPlayerCount
              : 0;
          }
        }
      } else {
        // 全員フラットな客観視点
        for (const pid of playerIds) {
          const probs = {} as Record<Role, number>;
          roleProbabilities[pid] = probs;
          for (const r of allRoles) {
            probs[r] = targetRoleCounts[r] / totalCount;
          }
          gnosiaProbabilities[pid] = targetRoleCounts.GNOSIA /
            totalCount;
          enemyProbabilities[pid] = (targetRoleCounts.GNOSIA +
            targetRoleCounts.AC_FOLLOWER +
            targetRoleCounts.BUG) /
            totalCount;
        }
      }

      // サンプル世界を1つ生成
      const sampleWorld: RoleAssignment = {};
      const rolePool: Array<Role> = [];
      for (
        const [r, count] of Object.entries(targetRoleCounts) as ReadonlyArray<
          [Role, number]
        >
      ) {
        for (let i = 0; i < count; i++) {
          rolePool.push(r);
        }
      }
      if (fixedPid && fixedRole) {
        sampleWorld[fixedPid] = fixedRole;
        const idx = rolePool.indexOf(fixedRole);
        if (idx !== -1) rolePool.splice(idx, 1);
        let pIdx = 0;
        for (const pid of playerIds) {
          if (pid !== fixedPid) {
            const r = rolePool[pIdx++];
            if (r) {
              sampleWorld[pid] = r;
            }
          }
        }
      } else {
        let pIdx = 0;
        for (const pid of playerIds) {
          const r = rolePool[pIdx++];
          if (r) {
            sampleWorld[pid] = r;
          }
        }
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
          remainingCounts[fixedRole] - 1,
        );
        const num = factorial(totalCount - 1);
        let denom = 1;
        for (const count of Object.values(remainingCounts)) {
          denom *= factorial(count);
        }
        totalComb = Math.round(num / denom);
      } else {
        const num = factorial(totalCount);
        let denom = 1;
        for (const count of Object.values(targetRoleCounts)) {
          denom *= factorial(count);
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
    const guardedTargetPlayers = new Set<string>();
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
        candidateRoles.get(ev.targetId)?.delete("GNOSIA");
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
          candidateRoles.get(target)?.delete("GNOSIA");

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
            if (bugPid) {
              const bugCandidates = candidateRoles.get(bugPid);
              if (bugCandidates) {
                for (const r of ALL_ROLES) {
                  if (r !== "BUG") bugCandidates.delete(r);
                }
              }
              for (const pid of playerIds) {
                if (pid !== bugPid) candidateRoles.get(pid)?.delete("BUG");
              }
            }
            // 襲撃対象はバグではない（守護天使に守られた）
            candidateRoles.get(target)?.delete("BUG");
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
            const bugPid = ev.disappearedPlayerIds.find((p) => p !== target);
            if (bugPid) {
              const bugCandidates = candidateRoles.get(bugPid);
              if (bugCandidates) {
                for (const r of ALL_ROLES) {
                  if (r !== "BUG") bugCandidates.delete(r);
                }
              }
              for (const pid of playerIds) {
                if (pid !== bugPid) candidateRoles.get(pid)?.delete("BUG");
              }
            }
            candidateRoles.get(target)?.delete("BUG");
          }
        }
      }
    }

    // 消滅したプレイヤーは GNOSIA ではない (襲撃死またはバグ調査死のため)
    for (const pid of disappearedPlayers) {
      candidateRoles.get(pid)?.delete("GNOSIA");
    }

    // 護衛された襲撃対象プレイヤーは GNOSIA ではない
    for (const pid of guardedTargetPlayers) {
      candidateRoles.get(pid)?.delete("GNOSIA");
    }

    // 嘘つき確定者は人間陣営（CREW, ENGINEER, DOCTOR, GUARDIAN_ANGEL, GUARD_DUTY）ではない
    for (const pid of definiteLiars) {
      const c = candidateRoles.get(pid);
      if (c) {
        c.delete("CREW");
        c.delete("ENGINEER");
        c.delete("DOCTOR");
        c.delete("GUARDIAN_ANGEL");
        c.delete("GUARD_DUTY");
      }
    }

    // 留守番の制約
    if (this.settings.roles.hasGuardDuty && guardDutyCOs.size > 0) {
      // 留守番COしていないプレイヤーは真留守番にはなれない
      for (const pid of playerIds) {
        if (!guardDutyCOs.has(pid)) {
          candidateRoles.get(pid)?.delete("GUARD_DUTY");
        }
      }
      // 留守番COしたプレイヤーは、真留守番か敵陣営（GNOSIA, AC, BUG）。一般乗員や他役職は留守番騙りをしない
      for (const pid of guardDutyCOs) {
        const c = candidateRoles.get(pid);
        if (c) {
          c.delete("CREW");
          c.delete("ENGINEER");
          c.delete("DOCTOR");
          c.delete("GUARDIAN_ANGEL");
        }
      }
    }

    // エンジニアCOしたプレイヤーは、真エンジニアか敵陣営（GNOSIA, AC, BUG）
    for (const pid of engineerCOs) {
      const c = candidateRoles.get(pid);
      if (c) {
        c.delete("CREW");
        c.delete("DOCTOR");
        c.delete("GUARDIAN_ANGEL");
        c.delete("GUARD_DUTY");
      }
    }

    // ドクターCOしたプレイヤーは、真ドクターか敵陣営（GNOSIA, AC, BUG）
    for (const pid of doctorCOs) {
      const c = candidateRoles.get(pid);
      if (c) {
        c.delete("CREW");
        c.delete("ENGINEER");
        c.delete("GUARDIAN_ANGEL");
        c.delete("GUARD_DUTY");
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
          const targetCandidates = candidateRoles.get(ev.targetId);
          if (targetCandidates) {
            if (ev.result === "HUMAN") {
              targetCandidates.delete("GNOSIA");
            } else if (ev.result === "GNOSIA") {
              candidateRoles.set(ev.targetId, new Set(["GNOSIA"]));
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
              targetCandidates.delete("BUG");
            }
          }
        }
      }
    }

    // 潜伏なし設定の場合: COしていないプレイヤーは真ENGINEER/真DOCTORになれない
    if (!this.settings.allowHiddenRoles) {
      if (this.settings.roles.hasEngineer && engineerCOs.size > 0) {
        for (const pid of playerIds) {
          if (!engineerCOs.has(pid)) {
            // 視点プレイヤー自身が真エンジニア潜伏と指定している場合を除く
            if (
              options.perspectivePlayerId === pid &&
              options.perspectiveRole === "ENGINEER"
            ) {
              continue;
            }
            candidateRoles.get(pid)?.delete("ENGINEER");
          }
        }
      }
      if (this.settings.roles.hasDoctor && doctorCOs.size > 0) {
        for (const pid of playerIds) {
          if (!doctorCOs.has(pid)) {
            if (
              options.perspectivePlayerId === pid &&
              options.perspectiveRole === "DOCTOR"
            ) {
              continue;
            }
            candidateRoles.get(pid)?.delete("DOCTOR");
          }
        }
      }
    }

    // 候補が0になったプレイヤーがいれば即破綻
    for (const pid of playerIds) {
      const count = candidateRoles.get(pid)?.size ?? 0;
      if (count === 0) {
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
    if (options.gnosiaComrades) {
      for (const cid of options.gnosiaComrades) {
        involvedPlayerIds.add(cid);
      }
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
      const size = candidateRoles.get(pid)?.size ?? 0;
      if (size > maxCandidateSize) {
        maxCandidateSize = size;
      }
    }

    const constrainedPlayerIds: Array<string> = [];
    const unconstrainedPlayerIds: Array<string> = [];

    for (const pid of playerIds) {
      const size = candidateRoles.get(pid)?.size ?? 0;
      if (
        involvedPlayerIds.has(pid) ||
        size < maxCandidateSize
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

    const allRoles: ReadonlyArray<Role> = [
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
    const sampleWorlds: Array<RoleAssignment> = [];

    // 重み付きカウント集計（厳密解）
    const roleWeightedCounts: Record<string, Record<Role, number>> = {};
    const gnosiaWeightedCounts: Record<string, number> = {};
    const enemyWeightedCounts: Record<string, number> = {};

    for (const pid of playerIds) {
      const counts = {} as Record<Role, number>;
      roleWeightedCounts[pid] = counts;
      for (const r of allRoles) {
        counts[r] = 0;
      }
      gnosiaWeightedCounts[pid] = 0;
      enemyWeightedCounts[pid] = 0;
    }

    const currentAssignment: RoleAssignment = {};
    const remainingRoleCounts: Record<Role, number> = {
      ...targetRoleCounts,
    };

    // キーパーソンをMRV順にソート
    constrainedPlayerIds.sort(
      (a, b) =>
        (candidateRoles.get(a)?.size ?? 0) - (candidateRoles.get(b)?.size ?? 0),
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
            if (P === undefined) return false;
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
            if (p1 === undefined || p2 === undefined) return false;
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
          const allowedCandidates = samplePid !== undefined
            ? candidateRoles.get(samplePid)
            : undefined;
          if (allowedCandidates) {
            for (
              const [r, count] of Object.entries(
                remainingRoleCounts,
              ) as ReadonlyArray<[Role, number]>
            ) {
              if (count > 0 && !allowedCandidates.has(r)) {
                return; // unconstrainedプレイヤーがなれない役職が余っているため破綻
              }
            }
          }

          let denom = 1;
          for (const count of Object.values(remainingRoleCounts)) {
            denom *= factorial(count);
          }
          weight = Math.round(factorial(unconstrainedCount) / denom);
          if (weight <= 0) return;
        }

        totalWorldsCount += weight;

        // サンプル世界の生成（上位50件）
        if (sampleWorlds.length < 50) {
          const fullSample = { ...currentAssignment };
          if (unconstrainedCount > 0) {
            const pool: Array<Role> = [];
            for (
              const [r, cnt] of Object.entries(
                remainingRoleCounts,
              ) as ReadonlyArray<[Role, number]>
            ) {
              for (let i = 0; i < cnt; i++) {
                pool.push(r);
              }
            }
            unconstrainedPlayerIds.forEach((pid, idx) => {
              const r = pool[idx];
              if (r) {
                fullSample[pid] = r;
              }
            });
          }
          sampleWorlds.push(fullSample);
        }

        // キーパーソンたちの集計
        for (const pid of constrainedPlayerIds) {
          const r = currentAssignment[pid];
          if (r) {
            const roleMap = roleWeightedCounts[pid];
            if (roleMap) {
              roleMap[r] = (roleMap[r] ?? 0) + weight;
            }
            if (r === "GNOSIA") {
              gnosiaWeightedCounts[pid] = (gnosiaWeightedCounts[pid] ?? 0) +
                weight;
            }
            if (r === "GNOSIA" || r === "AC_FOLLOWER" || r === "BUG") {
              enemyWeightedCounts[pid] = (enemyWeightedCounts[pid] ?? 0) +
                weight;
            }
          }
        }

        // 無制約プレイヤーたちの集計（残りの役職枠を均等配分）
        if (unconstrainedCount > 0) {
          for (const pid of unconstrainedPlayerIds) {
            const roleMap = roleWeightedCounts[pid];
            for (const r of allRoles) {
              const rCount = remainingRoleCounts[r];
              const probFraction = rCount / unconstrainedCount;
              if (roleMap) {
                roleMap[r] = (roleMap[r] ?? 0) + probFraction * weight;
              }
              if (r === "GNOSIA") {
                gnosiaWeightedCounts[pid] = (gnosiaWeightedCounts[pid] ?? 0) +
                  probFraction * weight;
              }
              if (r === "GNOSIA" || r === "AC_FOLLOWER" || r === "BUG") {
                enemyWeightedCounts[pid] = (enemyWeightedCounts[pid] ?? 0) +
                  probFraction * weight;
              }
            }
          }
        }
        return;
      }

      const pid = constrainedPlayerIds[index];
      if (pid === undefined) return;
      const candidates = candidateRoles.get(pid);
      if (!candidates) return;

      for (const role of candidates) {
        if (remainingRoleCounts[role] <= 0) continue;

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
      const probs = {} as Record<Role, number>;
      roleProbabilities[pid] = probs;
      const roleCounts = roleWeightedCounts[pid];
      for (const r of allRoles) {
        const prob = (roleCounts?.[r] ?? 0) / totalWorldsCount;
        probs[r] = prob;
        if (prob >= 0.999999) {
          definiteRoles[pid] = r;
        }
      }
      gnosiaProbabilities[pid] = (gnosiaWeightedCounts[pid] ?? 0) /
        totalWorldsCount;
      enemyProbabilities[pid] = (enemyWeightedCounts[pid] ?? 0) /
        totalWorldsCount;
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
