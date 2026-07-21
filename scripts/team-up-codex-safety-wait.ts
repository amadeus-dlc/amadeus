export type SafetyWaitSnapshot = {
  herdrVersion: string;
  codexVersion: string;
  columns: number;
  rows: number;
  visibleText: string;
};

export type SafetyWaitFingerprint = SafetyWaitSnapshot & {
  schemaVersion: 1;
  id: string;
  modalTitle: string;
};

export type FingerprintDecision =
  | { kind: "matched"; fingerprintId: string }
  | { kind: "no-input"; reason: "unsupported-fingerprint" };

export type PostSendVisibleState = "modal-present" | "confirmed-absent" | "unknown";

export type SafetyWaitPane = {
  session: string;
  role: string;
  paneId: string;
  columns: number;
  rows: number;
};

export type SafetyWaitAdapter = {
  versions(): Promise<{ herdrVersion: string; codexVersion: string }>;
  resolve(role: string): Promise<readonly SafetyWaitPane[]>;
  readVisible(paneId: string): Promise<string>;
  sendEnter(paneId: string): Promise<void>;
  now(): number;
};

export type SafetyWaitCommandRunner = (
  command: string,
  args: readonly string[],
) => Promise<{ exitCode: number; stdout: string }>;

export type SafetyWaitPollResult =
  | { kind: "sent"; paneId: string }
  | { kind: "sent-unconfirmed"; paneId: string }
  | {
      kind: "no-input";
      reason:
        | "role-not-unique"
        | "unsupported-fingerprint"
        | "unstable-fingerprint"
        | "identity-changed"
        | "version-changed"
        | "transaction-expired"
        | "already-latched"
        | "adapter-failure";
    };

export type SafetyWaitRunIdentity = {
  expectedRun: string;
  expectedSession: string;
  runRecord: string;
  recordedSession: string;
  recordedRuntime: string;
  recordedStatus: string;
};

const PRODUCTION_FINGERPRINTS: readonly SafetyWaitFingerprint[] = Object.freeze([
  Object.freeze({
    schemaVersion: 1,
    id: "natural-20260721T100145Z",
    modalTitle: "Additional safety checks",
    herdrVersion: "0.7.1",
    codexVersion: "codex-cli 0.144.6",
    columns: 120,
    rows: 34,
    visibleText: [
      "Additional safety checks",
      "This request requires additional safety checks, which can take extra time.",
      "› 1. Keep waiting",
      "  2. Learn more",
      "Press enter to confirm or esc to go back",
    ].join("\n"),
  }),
]);

const PRODUCTION_CONFIRMED_ABSENT_VISIBLE_TEXTS: readonly string[] = Object.freeze([]);

export function productionActivationEnabled(): boolean {
  return PRODUCTION_FINGERPRINTS.length > 0;
}

export function roleToAgentLabel(role: string): string | null {
  if (role === "leader") return "leader";
  const match = /^e([1-6])$/.exec(role);
  return match === null ? null : `engineer-${match[1]}`;
}

export function safetyWaitRunIsActive(identity: SafetyWaitRunIdentity): boolean {
  const normalizedRecord = identity.runRecord.replace(/\/+$/, "");
  const recordName = normalizedRecord.slice(normalizedRecord.lastIndexOf("/") + 1);
  return (
    recordName === identity.expectedRun &&
    identity.recordedSession === identity.expectedSession &&
    identity.recordedRuntime === "codex" &&
    (identity.recordedStatus === "launching" || identity.recordedStatus === "running")
  );
}

function normalizeLineEndings(value: string): string {
  return value.replaceAll("\r\n", "\n");
}

const FINGERPRINT_KEYS = [
  "schemaVersion",
  "id",
  "modalTitle",
  "herdrVersion",
  "codexVersion",
  "columns",
  "rows",
  "visibleText",
] as const;

function hasExactFingerprintKeys(record: Record<string, unknown>): boolean {
  const keys = Object.keys(record);
  return (
    keys.length === FINGERPRINT_KEYS.length &&
    FINGERPRINT_KEYS.every((key) => key in record)
  );
}

export function parseSafetyWaitFingerprint(raw: unknown): SafetyWaitFingerprint | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  if (!hasExactFingerprintKeys(record)) return null;
  const stringFields = [record.id, record.modalTitle, record.herdrVersion, record.codexVersion];
  if (!stringFields.every((value) => typeof value === "string" && value.length > 0)) {
    return null;
  }
  if (
    record.schemaVersion !== 1 ||
    typeof record.columns !== "number" ||
    !Number.isInteger(record.columns) ||
    record.columns <= 0 ||
    typeof record.rows !== "number" ||
    !Number.isInteger(record.rows) ||
    record.rows <= 0 ||
    typeof record.visibleText !== "string" ||
    !normalizeLineEndings(record.visibleText)
      .split("\n")
      .includes(record.modalTitle as string)
  ) {
    return null;
  }
  return record as SafetyWaitFingerprint;
}

export function evaluateFingerprint(
  snapshot: SafetyWaitSnapshot,
  supportedFingerprints: readonly SafetyWaitFingerprint[],
): FingerprintDecision {
  const match = supportedFingerprints.find(
    (fingerprint) =>
      fingerprint.herdrVersion === snapshot.herdrVersion &&
      fingerprint.codexVersion === snapshot.codexVersion &&
      fingerprint.columns === snapshot.columns &&
      fingerprint.rows === snapshot.rows &&
      normalizeLineEndings(fingerprint.visibleText) ===
        normalizeLineEndings(snapshot.visibleText),
  );
  return match === undefined
    ? { kind: "no-input", reason: "unsupported-fingerprint" }
    : { kind: "matched", fingerprintId: match.id };
}

export function evaluateProductionFingerprint(
  snapshot: SafetyWaitSnapshot,
): FingerprintDecision {
  return evaluateFingerprint(snapshot, PRODUCTION_FINGERPRINTS);
}

function postSendResult(
  paneId: string,
  visibleText: string,
  fingerprints: readonly SafetyWaitFingerprint[],
  confirmedAbsentVisibleTexts: readonly string[],
  elapsedMs: number,
  ttlMs: number,
): SafetyWaitPollResult {
  const state = classifyPostSendVisible(
    visibleText,
    fingerprints,
    confirmedAbsentVisibleTexts,
  );
  const unconfirmed = elapsedMs > ttlMs || state !== "confirmed-absent";
  return unconfirmed ? { kind: "sent-unconfirmed", paneId } : { kind: "sent", paneId };
}

export function classifyPostSendVisible(
  visibleText: string,
  fingerprints: readonly SafetyWaitFingerprint[],
  confirmedAbsentVisibleTexts: readonly string[],
): PostSendVisibleState {
  const normalized = normalizeLineEndings(visibleText);
  if (
    fingerprints.some(
      (fingerprint) => normalizeLineEndings(fingerprint.visibleText) === normalized,
    )
  ) {
    return "modal-present";
  }
  if (
    confirmedAbsentVisibleTexts.some(
      (confirmedAbsent) => normalizeLineEndings(confirmedAbsent) === normalized,
    )
  ) {
    return "confirmed-absent";
  }
  return "unknown";
}

async function runCommand(
  command: string,
  args: readonly string[],
): Promise<{ exitCode: number; stdout: string }> {
  const process = Bun.spawn([command, ...args], { stdout: "pipe", stderr: "pipe" });
  const [exitCode, stdout] = await Promise.all([
    process.exited,
    new Response(process.stdout).text(),
  ]);
  return { exitCode, stdout };
}

function parseJsonObject(stdout: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(stdout);
  if (typeof parsed !== "object" || parsed === null) throw new Error("invalid Herdr JSON");
  return parsed as Record<string, unknown>;
}

export class HerdrSafetyWaitAdapter implements SafetyWaitAdapter {
  private readonly run: SafetyWaitCommandRunner;

  constructor(
    private readonly config: {
      session: string;
      herdrCommand?: string;
      codexCommand?: string;
      run?: SafetyWaitCommandRunner;
    },
  ) {
    this.run = config.run ?? runCommand;
  }

  private async command(command: string, args: readonly string[]): Promise<string> {
    const result = await this.run(command, args);
    if (result.exitCode !== 0) throw new Error(`command failed: ${command}`);
    return result.stdout;
  }

  async versions(): Promise<{ herdrVersion: string; codexVersion: string }> {
    const herdrCommand = this.config.herdrCommand ?? "herdr";
    const codexCommand = this.config.codexCommand ?? "codex";
    const [herdr, codex] = await Promise.all([
      this.command(herdrCommand, ["--version"]),
      this.command(codexCommand, ["--version"]),
    ]);
    return {
      herdrVersion: herdr.trim().replace(/^herdr\s+/, ""),
      codexVersion: codex.trim(),
    };
  }

  async resolve(role: string): Promise<readonly SafetyWaitPane[]> {
    const label = roleToAgentLabel(role);
    if (label === null) return [];
    const herdr = this.config.herdrCommand ?? "herdr";
    const list = parseJsonObject(
      await this.command(herdr, ["--session", this.config.session, "agent", "list"]),
    );
    const result = list.result as Record<string, unknown> | undefined;
    const agents = Array.isArray(result?.agents) ? result.agents : [];
    const matches = agents.filter(
      (pane): pane is Record<string, unknown> =>
        typeof pane === "object" &&
        pane !== null &&
        pane.agent === "codex" &&
        pane.name === label &&
        typeof pane.pane_id === "string",
    );
    return Promise.all(
      matches.map(async (pane) => {
        const paneId = pane.pane_id as string;
        const layout = parseJsonObject(
          await this.command(herdr, [
            "--session",
            this.config.session,
            "pane",
            "layout",
            "--pane",
            paneId,
          ]),
        );
        const layoutResult = layout.result as Record<string, unknown> | undefined;
        const layoutBody = layoutResult?.layout as Record<string, unknown> | undefined;
        const layoutPanes = Array.isArray(layoutBody?.panes) ? layoutBody.panes : [];
        const ownLayout = layoutPanes.find(
          (candidate) =>
            typeof candidate === "object" &&
            candidate !== null &&
            (candidate as Record<string, unknown>).pane_id === paneId,
        ) as Record<string, unknown> | undefined;
        const rect = ownLayout?.rect as Record<string, unknown> | undefined;
        if (typeof rect?.width !== "number" || typeof rect.height !== "number") {
          throw new Error("missing pane dimensions");
        }
        return {
          session: this.config.session,
          role,
          paneId,
          columns: rect.width,
          rows: rect.height,
        };
      }),
    );
  }

  readVisible(paneId: string): Promise<string> {
    return this.command(this.config.herdrCommand ?? "herdr", [
      "--session",
      this.config.session,
      "pane",
      "read",
      paneId,
      "--source",
      "visible",
      "--format",
      "text",
    ]);
  }

  async sendEnter(paneId: string): Promise<void> {
    await this.command(this.config.herdrCommand ?? "herdr", [
      "--session",
      this.config.session,
      "pane",
      "send-keys",
      paneId,
      "enter",
    ]);
  }

  now(): number {
    return performance.now();
  }
}

export class SafetyWaitSupervisor {
  private latchedPaneId: string | null = null;
  private absentPolls = 0;

  constructor(
    private readonly config: {
      session: string;
      role: string;
      supportedFingerprints: readonly SafetyWaitFingerprint[];
      confirmedAbsentVisibleTexts?: readonly string[];
      transactionTtlMs?: number;
    },
  ) {}

  private observeUnsupported(firstText: string): void {
    const state = classifyPostSendVisible(
      firstText,
      this.config.supportedFingerprints,
      this.config.confirmedAbsentVisibleTexts ?? [],
    );
    if (state !== "confirmed-absent") {
      this.absentPolls = 0;
      return;
    }
    this.absentPolls += 1;
    if (this.absentPolls < 2) return;
    this.latchedPaneId = null;
    this.absentPolls = 0;
  }

  async poll(adapter: SafetyWaitAdapter): Promise<SafetyWaitPollResult> {
    try {
      const versions = await adapter.versions();
      const candidates = (await adapter.resolve(this.config.role)).filter(
        (pane) => pane.session === this.config.session && pane.role === this.config.role,
      );
      if (candidates.length !== 1) return { kind: "no-input", reason: "role-not-unique" };
      const pane = candidates[0]!;
      const firstText = await adapter.readVisible(pane.paneId);
      const startedAt = adapter.now();
      const first = evaluateFingerprint(
        { ...versions, columns: pane.columns, rows: pane.rows, visibleText: firstText },
        this.config.supportedFingerprints,
      );
      if (first.kind === "no-input") {
        this.observeUnsupported(firstText);
        return first;
      }
      this.absentPolls = 0;
      if (this.latchedPaneId === pane.paneId) {
        return { kind: "no-input", reason: "already-latched" };
      }

      const stableText = await adapter.readVisible(pane.paneId);
      const stableAt = adapter.now();
      const ttl = this.config.transactionTtlMs ?? 1_000;
      if (stableAt - startedAt > ttl) {
        return { kind: "no-input", reason: "transaction-expired" };
      }
      const stable = evaluateFingerprint(
        { ...versions, columns: pane.columns, rows: pane.rows, visibleText: stableText },
        this.config.supportedFingerprints,
      );
      if (stable.kind === "no-input" || stable.fingerprintId !== first.fingerprintId) {
        return { kind: "no-input", reason: "unstable-fingerprint" };
      }

      const sendCandidates = (await adapter.resolve(this.config.role)).filter(
        (candidate) =>
          candidate.session === this.config.session && candidate.role === this.config.role,
      );
      if (
        sendCandidates.length !== 1 ||
        sendCandidates[0]!.paneId !== pane.paneId ||
        sendCandidates[0]!.columns !== pane.columns ||
        sendCandidates[0]!.rows !== pane.rows
      ) {
        return { kind: "no-input", reason: "identity-changed" };
      }
      const sendVersions = await adapter.versions();
      if (
        sendVersions.herdrVersion !== versions.herdrVersion ||
        sendVersions.codexVersion !== versions.codexVersion
      ) {
        return { kind: "no-input", reason: "version-changed" };
      }
      const sendAt = adapter.now();
      if (sendAt - startedAt > ttl) {
        return { kind: "no-input", reason: "transaction-expired" };
      }

      await adapter.sendEnter(pane.paneId);
      this.latchedPaneId = pane.paneId;
      const postText = await adapter.readVisible(pane.paneId);
      const result = postSendResult(
        pane.paneId,
        postText,
        this.config.supportedFingerprints,
        this.config.confirmedAbsentVisibleTexts ?? [],
        adapter.now() - sendAt,
        ttl,
      );
      return result;
    } catch {
      return { kind: "no-input", reason: "adapter-failure" };
    }
  }
}

function option(argv: readonly string[], name: string): string | null {
  const index = argv.indexOf(name);
  return index >= 0 && index + 1 < argv.length ? argv[index + 1]! : null;
}

async function runRecordIsActive(
  runRecord: string,
  expectedRun: string,
  expectedSession: string,
): Promise<boolean> {
  try {
    const [recordedSession, recordedRuntime, recordedStatus] = await Promise.all(
      ["session", "runtime", "status"].map((name) =>
        Bun.file(`${runRecord}/${name}`).text(),
      ),
    );
    return safetyWaitRunIsActive({
      expectedRun,
      expectedSession,
      runRecord,
      recordedSession: recordedSession.trim(),
      recordedRuntime: recordedRuntime.trim(),
      recordedStatus: recordedStatus.trim(),
    });
  } catch {
    return false;
  }
}

function createAdapter(argv: readonly string[], session: string): HerdrSafetyWaitAdapter {
  return new HerdrSafetyWaitAdapter({
    session,
    herdrCommand: option(argv, "--herdr") ?? "herdr",
    codexCommand: option(argv, "--codex") ?? "codex",
  });
}

async function checkRoleReady(
  adapter: SafetyWaitAdapter,
  role: string,
): Promise<number> {
  try {
    const candidates = await adapter.resolve(role);
    return candidates.length === 1 ? 0 : 3;
  } catch {
    return 3;
  }
}

async function supervise(
  argv: readonly string[],
  session: string,
  role: string,
): Promise<number> {
  const run = option(argv, "--run");
  const runRecord = option(argv, "--run-record");
  if (run === null || runRecord === null) return 2;
  if (!productionActivationEnabled()) {
    console.error(`[safety-wait] role=${role} result=disabled-empty-production-allowlist`);
    return 3;
  }

  const supervisor = new SafetyWaitSupervisor({
    session,
    role,
    supportedFingerprints: PRODUCTION_FINGERPRINTS,
    confirmedAbsentVisibleTexts: PRODUCTION_CONFIRMED_ABSENT_VISIBLE_TEXTS,
  });
  const adapter = createAdapter(argv, session);
  while (await runRecordIsActive(runRecord, run, session)) {
    const result = await supervisor.poll(adapter);
    const reason = result.kind === "no-input" ? result.reason : result.kind;
    console.error(`[safety-wait] role=${role} result=${reason}`);
    if (
      result.kind === "no-input" &&
      (result.reason === "role-not-unique" || result.reason === "adapter-failure")
    ) {
      return 3;
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  console.error(`[safety-wait] role=${role} result=inactive-run`);
  return 3;
}

export async function main(argv: readonly string[]): Promise<number> {
  if (argv[0] === "production-enabled") {
    return productionActivationEnabled() ? 0 : 3;
  }
  const session = option(argv, "--session");
  const role = option(argv, "--role");
  if (session === null || role === null || roleToAgentLabel(role) === null) return 2;
  if (argv[0] === "role-ready") {
    return checkRoleReady(createAdapter(argv, session), role);
  }
  if (argv[0] !== "supervise") return 2;
  return supervise(argv, session, role);
}

if (import.meta.main) {
  process.exitCode = await main(process.argv.slice(2));
}
