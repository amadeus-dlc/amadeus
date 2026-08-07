# Requirements — 260807-merged-pr-convergence(Issue #2401)

上流入力(consumes 全数): `intent-statement`(`ideation/intent-capture/intent-statement.md` — 確定裁定 Q1〜Q3 と Success Metrics を FR の導出元として消費)、`scope-document`(`ideation/scope-definition/scope-document.md` — In 6 capability / Out 4 項目を FR の外延として消費)、`business-overview`(codekb — pr-convergence plugin の位置づけの確認)、`architecture`(codekb — 現在節の landed 未対応機序・kind 閉集合3面・投影経路を FR-1/FR-4 の患部特定に消費)、`code-structure`(codekb — plugins/ canonical と self-install 投影の編集面確定に消費)。患部の機構詳細は `codekb/amadeus/re-scans/260807-merged-pr-convergence.md`(測定 ref = observed `4a3da7d62`)を正本とする。

## Intent analysis

マージ済み PR しか残っていない unit の pr-convergence-report を、事実に忠実な形(landed)で機械生成できるようにし、override の人間裁定往復と converged:false の虚偽記録を解消する。fail-closed 設計(UNKNOWN never success・CLEAN 必要条件)は縮めず、契約の未定義領域(state=MERGED)に明示の第3状態を新設する。

## Functional requirements

### FR-1. MERGED の観測(gh-runner)
- FR-1.1: `PR_STATE_QUERY`(gh-runner.ts:191-195)へ `state` / `mergedAt` / `mergeCommit { oid statusCheckRollup { state } }` を追加し、`RawPrState`(:76-79)/ predicate 側 parse を拡張する。**AC-1a**: 拡張後クエリがマージ済み PR で state/mergedAt/mergeCommit.oid を返すことを scripted fixture で assert。
- FR-1.2: parse は fail-closed を維持する — `state` の未知値は throw(`MergeStateStatus`/`Mergeable` の既存様式 :117-121/:124-138 と同形)。**AC-1b**: 未知 state 値を注入したテストが throw を assert(落ちる実証を fixture 固定)。

### FR-2. landed 検出と status verb
- FR-2.1: status / report 両 verb は state=MERGED を **resolveMergeable の retry ループより前**に検出して短絡する(intent-capture Q2=A)。**AC-2a**: マージ済み PR に対する status がリトライ待ちなし(sleep seam 呼び出し 0 回)で応答するテスト。
- FR-2.2: landed 時の status は **exit 0**、JSON に landed を示す verdict フィールドを含む(本ステージ Q1=A auto-decision-837ea2da…)。converged との判別は JSON 面で可能に保つ。**AC-2b**: exit 0 + verdict 判別のテスト。
- FR-2.3: 未マージ PR の既存挙動(CLEAN 要求・UNKNOWN リトライ・exit 1/2)は無変更。**AC-2c**: 既存 t446/t448 が無改変 green + 未マージ PR で landed が発火しない負方向テスト。

### FR-3. landed report(report verb)
- FR-3.1: report verb は state=MERGED で `kind: "landed"` の report(`ConvergenceReport` 第3 variant、cli.ts:61-76)を書く。記録内容: pull request 参照・mergedAt・merge SHA(mergeCommit.oid)・`statusCheckRollup.state`(informational — intent-capture Q3=A、landed の成立条件にしない)・generated at。全フィールド機械導出(cli.ts:86-88 原則)。**AC-3a**: landed report の全フィールドが GhSpawn fixture の値から機械導出されることを assert。
- FR-3.2: landed 記録に HUMAN_TURN を要求しない(本ステージ Q2=A auto-decision-bf2a78bd…)。audit emit を伴う場合は audit-before-report 順序(cli.ts:20-25 — 実測 verbatim 確認済み)を踏襲。**AC-3b**: landed 経路が latestHumanTurn を呼ばない(または不在でも成功する)テスト。
- FR-3.3: 非 converged・非 MERGED の refuse(:438-447)と override の already-converged refuse(:468-474)は無変更。override は今後も利用可能(GitHub 到達不能時の人間裁定経路として保存)。**AC-3c**: マージ済み実 PR 相当の scripted GhSpawn fixture で landed report が書かれ、レンダリング(`renderReport` :89-129 の `- label: value` 正書式)がセンサーを PASS する。(AC-3 は AC-3c と読み替える)

### FR-4. センサーの語彙拡張
- FR-4.1: `amadeus-sensor-pr-convergence-report-format.ts` の kind 閉集合(:69)へ `landed` を追加し、整合分岐(:122-130)に landed の規則(converged は false であること・mergedAt / merge SHA の必須実在)を追加する。**AC-4a**: kind=landed の受理と landed 規則違反の finding を単体で assert。
- FR-4.2: core→plugin import 禁止(sensor ヘッダ :16-20)を維持し、drift 防止は t450 の renderReport-fixture 経由で landed ケースを追加。**AC-4b**: landed fixture の PASS + 欠落フィールド/矛盾(landed なのに converged:true)の FAILED を両側実測(落ちる実証)。

### FR-5. stage 文書と docs
- FR-5.1: `plugins/pr-convergence/stages/pr-convergence.md` の `### (5)`(:123-157)に landed 経路を追記し、`## Guardrail` の「Convergence is not merge」(:200-202)と整合する文言(landed = マージの**記録**であり承認ではない)を明記。frontmatter `outputs`(:14)も更新。
- FR-5.2: 対訳・参照 docs の同期対象は「landed / pr-convergence」語彙の repo 全域 grep で棚卸しする(enumeration-completeness の docs 面)。

## Non-functional requirements

- NFR-1(TDD): 各 FR は合意済み seam(t446 純関数 / t448 runCli + scripted GhSpawn / t450 evaluateReportFormat)への失敗テスト1件の Red 実測から始める(team.md Testing Posture)。新規テスト番号は **t481 以降**(RE 実測予約)。
- NFR-2(検証コマンド標準集合): `bun run typecheck` / `bun run lint` / `bash tests/run-tests.sh --ci` / coverage 両ゲート / complexity / 隔離2回ビルド再現性 / `bun run source-only:check`。
- NFR-3(配布境界): 編集正本は repo root `plugins/pr-convergence/` と `packages/framework/core/tools/`(sensor)。`bun run build` で dist + opt-in self-install を再生成し追跡ファイル不変を確認。`.claude/plugins/` は未追跡生成物 — 直接編集禁止。
- NFR-4(台帳波及): cli.ts / predicate.ts / gh-runner.ts への行挿入は coverage-patch-allowlist :6365-6398 の機械 remap + reason 直読照合 + span 膨張検査。census は最終 base で採る。

## Constraints

- `evaluateConvergence`(predicate.ts:180-192)の converged 定義は無変更(「FR-3b」は pr-convergence plugin 設計時(intent 260805-pr-convergence-plugin)の要件 ID で、predicate.ts:176 のコメント実文 `The one place "converged" is defined (FR-3b)` に実在する引用 — 本 intent の FR-3.x とは別番号空間。intent-capture Q1=A の根拠)。
- `MergeStateStatus` / `Mergeable` の fail-closed parse(未知値 throw)を弱めない。
- sensor は advisory 契約(検査結果は常に exit 0、:153-161)を維持。
- engine 本体(orchestrate / state / artifact guard)は無変更 — core 側に "pr-convergence-report" ハードコード 0 件(RE 実測)。

## Assumptions

- GitHub GraphQL はマージ済み PR で `state: "MERGED"` / `mergedAt` / `mergeCommit.oid` を安定して返す(クロスレビュー A の live 実測で確認済み)。
- statusCheckRollup は required/optional を区別しない弱い主張のまま informational 利用に留める(predicate.ts:176-178 の設計意図と整合 — 実測でコメント本文行は 176-178)。

## Out of scope

- マージ時実績の導出(branch-protection 照会・required checks 個別照合)— intent-capture Q1/Q3 で棄却。
- review threads のマージ時点スナップショット再構成 — API 上不能(レビュー B 限界指摘)。
- override 経路・未マージ PR 挙動・engine 本体の変更。
- #2403 / #2397 — 別 Issue。

## Open questions

- なし(方式・適用面・checks 扱い・exit code・HUMAN_TURN 要否はすべて裁定済み — intent-capture Q1〜Q3 + 本ステージ Q1〜Q2)。landed の verdict フィールド名等の微細な形状は functional-design で確定する(実装時判断として明示委譲)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-07T10:52:47Z
- **Iteration:** 1
- **Scope decision:** none

上流裁定(Q1〜Q3)からの逸脱なし、クロスレビュー申し送り3点は全て FR へ転記済み。指摘は識別子不整合・引用行ズレ・AC ラベリング非一貫の軽微精度問題と、スコープ外 file:line の追加検証依頼(FOLLOW-UP)のみでブロッカーなし。

### Findings

- NIT | requirements.md:42 / intent-statement.md: FR-3b という解決不能な参照 — 実在 ID へ張り替え推奨
- NIT | requirements.md Assumptions: predicate 引用が :176-179 vs intent-statement :176-178 で1行ズレ — 実測で統一
- NIT | requirements.md FR-1.1/FR-3.1/FR-3.2/FR-4.1 に専用 AC ラベルなし — ラベリング非一貫
- FOLLOW-UP | requirements.md の cli.ts:20-25 / :460-467 / allowlist:6365-6398 / Mergeable:124-138 引用はスコープ内で裏取り不能 — conductor 実測を要請
- FOLLOW-UP | NFR-1 の t481 予約は base 前進で失効しうる — code-generation 着手時に再実測
