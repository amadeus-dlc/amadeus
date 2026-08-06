# Code Summary — fix-2251-completion-directive

上流入力(consumes 全数): requirements.md, architecture.md, code-structure.md

- 測定 ref: ブランチ `worktree-agent-a53fdd65a73c79b15`、HEAD `28e1d0925`、base `26984d38b`（着手時の origin/main）
- 数値はすべてコマンド出力からの転記（`cid:requirements-analysis:numbers-from-command-output-only`）

## 何を変えたか

completion 未コミット窓を、`error` directive（`ERROR_LOGGED` / `amadeus.operation.failed` を伴う）から
新設 typed kind **`await-completion`** による「正規の待ち状態」へ移した。抑止側（`recordEngineError` の
条件を狭める）は FR-3d により採らず、#839 の error 記録契約は無改変のまま維持している。

判別軸は例外型 `WorkflowCompletionNotSettledError`（`amadeus-workflow-completion.ts` で新設）。
**「Goal 作業をやり直せば解ける = settle 待ち」だけを新 kind へ移し、壊れた state（Scope 欠落、
Intent record 未解決、lineage 矛盾など）は error 経路と監査証跡を維持する**。この非対称は
`t453` の第5ケース（malformed state は ERROR_LOGGED が +1 される）で両側実測している。

## 変更ファイル

| ファイル | 変更 |
|---|---|
| `packages/framework/core/tools/amadeus-directive.ts` | 新 kind `await-completion`（`{kind, reason}`）を union / `VALID_KINDS` / 許可キー / フィールド検査 / self-check 例の6面へ追加 |
| `packages/framework/core/tools/amadeus-orchestrate.ts` | `awaitCompletionDirective()` 追加。`:3023`（FR-3a 主患部）と `:588`（mirror boundary）を新 kind へ |
| `packages/framework/core/tools/amadeus-state.ts` | `awaitCompletion()` ヘルパ追加。`:2526` の settle 待ち拒否を新 kind の JSON で stderr 出力（非0 exit・state 無変更は維持）。`:2514`（record 未解決）は error のまま |
| `packages/framework/core/tools/amadeus-workflow-completion.ts` | `WorkflowCompletionNotSettledError` 新設。Goal lineage / receipt の読取と `authorizeGoalCompletion` の rejected をこの型で包む |
| `docs/reference/12-state-machine.md` / `.ja.md` | 「完了待ち状態 (issue #2251)」節を EN/JA 同一変更で追加 |
| `packages/framework/harness/{claude,codex,kimi,kiro,kiro-ide,pi}/skills/amadeus/SKILL.md` | forwarding-loop の stop リスト・per-kind 表・kind 総数（nine → ten）を同期 |
| `packages/framework/harness/{cursor,opencode}/commands/amadeus.md` | per-kind 表の行と散文 stop リストを同期 |
| `tests/integration/t453-await-completion-directive.integration.test.ts` | 新規（5ケース） |
| `tests/integration/t427-goal-reconciliation-completion.integration.test.ts` | mirror boundary の期待を `error` → `await-completion` へ**申告付きで**改訂 |
| `tests/.coverage-registry.json` / `tests/unit/t-coverage-mechanism-ratchet.test.ts` | t453 の登録 |

`dist/` とセルフインストール面は `bun run build` で再生成。再生成後の `git status` に
追跡ファイルの drift は出ていない（source-only 境界を維持）。

## Red → Green の実測（サイト別）

いずれも `tests/integration/t453-await-completion-directive.integration.test.ts` を対象テストとし、
**注入 → 赤の実測 → 復元 → 残渣ゼロ確認**を不可分の1セットで実施した
（`cid:code-generation:falling-proof-injection-one-set` / `falling-proof-no-stash`）。
復元は `git checkout HEAD -- <path>` のみを使い、stash は使っていない。
注入面は対象テストが実際に spawn する正本（`packages/framework/core/tools/*.ts`）である
（`cid:code-generation:injection-surface-verify`）。

| サイト | 注入 | 赤の実測 | 復元後 |
|---|---|---|---|
| `amadeus-orchestrate.ts:3023`（FR-3a） | `awaitCompletionDirective` → `errorDirective` | 2 fail / 3 pass。`Expected: "await-completion" / Received: "error"` ×2 | 5 pass / 0 fail |
| `amadeus-orchestrate.ts:588`（mirror boundary） | 型判別を外し無条件 `errorDirective` | 1 fail / 4 pass。`Expected: "await-completion" / Received: "error"` | 5 pass / 0 fail |
| `amadeus-state.ts:2526`（complete-workflow） | `awaitCompletion` 分岐を削除し `error` のみ | 1 fail / 4 pass。`Expected: "await-completion" / Received: undefined`（stderr が error JSON のため `kind` 不在） | 5 pass / 0 fail |

`:588` のケースは**テスト先行**である。引き取り時点でこの面は実装済みだがテストが無く、
fixture の `completionInstance` 引数が未使用だった。テストを書いてから上記の注入で赤を出している。
`:3023` / `:2526` は先行セッションの実装を引き取ったため、原著時の Red→Green 順序は
当セッションでは観測しておらず、**上表の注入による落ちる実証で代替**している（provenance は plan 記載）。

## FR-3e 受け入れ基準の実測

| 述語（逐語） | 実測 |
|---|---|
| 監査シャードへ Error 行が追記されないこと | **PASS**。`t453` 第1ケースが `errorLoggedRows` の前後一致を assert。scratch 直接実測でも修正後 `rows=0`（3回連続） |
| 新 kind の directive が返ること | **PASS**。bare `next` の stdout が `kind: "await-completion"`、`reason` が `/workflow completion transaction is not committed/` に一致 |
| `next` を N 回叩いても監査行が増えないこと（現行は randomUUID の idempotencyKey で N 行追記される） | **PASS**。同一 fixture で N=3 の対照実測 — **修正前**: `next#1 kind=error rows=1` / `next#2 rows=2` / `next#3 rows=3`（Issue 記載どおり N 行追記）。**修正後**: 3回とも `kind=await-completion rows=0` |
| #839/#878 のピンテストがグリーンのままであること | **PASS**。`t214-engine-error-logged`（#839）+ `t427` + `t114-orchestrate-next` = 44 pass / 0 fail。`t216-orchestrate-default-errlog`（#878）= 2 pass / 0 fail |

## 検証コマンドと exit code（最終変更後に再実行）

| コマンド | exit |
|---|---|
| `bun run typecheck` | 0 |
| `bun run lint` | 0 |
| `bun run source-only:check` | 0 |
| `bun run build` → `git status` に追跡 drift なし | 0 |
| `bun test tests/integration/t453-...` | 0（5 pass / 0 fail / 25 assertions） |
| `bash tests/run-tests.sh --ci` | 0（Test files 845 / Failed files 0 / assertions 11208 / Failed 0 / `RESULT: PASS`） |

初回の `--ci` は 3 files fail だったが、原因は当 worktree に `node_modules/@ast-grep/napi` が
未インストールだったこと（`InfraFailure: TOOL_MISSING ... ENOENT`）で、患部と無関係の環境要因。
`bun install` 後に同3ファイルは 84 pass / 0 fail、全体も `RESULT: PASS` へ回復した。
自変更由来の失敗はゼロ。

## スコープ外として別起票すべき事項

1. **未発火の同型2面**（FR-3b が明示的にスコープ外とした面）:
   `amadeus-orchestrate.ts:3037` と `:4987` の
   `Goal reconciliation refused completed recovery: ...`。いずれも `Status === "Completed"` の
   state に対する `authorizePersistedCompletedWorkflow` 拒否経路で、全 intent の監査シャードに
   発火実績が無い。settle 待ちか壊れた state かの判別は本 unit の
   `WorkflowCompletionNotSettledError` を再利用できるが、発火実績が無い以上
   「落ちる実証」を組めないため、要件段の裁定を経てから触るべき。
2. **Stop hook の terminal allow に `await-completion` が無い**:
   `amadeus-stop.ts` は `done` / `parked` を allow するが、`await-completion` は
   （`error` と同様に）cap 付き block へ落ちる。SKILL 契約では terminal なので、
   契約と hook の非対称。**修正前も同窓は `error` で同じ扱いのため退行ではない**が、
   `cid:requirements-analysis:symmetric-pair-review` の対象。
3. **`docs/reference/17-skill-system.md` の kind 表が base 時点で既に陳腐化**:
   「nine directive kinds」「emits seven kinds today」と記載されているが、
   本変更前の実体は 12 kinds。本変更が持ち込んだ drift ではない。

## 逸脱・裁定事項

要件・設計からの逸脱は無い。Step 4-6 で足した3点（mirror boundary のテスト、JA 対訳 docs、
cursor/opencode の散文 stop リスト）はいずれも FR-3b / FR-3c と
「ALWAYS 正本・全ハーネス面・tests・EN/JA 対訳 docs を同一変更で同期」の充足であり、
スコープ拡大ではない。上記「スコープ外」3点は実装せず報告に留めた。
