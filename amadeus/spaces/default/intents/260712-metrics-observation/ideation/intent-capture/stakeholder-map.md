# Stakeholder Map — メトリクス定点観測(260712-metrics-observation)

## 主要ステークホルダーと関心事

| ステークホルダー | 役割 | 関心事 |
|---|---|---|
| ユーザー(j5ik2o) | 発案者・最終意思決定者 | コードベース健全性の時系列可視化。要望の発信元(Issue #921、2026-07-12)。マージ承認の唯一の権限者(no-AI-merge) |
| leader | ゲート執行・選挙集計・PR 管理 | delegate 発行、§13 選挙の配信、マージ実行(ユーザー承認後) |
| e2(本 intent conductor) | conductor | ステージ進行、成果物品質、ノルム順守(worktree 隔離・deslop・push 前 lcov) |
| 開発チーム(e1〜e6) | 消費者・選挙投票者・レビュアー | 計測結果の利用(品質判断材料)。選挙投票と PR レビュー(Bolt ごとにレビュアー指名) |
| CI(GitHub Actions) | 実行基盤 | トリガーに CI を選ぶ場合、計測ジョブの実行時間・依存(lizard の pinned install 等)が影響を受ける |

## 意思決定者と影響者

- **意思決定者**: ユーザー(スコープ例外・マージ・仕様変更のエスカレーション正準リスト該当事項)。エージェント選挙(設計判断 — メトリクス選定・保存形式・トリガー等は leader 経由の選挙で確定)
- **影響者**: e4/e5(Issue クロスレビューで実現イメージへ非ブロッキング補足を提供 — 追記型台帳の衝突考慮、lizard 再利用可能性)。complexity-gate の既存実装(設計の参照点)

## コミュニケーション要件

- 進行報告は push-reporting(完了・ブロッカーの自発報告)+ dispatch-ack-required(全方向 ack プロトコル、3分タイムアウト)に従い、leader 宛は agmsg(送信前 team.sh 実名確認)で行う
- ステージゲートは delegate-approval provenance(#671)— conductor がゲート準備完了を leader へ報告 → delegate 発行 → approve
- §13 学習選定・設計質問はエージェント選挙(blind 配布・独立投票)— leader が配信・集計
- PR は日本語(タイトル・本文・コメント)、コミットメッセージは英語。Bolt 単位 PR+レビュアー指名+deslop+push 前ローカル lcov
