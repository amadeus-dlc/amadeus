import { cpSync, existsSync, mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import type {
  CredentialBinding,
  CredentialDeclaration,
  CredentialSourcePort,
  ScratchAllocator,
  ScratchReceipt,
} from "./adapter.ts";
import { requireCapability } from "./registry.ts";
import type { ResourceRegistrar } from "./resources.ts";
import { initializeScratchGit } from "./scratch.ts";
import { removeTreeVerified } from "./testing/remove-tree-verified.ts";

/**
 * Kimi Code keeps its OAuth material under `$KIMI_CODE_HOME` — the
 * `credentials/` and `oauth/` entries of the user's real home — and reads it
 * through no environment variable, so a scratch home is unauthenticated and
 * cannot open a session at all. The seam this module owns is therefore the same
 * scratch-side BINDING the Kiro adapter uses: the scratch home links those two
 * entries by reference. No credential byte is copied into scratch, the adapter
 * never writes to the source home, and removing the scratch tree removes the
 * whole binding (security-design.md § "Source credential → run binding").
 *
 * Everything the CLI wants to own per-run — config.toml, sessions, logs, hook
 * wiring state — is created scratch-local and dies with the scratch tree.
 */

export const KIMI_HOME_BINDING_KEY = "KIMI_CODE_HOME_BINDING";

/** The only source entries a scratch home binds. Both are credential-bearing. */
export const KIMI_BOUND_HOME_ENTRIES = ["credentials", "oauth"] as const;

export interface KimiHomeLayout {
  readonly home: string;
  readonly credentialsDir: string;
  readonly oauthDir: string;
  readonly configFile: string;
}

/** Fixed offsets of a Kimi home; `$KIMI_CODE_HOME` names the home itself. */
export function kimiHomeLayout(home: string): KimiHomeLayout {
  return {
    home,
    credentialsDir: join(home, "credentials"),
    oauthDir: join(home, "oauth"),
    configFile: join(home, "config.toml"),
  };
}

/**
 * The home that owns the real login. `AMADEUS_KIMI_SOURCE_HOME` overrides for
 * tests; otherwise the CLI's own `KIMI_CODE_HOME`, then its default location.
 */
export function defaultKimiSourceHome(
  env: Readonly<Record<string, string | undefined>> = process.env,
): string {
  return env.AMADEUS_KIMI_SOURCE_HOME ?? env.KIMI_CODE_HOME ?? join(homedir(), ".kimi-code");
}

/**
 * Link the source credential entries into a scratch home. Returns the
 * scratch-side paths that were created — the only resources this binding owns.
 * A source without stored credentials produces no links; preflight is what
 * decides whether that is runnable, not this function.
 */
export function bindKimiScratchHome(
  scratchHome: string,
  sourceHome: string,
): readonly string[] {
  mkdirSync(scratchHome, { recursive: true });
  if (sourceHome === scratchHome) return [];
  const bound: string[] = [];
  for (const entry of KIMI_BOUND_HOME_ENTRIES) {
    const target = join(sourceHome, entry);
    const link = join(scratchHome, entry);
    if (!existsSync(target) || existsSync(link)) continue;
    symlinkSync(target, link, process.platform === "win32" ? "junction" : "dir");
    bound.push(link);
  }
  return bound;
}

/**
 * The managed model id a scratch config seeds. `AMADEUS_KIMI_MODEL` overrides
 * and accepts either a bare id or the full `kimi-code/<id>` alias.
 */
export function defaultKimiJourneyModel(
  env: Readonly<Record<string, string | undefined>> = process.env,
): string {
  const value = env.AMADEUS_KIMI_MODEL ?? "k3";
  return value.includes("/") ? (value.split("/").pop() as string) : value;
}

/**
 * Write a scratch home's `config.toml`. Kimi refuses to open a session without
 * `default_model` and a matching `[models."kimi-code/<id>"]` entry, so a
 * config-less scratch home cannot run a journey at all. The tables mirror what
 * `kimi login` writes and carry NO credential material — the OAuth tokens reach
 * the scratch home only through the binding above.
 */
export function writeKimiScratchConfig(home: string, model?: string): string {
  mkdirSync(home, { recursive: true });
  const id = model ?? defaultKimiJourneyModel();
  const alias = `kimi-code/${id}`;
  const path = kimiHomeLayout(home).configFile;
  writeFileSync(
    path,
    [
      `default_model = "${alias}"`,
      ``,
      `[providers."managed:kimi-code"]`,
      `type = "kimi"`,
      `api_key = ""`,
      `base_url = "https://api.kimi.com/coding/v1"`,
      ``,
      `[providers."managed:kimi-code".oauth]`,
      `storage = "file"`,
      `key = "oauth/kimi-code"`,
      ``,
      `[models."${alias}"]`,
      `provider = "managed:kimi-code"`,
      `model = "${id}"`,
      `max_context_size = 1048576`,
      ``,
    ].join("\n"),
    { encoding: "utf8", mode: 0o600 },
  );
  return path;
}

export interface KimiHomeCredentialSourceOptions {
  readonly sourceHome?: string;
}

/**
 * The source-side auth boundary. `expose()` yields the source home locator that
 * `bindKimiScratchHome` needs and nothing else — it is never placed in the child
 * environment, an argument vector, a diagnostic, or a receipt.
 */
export class KimiHomeCredentialSource implements CredentialSourcePort {
  readonly #sourceHome: string;

  constructor(options: KimiHomeCredentialSourceOptions = {}) {
    this.#sourceHome = options.sourceHome ?? defaultKimiSourceHome();
  }

  async canLease(declaration: CredentialDeclaration): Promise<boolean> {
    if (declaration.childKey !== KIMI_HOME_BINDING_KEY) return false;
    const layout = kimiHomeLayout(this.#sourceHome);
    return existsSync(layout.credentialsDir) || existsSync(layout.oauthDir);
  }

  async lease(declaration: CredentialDeclaration): Promise<CredentialBinding> {
    if (!(await this.canLease(declaration))) {
      throw new Error("Kimi Code source authentication is unavailable");
    }
    let value: string | undefined = this.#sourceHome;
    let active = true;
    return {
      key: declaration.childKey,
      expose: () => {
        if (!active) throw new Error("credential binding was released");
        return value ?? "";
      },
      release: async () => {
        value = undefined;
        active = false;
      },
    };
  }
}

export interface KimiScratchAllocatorOptions {
  readonly prefix: string;
  readonly distributionDir: string;
}

export class KimiScratchAllocator implements ScratchAllocator {
  readonly #options: KimiScratchAllocatorOptions;
  allocationCount = 0;

  constructor(options: KimiScratchAllocatorOptions) {
    this.#options = options;
  }

  async allocate(registrar: ResourceRegistrar): Promise<ScratchReceipt> {
    this.allocationCount += 1;
    registrar.registerPlanned({
      id: "scratch-root",
      kind: "scratch-root",
      locator: "temporary-directory",
      credentialBearing: false,
    });
    const root = mkdtempSync(join(tmpdir(), this.#options.prefix));
    registrar.markCreated("scratch-root");
    const projectDir = join(root, "project");
    const homeDir = join(root, "home");
    try {
      cpSync(this.#options.distributionDir, projectDir, { recursive: true });
      mkdirSync(homeDir, { recursive: true });
      mkdirSync(join(root, "tmp"), { recursive: true });
      initializeScratchGit(projectDir, homeDir, process.env, requireCapability("kimi-print").environment);
      return { root, projectDir, homeDir, state: "ready" };
    } catch (error) {
      try {
        removeTreeVerified(root);
      } catch (cleanupError) {
        throw new AggregateError(
          [error, cleanupError],
          "rollback cleanup failed after setup failure",
        );
      }
      throw error;
    }
  }
}
