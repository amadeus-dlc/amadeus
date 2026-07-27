# Requirements — 260726-answer-manual-binding(Issue #1548)

上流入力(consumes 全数): business-overview.md(prompt モード主要機能の回答不能という事業影響)、architecture.md(answer/guard/handlePromptAnswer 経路断面 — FR-1 の機序根拠)、code-structure.md(対象モジュール配置と配布13コピー)— codekb 260726-answer-manual-binding 断面(observed `ad1ff5de9`)。詳細事実は record 内 scan-notes.md。宣言 consumes のうち intent-statement / scope-document / team-practices(いずれも required:false)は本 intent の bugfix スコープで該当ステージが SKIP のため不存在 — N/A(捏造補完しない)。

## Intent 分析

manual-boundary の ask(reconciliation 経由で `expectedPrompt.event.boundary.kind === "manual"` になった prompt)への `answer approve/skip` が、`runMirrorLifecycleAnswer`(amadeus-mirror-lifecycle.ts:969-985)の転送欠落(manualOperation/invocationId を渡さない)× 冒頭 guard(:257-265)の answer 非免除により常に失敗し、stale expectedPrompt が以後の全 boundary sync を state-write safety-block にする(#1548、クロスレビュー 2/2 CONFIRMED+repo外 scratch 決定的再現)。**目標は ask/answer 往復の回復**(文書化済み仕様への回復 = バグ修正)。

- 種別: バグ修正 / スコープ: amadeus-bugfix / 深度: Minimal / ラベル: P1/S2-CRITICAL
- 裁定: Q1 = A(answer 側で永続値補填、guard 不変)— questions「裁定の記録」参照

## 機能要件

### FR-1: answer 側の manual フィールド補填(裁定 Q1=A)
`runMirrorLifecycleAnswer` の boundary 転送(:969-985)で、`expected.event.boundary.kind === "manual"` のとき `manualOperation = expected.operation`、`invocationId = expected.event.boundary.instance` を request へ補填する。
- 根拠(RE 確定): manual 経路の元値は `parseManualArgs`(:445-447)で `invocationId === boundary.instance`・`manualOperation === operation` — 永続値からの再構成は元値と厳密一致
- guard(:257-265)・coordinator は無変更(「manual boundary リクエストは常に id を携行する」不変条件を全経路で維持)
- 受け入れ基準: manual-boundary ask への `answer approve` が guard を通過して `handlePromptAnswer` に到達し、expectedPrompt を consume して decision を実行する。`answer skip` は expectedPrompt を consume して skip する。非 manual boundary の answer 挙動は不変

### FR-2: リグレッションテスト(regression-first — テスト gap の閉包)
t282 に **manual ask→answer 往復の貫通テスト**を新設(RE 確定の gap)。再現シードは実機序どおり: 先行 manual create が非終端 receipt を残す → 後続 prompt モード boundary が reconciliation で manual event の ask を発行(`expectedPrompt.event.boundary.kind === "manual"` を assert)→ その bindingId へ answer。
1. **approve 往復**: 現行コードでは `Manual Mirror lifecycle requires an operation and invocation ID` で赤(#1548 verbatim 再現)→ 修正後は consume+実行で green
2. **skip 往復**: 現行赤 → 修正後 consume で green
3. **封鎖解除の実証**: stale expectedPrompt 残存下の次 boundary が `expected prompt could not be persisted`(state-write safety-block)になる連鎖を修正前に固定し、修正後は answer 消費後の次 boundary が正常進行することを確認
- 受け入れ基準: 3ケースとも修正前に対象分岐へ実到達して赤(assertion 実文で確認)→ 修正後 green。既存 t282(998行)の全テストはグリーン維持

### FR-3: guard negative テストの維持
既存の guard 発火テスト(t282:435 — answer なし manual + 欠落 → error)がグリーン維持されること(guard 防御の非毀損の固定)。

### FR-4: Issue クローズ
- 受け入れ基準: PR main 着地実測後、#1548 へ修正機序(補填値の一致根拠)・stale 遡及ゼロ(committed record 5件全 null — 回復手順不要)の確認結果を記録してクローズ(close-after-landing)

## 非機能要件

- **NFR-1 配布同期**: 正本(amadeus-mirror-lifecycle.ts、13コピー)変更後 `bun scripts/package.ts`+`bun run promote:self`、`dist:check`/`promote:self:check` グリーン
- **NFR-2 検証ゲート**: typecheck / lint / run-tests.sh --ci / coverage:ci グリーン、lcov patch 未カバー 0(t282 は lifecycle を in-process 駆動する既習様式 — 補填行は計測される)
- **NFR-3 CLI 契約不変**: answer verb の引数契約(**必須**引数は `--binding-id` のみ — 既存の任意フラグ `--repo`/`--space`/`--intent`/`--project-dir` を含め全フラグ集合は不変)・出力様式・exit code は不変。変わるのは manual-boundary ask への挙動(error → 正常 consume)のみ

## 制約

- 変更は surgical: runMirrorLifecycleAnswer の補填+テストのみ。guard・coordinator・policy・reducer・types は無変更
- 新 verb・互換シム禁止。遡及修復機構は作らない(stale 残存ゼロを RE で確定済み — 不要なリスク対策は負債)

## 前提

- answer 経路(handlePromptAnswer 以降)は manualOperation/invocationId を参照しない(coordinator :292-303/:509-558 — RE 確定)。補填はあくまで guard 充足のためで、意味論は prompt-approved 権限で処理される
- #1553/#1557 と対象ファイル非交差(lifecycle answer/guard 面は両 PR の diff 外)

## Out of scope

- guard 免除方式(Q1 で B 案棄却)
- expectedPrompt の遡及修復 verb(残存ゼロにつき不要)
- reconciliation・policy の挙動変更

## Open questions

- なし(Q1 裁定済み)

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-07-27T00:24:20Z
- **Iteration:** 1
- **Scope decision:** none

FR-1〜4・NFR-1〜3 とも実測可能、file:line 引用は HEAD ad1ff5de9 で全数 verbatim 一致、Q1=A 裁定の無申告逸脱なし、検証劇場・免責の抜け道なし。Minor 2件(NFR-3 の引数契約表現を必須/任意で精密化、SKIP 上流3成果物の N/A 注記)は conductor が是正済み。

### Findings

- [Minor/是正済み] NFR-3 の「--binding-id のみ」を「必須引数は --binding-id のみ(任意フラグ集合は不変)」へ精密化
- [Minor/是正済み] 宣言 consumes のうち SKIP ステージ由来3成果物(required:false)の N/A 注記を冒頭へ追加
