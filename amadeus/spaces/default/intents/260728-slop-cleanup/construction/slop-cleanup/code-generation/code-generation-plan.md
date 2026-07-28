# コード生成計画 — Slop cleanup

## 方針

- `v0.1.6..HEAD` で確定した 3 カテゴリ・5 パスだけを修正し、公開 CLI、directive、audit、observability event の挙動は変えない。
- TypeScript の変更元は `packages/framework/core/` の正本とし、dist 7 面と self-install 5 面は既存の生成コマンドで同期する。生成物は直接編集しない。
- コメントだけの FR-1 と未使用フィールド削除の FR-2 は、指定済みの既存回帰テストで挙動非変更を確認する。新規 runtime テストや test configuration は追加しない。
- 既存の番号回答再発防止変更を保持し、今回の Slop cleanup と混在させたり revert したりしない。

## 実装チェックリスト

- [x] 1. 対象 5 パスの baseline と test configuration を確認する。`git diff` と `rg` で、Journal の失効コメント、`ProcessObservation.registered` の宣言・初期化、Markdown 3 文書の空白ノイズが未修正であることを確認する。`package.json` と既存 Bun test runner で必須回帰テスト 4 件を実行できることを確認し、test configuration は変更しない。〔FR-1〜FR-3、NFR-2、NFR-3〕

- [x] 2. `packages/framework/core/tools/amadeus-journal.ts` のコメントだけを、shared canonical JSONL codec としての責務、および live audit/state path、migration converter、OTLP projector で共有される現行配線を肯定的に説明する文へ更新する。runtime code、型、export を変更せず、失効した「nothing imports it until PR-3」相当の記述が消えたことを差分と `rg` で確認する。〔FR-1、NFR-1、NFR-3〕

- [x] 3. `packages/framework/core/tools/amadeus-observability.ts` から `ProcessObservation.registered` の型フィールドと `true` 初期化子だけを削除する。nullable singleton による first-caller-wins、flush、再 flush の no-op を変更せず、`rg '\bregistered\b' packages/framework/core/tools/amadeus-observability.ts` が 0 件になることを確認する。〔FR-2、NFR-1、NFR-3〕

- [x] 4. Markdown 3 文書の本文を変えずに空白ノイズだけを除去する。`260727-solo-election/.../code-generation-plan.md` の trailing spaces と、`docs/reference/18-workspace-layout.md`、`docs/reference/18-workspace-layout.ja.md` の余分な EOF blank line を修正し、対象 5 パス限定の `git diff --check` を成功させる。〔FR-3、NFR-2、NFR-3〕

- [x] 5. core 正本の修正後、`bun run dist` と `bun run promote:self` で dist 7 面・self-install 5 面を再生成する。生成投影を手編集せず、別件の番号回答再発防止変更も同じ生成結果に保持されることを差分で確認する。〔FR-4、NFR-3〕

- [x] 6. 既存の必須回帰テストを実行する。`tests/unit/t352-journal-codec.pbt.test.ts`、`tests/unit/t351-audit-record-seams.test.ts`、`tests/integration/t356-journal-convert.test.ts`、`tests/integration/t357-observability-seam.test.ts` を同一の `bun test` 呼び出しで成功させ、Journal serialize/parse/identity、audit seam、migration conversion、process observation の first-caller-wins/flush/idempotence が維持されたことを確認する。新規テストファイルは作成しない。〔FR-1、FR-2、NFR-1、NFR-2〕

- [x] 7. 最終品質ゲートを実行する。`bun run typecheck`、core 2 ファイルへの `bunx @biomejs/biome check`、`bun run dist:check`、`bun run promote:self:check`、`git diff --check` を順に成功させる。既存 lint warning は解消対象にせず、失敗が今回の変更に由来する場合だけ該当箇所を外科的に修正して再検証する。〔FR-1〜FR-4、NFR-1〜NFR-3〕

- [x] 8. 最終差分を対象別にレビューし、Slop cleanup の正本 2 ファイル、生成投影、Markdown 3 文書、Amadeus 成果物以外に今回起因の変更がないことを確認する。別件の番号回答再発防止変更との境界と、計画からの差異・残件を `code-summary.md` に記録する。〔NFR-3〕

## 完了条件

- Journal コメントが現行配線を肯定的に説明し、失効記述がなく、runtime 行は変更されていない。
- `ProcessObservation.registered` が宣言・初期化ともに消え、必須 observability 回帰テストが成功している。
- Markdown 3 文書は本文不変のまま空白ノイズだけが除去されている。
- core、dist 7 面、self-install 5 面が既存生成経路で同期し、drift check が成功している。
- 必須回帰テスト 4 件、typecheck、対象 Biome check、`dist:check`、`promote:self:check`、`git diff --check` がすべて成功している。
- 番号回答再発防止の別件変更を revert・改変せず、今回の変更行が FR-1〜FR-4 に追跡できる。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-28T14:42:38Z
- **Iteration:** 1
- **Scope decision:** none

実装・検証の要件追跡は概ね揃っているが、scope の誤記と変更境界を監査できない成果物一覧不足のため承認できない。

### Findings

- Code Generation の実行 scope は amadeus-bugfix だが、code-summary.md は amadeus-refactor として実装したと明記しており、実行コンテキストと成果物の分類が矛盾している。
- code-summary.md は dist 7面・self-install 5面を抽象的に列挙するだけで実際の作成・変更ファイルをパス単位で記録しておらず、さらに番号回答再発防止など別件差分を生成面へ保持したと認めているため、今回の変更と既存変更の境界および NFR-3 の局所性を第三者が検証できない。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-28T14:44:01Z
- **Iteration:** 2
- **Scope decision:** none

前回の2指摘は解消され、amadeus-bugfix の scope、生成先24ファイル、別件差分との境界が明記されて要件追跡と監査が可能になった。

### Findings

- None
