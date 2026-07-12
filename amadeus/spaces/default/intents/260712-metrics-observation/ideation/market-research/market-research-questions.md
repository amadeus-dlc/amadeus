# Market Research — 明確化質問(260712-metrics-observation)

> 回答方式: 既決照合(no-election-for-decided-norms)。本ステージの論点は Issue #921(クロスレビュー 2/2)+leader ディスパッチ+intent-capture 裁定(E-MO-IC)から導出でき、真に未決の設計判断(メトリクス選定・保存形式・トリガー・可視化要否)は Issue 本文の明示的委譲により requirements/design ステージの論点である。各回答に出典を付す。

## Q1. 外部品質 SaaS(SonarCloud 等)の導入を本 intent の選択肢として真剣に評価すべきか?

- A. 評価のうえ不採を明記する(比較・却下理由を成果物に残す)
- B. 評価自体を省略する
- [Answer]: A — competitive-analysis.md / build-vs-buy.md で評価・不採を記録した。根拠: project.md Forbidden(ランタイム依存の無断追加禁止)と #921 の要望形(「ファイルに出力」= リポジトリ内台帳)が既決の制約であり、inception ガードレール「アーキテクチャ決定には代替案2つ以上の文書化」に従い却下理由付きで記録(出典: project.md / Issue #921 本文)。

## Q2. 可視化(グラフ/ダッシュボード)は本ステージで方向を確定すべきか?

- A. しない — #921 が「論点」と明示しており、requirements の論点として委譲(カバレッジは Codecov 既保有で重複構築しない、の整理のみ本ステージで記録)
- B. する
- [Answer]: A(出典: Issue #921「可視化の要否」が論点欄に明記 — 委譲は起票時点の既決)。

## Q3. 本ステージで未決として requirements へ渡す論点の台帳

選挙不要(委譲の転記のみ)。以下を requirements の入力とする:
1. メトリクス選定と粒度(候補: LOC/ファイル数/関数数+CCN 分布/テスト数・assertion 数/カバレッジ%/dist サイズ — #921 記載)
2. 保存形式(日付付き個別 JSON vs 追記台帳 — market-trends.md §5 の競合安全所見を添付)
3. トリガー(main マージ CI / cron / 手動 — market-trends.md §4 の所見を添付)
4. snapshot への lcov 集計値の含否(build-vs-buy.md ハイブリッド節)
5. スキーマの計測器疎結合(build-vs-buy.md リスク節)
