# Requirements — 260802-scope-grid-face-sync(#2033)

上流入力(consumes 全数): business-overview.md、architecture.md、code-structure.md

> 承認系譜: (1) Issue #2033 クロスレビュー2名 CONFIRMED_WITH_REFINEMENTS(target-sha 47574fbab、2026-08-02) (2) intent birth 時のユーザー裁定「self-fix intent で止血+再発防止」(2026-08-02) (3) 本ステージ Q1/Q2 裁定(requirements-analysis-questions.md、ユーザー承認 2026-08-02T10:39:32Z — Q1「当初のスコープを縮めるのは NG」/ Q2「A」)。

## Intent analysis

2026-07-28 の self-feature lightening 裁定(4ステージを SKIP へ)が `.claude` 面にのみ着地し、他4 dogfood 面(`.codex`/`.cursor`/`.kimi-code`/`.opencode`)が裁定前の姿で残存している(business-overview.md の現在節が示す #2033 修正 intent の背景)。その結果、kimi ハーネスで birth した intent が廃止済み4ステージを実行した(被害2件実測)。ゴールは2つ:

1. **止血** — 4面の値と prose を裁定済みの `.claude` 面へ整合させ、ユーザー裁定がハーネス選択に依らず効く状態へ回復する
2. **再発防止** — 「self-* の面間乖離を検出するコードがリポジトリに1行も存在しない」(architecture.md のガード3層機序: promote-self の extras verbatim 保持 `scripts/promote-self.ts:151`/`:156`、compile --check の単一面検査 `amadeus-graph.ts:330-332`、センサーの名前集合比較 `amadeus-sensor-self-scope-consistency.ts:153-172`)を、CI blocking の parity テスト+センサーの値比較拡張で塞ぐ

## Functional requirements

### FR-1: grid 止血(4セル×4面)

`.codex`/`.cursor`/`.kimi-code`/`.opencode` の `tools/data/scope-grid.json` で、`self-feature` の `feasibility` / `approval-handoff` / `practices-discovery` / `nfr-requirements` を `EXECUTE` → `SKIP` へ変更する(`.kimi-code` の該当行 :405/:409/:411/:419 — code-structure.md の患部配置表)。**`formal-model-check` キーは4面へ追加しない** — `.claude` 限定の意図的非対称(一次根拠 `amadeus-graph.ts:1375`/`:1387` の設計コメント、導入 242e4175a)。変更は当該4セルのみ(キー順・他セル不変)。

- 受け入れ基準: 4面の self-feature EXECUTE 数が 18→14 になり、`.claude`(15、formal-model-check +1 を含む)と共有キー上で全セル一致する。

### FR-2: prose 止血(3ファイル×4面)

`scopes/amadeus-self-feature.md`(17行差)/ `amadeus-self-document.md`(4行差)/ `amadeus-self-refactor.md`(4行差)を `.claude` 版の内容で4面へ同期する。`amadeus-self-fix.md` は既に0行差のため変更しない。

- 受け入れ基準: 同期後、self-* 4 prose すべてが5面 byte 一致。

### FR-3: parity テスト t413(CI blocking の常設ガード — Q2 裁定 A)

`tests/integration/t413-self-scope-face-parity.test.ts` を追加する。検査は3面:
(a) self-* 4 scope の grid 行が5面すべてに存在する(存在の非対称検出 — Q1 裁定で維持)
(b) 5面すべてが共有する stage キー上でセル値が一致する(共有キーの交差集合 — plugin compose が mint する面局所キー(`formal-model-check`)は交差から機序的に外れるため恒常赤にならない)
(c) self-* 4 prose が5面 byte 一致する

- 落ちる実証: 止血前状態での赤は**実測済み**(bolt ブランチ `fix/2033-self-scope-grid-face-sync` @ 0009e5fff — cell 乖離4件+prose 乖離12ファイルを検出)。PR には止血後 green と、片面注入で赤くなる実証を含める。
- `tests/run-tests.sh --ci` の integration 層に載ることで CI blocking になる(既存ブロッキング集合への追加のみ、新規 CI ステップなし)。

### FR-4: センサー値比較拡張(advisory 維持 — Q2 裁定 A)

正本 `packages/framework/core/tools/amadeus-sensor-self-scope-consistency.ts` を「名前集合比較」から「面間内容比較」へ拡張する:

- `readGridScopes`(:110-137)の :115 で parse 済みの `stages` を retain し、snapshot(`HarnessSnapshot` :41-46 / `SurfaceSnapshot` :48-51)へ値を運ぶ
- cross-face 比較は `evaluateSelfScopeConsistency`(:174-211)の flatMap(:190-204)直後に新設する(snapshots 全件が揃う唯一の場所 — code-structure.md の挿入点表)
- 比較は**面間一致を不変条件とする**(FR-3 (b) と同じ共有キー交差)。期待セル値の定数化は禁止 — `EXPECTED_SELF_SCOPES`(:12-17)のような第2正本を値について作らない
- prose parity: `inspectScopeFile`(:60-94)で読んだ本文を retain し、面間 byte 比較する
- `Finding` 型(:26-32)へ新 reason(`cell-mismatch` / `body-mismatch`)と `stage` / `expected` / `actual` フィールドを追加し、manifest の `output_schema` を対で更新する
- `default_severity: advisory` は維持する(Q2 裁定 A)
- 受け入れ基準: 片面のセル値注入で `cell-mismatch`、片面の prose 注入で `body-mismatch` が findings に現れ(FR-6 の落ちる実証)、止血後の実リポジトリでは findings 0 / pass true(FR-6 の corpus sweep)。期待値定数は diff 上に現れない(第2正本なしの機械確認)。

### FR-5: manifest 文言是正

`packages/framework/core/sensors/amadeus-self-scope-consistency.md` :37-38 の「release-blocking は package/promotion drift guards」を実態(本件盲点の実測)に合わせ、「release-blocking は t413 parity テスト、本センサーは write-time の advisory 早期検知」へ是正する。検査内容の記述(名前集合→値比較)も現行実装に合わせて更新する。

- 受け入れ基準: manifest 本文に t413 への参照が存在し、「drift guards が release-blocking」の旧文言が残存しない(grep 機械確認)。

### FR-6: センサーテストの更新と落ちる実証

既存 `tests/integration/t-self-scope-consistency-sensor.test.ts` の fixture `seedHarness`(:22-34)は grid を空 `stages` で seed しており、値比較を追加すると vacuous に通る(code-quality-assessment.md)。fixture を実値 seed へ更新し、次を追加する:

- 落ちる実証: 片面だけセル値を変えた fixture で `cell-mismatch`、片面だけ prose を変えた fixture で `body-mismatch` が findings に出ることを assert(注入は実行時に消費される値へ)
- corpus sweep: 止血後の実リポジトリ5面に対してセンサーを実行し findings 0 / pass true(正当な現物で赤くならないこと — 意図的非対称の機序除外の実証を兼ねる)
- 受け入れ基準: 既存6テストが実値 seed の fixture で green を維持し、上記の落ちる実証2件+corpus sweep 1件が新規テストとして green(赤の実測ログを PR に添付)。

### FR-7: 変更の投影同期

センサー正本(packages/framework/core/tools/)と manifest 正本(packages/framework/core/sensors/)の変更後、`bun scripts/package.ts` で dist を再生成し `bun run promote:self` で5面の self-install コピーへ投影する(現状5面コピーは byte 一致 — code-structure.md)。grid / prose は workspace-local のため5面直編集が正(dist に載らない設計 — `scripts/package.ts:147-148`)。

- 受け入れ基準: `bun run dist:check` と `bun run promote:self:check` がともに exit 0。

## Non-functional requirements

- 既存 CI ブロッキング集合(typecheck / lint / dist:check / promote:self:check / run-tests --ci / coverage gates)を全て green に維持する
- dist 配下・stock 10 scope・self-fix scope の値は一切変更しない(diff で不変を確認)
- センサーの実行時間は manifest の `timeout_seconds: 5` 内に収まること(5面×数ファイルの読取+比較のみで十分)
- t89:139/:366・t93:106 の sensor id pin を壊さない(id・manifest 名は不変)

## Constraints

- 1 Issue = 1 intent(#2033 のみ。#2019 の kind-pruning、installer-distribution は別)
- Bolt 実装は worktree 分離(solo-bolt-worktree-required)。既存 WIP(ブランチ `fix/2033-self-scope-grid-face-sync` @ 0009e5fff: t413 3検査+grid 4セル同期済み、prose 未同期)を bolt ブランチとして継続してよい
- TDD 既定(tdd-default-with-narrow-exceptions): FR-3 の Red は実測済み。FR-4 は fixture の Red(FR-6)を先行させてから実装する
- コミットメッセージは英語、成果物・Issue・PR は日本語

## Assumptions

- `self-feature.formal-model-check`(`.claude` のみ EXECUTE)は意図的非対称(`amadeus-graph.ts:1375`/`:1387`、242e4175a)— 同期・検出対象外
- `installer-distribution` の3面不在も意図的/未裁定の別件(Q1 裁定)— 本 intent では touch しない
- 患部9パスは base..observed 区間で無変化(RE 実測)のため、observed 47574fbab 基準の file:line がそのまま有効

## Out of scope

- installer-distribution scope の対称化・workspace-local scope の正本設計(**別 Issue として起票する** — Q1 裁定。installer-distribution は Issue #2033 の当初スコープに元々含まれておらず、存在の非対称は値乖離と別クラスの欠陥のため、本件を扱わないことは「当初スコープを縮めない」裁定と両立する)
- センサー default_severity の blocking 昇格・CI への sensor 実行ステップ追加(Q2 裁定 A)
- grid/prose 正本の packages/framework/core への移設(dist 経由で7ハーネスへ漏れる — 設計禁止事項)
- 被害 intent record(260729-otel-upstream / 260801-tla-multi-model)の遡及修正(record は履歴)
- `amadeus-graph.ts:1409` の `in` 演算子問題(reviewer-2 指摘の同根別バグ — 別 Issue 判断)

## Open questions

- なし(実装細目 — 新規テストの採番は t413 予約済み、既存無番号センサーテストは温存 — は code-generation の plan で確定する)

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-02T10:46:52Z
- **Iteration:** 1
- **Scope decision:** none

必須7節が揃い、FR-1〜FR-7 は #2033 の止血(grid+prose)と再発防止(t413/センサー拡張/manifest/fixture)を過不足なくテスト可能に固定。file:line 引用は codekb 現在節と一致、Q1/Q2 裁定の転記も原文どおりで矛盾なし。

### Findings

- [Minor] requirements.md Out of scope — installer-distribution 除外と「スコープを縮めない」裁定の両立論理の明記を推奨(是正済み: 当初スコープ非含有の一文を追加)
- [Minor] requirements.md FR-4〜FR-7 — 「受け入れ基準:」ラベルの書式統一を推奨(是正済み: 各 FR へ AC 行を追加)
- [Minor] requirements.md — :405/:409 等と seedHarness(:22-34) の引用は re-scans 由来(レビュー読取範囲外)だがプロジェクト慣行と整合、非ブロッキング
