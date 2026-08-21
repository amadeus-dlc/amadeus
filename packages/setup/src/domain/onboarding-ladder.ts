// #3388: the onboarding doc is the one payload file whose name the target
// project very likely already owns — AGENTS.md is a Codex/Cursor convention and
// CLAUDE.md is Claude Code's, so a collision is the normal case, not an edge
// case. Overwriting it is unacceptable; skipping it silently reproduces the
// #3386 failure mode, where the method layer is simply absent and nothing says
// so. A default (non-force) install therefore walks a destination ladder:
//
//   1. the real name          — the target has no file there;
//   2. <STEM>-AMADEUS.md      — the real name is taken;
//   3. nothing at all         — BOTH names are taken; reported, never written.
//
// Rungs 2 and 3 are only safe when paired with the wiring guidance in
// reporter.renderOnboardingWiring: no harness auto-loads the alternate name
// (Claude Code reads CLAUDE.md / .claude/CLAUDE.md, Codex-family harnesses read
// AGENTS.md and have no @-import at all), so an unannounced alternate is a
// silent no-op. The guidance is part of the ladder's contract, not a nicety.
//
// --force keeps the pre-#3388 behaviour verbatim: the real name, backed up
// first (BR-I11~I14). The ladder is the DEFAULT path's no-clobber answer, and a
// user who explicitly asked to overwrite is not second-guessed.

const MD_SUFFIX = ".md";

// The two project-root onboarding filenames across all eight harnesses. Only a
// depth-1 payload file matching one of these enters the ladder — a nested
// CLAUDE.md inside a harness dir is an ordinary shared file.
export const ONBOARDING_DOC_BASENAMES: readonly string[] = Object.freeze(["CLAUDE.md", "AGENTS.md"]);

export type OnboardingNoticeKind = "alternate" | "blocked";

// What the reporter needs to phrase the wiring guidance: which name was wanted,
// which one the ladder landed on (or would have), how far it got — and whether
// the real name is occupied right now. That last fact does not follow from the
// kind: upgrade routes the doc to the alternate because the installed manifest
// records it there (plan.routeUpgradeDestination), whether or not the user still
// keeps a file at the real name. Phrasing every alternate as "the real name
// already exists" would state a collision that may not exist any more.
export type OnboardingNotice = {
  readonly kind: OnboardingNoticeKind;
  readonly primary: string;
  readonly alternate: string;
  readonly primaryExists: boolean;
};

export type OnboardingDestination =
  // Write to the payload's own relative path — either it is not a ladder file,
  // --force is in effect, or the real name is free.
  | { readonly type: "primary"; readonly dest: string }
  // Rung 2: the doc lands on the alternate. `primaryExists` is the observed
  // state of the real name, carried so the notice never has to assume it.
  | { readonly type: "alternate"; readonly dest: string; readonly primaryExists: boolean }
  // Rung 3: both names are taken. Nothing is written and nothing is recorded.
  | { readonly type: "blocked"; readonly dest: string; readonly primaryExists: boolean };

export type OnboardingProbe = {
  readonly relPath: string;
  readonly force: boolean;
  readonly primaryExists: boolean;
  readonly alternateExists: boolean;
};

// The alternate destination for a payload path, or null when the path is not an
// onboarding doc. Depth matters: walkFiles yields "/"-joined relative paths, so
// a project-root doc is exactly a path with no separator in it.
export function onboardingAlternateFor(relPath: string): string | null {
  if (relPath.includes("/")) return null;
  if (!ONBOARDING_DOC_BASENAMES.includes(relPath)) return null;
  return `${relPath.slice(0, -MD_SUFFIX.length)}-AMADEUS.md`;
}

// The ladder itself, as a pure total function of the four facts that decide it.
// Exported as a decision seam so the branches can be exercised without a
// filesystem, the same way classify/classifyAction are.
export function decideOnboardingDestination(probe: OnboardingProbe): OnboardingDestination {
  const alternate = onboardingAlternateFor(probe.relPath);
  if (alternate === null) return Object.freeze({ type: "primary", dest: probe.relPath });
  if (probe.force) return Object.freeze({ type: "primary", dest: probe.relPath });
  if (!probe.primaryExists) return Object.freeze({ type: "primary", dest: probe.relPath });
  if (!probe.alternateExists) return Object.freeze({ type: "alternate", dest: alternate, primaryExists: probe.primaryExists });
  return Object.freeze({ type: "blocked", dest: alternate, primaryExists: probe.primaryExists });
}

// The notice a non-"primary" destination owes the user, or null when the doc
// landed on its real name and needs no wiring at all.
export function noticeFor(relPath: string, destination: OnboardingDestination): OnboardingNotice | null {
  if (destination.type === "primary") return null;
  return Object.freeze({
    kind: destination.type,
    primary: relPath,
    alternate: destination.dest,
    primaryExists: destination.primaryExists,
  });
}
