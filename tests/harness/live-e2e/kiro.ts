import { cpSync, existsSync, mkdirSync, mkdtempSync, symlinkSync } from "node:fs";
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
 * Kiro CLI keeps its authentication in an on-disk database under the user's
 * home, and re-executes `kiro-cli chat` from a per-home runtime path. Neither
 * is reachable through an environment variable, so a scratch home is
 * unauthenticated and cannot even launch the TUI. The seam this module owns is
 * therefore a scratch-side BINDING: the scratch home links the source auth
 * database and chat runtime by reference. The credential bytes never leave the
 * user's home, nothing is copied into scratch, and the adapter never writes to,
 * edits, or deletes anything under the source home — removing the scratch tree
 * removes the whole binding.
 */

export const KIRO_HOME_BINDING_KEY = "KIRO_CLI_HOME_BINDING";
export const KIRO_AUTH_FILE = "data.sqlite3";
export const KIRO_CHAT_BINARY = "kiro-cli-chat";

/**
 * Entries linked into the scratch data directory: the auth database plus the
 * runtime assets `kiro-cli chat` executes. Everything else the CLI wants
 * (history, sessions, caches) is created scratch-local and dies with it.
 */
export const KIRO_BOUND_DATA_ENTRIES = [
  KIRO_AUTH_FILE,
  "bun",
  "bun.sha256",
  "tui.js",
  "tui.js.sha256",
  "shell",
] as const;

export interface KiroHomeLayout {
  readonly home: string;
  readonly dataDir: string;
  readonly authFile: string;
  readonly chatBinary: string;
}

/**
 * Resolve the Kiro paths a home owns. Paths are fixed offsets from the home,
 * except that a source home on Linux honours `XDG_DATA_HOME` — the registry
 * declares that key as a source path, and kiro-cli stores its data there when
 * it is set. Scratch homes never pass an environment, so their layout stays a
 * pure offset of the scratch root.
 */
export function kiroHomeLayout(
  home: string,
  platform: string = process.platform,
  env: Readonly<Record<string, string | undefined>> = {},
): KiroHomeLayout {
  const xdgDataHome = platform === "darwin" ? undefined : env.XDG_DATA_HOME;
  const dataDir = platform === "darwin"
    ? join(home, "Library", "Application Support", "kiro-cli")
    : xdgDataHome !== undefined && xdgDataHome !== ""
      ? join(xdgDataHome, "kiro-cli")
      : join(home, ".local", "share", "kiro-cli");
  return {
    home,
    dataDir,
    authFile: join(dataDir, KIRO_AUTH_FILE),
    chatBinary: join(home, ".local", "bin", KIRO_CHAT_BINARY),
  };
}

export function defaultKiroSourceHome(env: Readonly<Record<string, string | undefined>> = process.env): string {
  return env.AMADEUS_KIRO_SOURCE_HOME ?? homedir();
}

/**
 * Link the source auth database and chat runtime into a scratch home. Returns
 * the scratch-side paths that were created — the only resources this binding
 * owns.
 */
export function bindKiroScratchHome(
  scratchHome: string,
  sourceHome: string,
  platform: string = process.platform,
  sourceEnv: Readonly<Record<string, string | undefined>> = {},
): readonly string[] {
  const source = kiroHomeLayout(sourceHome, platform, sourceEnv);
  const scratch = kiroHomeLayout(scratchHome, platform);
  const bound: string[] = [];
  mkdirSync(scratch.dataDir, { recursive: true });
  for (const entry of KIRO_BOUND_DATA_ENTRIES) {
    const target = join(source.dataDir, entry);
    if (!existsSync(target)) continue;
    const link = join(scratch.dataDir, entry);
    symlinkSync(target, link);
    bound.push(link);
  }
  mkdirSync(join(scratchHome, ".local", "bin"), { recursive: true });
  if (existsSync(source.chatBinary)) {
    symlinkSync(source.chatBinary, scratch.chatBinary);
    bound.push(scratch.chatBinary);
  }
  return bound;
}

export interface KiroHomeCredentialSourceOptions {
  readonly sourceHome?: string;
  readonly platform?: string;
  /** Source-side environment consulted for `XDG_DATA_HOME`; defaults to none. */
  readonly env?: Readonly<Record<string, string | undefined>>;
}

/**
 * The source-side auth boundary. `expose()` yields the source home locator that
 * `bindKiroScratchHome` needs and nothing else — it is never placed in the
 * child environment, an argument vector, a diagnostic, or a receipt.
 */
export class KiroHomeCredentialSource implements CredentialSourcePort {
  readonly #sourceHome: string;
  readonly #platform: string;
  readonly #env: Readonly<Record<string, string | undefined>>;

  constructor(options: KiroHomeCredentialSourceOptions = {}) {
    this.#sourceHome = options.sourceHome ?? defaultKiroSourceHome();
    this.#platform = options.platform ?? process.platform;
    this.#env = options.env ?? {};
  }

  async canLease(declaration: CredentialDeclaration): Promise<boolean> {
    return declaration.childKey === KIRO_HOME_BINDING_KEY &&
      existsSync(kiroHomeLayout(this.#sourceHome, this.#platform, this.#env).authFile);
  }

  async lease(declaration: CredentialDeclaration): Promise<CredentialBinding> {
    if (!(await this.canLease(declaration))) {
      throw new Error("Kiro CLI source authentication is unavailable");
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

export interface KiroScratchAllocatorOptions {
  readonly prefix: string;
  readonly distributionDir: string;
}

export class KiroScratchAllocator implements ScratchAllocator {
  readonly #options: KiroScratchAllocatorOptions;
  allocationCount = 0;

  constructor(options: KiroScratchAllocatorOptions) {
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
      initializeScratchGit(projectDir, homeDir, process.env, requireCapability("kiro-tui").environment);
      return { root, projectDir, homeDir, state: "ready" };
    } catch (error) {
      removeTreeVerified(root);
      throw error;
    }
  }
}
