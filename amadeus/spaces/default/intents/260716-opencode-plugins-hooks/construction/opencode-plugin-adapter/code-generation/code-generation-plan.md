# Code Generation Plan — opencode-plugin-adapter(Issue #1049 / Bolt 1)

> 上流入力(consumes 全数): `../functional-design/business-logic-model.md`(ワークフロー・決定木・意図的相違)、`../functional-design/business-rules.md`(R-1〜R-8)、`../functional-design/domain-entities.md`(型・forwardStdout scope-out)、`../nfr-design/performance-design.md`(不導入表)、`../nfr-design/security-design.md`(reconstruct 境界集約)、`../../../inception/units-generation/unit-of-work.md`(U1 範囲・検証列)、`../../../inception/requirements-analysis/requirements.md`(FR-1〜5)。2026-07-17。

## 実行構成

- builder 1名(amadeus-developer-agent、worktree 隔離 c2)を conductor(e3)がディスパッチ。ブランチ: `bolt/1049-opencode-plugins`(main ベース)
- 実装順序は component-dependency 既決の直列: **C3(工程0)→ C2(lib)→ C1(entrypoint)→ C4(テスト)→ C5(manifest+docs+regen)**

## Step 1: 工程0 — 写像対応表の in-tree 実測凍結(C3)

1. `@opencode-ai/plugin` を devDependency として追加(NQ-5 pre-approved 分岐 (a) を第一手 — 実測後、型が不要十分なら (b) 手書き最小 interface へ切替可)し、node_modules 実体の `packages/plugin` 型定義・フック語彙を verbatim 採取(AC-1c の in-tree 再実測)
2. Cursor 8 target × opencode フックの対応表を3値(配線/⚠/未対応)+一次ソース verbatim 根拠で凍結(AC-1a/1b)
3. mint 行は ADR-5 の2条件((i) UserMessage machine マーカー判別可能性 (ii) AskUserQuestion 応答の chat.message 経由)を実測 — いずれか不成立なら未対応(fail-closed)
4. **FD レビュー留保の確認(必須)**: session 系配線が cursor forwardStdout 相当のコンテキスト注入 seam を必要とするか実測 — 必要と確定した場合は実装を止め conductor へ報告(型再設計の確定条件発火 — deviation-stop)
5. 表を code-generation dir に収載+lib ヘッダコメントへ転記

## Step 2: 実装(C2→C1)

- `packages/framework/harness/opencode/plugin/amadeus-opencode-lib.ts`(写像 lib): 純関数 `reconstruct(event, payload)` — cursor-lib :96-201 同型(純写像面のみ)。ToolNameMap 相当は工程0 確定値のみの frozen リテラル。検証は reconstruct 境界に集約(security-design)
- `packages/framework/harness/opencode/plugin/amadeus-opencode-plugin.ts`(entrypoint): `export const AmadeusPlugin = async (ctx) => ({...hooks})`(C-5)。全ハンドラ try/catch+必ず正常 return(R-1)。spawn は同期・`env: process.env` 明示・**戻り code を読み非0/失敗は stderr 記録**(FD 明文照合の意図的強化 — cursor defaultSpawn の stderr:"ignore" を踏襲しない)
- core hooks 11本は無改変(AC-2b — diff 目録で機械確認)

## Step 3: テスト(C4)

- unit(純関数層): reconstruct の配線各行入出力+未登録語彙 advisory reject+payload 欠落エッジ(AC-3a 最低2系)— **fs トークンなし**(fs-tests-integration-first、ADR-4)
- integration(実 FS/spawn 層): spawn 経路・dist 配布面 — `// size:` 宣言付き
- 落ちる実証: 実行時消費行へ注入(AC-3b / inject-runtime-consumed-lines)、注入面は「テストが実際に読む面」を実測確認(injection-surface-verify)、注入→赤実測→revert を1セット(falling-proof-injection-one-set)

## Step 4: 配布+docs(C5)

- manifest.ts harnessFiles へ plugin 2ファイル追加(ADR-1: authoredExempt 不変)→ `bun scripts/package.ts` regen → `dist/opencode/.opencode/plugins/` 実在確認(AC-4a/4b — 複数形 `plugins` を dist レイアウトで再実測)
- docs 機能単位表: 配線確定分は対応へ、写像不能分は根拠付き未対応へ(AC-5a、measurement-ref+opencode バージョン明記)

## Step 5: 検証列(全て同期実行・exit code 記録)

`bun run typecheck` / `bun run lint` / `bun run dist:check` / `bun run promote:self:check` / `bash tests/run-tests.sh --ci` / patch gate、push 前ローカル lcov(diff 追加行未カバー 0 — 配線行・catch 行の個別列挙 lcov-wiring-line-checklist)。deslop → 全検証再実行。

## Step 6: PR

`bolt/1049-opencode-plugins` → main、タイトル日本語・本文 `Fixes #1049`。作成者が実装者以外のレビュアーを先行指名(pr-reviewer-nomination-creator-first)。マージはユーザー承認後 leader 執行。

## 統制(builder プロンプトへ焼き込み)

- 逸脱は実装前停止(既存様式準拠と判断する場合も停止対象 — deviation-applicability-not-solo)
- モニタ/バックグラウンド待ちでターン終了しない — 検証は同期で完遂し完了報告まで1タスク(builder-prompt-sync-completion)
- 割当 worktree 外での git 操作(checkout/stash/reset)禁止・本線絶対パス非混入(c2)
- 配線 0 件も正常系(AC-5b)— その場合は plugin 最小殻+表+docs 更新で完了
