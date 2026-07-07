# Decision Log — インストーラの実装(Ideation)

> ステージ: approval-handoff (Ideation) / 作成: 2026-07-07
> Ideation フェーズ全体の決定記録。各決定の詳細は出典ステージの質問票(`*-questions.md`)に一次記録がある。

## 決定一覧

| # | 決定 | 出典 | モード |
|---|------|------|--------|
| D1 | 中心課題は導入・更新・安全性の3点セット | intent-capture Q1 | Grilling |
| D2 | 顧客は新規 + 既存ユーザー(組織一括展開は除外) | intent-capture Q2 | Grilling |
| D3 | 提供形態は npm 公開 CLI + bunx/npx ワンライナー | intent-capture Q3 | Grilling |
| D4 | 全4ハーネス対応・ユーザー選択式(自動検出なし) | intent-capture Q4 | Grilling |
| D5 | 非破壊マージがデフォルト(`amadeus-*` のみ更新)+ `--force` | intent-capture Q5 | Grilling |
| D6 | 成功指標: 1コマンド1分以内 / README手動手順の廃止 / カスタマイズを失わない更新 | intent-capture Q6 | Grilling |
| D7 | トリガーはリリース頻度の上昇(更新配布の必要性) | intent-capture Q7 | Grilling |
| D8 | 比較対象は cc-sdd(主参照)+ spec-kit + 参照型。更新対応を重視 | market-research Q1 | Guided |
| D9 | UX水準: 対話式ウィザード + 非対話フラグ完備 | market-research Q2 | Guided |
| D10 | 差別化: バージョン検出 + 適用前差分レポート | market-research Q3 | Guided |
| D11 | build-vs-buy: 完全自作(bun/TypeScript、依存ゼロ) | market-research Q4 | Guided |
| D12 | ポジショニング: プロダクトの顔(1コマンドで始められる AI-DLC) | market-research Q5 | Guided |
| D13 | パッケージ名 `@amadeus-dlc/setup`(議論を経て確定) | feasibility Q1 | Guided |
| D14 | npx/bunx 両対応(TS をビルドして公開) | feasibility Q2 | Guided |
| D15 | 公開フローは既存タグ運用に統合 + 手順明文化 | feasibility Q3 | Guided |
| D16 | 配布物は GitHub からタグ指定取得(npm 同梱しない) | feasibility Q4 | Guided |
| D17 | タイムライン制約なし(品質優先) | feasibility Q5 | Guided |
| D18 | コンプライアンスはライセンス継承のみ。**MIT + Apache-2.0 デュアル**(package.json の MIT-0 は要是正) | feasibility Q6 | Guided(ユーザー訂正) |
| D19 | 初回 MUST は init + upgrade(doctor は除外) | scope-definition Q1 | Grilling |
| D20 | 差分レポートはファイルレベル一覧(内容 diff は将来) | scope-definition Q2 | Grilling |
| D21 | OUT 5項目(一括展開/オフライン/ロールバック/自動検出/provenance) | scope-definition Q3 | Grilling |
| D22 | 順序付けは依存優先(基盤 → init → upgrade) | scope-definition Q4 | Grilling |
| D23 | bin 名は `amadeus-setup`(/amadeus スキルとの混同回避) | scope-definition Q5 | Grilling |
| D24 | 体制はソロメンテナ + AI エージェント | team-formation Q1 | Guided |
| D25 | npm 公開実行者はメンテナ自身 | team-formation Q2 | Guided |
| D26 | Bolt 運用はデフォルト(skeleton ゲート + ladder) | team-formation Q3 | Guided |
| D27 | CLI 言語は英語デフォルト + `--lang ja` | rough-mockups Q1 | Guided |
| D28 | ウィザードは標準構成(2〜3ステップ) | rough-mockups Q2 | Guided |
| D29 | 出力はミニマル + 差分のみテーブル整形 | rough-mockups Q3 | Guided |
| D30 | `--force` は二段階確認("force" 明示入力)+ OVERWRITE 事前列挙 | rough-mockups レビュー対応 | Review |
| D31 | Ideation 承認・Inception へ移行 | approval-handoff Q1 | Guided |

## 持ち越し事項(承認済み)

| # | 事項 | 解決タイミング | オーナー |
|---|------|----------------|----------|
| C1 | npm 組織スコープ `amadeus-dlc` の確保 | 公開前タスク | メンテナ |
| C2 | `--force --yes` 併用時の表示仕様の確定 | functional-design | 設計 |

## レビュー記録

- rough-mockups: product-lead レビュー 1回目 NOT-READY(5件)→ 全件修正 → 2回目 READY
