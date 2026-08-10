# Intent Statement — 制御バイト混入の loud 検出ゲート新設(Issue #2814)

上流入力(consumes 全数): なし(本ステージは consumes を宣言しない — 一次入力は GitHub Issue #2814 本文・クロスレビュー2件・ユーザー起動指示)

## Problem Statement(解決する業務課題)

tracked ソースへの制御バイト(NUL 等)混入は、git diff(NUL オフセット依存で binary 抑制または無音テキスト差分)・grep(binary 化で偽陰性 — 本環境の ugrep ラッパは該当ファイルを無音で落とし exit 1)・人間レビューのいずれにも構造的に見えない欠陥クラスである。実事例 #786 では `amadeus-learnings.ts` へ生 NUL が混入し(当時 7 コピー)、grep の偽陰性が検証規律(全数列挙・不在主張・棚卸し)全体を無音で崩した。現行の検出面は単一ファイル限定の regression guard(`tests/unit/t-learnings-persist-seam.test.ts:258-261`)と入力面限定の点在防御のみで、**ツリー全域を対象とする決定的ゲートが不在**。

## Target Customer(誰がどう恩恵を受けるか)

このリポジトリの全コミッター(人間・エージェント)と、grep ベースの検証規律に依存する運用全体。混入経路(エディタ事故・ツール出力貼り込み・エンコーディング事故)を問わず PR 段で遮断されることで、検証偽陰性の連鎖が根元で止まる。

## Success Metrics(測定可能な成果)

Issue #2814 完了条件(クロスレビュー訂正を反映):

1. tracked ソース(対象ディレクトリ集合を明示宣言)への NUL を含む制御バイト混入を検出する決定的検査が CI blocking で走る — `docs/` を対象に含める場合は `scripts/detect-ci-changes.sh` の分岐追加を含む(docs-only PR での空文化封鎖)
2. 落ちる実証 — NUL 注入ファイルをコミットした状態で検査が赤になること(注入→赤実測→復元→残渣ゼロ確認の不可分1セット、`cid:code-generation:falling-proof-injection-one-set` / `c5-260803-state-integrity` 準拠)
3. 正当な既存コーパス全数 sweep で偽陽性ゼロ(生バイトのみ検出。正当バイナリ `assets/AI-DLC-Workflows-2.0-Specification.pdf` 1 件への allowlist は現時点で必須 — reviewer-1 実測 files_with_NUL=1)
4. 検出時のエラーメッセージが該当ファイル・オフセットを名指す

## Initiative Trigger(なぜ今か)

- team.md `cid:requirements-analysis:control-byte-guard`(PM1-8 2026-07-10)が「lint/sensor での loud 検出を導入する」と記録したまま未実装
- Issue #2814 がクロスレビュー2名成立(reviewer-1 / reviewer-2 とも CONFIRMED_WITH_REFINEMENTS)し、ユーザーが本 intent の起動を明示指示(2026-08-10)

## Initial Scope Signal

scope = `self-feature`(ユーザー明示)。autonomy = `full`(グラント発行済み)。

### 確定済み裁定(クロスレビュー訂正の要件段一次入力 — ユーザー起動指示 (a)〜(f))

1. 単一ファイル限定の #786 regression guard(`t-learnings-persist-seam`)は実装済み — 不在なのは**全域ゲート**
2. dist 増幅は source-only 移行で不成立 — tracked 影響面は正本 1 ファイル(`git ls-files dist` = 0)
3. `docs/` を対象に含めるなら `scripts/detect-ci-changes.sh` の分岐追加が必須(走査系ゲート 4 種は "Lint and complexity" ジョブ同居、`full=true` 条件 — `cid:build-and-test:ci-paths-ignore-doc-guard-blindspot` 同型)
4. `tests/` を対象に含めると落ちる実証 fixture と自己衝突 — 設計段で解消(現存 NUL は全て実行時生成でソース上は生バイトなし)
5. 正当バイナリ(PDF 1 件)への allowlist は現時点で必須(将来形ではない)
6. 検査述語は `amadeus-migrate.ts:477` の `isUtf8`(`buffer.includes(0)`)が canonical として再利用可能 — 新規述語を発明しない

### 追加の設計段送付事項(クロスレビュー由来)

- 実装形態(sensor / test / CI script)は未評価 — `amadeus/` を含めた場合の実行コストも未評価(reviewer-1)
- 対象範囲(Issue 宣言 5 dirs = tracked の 16.0%)とタイトル「tracked ソース」の齟齬解消 — 先例 `cid:feasibility:c2-2`(手書き正本対象・生成物/fixture 除外)は Issue スコープの**部分集合**であり、`tests/` + `docs/` は意図的拡張として根拠明示が必要(reviewer-2)
- バイト検査に対話シェルの grep を使わない(ugrep ラッパが NUL ファイルを無音で落とす)— perl 等のバイト走査で行う(両レビュアー手法メモ)
