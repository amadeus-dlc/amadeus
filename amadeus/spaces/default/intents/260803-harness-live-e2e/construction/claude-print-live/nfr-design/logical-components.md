# Logical Components — claude-print-live

## 上流入力

`business-logic-model.md:7-17`のC5/C6 sliceを、共通production seamへ接続する。

## Components

| ID | Component | Responsibility |
|---|---|---|
| LC-CP-01 | `ClaudePrintPreflight` | version/help/dist/auth/settings capability |
| LC-CP-02 | `ClaudeCredentialProjection` | opaque API-key/native binding |
| LC-CP-03 | `ClaudeProjectSettingsBuilder` | project-only empty hooks settings |
| LC-CP-04 | `ClaudePrintSpawnSpec` | safe argv/env/cwd |
| LC-CP-05 | `ClaudeJsonNormalizer` | bounded JSON envelope parse |
| LC-CP-06 | `ClaudeStructuredJourney` | schema/turn/error anchors |

## Dependencies and Ownership

C5 owns LC-CP-01〜05、C6 owns LC-CP-06。C4 owns supervisor/process handle/output collector/deadline/cleanup、C8 owns ledger。C5はclosed SpawnSpecをC4 capabilityへ渡し、borrowed execution viewだけをnormalizeする。

## Failure Domains

preflightはcanonical skip、settings/prepare/spawn/outputはcurrent run、ledger failureはevidence boundaryへ封じる。全失敗でsession非永続、process/credential残存0を検証する。

## Handoff

U04/U05はClaude familyのproject-only config seamを再利用するが、SDK/TUI固有transportを本componentへ混入しない。U02 assertionsと共通bounded lifecycleを必須利用する。
