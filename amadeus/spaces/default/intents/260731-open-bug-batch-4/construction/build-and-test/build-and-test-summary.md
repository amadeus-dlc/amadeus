# Build and Test Summary — 260731-open-bug-batch-4

上流入力(consumes 全数): code-generation-plan.md — 4 unit の実装計画・逸脱記録から検証範囲を確定した。code-summary.md — 各 unit の FR 対応と検証実績を本書の集約元とした。

## 検証構成(bt-20260730-1 準拠)

per-unit の focused suite + PR CI(各 PR で確立済み)+ main worktree のフルベースライン(本ステージ実施)の2層。Bolt worktree での full CI 再実行は各 unit の CI 証跡と重複するため行わない。

## Unit 別結果

| Unit | Issue | PR | 患部スイート | §12a | 着地 |
|---|---|---|---|---|---|
| fix-1811-supervisor-orphans | #1811 | #1821 MERGED | t-team-up-codex-resume.serial green | READY (it.1) | origin/main grep 済み |
| fix-1800-t224-diagnostics | #1800 | #1820 MERGED | t224 green(リトライ3面固定) | READY (it.1) | 同上 |
| fix-1797-t259-interleave | #1797 | #1822 MERGED | t259 2 pass・スイープ実測導出 | READY (it.1) | 同上 |
| fix-1816-mirror-terminal-status | #1816 | #1823 MERGED | t374+t281 10 pass・t361 無改変 | READY (it.1) | 同上 |

## フルベースライン(main worktree、HEAD 9008141df)

typecheck 0 / lint 0 / dist:check 0 / promote:self:check 0 / `tests/run-tests.sh --ci` exit 0 — **674 files / 9398 assertions / 0 failed**。wall-clock drift 3件は advisory・本 intent 非接触(t258 は #1830 起票済み)。

## 検証済み面と未検証面の書き分け(c4-conditional-ready 準拠)

- 検証済み: 4 Issue の元症状閉包(各 unit の Red→Green+落ちる実証)、リグレッション(フル CI)、配布同期(fix-1816)、write⇔check 対称性(FR-4b' ネガティブコントロール込み)。
- 未検証(スコープ外として明示): #1830(t258 flake、既知・別 Issue)、#1833(mirror landing ノルム乖離、documentation)。いずれも本 intent の受け入れ基準外であり申し送り済み。

## Verdict

**READY** — 4 FR 全充足、全ゲート green、逸脱は全て裁定経由(E-OBB4-CG1)で正規化済み。
