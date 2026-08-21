# Stakeholder Map — 260821-fmc-retirement

## ステークホルダー

| ステークホルダー | 役割 | 関心・痛点 | 関与 |
|---|---|---|---|
| ユーザー(監督者) | 裁定者・再設計の将来オーナー | FMC が成果ゼロでトークン・時間を消費し混乱を生む。再設計までの完全削除を裁定済み(2026-08-21) | 退役裁定済み。full autonomy 予定のため以降は fail-closed 時のみ関与 |
| AI-DLC conductor(将来 intent の実行者) | 消費者 | 毎 intent の tla-authoring / formal-model-check 2 ステージ実行コストが消える。0-plugin baseline の workflow 短縮 | 受益者 |
| CI パイプライン | 検証基盤 | formal-model-check blocking job の除去 — `ci-success` 集約の needs 整合を壊さない移行が必須 | 変更対象 |
| github-pr-convergence プラグイン | 隣接プラグイン | model-map に自 models(BoltPrAttestationGate / PrConvergenceGate)の pin を持つが、その consumer は FMC 側 — 削除で参照が残らないことの実測が必要 | 非接触確認対象 |
| 別エージェント(#3382 対応中) | 並行作業者 | plugins/github-pr-convergence を作業中 — 本 intent は同ディレクトリ非接触で衝突なし | 情報共有のみ |
| 将来の再設計 intent | 後続 | 旧実装・7 モデル・ノルム経緯は git 履歴と本 record が参照点 | 本 record が引き継ぎ資料 |

## 影響面の所有

- ソース削除・CI・テスト・docs: 本 intent の Bolt が所有
- ノルム整理(team.md / project.md): 単独ノルム PR(蒸留手順)で本 intent が起案、マージは常任承認条件
- Issue 処遇(#3246 等): ユーザー裁定(questions Q3)
