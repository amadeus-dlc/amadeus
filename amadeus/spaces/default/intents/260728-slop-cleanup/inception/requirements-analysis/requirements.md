# 要件定義 — Slop cleanup

## Intent 分析

`v0.1.6` から observed HEAD `ca8ff0af40d6250edffe42246d3f5538819c22af` までに混入した、機能価値を持たない 3 カテゴリ・5 パスの Slop を除去する。目的は、実装と矛盾する説明、状態を表さない未使用フィールド、レビューを妨げる空白ノイズを、既存挙動を変えずに解消することである。

本要件は `amadeus/spaces/default/codekb/amadeus/business-overview.md` の業務境界、`architecture.md` の生成面・process observation 相互作用、`code-structure.md` の正本と投影先の配置に基づく。ユーザー要求の正本は audit の `WORKFLOW_STARTED.Request` である。

## 機能要件

### FR-1: Journal codec の説明を現行配線へ合わせる

`packages/framework/core/tools/amadeus-journal.ts:9-13` は、codec が未配線であるという失効記述を削除し、現行の責務と消費関係を正確に説明しなければならない。

- 優先度: Must
- 根拠: PR-3 `748e693e3` は着地済みで、audit / state / lib / journal-convert / otel-projector の 5 canonical module が import している。
- 受け入れ基準:
  - Given 現行 HEAD の Journal codec
  - When コメントを正本から読む
  - Then コメントが本モジュールを shared canonical JSONL codec として説明する
  - And live audit/state path、migration converter、OTLP projector で共有される現在の消費関係を肯定的に記載する
  - And 「nothing imports it until PR-3」に相当する失効記述が存在しない
  - And runtime code、型、export は変更されていない

### FR-2: 未使用の process observation フィールドを除去する

`ProcessObservation.registered` の型フィールドと `true` 初期化子を削除しなければならない。

- 優先度: Must
- 根拠: `registered` は宣言・代入以外に読取がなく、登録状態は `_processObservation !== null` が表す。
- 受け入れ基準:
  - Given process observability の初期化と flush
  - When `registered` を削除した実装を実行する
  - Then first-caller-wins、flush、再 flush の no-op が維持される
  - And `rg '\bregistered\b' packages/framework/core/tools/amadeus-observability.ts` は 0 件になる

### FR-3: 確定済み Markdown whitespace を除去する

次の空白ノイズを除去しなければならない。

1. `amadeus/spaces/default/intents/260727-solo-election/construction/solo-election-core/code-generation/code-generation-plan.md:3` の trailing spaces
2. `docs/reference/18-workspace-layout.md` の余分な EOF blank line
3. `docs/reference/18-workspace-layout.ja.md` の余分な EOF blank line

- 優先度: Must
- 受け入れ基準:
  - Given `v0.1.6..HEAD` で確定した対象 3 diagnostics
  - When 3 文書を修正する
  - Then 対象5パス限定の `git diff --check` が 0 diagnostics になる
  - And 日英文書の本文内容は変わらない

### FR-4: 正本と生成面を同期する

core 正本 2 ファイルの修正は、既存の package / self-promotion 経路を使って dist 7 面と self-install 5 面へ同期しなければならない。

- 優先度: Must
- 受け入れ基準:
  - Given core 正本の修正
  - When package と self-promotion を実行する
  - Then `dist:check` と `promote:self:check` が成功する
  - And 生成物を直接編集した差分が存在しない

## 非機能要件

### NFR-1: 挙動非変更

公開 CLI、directive、audit、observability event の契約を変更してはならない。次の既存テストを必須回帰群とする。

- `tests/unit/t352-journal-codec.pbt.test.ts` — Journal codec の serialize / parse / identity 不変量
- `tests/unit/t351-audit-record-seams.test.ts` — audit record と Journal entry の境界
- `tests/integration/t356-journal-convert.test.ts` — Markdown shard から Journal への変換
- `tests/integration/t357-observability-seam.test.ts` — process observation の first-caller-wins / flush / idempotence

FR-1 はコメントだけの是正で runtime 契約を追加しないため、新規 runtime テストは作らない。肯定的記述、失効語彙の不在、runtime 行の無変更を差分と `rg` で検証し、既存 Journal 回帰群で非変更を確認する。

### NFR-2: 検証可能性

少なくとも次を実行し、exit code から合否を確定しなければならない。既存 lint warning は今回の成功として解消扱いにしない。

```bash
bun run typecheck
bun test tests/unit/t352-journal-codec.pbt.test.ts tests/unit/t351-audit-record-seams.test.ts tests/integration/t356-journal-convert.test.ts tests/integration/t357-observability-seam.test.ts
bunx @biomejs/biome check packages/framework/core/tools/amadeus-journal.ts packages/framework/core/tools/amadeus-observability.ts
bun run dist:check
bun run promote:self:check
git diff --check
```

### NFR-3: 変更の局所性

変更は FR-1〜FR-4 に直接 trace できる行だけに限定する。巨大 tool file の分割、既存 complexity warning、一般的な whitespace CI gate の新設は含めない。

## 制約

- TypeScript / ESM / Bun / Biome の既存設定を維持する。
- core 正本を先に変更し、投影物は生成コマンドで同期する。
- 既存の番号回答再発防止変更を revert・改変しない。
- `amadeus/` 配下の成果物は日本語で記録する。

## 前提

- `v0.1.6` は `68f2d6699ccb8148c0427b1ff56d37116e565f89` を指す。
- 確定5パスは実装開始前に未コミット差分を持たず、別件変更と分離されている。
- `ProcessObservation.registered` の削除は、nullable singleton による既存状態機械を変えない。

## スコープ外

- 番号回答を意味的選択肢へ解決する別件修正とその `codex exec` E2E
- 既存295件の Biome warning
- 巨大 tool file の分割・アーキテクチャ再編
- repository 全体へ適用する新しい whitespace gate
- Journal / observability の新機能または公開契約変更

## トレーサビリティ

| 要件 | 実装対象 | 検証 |
| --- | --- | --- |
| FR-1 | `amadeus-journal.ts` コメント | 肯定的な現行説明、失効語彙検索、t351/t352/t356、typecheck、dist drift |
| FR-2 | `amadeus-observability.ts` 型・初期化子 | t357、参照0件、typecheck |
| FR-3 | Markdown 3文書 | 対象限定 `git diff --check` |
| FR-4 | dist 7面・self-install 5面 | `dist:check`、`promote:self:check` |
| NFR-1〜3 | 全変更差分 | 対象テスト、Biome、差分レビュー |

## Open questions

なし。対象、期待結果、非対象、検証境界は Reverse Engineering とユーザー指示から一意に確定している。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-07-28T14:27:26Z
- **Iteration:** 1
- **Scope decision:** none

FR-1の肯定的な完了条件と Journal codec のテスト対象を具体化する必要がある。

### Findings

- FR-1は失効記述の不存在しか検証せず、コメント全体を削除しても基準を満たす。canonical codec と現行5消費者の関係を肯定的に観測できる基準が必要。
- NFR-1/NFR-2の Journal codec 対象テストが具体化されていない。必須テストID・パス・実行方法と、新規回帰テスト要否を明記する必要がある。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-07-28T14:28:36Z
- **Iteration:** 2
- **Scope decision:** none

前回2件の指摘は解消された。FR-1の肯定条件、必須回帰テスト4件、実行コマンド、新規 runtime test 不要の根拠が明記され、開発とQAを開始できる。

### Findings

- None
