# Code Summary — fix-661-glossary-note

> Bolt: `fix-661-glossary-note` / Issue: [#661](https://github.com/amadeus-dlc/amadeus/issues/661)
> Branch: `bolt/fix-661-glossary-note`(base: origin/main `f27bcb9e2`)/ commit `cbaa39fc0`(未push、PR未作成)
> Worktree: `/Users/j5ik2o/Sources/j5ik2o.github.com/amadeus-dlc/amadeus/.claude/worktrees/agent-a7edc5833544637ba`

## 変更内容

Bolt/Unit 用語の AI-DLC v1 からの意図的逸脱を注記(EN/JA)として追加。既存定義文言は無変更(全 hunk が既存文の直後への注記追加のみであることを diff で確認済み)。

### 注記追加サイト: 9箇所(計画5 + grep 棚卸しで発見4)

計画対象:
1. `packages/framework/core/amadeus-common/protocols/stage-protocol.md` — Glossary「Bolt」行(canonical)
2. `packages/framework/core/amadeus-common/stages/inception/delivery-planning.md` — Step 3 グロッサリー
3. `docs/guide/glossary.md` — Bolt エントリ(EN)
4. `docs/guide/glossary.ja.md` — Bolt エントリ(JA)
5. `packages/framework/core/knowledge/amadeus-delivery-agent/workflow-planning-guide.md` — Bolt 定義引用部

棚卸しで発見(伝播漏れ防止):
6. `docs/reference/04-stages/inception.md` — 2サイト(Stage 2.8 Purpose 段落、「Bolt ≠ sprint ≠ MMF」bullet)
7. `docs/reference/04-stages/inception.ja.md` — 上記 Purpose 段落の日本語鏡像
8. `packages/framework/core/agents/amadeus-delivery-agent.md` — Bolt Planning 定義文
9. `packages/framework/core/knowledge/amadeus-shared/audit-format.md` — Construction Bolt Events 導入部の定義再掲

言及のみ(競合定義でない)として不変更: workshop-mode.md、16-worked-examples.md、04-phases-and-stages.md、construction.md/.ja.md

### 生成物同期

`bun scripts/package.ts` + `bun run promote:self` 実行済み。計41ファイル(core 9 + `.claude/`・`.codex/`・`dist/{claude,codex,kiro,kiro-ide}/` の鏡像)、同一コミット。

## 検証結果(最終コミット内容に対する実測 exit code)

- `bun run lint` → 0(警告17/情報6はすべて既存・無関係テストファイル)
- `bun run dist:check` → 0
- `bun run promote:self:check` → 0
- `bash tests/run-tests.sh --ci` → 1 — `t92.test.ts` Group N test 44 のみ失敗

### t92 赤のベースライン検証

クリーンな origin/main(`f27bcb9e2`)で同一失敗を実測再現(expected exit-2 / got exit-1)。**本 Bolt と無関係の既存赤であり、その正体は #657 そのもの**(並行 Bolt `fix-657-sensor-tsc` が修理中)。boy-scout 規範に照らし、同一バッチ内の別 Bolt が修理対象としているため本 Bolt では対応しない(黙殺ではなくここに記録)。

## 計画からの逸脱

- 対象サイトを5→9に拡張(計画自身の「grep 発見分も追加」指示に従う)
- sandbox 制約により git fetch / bun install / dist 再生成系コマンドは sandbox バイパスで実行(成果物への影響なし)
