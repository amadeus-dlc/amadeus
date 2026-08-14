# Bolt Plan — 260814-plugins-rename-drift

上流入力: `requirements-analysis/requirements.md`(FR・受け入れ基準)、`application-design/components.md`(規模見積り)、`units-generation/unit-of-work.md`(U1〜U3)、`unit-of-work-dependency.md`(DAG)、`unit-of-work-story-map.md`(FR 写像)。裁定は `delivery-planning-questions.md` Q1/Q2。team-practices は memory ノルム(org/team/project — Branching = トランクベース+Bolt スカッシュマージ、Walking Skeleton = self-feature で維持、Deployment = デプロイ基盤なし)。stories / mockups は SKIP で不在(expected)。

## 順序(3 Bolt 直列 — b1-rename → b2-settings → b3-git-drift)

## Bolt b1-rename

Bolt 1: rename-github-pr-convergence(walking-skeleton ゲート付き)

- **Units:** `rename-github-pr-convergence`

- 含む Unit: U1 rename-github-pr-convergence(kind: packaging)
- **walking-skeleton マーカー**: **あり** — project.md Mandated「self-feature なら既存コード変更でも最初の Construction Bolt に walking-skeleton gate を維持」。本 Bolt は改名がプラグイン機構の全層(オーサリング → compose → 投影 → graph → scope-grid → conformance)を end-to-end に通ることを証明するスライスであり、skeleton の趣旨(全層を貫通する最小スライス)に実質的にも合致する。
- **Definition of Done**: FR-REN-1〜8 の受け入れ基準を全て実測(残存参照 2 述語 0 件、不変識別子 diff 機械確認、scope-grid 不変の実測、ADR-2 落ちる実証 1 セット完了)。`bun run build` 追跡ファイル不変・フルスイート green・coverage/complexity green。PR 作成 → pr-convergence 収束 → 人間承認スカッシュマージ。
- **確信仮説**: 「プラグインディレクトリ名は、ステージ slug・センサー id・スキル名を変えずに、全配送経路(dist 8 ハーネス・self-install・scope-grid)を壊さず改名できる」— 出荷が命名規約適用の安全性を証明する。
- **期待デモ**: 改名後の compose → doctor green、scope-grid 4 スコープ行の不変を示す実測ログ、残存参照検査 0 件。

## Bolt b2-settings

Bolt 2: plugin-settings-core

- **Units:** `plugin-settings-core`

- 含む Unit: U2 plugin-settings-core(kind: library)
- **Definition of Done**: FR-SET-1〜4 受け入れ + 落ちる実証(不正値 fail-closed / 省略デフォルト / 綴り誤り loud — 実消費 (iii) は B3 で完結)。t432 docs 逐語一致 green。既存 manifest byte-identical。TDD slice の Red→Green 記録。PR → 人間承認マージ。
- **確信仮説**: 「プラグインが設定値を宣言し、workspace が 3 層で override し、不正が全て loud になる共通基盤は、既存 config 機構への 1 キー追加で成立する」。
- **期待デモ**: 宣言 + override + fail-closed の各テスト green、綴り誤り manifest の loud エラー実測。

## Bolt b3-git-drift

Bolt 3: git-drift-plugin

- **Units:** `git-drift-plugin`

- 含む Unit: U3 git-drift-plugin(kind: service)
- **Definition of Done**: FR-DRIFT-1〜6 受け入れ + 落ちる実証 3 経路 + 非 git 不発火 + スロットル設定の実消費(FR-SET (iii))。stages:[]+sensors+seams conformance ケース green。plugin-conformance-e2e green。activation.names へ git-drift 追加(B1 マージ後の最新 main 起点 — config.json 競合の構造的回避)。PR → 人間承認マージ。
- **確信仮説**: 「origin 進行は、作業中に advisory センサーとして早期検知でき、install/drop で構成可能なプラグインとして全層を通せる」。
- **期待デモ**: テスト用リポジトリで origin を進めた 3 経路の実測ログ、設定変更がスロットル挙動に反映される実測。

## 実行形態

- 直列(B1 → B2 → B3)。並行なし — config.json 共有(B1/B3)と coverage single-owner ノルム、および B1 の walking-skeleton ゲート(残り Bolt の実行前に人間承認)による。
- 各 Bolt は git worktree 分離で実装(cid:code-generation:solo-bolt-worktree-required — 新規 worktree では依存インストール + `bun run build` を定型手順に含める)。base = main、マージ先 = main、スカッシュマージ。
- B1 出荷後にラダープロンプト(org.md Walking Skeleton 節)で残り Bolt の実行形態を確認する。
