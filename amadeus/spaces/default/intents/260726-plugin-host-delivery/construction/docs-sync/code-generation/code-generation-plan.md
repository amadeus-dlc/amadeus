# Code Generation Plan — U8 docs-sync（Bolt 8）

> 上流入力(consumes 全数): requirements(FR-9)、functional-design/business-rules、functional-design/business-logic-model、harness-capability-matrix（U1 権威マトリクス）

本 Unit は文書のみを更新するコード変更ゼロの Unit（unit-of-work.md U8 / components.md C8 責務行）。`docs/guide/19-plugins.md`（英語）と `docs/guide/19-plugins.ja.md`（日本語対訳）を、概念記述のみの現状から「実装後の実手順」へ更新する。

## 転記元（実装ソース — grep 裏取り、記憶起草禁止 BR-U8-1/BR-U8-2）

vocab 起点の repo 全域 grep（BR-U8-2）で更新対象を確定した結果、`amadeus-plugin` CLI に言及する docs は 19-plugins 両言語と `docs/reference/06-hooks-and-tools.md:46`・`docs/guide/15-troubleshooting.md:39` のみで、後 2 者は既に実装と一致（SessionStart / --if-stale / no-op を正確に記述済み）。よって更新範囲は 19-plugins 両言語に限定（BR-U8-0）。

- **CLI verbs / flags / exit**: `packages/framework/core/tools/amadeus-plugin.ts`（USAGE `:98-102`、command union `:69-72`、renderPluginCliResult 各 exit `:571-601`、no-op `:319-320,579-580`、--project-root `:106-109`、fail-closed 未知フラグ→exit 2 `:9-10`）。実行形は配布コピー `.claude/tools/amadeus-plugin.ts`、manualComposeCommand `scripts/plugin-projection.ts:557-559`（`bun <harnessDir>/tools/amadeus-plugin.ts compose`）。
- **SessionStart 自動 compose**: hook `packages/framework/core/hooks/amadeus-plugin-compose.ts:16`（`compose --if-stale --project-root`）。claude 面（U2）は `claude/settings.json.example:34-37`。6 面/1 面の配線は `scripts/plugin-projection.ts:459-467`（PLUGIN_COMPOSE_TRIGGER）、クラスは `:360-368`（PLUGIN_HOST_CLASS）、wired/degraded 分類 `:449-451,472-476`。opencode = manual-only の degrade 契約（harness-capability-matrix 列6 の doctor 文言を転記）。
- **--doctor plugin section（U5）**: buildDoctorPluginSection `amadeus-plugin.ts:495-506`、doctorPluginRows `:531-544`、isFailingPluginState `:470-472`、KNOWN 集合 `:465-466`、状態 union `:81`、integration `amadeus-utility.ts:2887-2890`。visible-passing = ok/drift/advisory、loud fail = degraded/recovery-pending/unknown。0-plugin は単一 pass 行。
- **install bundle 投影（U3）**: installArtifacts `scripts/plugin-projection.ts:620+`、installDoc `:580-609`（INSTALL.md、クラス別手順）、snippets `hooks/hooks.json`（claude）/`hooks/auto-compose.snippet`（folder-drop-auto）/なし（manual-only）。OutDirRefusal `:440-444`、classifyOutDir `:461+`。
- **activation policy（U6, ADR-1 案A）**: `amadeus-plugin-activation.ts:1-7`（spec-hash advisory・TLC 自動実行なし・state 非書込）、ACTIVATION_PLUGIN `:34`（formal-model-check）、ACTIVATION_WATCH_GLOBS `:40`（`specs/tla/**`）、doctor activation 行 `amadeus-plugin.ts:503`。
- **7 パッケージ面 / 5 セルフインストール面**: `scripts/plugin-projection.ts:42-50`（PACKAGE_HARNESSES 7 値）、`:56`（SELF_INSTALL_HARNESSES 5 値: claude/codex/cursor/opencode/kimi）。現状 docs の「6 / 4」は kimi 追加で stale（FR-9 の「全ハーネスへ投影」実態更新対象）。

## 手順

1. 両ファイルの導入段落と末尾「N packaged / M self-install」節を 7 / 5（kimi 追加）へ更新。
2. ライフサイクル節の後に新規節を挿入（同一構成を日英で対応）: CLI / セッション起動時の自動 compose / `--doctor` プラグイン節 / ホストへのインストール。
3. 見送り面節の後に activation ポリシー節を挿入。
4. 日英ペアを同一構成（H2 11 節 1:1・表 23 行 1:1）で更新（BR-U8-3）。
5. 記載 CLI・パス・exit は配布コピーの smoke 実行で確認（BR-U8-1）。
6. 既存 docs 参照整合ゲート（t174 系）green を確認（BR-U8-4）。

## 逸脱

component-methods.md C1-C6 の契約と実装・docs 記載の間に乖離なし（BR-U8-5: 乖離 0 件）。ハーネス別クラス語彙は ADR-4 正準 literal `native-manifest | folder-drop-auto | manual-only` を逐語使用（BR-U8-6）。
