# Requirements — 260727-install-doc-mismatch (#1569)

上流入力(consumes 全数): business-overview.md、architecture.md、code-structure.md

## 承認系譜(approval lineage)

- **修正方向の裁定**: (A) docs/INSTALL.md 側を修正し、CLI discovery(`.amadeus-plugin-src/`)を正とする — 2026-07-27 ユーザー直接裁定。Issue #1569 コメント(https://github.com/amadeus-dlc/amadeus/issues/1569#issuecomment-5088508377)に記録。(B) CLI discovery の `plugins/<name>/` 両対応拡張は不採用(U2 の承認済みホストモデルを覆す仕様変更のため)。
- **強制機構の裁定**: Q1 = A(共有定数化) — 2026-07-27 ユーザー直接裁定(`requirements-analysis-questions.md` 裁定の記録参照)。
- **スコープ**: amadeus-bugfix 維持(2026-07-27、`amadeus-document` への切替を提示のうえユーザーが維持を選択)。

## Intent 分析

出荷 install bundle の INSTALL.md と docs が案内するコピー先(`<harnessDir>/plugins/<name>/`)が、CLI discovery が実際に走査するパス(`<projectRoot>/.amadeus-plugin-src/<name>/`)と乖離しており、手順どおりに配置すると compose が無音 0 件になる(upstream `business-overview.md` の現在断面が「plugin 導入 UX の案内誤り — 提供機能自体は正常」と確定)。目標は (1) 案内文言の正誤修正、(2) 同型再発を構造的に防ぐ一致強制、(3) リグレッションテストによる不変量の固定。

欠陥のアーキテクチャ文脈は upstream `architecture.md` の現在断面のとおり: discovery 入力(`.amadeus-plugin-src/<name>/`、staging)と compose 出力(`<harnessDir>/plugins/<name>/`、composed owned)は U2 で意図的に分離されたホストモデルであり、installDoc は「入力先」に「出力先」を書いてしまった(write⇔read 非対称)。対象ファイルの所在・テスト棚卸しは upstream `code-structure.md` の現在断面(#1569 対象ファイル所在表)に依拠する。

## 機能要件 (FR)

### FR-1: installDoc のコピー先文言修正
- `scripts/plugin-projection.ts:593`(observed `46a75f2e7`)の installDoc 生成文言のコピー先を `<harnessDir>/plugins/<name>/` から **`.amadeus-plugin-src/<name>/`(project root 相対)** へ変更する。
- 対象クラスは copy 行を出す **folder-drop-auto / manual-only の2クラスのみ**。`native-manifest`(claude、`:582-591` marketplace 手順)は変更しない。
- `manualComposeCommand`(`:557-559`)は正しいため変更しない。
- 受け入れ基準: 修正後の installDoc 出力に `.amadeus-plugin-src/<name>/` がコピー先として現れ、`<harnessDir>/plugins/<name>/` がコピー先として現れないこと(テストで固定、FR-5)。

### FR-2: 共有定数化(一致の構造的強制) — Q1 裁定 A
- `.amadeus-plugin-src` リテラルを、discovery の所有モジュール `packages/framework/core/tools/amadeus-plugin.ts` から export された共有定数へ昇格する(現状 `:278-279` `pluginSourceRootOf` 内の private リテラル)。
- discovery(`pluginSourceRootOf`)と installDoc(`scripts/plugin-projection.ts`)の両方が同一定数を参照する。
- 受け入れ基準: 修正後、`scripts/plugin-projection.ts` 内に `.amadeus-plugin-src` の独立リテラルが存在しない(定数参照のみ。機械確認: grep)。
- 定数の命名・export 形式(named const / 関数 export)は実装時判断(Open questions 参照)。

### FR-3: dist 再生成と self-install 同期
- 正本修正後、`bun scripts/package.ts` で dist を **7ハーネス全て**(claude/codex/cursor/opencode/kimi/kiro/kiro-ide)再生成する(cid:build-and-test:bt-dist-regen-seven-harnesses)。
- INSTALL.md の実変化は copy 行を持つ **6面**(codex/cursor/kimi/kiro/kiro-ide/opencode 各 `INSTALL.md:3`)。claude 面は不変。
- `amadeus-plugin.ts`(core tool)へ export を足すため、セルフインストールツリーへ `bun run promote:self` を実行する。
- 受け入れ基準: `bun run dist:check` と `bun run promote:self:check` が green(`pluginBundleExpected` `:787-796` のバイト再導出により stale INSTALL.md は機械検出される)。

### FR-4: docs の対訳同期修正
- `docs/guide/19-plugins.md:183`(EN)と `docs/guide/19-plugins.ja.md:175`(JA)の両方で、コピー先を `.amadeus-plugin-src/<name>/` へ修正する(cid:requirements-analysis:docs-language-ownership — 対訳同期)。
- docs prose はドリフトガード非対象(手書き)のため、レビュー観点で両ファイルの修正を確認する。

### FR-5: リグレッションテスト(regression-first)
- 「installDoc 出力のコピー先 == discovery が走査するパス」の不変量をテストで固定する。追加場所の最有力は `tests/integration/t307-install-artifacts-classes.integration.test.ts`(現状 copy 先パスを非アサート)。
- テストは共有定数(FR-2)由来のパスが installDoc 出力に現れることをアサートする(両モジュール横断の一致検証)。
- **落ちる実証**: 修正前の文言(`<harnessDir>/plugins/<name>/`)では赤くなることを、テストが実際に読む面(正本 or dist — 注入前に実測確認、cid:code-generation:injection-surface-verify)への一時注入で実証してから完成扱いにする(cid:code-generation:falling-proof-injection-one-set — 赤の実測→revert までを不可分1セット)。

## 非機能要件 (NFR)

- **NFR-1 挙動不変**: CLI discovery / compose / status の実行時挙動は一切変更しない(変更は文言・定数昇格・テストのみ)。`.amadeus-plugin-src` の解決値はリファクタ前後でバイト同一。
- **NFR-2 検証ゲート**: `bun run typecheck` / `bun run lint` / `bun run dist:check` / `bun run promote:self:check` / 関連 `tests/run-tests.sh` プロファイルが全て green(project.md Testing Posture)。
- **NFR-3 カバレッジ**: push 前にローカル lcov で diff 追加行の未カバー 0 を実測(cid:code-generation:local-lcov-pre-push)。新規テストは実 FS を使う場合 integration 層へ(cid:code-generation:fs-tests-integration-first)。

## 制約

- amadeus-bugfix スコープ(Minimal): 対象バグの修復+リグレッションテストに限定。CLI の機能拡張・後方互換レイヤー・移行シムは導入しない(org.md Forbidden)。
- `dist/<harness>/` の手編集禁止 — 正本編集+再生成のみ(project.md Forbidden)。
- 1 Bolt / 1 PR。Construction はソロでも worktree 分離で実装する(cid:code-generation:solo-bolt-worktree-required)。

## 前提

- U2 のホストモデル(staging `.amadeus-plugin-src` と composed 出力 `plugins/<name>/` の分離)は承認済み設計であり本 intent では変更しない。
- 区間実測(observed `46a75f2e7`)の file:line は RE の Architect 独立再実測で訂正 0 件。merge 取込(9e13760ce)は plugin 対象面のコード内容を変更していない(#1568 squash と同一内容)。

## Out of scope

- (B) 案: CLI discovery の `<harnessDir>/plugins/<name>/` 両対応拡張(ユーザー裁定で不採用)。
- plugin 導入 UX のその他改善(エラーメッセージ、doctor 拡充等)。
- docs prose の installDoc 自動同期機構の新設(負債シグナル 2 として codekb に記録済み — 必要なら別 Issue)。

## Open questions(後続ステージへ)

- FR-2 の定数の命名と export 形式(named const vs 関数)は code-generation で既存 idiom(近傍の export 様式)に合わせて決定する。
- installDoc(`plugin-projection.ts:593`)の `harnessDir` 引数が修正後に未使用化する可能性 — 実装時に実測し、未使用なら引数削除まで含めるか(surgical 原則の範囲内で)判断する。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-07-27T08:00:49Z
- **Iteration:** 1
- **Scope decision:** none

承認系譜への逸脱なし、上流3ファイルの file:line 主張は全数実測裏取り済み。FR-1〜FR-5 は機械検証可能な合否基準を持ち regression-first を充足。Minor 1件のみで READY。

### Findings

- [Minor] requirements.md:3 — 上流入力ヘッダが stage frontmatter の optional consumes (intent-statement/scope-document/team-practices) を列挙していない。ただし実行時 directive の解決済み consumes は codekb 3件のみで upstream-coverage センサーは PASSED 実測済み(充足)
