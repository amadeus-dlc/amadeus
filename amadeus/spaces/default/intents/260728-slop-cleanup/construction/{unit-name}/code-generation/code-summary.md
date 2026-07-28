上流入力(consumes 全数): code-generation-plan, requirements

# コード生成サマリー — Slop cleanup

`code-generation-plan.md` と `requirements.md` の FR-1〜FR-4、NFR-1〜NFR-3 を、実行 scope `amadeus-bugfix` で実装した。新規 runtime テストおよび test configuration は追加していない。

## 実装内容

| 対象 | 内容 |
| --- | --- |
| `packages/framework/core/tools/amadeus-journal.ts` | 失効した未配線コメントを、shared canonical JSONL codec と live audit/state path、migration converter、OTLP projector の現行消費関係を肯定的に説明するコメントへ更新。runtime code、型、export は不変更 |
| `packages/framework/core/tools/amadeus-observability.ts` | 未使用の `ProcessObservation.registered` 宣言と `true` 初期化だけを削除。nullable singleton による first-caller-wins、flush、再 flush no-op は維持 |
| Markdown 3文書 | solo-election の code generation plan から trailing spaces を除去し、workspace layout の英日2文書から余分な EOF blank line を除去。本文は不変更 |
| dist 7面 | `bun run dist` で claude、codex、cursor、kimi、kiro、kiro-ide、opencode の生成面を正本から再生成 |
| self-install 5面 | `bun run promote:self` で claude、codex、cursor、kimi、opencode のプロジェクトローカル面を正本から再生成 |

## 生成先の実変更ファイル

次の24ファイルにある `amadeus-journal.ts` のコメント差分と `amadeus-observability.ts` の `registered` 削除差分だけが、今回の Slop cleanup に起因する生成差分である。

### dist 7面

| Harness | Journal | Observability |
| --- | --- | --- |
| claude | `dist/claude/.claude/tools/amadeus-journal.ts` | `dist/claude/.claude/tools/amadeus-observability.ts` |
| codex | `dist/codex/.codex/tools/amadeus-journal.ts` | `dist/codex/.codex/tools/amadeus-observability.ts` |
| cursor | `dist/cursor/.cursor/tools/amadeus-journal.ts` | `dist/cursor/.cursor/tools/amadeus-observability.ts` |
| kimi | `dist/kimi/.kimi-code/tools/amadeus-journal.ts` | `dist/kimi/.kimi-code/tools/amadeus-observability.ts` |
| kiro | `dist/kiro/.kiro/tools/amadeus-journal.ts` | `dist/kiro/.kiro/tools/amadeus-observability.ts` |
| kiro-ide | `dist/kiro-ide/.kiro/tools/amadeus-journal.ts` | `dist/kiro-ide/.kiro/tools/amadeus-observability.ts` |
| opencode | `dist/opencode/.opencode/tools/amadeus-journal.ts` | `dist/opencode/.opencode/tools/amadeus-observability.ts` |

### self-install 5面

| Harness | Journal | Observability |
| --- | --- | --- |
| claude | `.claude/tools/amadeus-journal.ts` | `.claude/tools/amadeus-observability.ts` |
| codex | `.codex/tools/amadeus-journal.ts` | `.codex/tools/amadeus-observability.ts` |
| cursor | `.cursor/tools/amadeus-journal.ts` | `.cursor/tools/amadeus-observability.ts` |
| kimi | `.kimi-code/tools/amadeus-journal.ts` | `.kimi-code/tools/amadeus-observability.ts` |
| opencode | `.opencode/tools/amadeus-journal.ts` | `.opencode/tools/amadeus-observability.ts` |

## 検証結果

- 必須回帰テスト4ファイル: 55 pass / 0 fail / 725 expect
- `bun run typecheck`: PASS
- `bunx @biomejs/biome check packages/framework/core/tools/amadeus-journal.ts packages/framework/core/tools/amadeus-observability.ts`: PASS
- `bun run dist:check`: PASS（7 harness）
- `bun run promote:self:check`: PASS（5 harness）
- `git diff --check`: PASS
- `rg '\bregistered\b' packages/framework/core/tools/amadeus-observability.ts`: 0件
- Journal の失効語彙検索: 0件

## 変更境界

今回の正本変更は TypeScript 2ファイルと Markdown 3文書に限定した。生成面は直接編集せず、既存コマンドから同期した。上表24ファイル以外の生成先変更は、作業開始時から存在した番号回答再発防止の別件差分に起因し、今回の Slop cleanup の変更として扱わない。具体的には `amadeus-directive.ts`、`amadeus-orchestrate.ts`、各 harness の `skills/amadeus/SKILL.md` および Codex の `question-rendering.md` にある変更であり、今回の実装では内容を改変せず、生成コマンドによる投影時にも保持した。Codex live E2E の GitHub Actions 強制 skip、Reverse Engineering／requirements 成果物の別件差分も revert・改変していない。

## 計画からの逸脱

なし。

## 残件

なし。
