export const TEST_TIME_FACTOR_ENV = "TEST_TIME_FACTOR";
export const FINAL_TEST_TIMEOUT_ENV = "AMADEUS_TEST_TIMEOUT";

type TestTimeEnvironment = Readonly<Record<string, string | undefined>>;

function parseFactor(raw: string, source: string): number {
  const factor = raw.trim() === "" ? Number.NaN : Number(raw);
  if (!Number.isFinite(factor) || factor < 1) {
    throw new Error(`${source} must be a finite number greater than or equal to 1 (got: '${raw}')`);
  }
  return factor;
}

/** Resolve the load-sensitive test-time multiplier. Only absence defaults to one. */
export function resolveTestTimeFactor(env: TestTimeEnvironment = process.env): number {
  const raw = env[TEST_TIME_FACTOR_ENV];
  return raw === undefined ? 1 : parseFactor(raw, TEST_TIME_FACTOR_ENV);
}

/** Resolve a live-test final override in seconds without applying TEST_TIME_FACTOR. */
export function resolveFinalTestTimeoutMs(
  defaultSeconds: number,
  env: TestTimeEnvironment = process.env,
): number {
  if (!Number.isSafeInteger(defaultSeconds) || defaultSeconds <= 0) {
    throw new Error(`defaultSeconds must be a positive safe integer (got: ${defaultSeconds})`);
  }
  const raw = env[FINAL_TEST_TIMEOUT_ENV];
  // Strict: Number.parseInt would read "0abc" as 0 and silently disable the
  // timeout, so a malformed override must fail instead of degrading.
  if (raw !== undefined && !/^\d+$/.test(raw.trim())) {
    throw new Error(
      `${FINAL_TEST_TIMEOUT_ENV} must be a non-negative integer number of seconds (got: '${raw}')`,
    );
  }
  const seconds = raw === undefined ? defaultSeconds : Number.parseInt(raw.trim(), 10);
  const timeoutMs = seconds * 1000;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 0) {
    throw new Error(`${FINAL_TEST_TIMEOUT_ENV} must resolve to a non-negative safe millisecond value`);
  }
  return timeoutMs;
}

/** Scale a millisecond baseline without allowing truncation or numeric overflow. */
export function scaleTestTime(
  baseMs: number,
  factor: number = resolveTestTimeFactor(),
): number {
  if (!Number.isSafeInteger(baseMs) || baseMs <= 0) {
    throw new Error(`baseMs must be a positive safe integer (got: ${baseMs})`);
  }
  if (!Number.isFinite(factor) || factor < 1) {
    throw new Error(`test time factor must be finite and greater than or equal to 1 (got: ${factor})`);
  }

  const scaled = Math.ceil(baseMs * factor);
  if (!Number.isSafeInteger(scaled) || scaled <= 0) {
    throw new Error(`scaled test time must be a positive safe integer (baseMs: ${baseMs}, factor: ${factor})`);
  }
  return scaled;
}
