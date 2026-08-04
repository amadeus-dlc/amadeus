# Bolt Plan — ハーネス横断 live E2E

入力参照: `requirements`、`components`、`unit-of-work`、`unit-of-work-dependency`、`unit-of-work-story-map`。`stories`、`mockups`、`team-practices`成果物は本scopeで生成されていないため、FR-1〜FR-11、C1〜C9、space memoryのaffirmed practicesを正本とする。

## Planning Contract

- 1 Unitを1 Bolt・1 worktree・1 PRへ対応させ、複数Unitを同一PRへ束ねない。
- 最初のBoltはU01単独のvertical walking skeletonとし、共通policyからCodex実journey、cleanup barrier、ledger commit、matrix、runbookまでを通す。
- ConstructionはUnit DAGの6 batchを厳守する。batch内だけを並行化し、同時にactiveなbuilderは最大4とする。
- 各BoltはFunctional Design、NFR Design、Code Generation、Build and Testを通る。Infrastructure Design、CI Pipeline、Operationはscope外である。
- live journeyはローカル明示opt-inだけで実行し、GitHub Actionsでは常にhard denyする。
- 全Boltの成功終端は`asserted → cleanup-barrier-closed → ledger-appended|already-present → closure-committed`とする。cleanup/leak failureはC8未記録のhard errorであり、ledger失敗もPASS、supported更新、materialization、projectionを解放しない。

## Ordered Bolt Batches

| Batch | Bolt | Unit | Parallelism | Phase | Gate / barrier |
|---|---|---|---|---|---|
| 1 | B01 | U01 `codex-live-walking-skeleton` | 1 | Phase 1 foundation | walking-skeleton user gate |
| 2 | B02 | U02 `live-e2e-common-hardening` | 1 | Phase 1 foundation | B01 production contract green |
| 3 | B03 | U03 `claude-print-live` | 1 | Phase 1 | B02 hardening suite green |
| 4 | B04 | U04 `claude-sdk-live` | 最大2 | Phase 1 | B03 Claude family seam green |
| 4 | B05 | U05 `claude-tui-live` | 最大2 | Phase 1 | B03 Claude family seam green |
| 5 | B06 | U06 `kimi-print-live` | 最大4 | Phase 2 | U04/U05を含むPhase 1 `closure-committed`またはIssue evidence確定 |
| 5 | B07 | U07 `kiro-acp-live` | 最大4 | Phase 2 | U04/U05を含むPhase 1 `closure-committed`またはIssue evidence確定 |
| 5 | B08 | U08 `kiro-tui-live` | 最大4 | Phase 2 | U04/U05を含むPhase 1 `closure-committed`またはIssue evidence確定 |
| 5 | B09 | U09 `kiro-ide-live` | 最大4 | Phase 2 | U04/U05を含むPhase 1 `closure-committed`またはIssue evidence確定 |
| 6 | B10 | U10 `cursor-live-closure` | 最大2 | Phase 3 | U06〜U09のPhase 2 `closure-committed`またはIssue evidence確定 |
| 6 | B11 | U11 `opencode-live-closure` | 最大2 | Phase 3 | U06〜U09のPhase 2 `closure-committed`またはIssue evidence確定 |

## Bolt Definitions

### B01 — Codex live walking skeleton

- **Unit:** U01
- **Walking skeleton:** Yes。C1〜C9のpublic boundaryとCodex C5/C6をend-to-endで通す。
- **Definition of Done:** strict opt-inとGHA hard deny、C4 runner/executor、Codex adapter/journey specification、scratch isolation、assertion、cleanup barrier、atomic JSONL ledger、`closure-committed`後だけのgenerated matrix、運用runbookとdoc contract testがgreen。cleanup failure時のC8 append 0回とledger失敗時のgreen禁止を実証し、実Codex green receiptを残す。
- **Confidence hypothesis:** 共通production kernelが1 transportで安全に実行・証跡化できれば、後続adapterは共通契約を再定義せず接続できる。
- **Expected demo:** opt-inなし/GHA上のprobe・process 0回、opt-inありのCodex実journey、ledgerからmatrix再生成。

### B02 — Common hardening

- **Unit:** U02
- **Definition of Done:** `tests/harness/live-e2e/testing/`のfake journey、negative/property/failure-injection suiteがGHA、env、secret、timeout、cleanup、ledger crash/stale-lock、projection driftを検出する。cleanup failureではC8 append 0回、ledger failureでは`closure-committed`未到達を検証し、U01 production APIは変更しない。
- **Confidence hypothesis:** 共通契約違反をtransport非依存に再現できれば、後続adapterの安全性を同じ物差しで判定できる。
- **Expected demo:** 正常fake journey greenと、注入した違反が期待どおりredになる証跡。

### B03 — Claude print live

- **Unit:** U03
- **Definition of Done:** `claude -p --setting-sources project`、専用opt-in、preflight、project-only settings、normalization、Claude family seamを実装し、暗黙settings混入negative testと実Claude print journeyをgreenにする。
- **Confidence hypothesis:** Claudeのmust-green headless経路が共通portへ接続できれば、Claude SDK/TUIを同一config seam上で分離実装できる。
- **Expected demo:** settings isolation test、実Claude print receipt、registry/matrix更新。

### B04 — Claude SDK live

- **Unit:** U04
- **Definition of Done:** SDK driverを共通portとClaude family seamへ接続し、env/result/abort/partial-result contractを満たす。成立時はgreen receipt、不成立時は阻害要因・推奨seam・受入条件付きIssueを残す。
- **Confidence hypothesis:** SDK固有の構造化resultと中断モデルをadapter内へ閉じ込められる。
- **Expected demo:** fake contractとminimal live、または再現可能な阻害証跡とIssue。

### B05 — Claude TUI live

- **Unit:** U05
- **Definition of Done:** runnerの暗黙`AMADEUS_TUI_LIVE=1`を廃止し、private tmux、project settings、readiness/exit/timeout、credential-safe cleanupを共通contractへ接続する。成立時green、不成立時evidence Issue。
- **Confidence hypothesis:** 対話TUIでも明示opt-inと決定的cleanupをheadless transportと同じpolicyで保証できる。
- **Expected demo:** implicit opt-in regression test、fake TUI contract、minimal liveまたはevidence Issue。

### B06 — Kimi print live

- **Unit:** U06
- **Definition of Done:** Phase 1 closureを検証し、Kimi専用opt-in、preflight、credential-safe isolation、`kimi -p` normalizationを接続する。fake/negative testsと実Kimi journeyをgreenにする。
- **Confidence hypothesis:** 2つ目のmust-green CLI familyでも共通contractが変更なしに機能する。
- **Expected demo:** Phase 1 evidence check、実Kimi receipt、matrix更新。

### B07 — Kiro ACP live

- **Unit:** U07
- **Definition of Done:** Phase 1 closure後、ACP event/resultとcancel/tool-output終了、timeout cleanupをadapterへ隔離する。成立時green、不成立時evidence Issue。
- **Confidence hypothesis:** event-driven ACP固有の終了モデルを共通resultへlosslessに正規化できる。
- **Expected demo:** fake ACP contract、minimal liveまたはevidence Issue。

### B08 — Kiro TUI live

- **Unit:** U08
- **Definition of Done:** Phase 1 closure後、private tmux/session、readiness/exit normalization、credential-safe cleanupを接続する。成立時green、不成立時evidence Issue。
- **Confidence hypothesis:** Kiro TUIが他TUIと同じpolicy/lifecycle contractで独立実行できる。
- **Expected demo:** fake TUI contract、minimal liveまたはevidence Issue。

### B09 — Kiro IDE live

- **Unit:** U09
- **Definition of Done:** Phase 1 closure後、generated scratch profile、CDP readiness/anchor/assertion、app終了とdebug保持を接続する。成立時green、不成立時evidence Issue。
- **Confidence hypothesis:** GUI/CDP経路でもmachine authを漏らさず決定的なterminal evidenceを生成できる。
- **Expected demo:** profile/cleanup contract、minimal IDE journeyまたはevidence Issue。

### B10 — Cursor capability closure

- **Unit:** U10
- **Definition of Done:** Phase 2 closure後、非対話transport・設定隔離・認証・終了条件をprobeする。supportedならadapterとminimal live、unsupportedなら再実行可能probe/test、typed registry entry、Issue、matrix verificationを生成する。
- **Confidence hypothesis:** Cursorのlive能力を憶測でなく再現可能なsupported/unsupported判定へ閉じられる。
- **Expected demo:** green receiptまたはnon-empty unsupported evidence package。

### B11 — OpenCode capability closure

- **Unit:** U11
- **Definition of Done:** Phase 2 closure後、非対話transport・plugin接続・設定隔離・認証・終了条件をprobeする。supportedならadapterとminimal live、unsupportedなら再実行可能probe/test、typed registry entry、Issue、matrix verificationを生成する。
- **Confidence hypothesis:** OpenCodeの部分実装をsilent skipやdormant stubにせず、検証可能なcapability truthへ閉じられる。
- **Expected demo:** green receiptまたはnon-empty unsupported evidence package。

## Completion Semantics

- Must-greenはB01 Codex、B03 Claude print、B06 Kimiであり、Issue化による代替完了を認めない。
- B04/B05/B07/B08/B09/B10/B11はgreen receiptまたは受入条件付きevidence Issueの二択で閉じる。
- 各Boltは対象UnitだけをPR化し、relevant tests、typecheck、lint、distribution drift guardを通す。配布面変更がある場合はrunbookに従い対応live journey receiptをledgerへ記録する。
- batch 4、5、6は全Boltのterminal evidenceが揃ってから次batchへ進む。
