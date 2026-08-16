// amadeus-autonomy-status-facet.ts — RFC-0001 C8 / FR-8: the single aggregate
// point `--status` and the statusline hook both read for autonomy display.
//
// UI-truthfulness contract: this module composes effective-value functions
// that already exist elsewhere (C3 interactivity, C5/C6 Construction
// projection, C7 config consent) and adds NO judgment of its own
// (business-rules.md R-6). A caller that wants to know "what does the system
// actually think right now" calls `statusAutonomyFacet`; nothing here
// re-derives interactivity, re-derives the projection, or re-parses config.
//
// Deliberately its own small module rather than folded into amadeus-lib.ts:
// amadeus-intent-autonomy.ts already imports FROM amadeus-lib.ts, so the
// reverse import here would cycle. amadeus-config.ts and
// amadeus-intent-autonomy(-production).ts have no import relationship with
// each other, so a leaf module consuming all three is cycle-free.
import { resolveAmadeusConfig } from "./amadeus-config.ts";
import {
  type AutonomyMode,
  type ConstructionProjection,
  projectConstructionAutonomy,
  resolveSessionInteractivity,
} from "./amadeus-intent-autonomy.ts";
import { readProductionAutonomyProjection } from "./amadeus-intent-autonomy-production.ts";
import type { MirrorMode } from "./amadeus-mirror-types.ts";

export type AutonomyStatusFacet = Readonly<{
  mode: AutonomyMode;
  projection: ConstructionProjection;
  interactive: boolean;
  mirrorConsent: MirrorMode;
  findingConsent: MirrorMode;
}>;

// `null` means "unavailable", never a guessed value (R-7): no active Intent
// projection, or an unresolvable config, both fall closed to null rather than
// filling the missing half with a default. A caller degrades exactly like the
// existing `autonomy === null` -> "unavailable" convention `--status` already
// uses (amadeus-utility.ts's `readStatusAutonomy`/`renderAutonomyStatus`).
export function statusAutonomyFacet(
  projectDir: string,
  intent?: string,
  space?: string,
): AutonomyStatusFacet | null {
  let projection: ReturnType<typeof readProductionAutonomyProjection>;
  try {
    projection = readProductionAutonomyProjection(projectDir, intent, space);
  } catch {
    // An unreadable projection means there is no facet to show — same answer
    // as an absent one.
    return null;
  }
  if (projection === null) return null;

  const config = resolveAmadeusConfig(projectDir, intent, space);
  if (config.kind !== "resolved") return null;

  return {
    mode: projection.mode,
    projection: projectConstructionAutonomy(projection.mode),
    interactive: resolveSessionInteractivity(projectDir).interactive,
    mirrorConsent: config.config.intentMirror.github.issue.consent,
    findingConsent: config.config.finding.github.issue.creation.consent,
  };
}
