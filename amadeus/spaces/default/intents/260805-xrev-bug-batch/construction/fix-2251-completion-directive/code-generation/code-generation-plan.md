# Code Generation Plan — fix-2251-completion-directive

上流入力(consumes 全数): requirements.md, architecture.md, code-structure.md

- 対象 Issue: #2251（completion 未コミット窓の `next` が想定内の正規状態を `ERROR_LOGGED` として監査記録する）
- 裁定: Q3=B（実発火面まで）+ Q3b=A（新 kind 導入）— `requirements.md` FR-3
- 測定 ref: 実装ブランチ `worktree-agent-a53fdd65a73c79b15`、base `26984d38b`（= 着手時点の origin/main）
- 患部の現行 file:line は着手時に実読で再確定した（下表）。RE 記載の行番号は base 前進でずれている

## 引き継ぎ（provenance）

本 unit は先行セッションの builder が同一 unit 名のブランチ `bolt-fix-2251-completion-directive`
（base `1043b7e67`、実装3コミット、PR 未発行・未 push）で着手済みだった。重複実装を避けるため
`cid:code-generation:cg-handover-plan-audit` に従い、チェックボックスや前任の申告を信用せず
**実装状態を file:line で監査したうえで引き取り**、現行 main へ再接地した
（`cid:code-generation:base-advance-regrounding`）。監査で検出した欠落は本 plan の Step 4-6 で閉じた。

前任コミット: `37bec7712` / `38cfb65f4` / `94b09f6e2` → 当ブランチへ cherry-pick 済み
（`5d1c7220c` / `25054fde2` / `05261a710`）。

## 患部の現行 file:line（着手時に実読で確定）

| 面 | 現行 file:line | verbatim 断片 | 扱い |
|---|---|---|---|
| FR-3a 主患部 | `packages/framework/core/tools/amadeus-orchestrate.ts:3023` | `` `No in-scope stage remains after ${currentSlug}, but the workflow completion transaction is not committed.` `` | 新 kind へ移す |
| FR-3b 同型面1 | `packages/framework/core/tools/amadeus-orchestrate.ts:588` | `` const refusal = `Goal reconciliation refused completion mirror: ${errorMessage(cause)}`; `` | 新 kind へ移す |
| FR-3b 同型面2 | `packages/framework/core/tools/amadeus-state.ts:2514` | `error("Goal reconciliation refused completion: Intent record is unresolved");` | error 継続（後述） |
| FR-3b 同型面3 | `packages/framework/core/tools/amadeus-state.ts:2526` | `` const refusal = `Goal reconciliation refused completion: ${errorMessage(cause)}`; `` | 新 kind へ移す |
| スコープ外1 | `packages/framework/core/tools/amadeus-orchestrate.ts:3037` | `` `Goal reconciliation refused completed recovery: ${completedRecoveryError(cause)}` `` | 無変更（未発火） |
| スコープ外2 | `packages/framework/core/tools/amadeus-orchestrate.ts:4987` | `` `Goal reconciliation refused completed recovery: ${completedRecoveryError(cause)}` `` | 無変更（未発火） |

RE の `:3005` / `:585` / `:3020` / `:4970` / `:2510` / `:2522` に対する現行対応は上表のとおり。
**スコープ外2面は RE の `:3020` / `:4970`** であり、行番号の近接（新 `:3022`）と取り違えないこと。

## 受け入れ基準（FR-3e 逐語）

> FR-3e: 受け入れ基準 — 起票時の再現（completion 未コミット窓での bare `next`）で、監査シャードへ
> Error 行が追記されないこと、新 kind の directive が返ること、`next` を N 回叩いても監査行が増えないこと
> （現行は randomUUID の idempotencyKey で N 行追記される）。#839/#878 のピンテストがグリーンのままであること。

述語は縮小せず、そのままテストの assert へ写す（`cid:code-generation:c3-260803-state-integrity`）。

## 実装ステップ

- [x] **Step 1 — 新 kind `await-completion` を directive 契約へ追加する。**
  `amadeus-directive.ts` の `DirectiveKind` / `Directive` union / `VALID_KINDS` /
  `KNOWN_FIELDS_BY_KIND` / `FIELD_CHECKS_BY_KIND` / `directiveSelfCheckExamples` の6面すべて。
  フィールドは `{ kind, reason }` のみ（`parked` と同じ最小形）。
  検証: `bun run typecheck` exit 0 と directive スキーマテストのグリーン。

- [x] **Step 2 — FR-3a 主患部を新 kind へ移す。** `amadeus-orchestrate.ts:3023`。
  `emit(errorDirective(...))` → `emit(awaitCompletionDirective(...))`。
  抑止側（`recordEngineError` の発火条件を狭める / `emit` の `recordError=false` を使う）は
  **FR-3d により採らない** — `emit()` の error 集約点（`:763-765`）と #839 の契約は無改変のまま、
  この窓が error kind を通らなくなることで ERROR_LOGGED から外れる。
  受け入れ述語の写し: 「監査シャードへ Error 行が追記されないこと」「新 kind の directive が返ること」
  「`next` を N 回叩いても監査行が増えないこと」を1テストずつ Red 実測 → 最小実装 → Green。

- [x] **Step 3 — FR-3b の同型面を移す。**
  - `amadeus-orchestrate.ts:588`（mirror boundary）
  - `amadeus-state.ts:2526`（`complete-workflow` 自身の拒否）
  判別は例外型 `WorkflowCompletionNotSettledError` で行い、**「settle 待ち」だけを新 kind へ、
  真の壊れた state は error へ残す**（`amadeus-workflow-completion.ts`）。
  `amadeus-state.ts` は directive emitter ではないため、`awaitCompletion()` ヘルパが
  同 shape の JSON を stderr へ出し **非0 exit / state 無変更の fail-closed を維持**する。
  受け入れ述語の写し: 「非0 exit」「READY 相当の完了面を触らない」「ERROR_LOGGED を残さない」。

- [x] **Step 4 —（監査で検出）mirror boundary 面のテストを追加する。**
  引き取り時点で `:588` は実装済みだがテストが無く、fixture ヘルパの `completionInstance`
  引数が未使用の死にパラメータだった（テストファイル冒頭は「3面を pin する」と主張しており
  主張と実体が乖離）。persisted completion boundary を arm するケースを追加して
  Red→Green を実測する（`cid:requirements-analysis:enumeration-completeness-review`）。

- [x] **Step 5 — FR-3c の語彙同期を正本語彙の repo 全域 grep から導出する。**
  `git grep -ln '\`parked\`' -- packages/ docs/ scripts/ tests/` を起点に対象面を列挙し、
  正規文書起点の列挙で knowledge/ 配下やハーネス表層を落とさない
  （`cid:requirements-analysis:enumeration-completeness-review` の docs 面）。
  引き取り時点で欠落していた面: `docs/reference/12-state-machine.ja.md`（**対訳必須**）、
  `cursor` / `opencode` の forwarding-loop stop リスト（表の行のみ追加され散文が未更新）。

- [x] **Step 6 — 既存ピンの明示改訂と回帰確認。**
  `t427` の mirror-boundary 期待を `error` → `await-completion` へ**申告付きで**改訂する
  （無申告の逸脱にしない）。#839 / #878 のピン（`t214-engine-error-logged` /
  `t216-orchestrate-default-errlog`）はグリーンのまま維持されることを実測する。

- [x] **Step 7 — 生成物同期と全検証。**
  正本のみ編集し `bun run build` で `dist/` とセルフインストール面を再生成、
  追跡ファイルに drift が出ないことを `git status` で確認する。
  `bun run typecheck` / `bun run lint` / `bun run source-only:check` /
  `bash tests/run-tests.sh --ci` を exit code つきで実測する。

## 明示的に採らない選択肢

- **抑止側修正（FR-3d）**: `recordEngineError` の条件を狭める / メッセージ一致で除外する。
  #839（エンジンの error 出口が監査証跡を残さない欠陥）と #878 を退行させるため不採用。
- **Stop hook への terminal allow 追加**: `await-completion` は SKILL 契約上 terminal だが、
  `amadeus-stop.ts` は `done` / `parked` のみを allow し、`error` も含めそれ以外は
  cap 付き block へ落ちる。修正前もこの窓は `error` として同じ扱いだったため**退行ではない**。
  FR-3 は hook 変更を求めておらず、hook の allow 集合を広げるのはループガードの緩和にあたるため
  **本 unit では実装せず、別 Issue の観測事項として報告する**（無申告のスコープ拡大を作らない）。
- **`docs/reference/17-skill-system.md` の kind 表の是正**: 同表は base 時点で既に
  「nine directive kinds」「emits seven kinds today」と実体（12 kinds）から乖離しており、
  本変更が持ち込んだ drift ではない。別件として報告する。
