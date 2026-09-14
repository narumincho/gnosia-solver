import { SampleSession } from "./sample_sessions/common.ts";
import { FULL_MATCH_1_SESSION } from "./sample_sessions/fullMatch1.ts";
import { FULL_MATCH_3_SESSION } from "./sample_sessions/fullMatch3.ts";
import { SCENARIO_SESSIONS } from "./sample_sessions/scenarioSessions.ts";

export type { SampleSession };

export const SAMPLE_SESSIONS: ReadonlyArray<SampleSession> = [
  FULL_MATCH_1_SESSION,
  ...SCENARIO_SESSIONS,
  FULL_MATCH_3_SESSION,
];
