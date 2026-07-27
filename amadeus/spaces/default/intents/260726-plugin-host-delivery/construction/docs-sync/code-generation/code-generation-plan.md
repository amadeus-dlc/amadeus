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

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-27T06:07:38Z
- **Iteration:** 1
- **Scope decision:** none

docs が実装に存在しない --doctor 出力文言を事実として記載(Critical)、かつ 7 面化の記述が一部本文で 6 面のまま残り自己矛盾(Major)

### Findings

- [Critical] docs/guide/19-plugins.md:143-145(および 19-plugins.ja.md:136-138 対訳)が『doctor on such a face emits `[degraded] opencode: no session-start trigger — run \'amadeus-plugin.ts compose\' manually`』と、opencode の --doctor 実出力として断定しているが、この文字列は実装(packages/framework/core/tools/amadeus-plugin.ts の buildDoctorPluginSection/doctorPluginRows/formatDoctorPluginLine、:470-472,495-544)のどこにも存在しない。--doctor のプラグイン節は composition 状態(ok/drift/degraded/recovery-pending/advisory/unknown、いずれもプラグイン単位)のみを描画し、opencode のようなハーネス面単位の session-start 未配線状態(resolveFaceDisposition/FaceDisposition、scripts/plugin-projection.ts:390-421)を doctor へ出力する経路は存在しない。code-summary.md:29 自身が『harness-capability-matrix.md 列6（転記）』と認めている通り、実装コードの grep 裏取りではなく設計文書(harness-capability-matrix.md:99)からの転記であり、BR-U8-1/BR-U8-2(記憶起草禁止・grep 裏取り必須)および FR-9 の合否基準『docs 記載のコマンド・パスが実装と一致』に違反する。repo 全域 grep(`grep -rn "no session-start trigger" packages/ scripts/ tests/`)でヒット0件を確認済み。
- [Major] EN/JA とも『seven packaged faces』への全数更新(BR-U8: 6/4→7/5 化)が本文中2箇所で未反映のまま残存し、同一ファイル内で自己矛盾している。docs/guide/19-plugins.md:70『projects every plugin into the six packaged harness trees』と :250『projects into all six faces』は実装の PACKAGE_HARNESSES(scripts/plugin-projection.ts:42-50、7要素、かつ同ファイル:4 のコメント・tests/integration/t254-reference-plugin-lifecycle.test.ts:189 の `toHaveLength(7)` で7が権威)と矛盾する一方、同ファイル :15,129,174,267,269,275 は正しく『seven』と記載——1ファイル内で6と7が混在。19-plugins.ja.md も同型(:68『6 つのパッケージハーネスツリー』、:240『6 面すべてへ投影』 vs :123,166,263『7』)。日英は1:1で誤りが対称のため対訳同期(BR-U8-3)は形式的に満たすが、FR-9 が名指しした『全ハーネスへ投影』記述の実態更新が本文中で不完全。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-27T06:07:38Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 の Critical(捏造 doctor 文言)と Major(6/7 面混在)を実装接地で確認、両方閉包

### Findings

- None
