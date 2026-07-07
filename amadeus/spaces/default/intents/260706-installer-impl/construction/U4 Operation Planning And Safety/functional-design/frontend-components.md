# Frontend Components — U4 Operation Planning And Safety

> Stage: functional-design / Unit: `U4 Operation Planning And Safety`  
> Upstream: `unit-of-work.md`, `unit-of-work-story-map.md`, `requirements.md`, `components.md`, `component-methods.md`, `services.md`

## Applicability

U4 has no graphical frontend. Its user-facing impact is the file-operation plan that Reporter renders before any write. This file defines the display data U4 must supply.

## Plan Display Data

| Display Area | U4 Supplies | Renderer Responsibility |
|---|---|---|
| Plan header | command, harness, target, manifest path, resolved version | Render plan summary |
| Operation table | operation kind, count, example path | Render stable columns |
| Conflict details | conflict path, class, reason | Render no-write or confirmation text |
| Backup details | source path, backup path, reason | Render backup-before-update assurance |
| No-write reason | reason code and next action hint | Render classified error |
| Force marker | force-update operations | Render force-applied operations clearly |

## Interaction Flows

### Pre-Apply Plan

1. U4 produces `FileOperationPlan`.
2. Reporter renders the plan.
3. If confirmation is needed, Prompt Adapter asks user.
4. U5 applies only if the plan can apply and the user/application decision allows it.

### Non-Interactive Collision

1. U4 sees existing shared target file with unknown or changed md5.
2. `--force` is absent and prompts are suppressed.
3. U4 emits conflict plan with `canApply: false`.
4. Reporter prints file-level plan and no-write error.

### Force With Backup

1. U4 sees changed or unknown shared file.
2. `--force` is present.
3. U4 emits `backup` followed by `force-update`.
4. Reporter shows backup path and force marker.

## Plain-Text Requirements

U4 supplies display data only. It does not define final wording, table column labels, or snapshot-test expectations. U5 Reporter owns canonical plain-text rendering using this data:

- operation kind and counts
- example paths
- backup path values
- conflict reason codes
- no-write reason codes
- `requiresConfirmation` and `confirmationReason`
- force-update markers

## Traceability

- `requirements.md` FR-008, FR-009, FR-010, and FR-011 define pre-apply report, backup, force, and no-write UX.
- `mockups.md` M3, M4, and M4a show canonical plan output.
- `unit-of-work-story-map.md` maps U4 display data to US-004 and US-007.
- `components.md`, `component-methods.md`, and `services.md` keep Reporter separate from Planner.
