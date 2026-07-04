# Refined Mockups Questions

## Design Plan

### Upstream Context

This stage consumes `wireframes`, `user-flow`, `stories`, `requirements`, and `team-practices`.

The rough `wireframes` define `doctor` as the primary surface and treat audit, OpenTelemetry core, Intent artifacts, and PR description as connected evidence surfaces.

The `user-flow` defines failure evidence inspection, engine error flow, hook drop flow, subagent status flow, conductor warning flow, PR evidence flow, and out-of-scope flow.

The `stories` define Maintainer as primary persona, Agent and Reviewer as supporting personas, and B001 as the first delivery slice.

The `requirements` define core failure observability, stdout JSON preservation, no-op default telemetry, deterministic verification, parity boundary, and PR readiness traceability.

The `team-practices` define the walking skeleton and verification posture for this Intent.

### Refined Design Approach

This Intent is not a web UI feature.

The refined mockups should therefore define a CLI-centered developer experience for `doctor`, plus interaction specifications for audit evidence, OpenTelemetry no-op behavior, Intent artifact references, and PR readiness evidence.

The output should avoid collector, dashboard, cloud infrastructure, always-on export, direct `skills/` edits, and unauthorized `.coderabbit.yml` changes.

## Questions

### Q1. Primary refined surface

Which surface should receive the most detailed refined mockup?

A. `doctor` CLI output only.

B. PR description only.

C. audit row format only.

D. OpenTelemetry spans and metrics only.

E. Recommended: `doctor` CLI output as the primary surface, with audit, telemetry, Intent artifact, and PR evidence links as supporting surfaces.

X. Other (please specify)

[Answer]: E

### Q2. `doctor` information hierarchy

How should the refined `doctor` output be ordered?

A. Alphabetical by check name.

B. Issue order: #431, #432, #433, #435, telemetry.

C. Implementation surface order: orchestrate, hooks, audit, telemetry, PR.

D. Most recent event first.

E. Recommended: summary first, then critical warnings, hook drops, engine errors, subagent status, OpenTelemetry core, and links.

X. Other (please specify)

[Answer]: E

### Q3. Interaction pattern for details

How should detailed evidence be exposed in a CLI-first experience?

A. Always print every detail in standard output.

B. Keep standard output minimal and require manual file inspection for all details.

C. Use an interactive wizard.

D. Emit only machine-readable JSON.

E. Recommended: concise standard output with evidence paths and optional verbose detail, while preserving JSON stdout contracts for directive/report commands.

X. Other (please specify)

[Answer]: E

### Q4. Required states

Which states should the refined mockups and interaction spec cover?

A. Success state only.

B. Error state only.

C. Empty and success states only.

D. Warning state only.

E. Recommended: empty, success, warning, malformed input, partial or unknown status, and stdout JSON preservation states.

X. Other (please specify)

[Answer]: E

### Q5. Design system mapping

How should design-system mapping be represented for non-UI CLI output?

A. Skip design-system mapping because there is no web UI.

B. Use web component names only.

C. Map only colors.

D. Map only typography.

E. Recommended: map CLI sections to design primitives such as heading, status label, evidence table, warning block, link list, and machine-readable contract boundary.

X. Other (please specify)

[Answer]: E

### Q6. Accessibility target

What accessibility target should apply?

A. No accessibility target because this is CLI output.

B. Color contrast only.

C. Screen reader notes only.

D. Keyboard notes only.

E. Recommended: WCAG 2.1 AA-inspired CLI guidance, including text labels not color alone, predictable heading order, copyable paths, and markdown artifact heading structure.

X. Other (please specify)

[Answer]: E

### Q7. Developer experience details

What developer experience details should be specified?

A. Only command examples.

B. Only audit schema examples.

C. Only telemetry attribute names.

D. Only PR checklist text.

E. Recommended: command output examples, audit field expectations, telemetry no-op and test-exporter behavior, evidence path copy flow, and PR readiness checklist.

X. Other (please specify)

[Answer]: E

### Q8. Scope boundary presentation

How should out-of-scope work be shown in refined artifacts?

A. Omit out-of-scope work.

B. Mention only collector and dashboard.

C. Mention only `skills/`.

D. Mention only `.coderabbit.yml`.

E. Recommended: include explicit not-designed flows for collector, dashboard, cloud infrastructure, always-on export, direct `skills/` edits, and unauthorized `.coderabbit.yml` changes.

X. Other (please specify)

[Answer]: E
