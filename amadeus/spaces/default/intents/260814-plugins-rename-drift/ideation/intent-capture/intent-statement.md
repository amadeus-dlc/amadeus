# Intent Statement — 260814-plugins-rename-drift

## Problem Statement(解決する業務課題)

Amadeus のプラグイン命名には依存軸(GitHub サービス依存 vs 純 git)が表現されておらず、並行開発中の origin/main 進行を作業中に検知する仕組みも存在しない。具体的には:

1. **命名規約の未適用(#2996)**: `pr-convergence` プラグインは gh CLI / GitHub API に依存する機能だが、名前から依存軸が読めない。プラグイン粒度の裁定(ユーザー直接裁定 2026-08-14、Issue 本文に記録)で「1プラグイン=1機能、依存軸プレフィックス命名(`github-*` / `git-*`)」が確定しており、既存プラグインを規約へ追随させる必要がある。
2. **origin 進行の早期検知の不在(#2997)**: 複数エージェントが worktree 並行作業する前提で、origin/main の進行に気づく最初の機会がマージ直前(pr-convergence の mergeability 検査)となり、手戻りコストが最大化した時点になる。
3. **プラグイン設定機構の不在(#2997)**: プラグインが設定値を宣言・取得する経路がなく(config キーは core の閉じた union)、スロットル間隔等をハードコードするしかない。

## Target Customer(誰がどう恩恵を受けるか)

- **Amadeus のプラグインを利用・拡張する開発者**: 依存軸プレフィックスにより「GitHub サービス依存か純 git か」が名前から読める予測可能な命名体系を得る。
- **Amadeus を使うすべての開発者(フレームワーク利用者・self-development の両方)**: origin 進行の早期警告により、手戻りを「マージ直前に発覚」から「作業中に早期検知」へ前倒しできる。
- **今後のプラグイン作者**: `plugin.settings.<plugin-name>.<key>` 名前空間が全単機能プラグイン共通の設定基盤になる。

## Success Metrics(成功指標 — Q2 回答で確定)

#2996 → #2997 の順で、各 Bolt の PR が人間承認を経てマージされ、両 Issue の完了条件(AC)がすべて実測で満たされること。具体的に:

- `bun run build` の全ハーネス dist 再生成で追跡ファイル不変、plugin-conformance-e2e green、既存テストスイート green、coverage/complexity ゲート green
- #2996: 残存参照検査 0 件(パス軸・素の名前軸の機械化述語で実測)、ステージ slug・センサー id・スキル名・ツールファイル名の不変を diff で機械確認
- #2997: センサー3経路(交差あり警告 / 交差なし情報表示 / fetch 失敗 loud skip)+ 設定機構4項(不正値 fail-closed / 省略デフォルト / 設定値の実消費 / 宣言側綴り誤りの loud 化)の落ちる実証完了
- TDD 既定(実装前の Red 実測 → 最小実装で Green の vertical slice 反復)

## Initiative Trigger(なぜ今か)

プラグイン粒度の裁定(2026-08-14)で命名規約と単機能プラグイン方針が確定し、両 Issue のクロスレビュー2名(xrev-260814-2996 / xrev-260814-2997、いずれも CONFIRMED_WITH_REFINEMENTS)が成立した直後であり、規約を最初の1対(`github-pr-convergence` / `git-drift`)から一貫させる適期。設定機構は最初の実消費者(git-drift のスロットル間隔)が明確な今が導入適期(先行着地禁止 = 実装+配線の同一 intent 要件)。

## Initial Scope Signal(初期スコープシグナル — Q1 回答で確定)

- スコープ: `self-feature`(Amadeus 自体の新機能)。対象は両 Issue の記載スコープのみ。
- 対象外: 残り2プラグイン(`coverage-patch-quick` / `formal-model-check`)への規約適用可否の裁定(必要なら別途)。
- 順序: #2996(改名)→ #2997(git-drift + plugin.settings)。#2997 は 1 Issue = 2 Unit(core 設定機構 / plugin git-drift)の意図的逸脱を含む(Unit 分割は units-generation 段で設計)。
- 不変条件(#2996): ステージ slug `pr-convergence`、センサー id `pr-convergence-report-format`、スキル名 `/amadeus-pr-convergence`、ツールファイル名 `pr-convergence-*.ts`。
- 主要リスク(#2996): `amadeus/config.json` の `plugin.scope-bindings` プラグイン名キーの同期漏れは **silent**(ステージが全スコープ行から無音脱落)— 改名 PR の主要リスクとして設計段で検証を手当てする。
- Intent autonomy: `semi`(2026-08-14 ユーザー宣言、INTENT_AUTONOMY_TRANSACTION_COMMITTED 実測)。マージは人間承認(AI 自発マージ禁止)。

## 上流入力

- Issue #2996: https://github.com/amadeus-dlc/amadeus/issues/2996(クロスレビュー2名成立)
- Issue #2997: https://github.com/amadeus-dlc/amadeus/issues/2997(クロスレビュー2名成立)
- 本 intent のミラー Issue: #3022(engine 一方向同期)
- 質問と回答: `intent-capture-questions.md`(Q1/Q2 とも A)
