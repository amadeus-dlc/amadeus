# Depth Control Architecture

> Languages: **English** | [日本語](25-depth-control-architecture.ja.md)

Depth control — the machinery that scales how much a stage produces to the
active depth level (§8 of [Stage Protocol](04-stage-protocol.md)) — is
implemented at several independent points across the workflow lifecycle. Each
point was hardened on its own schedule, and local optimization at one point
does not guarantee a balanced control system overall: a layer can end up
over-constrained relative to its payoff (the tightest gate sitting on a small
producer while the largest producer runs unmeasured) or under-constrained
(a contract with no sensor behind it) purely because it was easier to reach
first.

**This chapter's governing ruling is
[Issue #2683](https://github.com/amadeus-dlc/amadeus/issues/2683)**, the
balance ruling that fixed the control-point map, the target enforcement
strength per layer, the blocking-conversion governance principles, and the
rollout order below. This chapter is a transcription of that landed ruling,
not a second source of truth: the numbers and principles here are copied
verbatim from the ruling comment
([issuecomment-5229552315](https://github.com/amadeus-dlc/amadeus/issues/2683#issuecomment-5229552315)),
never re-derived. When this chapter and the Issue thread disagree, the Issue
thread is authoritative and this chapter is corrected in the same change that
resolves the disagreement.

## Operating norm

**Any new depth-control enhancement declares its position and target strength
on this map before starting work.** A proposal that adds enforcement at a
layer without stating which row it strengthens, and without checking that the
resulting strength does not exceed the ruling below, is a locally-optimizing
change of exactly the kind this chapter exists to prevent.

## Control-point map (L0–L5)

The full count of control points across the workflow, as measured on
2026-08-09:

| Layer | Target | Measurement | Enforcement | Status |
|---|---|---|---|---|
| L0 stage SKIP | Scope grid / composer | — (execution itself) | **Mechanical** (the engine never emits the directive) | Live |
| L1 early sizing | Intent size vs. depth fit (intent-capture / scope-definition gate) | **None** | **None** | Blank |
| L2 question ceiling | Primary question count per stage (4 / 8 / 12) | **None** (no counting sensor) | Contract only (MUST since [#2672](https://github.com/amadeus-dlc/amadeus/issues/2672)) | Contracted, unmeasured |
| L3 FR volume | `requirements.md` FR count band / bytes-per-FR | `depth-budget` sensor ([#2503](https://github.com/amadeus-dlc/amadeus/issues/2503) / [#2673](https://github.com/amadeus-dlc/amadeus/issues/2673)) + census ([#2666](https://github.com/amadeus-dlc/amadeus/issues/2666)) | Contract ([#2672](https://github.com/amadeus-dlc/amadeus/issues/2672)) + advisory | Tightest |
| L3' NFR volume & coverage | nfr-requirements / nfr-design (3rd- and 6th-largest producers by bytes, 5.0 MB combined) | **None** (no ID contract either) | **None** (`directive.depth` not wired) | Blank (child Issue in drafting) |
| L4 design artifacts | application-design / functional-design qualitative shape | None (deliberately guidance — the shape is not machine-verifiable) | Guidance ([#2672](https://github.com/amadeus-dlc/amadeus/issues/2672) separated contract from guidance) | Ruled |
| L5 enforcement sink | Sensor severity `blocking` + its approve-path consumers | — (mechanism) | fail-closed (in progress, [#2671](https://github.com/amadeus-dlc/amadeus/issues/2671) (c)) | In progress, zero production use |

Source of the byte distribution and the L3/L3' ranking: the stage-artifact
byte census across all 30 stage slugs (top 7 stages account for 80.0% of
total bytes),
[#2671 issuecomment-5229507166](https://github.com/amadeus-dlc/amadeus/issues/2671#issuecomment-5229507166).

## Target enforcement strength per layer

The ruling fixed one of five strengths for each layer — **mechanical /
contract+measurement / contract only / guidance / uncontrolled** — reasoning
from the byte distribution above and from the advisory-precision evidence
cited in each row.

| Layer | Ruling | Rationale |
|---|---|---|
| L0 SKIP | **Mechanical (status quo)** | Live, working. |
| L1 early sizing | **New layer, last in rollout order.** Start from designing a measurable predicate; enforcement stays advisory-ceiling until measurement produces a track record. | Writing a contract before the predicate exists would add another unmeasured contract — the same rut L2 is in. |
| L2 question ceiling | **Bring under measurement.** Add a question-count sensor (mechanical count of a questions file vs. the 4/8/12 ceiling), start advisory. | The ceiling is already contracted ([#2672](https://github.com/amadeus-dlc/amadeus/issues/2672)) yet unmeasured — a standing violation of the "an unmeasured contract approaches verification theater" principle established on the FR side. |
| L3 FR volume | **Status quo** (contract + advisory + census). Blocking conversion is gated by the double gate of [#2553](https://github.com/amadeus-dlc/amadeus/issues/2553) plus the quantity-governance principles below. | Already landed. |
| L3' NFR | **Climb the ladder from the bottom**: ID contract → measurement → observed range → threshold → contract. Threshold work and beyond does not start until an observed distribution exists. | `cid:code-generation:c1-threshold-inside-observed-range` (`amadeus/spaces/default/memory/project.md`): a threshold set outside the observed range of the predicate it gates degrades to an always-pass or always-fail check, which is not measurement. |
| L4 design artifacts | **Guidance, confirmed.** The [#2672](https://github.com/amadeus-dlc/amadeus/issues/2672) ruling for this layer is promoted to the permanent ruling for the whole map. | Mandating a non-verifiable qualitative shape as MUST is verification theater. |
| L5 sink | **Continue fail-closed implementation** ([#2671](https://github.com/amadeus-dlc/amadeus/issues/2671) (c)). Production adoption is subordinate to the blocking-conversion governance below. | In progress. |

## Blocking-conversion governance (quantity control)

Once the L5 sink lands, any surface can convert its advisory findings to
`blocking` severity independently. Without a quantity control, that
independence lets local decisions push the whole workflow toward standing
stoppage. The ruling fixes three principles that any blocking conversion
— on any surface, current or future — must satisfy:

1. **Precision gate**: a surface does not convert to `blocking` until its
   advisory flag rate, measured from real usage, sits inside the **10–30%**
   band (the same band that functions as outlier detection, per
   [#2553](https://github.com/amadeus-dlc/amadeus/issues/2553) completion
   condition 3). Below the band the check is not catching enough to justify
   blocking; above it, it is flagging routine cases rather than outliers.
2. **Quantity ceiling**: at most **two** surfaces may be `blocking`
   simultaneously, for now. Raising the ceiling requires a follow-up ruling
   recorded as a comment on
   [Issue #2683](https://github.com/amadeus-dlc/amadeus/issues/2683).
3. **Recording obligation**: every blocking conversion is declared as a
   comment on [Issue #2683](https://github.com/amadeus-dlc/amadeus/issues/2683),
   with the measured precision value attached (per
   `cid:requirements-analysis:numbers-from-command-output-only` — the recorded
   number must come from a command's output, not from memory or estimate).

## Rollout order

The order in which the blank/uncontrolled layers above (L1, L2, L3') are
brought up to their ruled strength is derived, not chosen for convenience:

**L3' (NFR foundation) → L2 (question-count sensor) → L1 (early sizing)**

Derivation: byte distribution × the gap between current and ruled
enforcement strength, from the same full census cited above
([#2671 issuecomment-5229507166](https://github.com/amadeus-dlc/amadeus/issues/2671#issuecomment-5229507166)).
L3' carries the largest unmeasured byte mass (5.0 MB, 3rd- and 6th-largest
producers) against zero enforcement — the widest gap. L2 already carries a
contract with zero measurement behind it — closing that gap is next. L1 is a
new layer with no existing contract to violate, so it is last: building its
predicate first (per the L1 ruling above) avoids repeating L2's unmeasured-
contract mistake.

## Child Issue subordination

Each of the following child Issues owns implementation for one or more rows
of the map above; their rulings must not contradict this map, and that check
is a required review point on each child's pull requests:

- [#2425](https://github.com/amadeus-dlc/amadeus/issues/2425) — effect
  measurement (L3)
- [#2553](https://github.com/amadeus-dlc/amadeus/issues/2553) — threshold
  re-tuning (L3)
- [#2671](https://github.com/amadeus-dlc/amadeus/issues/2671) — §8
  normativity + severity mechanism (L2–L5)
- NFR foundation enhancement (L3', in drafting at the time of this ruling —
  link added once filed)
- L1 early sizing (not yet filed — filed once the L2 measurement work above
  establishes the predicate-design pattern to follow)
- [#2661](https://github.com/amadeus-dlc/amadeus/issues/2661) — parent
  tracking Issue (depth completion + verification sweep); this chapter's
  ruling Issue, [#2683](https://github.com/amadeus-dlc/amadeus/issues/2683),
  is a child of #2661

## Related

- [Stage Protocol §8, Depth Guidance](04-stage-protocol.md) — the
  depth-level contract (question ceilings, FR bands) and guidance
  (qualitative shape) that this map's L2–L4 rows enforce or guide.
- [Sensor System](07-sensor-system.md) — the `depth-budget` sensor (L3) and
  the severity mechanism (`advisory` / `blocking`) that L5 governs.
