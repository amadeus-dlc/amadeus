# User Stories Questions

## Story Plan

### Persona Development Approach

Personas are derived from `aidlc/spaces/default/knowledge/actors.md` and `requirements.md`.

The candidate personas are Maintainer, Agent, and Reviewer.

Each persona should include role, goals, pain points, operating context, and priority ranking.

### Story Format

Stories will use the standard format, `As a [persona], I want [goal], so that [benefit]`.

Each story should include acceptance criteria in Given/When/Then form.

Each story should include INVEST notes and dependencies.

### Story Prioritization

Stories will use MoSCoW priority.

Must Have means the core failure observability outcome fails without the story.

Should Have means the outcome is painful but still workable without the story.

Could Have means the story improves usability or completeness without blocking MVP.

Won't Have means the story is explicitly out of scope for this Intent.

### Breakdown Approach Options

The candidate breakdown axes are persona, failure signal, workflow journey, CLI surface, and Issue or Requirement.

The recommended breakdown uses observable failure signal and user journey first, then maps each story to Requirements and Issues.

## Questions

### Q1. Persona priority

Which persona priority should guide the story map?

A. Maintainer first, because merge and PR readiness are the main decisions.

B. Agent first, because workflow execution and recovery are the main tasks.

C. Reviewer first, because Issue, Requirement, and verification traceability are the main outputs.

D. Treat Maintainer, Agent, and Reviewer as equal priority.

E. Recommended: Maintainer is primary, with Agent and Reviewer as supporting personas.

X. Other (please specify)

[Answer]: E

### Q2. Story breakdown axis

How should stories be primarily broken down?

A. By GitHub Issue: #431, #432, #433, and #435.

B. By persona: Maintainer stories, Agent stories, and Reviewer stories.

C. By workflow step: detect, record, diagnose, verify, and prepare PR.

D. By CLI surface: orchestrate, audit, doctor, hook, and telemetry.

E. Recommended: By observable failure signal and user journey, then map each story to Requirement and Issue.

X. Other (please specify)

[Answer]: E

### Q3. Story granularity

How large should each story be?

A. Large epic-level stories grouped by Issue.

B. Very small implementation tasks that map directly to files.

C. One story per acceptance criterion.

D. One story per Requirement only.

E. Recommended: implementation-sized vertical slices that are small enough for one Bolt or part of one Bolt, while preserving user value.

X. Other (please specify)

[Answer]: E

### Q4. MoSCoW priority policy

How should story priority be assigned?

A. Mark all R001-R009 related stories as Must Have.

B. Mark only the first Bolt slice as Must Have and defer the rest.

C. Mark Issue #431 and #432 as Must Have, and #433 and #435 as Should Have.

D. Mark OpenTelemetry core as Should Have because collector and dashboard are out of scope.

E. Recommended: Mark all core Requirements as Must Have, but identify B001 as the first delivery slice and mark collector, dashboard, cloud, and `skills/` direct edits as Won't Have.

X. Other (please specify)

[Answer]: E

### Q5. Acceptance criteria style

What acceptance criteria style should the stories use?

A. Given/When/Then only.

B. Checklist only.

C. Test command references only.

D. Brief prose acceptance only.

E. Recommended: Given/When/Then plus verification evidence mapping to tests, validator, parity, stdout JSON, and no-op default telemetry checks.

X. Other (please specify)

[Answer]: E

### Q6. Non-UI experience coverage

Which user experience details should be captured for this CLI-centered feature?

A. No UX details, because this is developer tooling.

B. CLI message wording only.

C. Audit schema only.

D. PR description and documentation only.

E. Recommended: CLI output, audit fields, doctor warnings, telemetry no-op behavior, and recovery cues as the user-facing experience.

X. Other (please specify)

[Answer]: E

### Q7. Failure and recovery paths

How much sad-path coverage should the stories include?

A. Happy paths only.

B. Only error audit failures.

C. Only doctor warnings.

D. Only telemetry disabled behavior.

E. Recommended: cover thrown errors, error directives, malformed drop files, missing subagent status, runtime graph mismatch, stdout JSON preservation, and telemetry no-op default.

X. Other (please specify)

[Answer]: E

### Q8. Out-of-scope story handling

How should out-of-scope work be represented?

A. Include collector setup as a Could Have story.

B. Include dashboard setup as a Could Have story.

C. Include cloud infrastructure as a Could Have story.

D. Include `skills/` direct edits as implementation stories.

E. Recommended: create explicit Won't Have entries for collector, dashboard, cloud infrastructure, always-on export, `skills/` direct edits, and unauthorized `.coderabbit.yml` changes.

X. Other (please specify)

[Answer]: E
