# Stakeholder Map — 260814-coverage-quick-norm

## 意思決定者

- **ユーザー(リポジトリオーナー)**: 起動文で対象・禁止・完了条件・マージ専権を裁定済み。PR マージは人間専権(cid:requirements-analysis:no-ai-merge)。ノルム変更 PR の独立レビューも人間側(cid:requirements-analysis:norm-consistency-review)。

## 実行者

- **conductor(本セッション)**: self-document ワークフローの実行、Inbox 追記、根拠の再実測、PR 作成、pr-convergence。ソロ運用。
- **architect 視点(support)**: 追記が既存 Corrections(coverage single-owner)および team.md の数値転記規律と矛盾しないことを起草前に確認する。矛盾があれば Inbox 追記を止め、エスカレーションする。

## 影響を受けるが決定権を持たない関係者

- **後続の自己開発エージェント**: Inbox の運用ノルムを内側ループで読む。
- **CI / レビュアー**: blocking gate の正本性は維持される。advisory を代替と読まれないことが利益。
- **定期蒸留ラウンド**: 本追記の昇格・削除を後で裁定する。本 intent は昇格しない。

## コミュニケーション

- Intent record と GitHub mirror Issue が一次記録。
- 進捗と完了報告はユーザー向け日本語。コミットメッセージは英語。
- ステージゲートは Intent autonomy `full` の AUTO_DECIDED。内容裁定の代答には常任グラントを使わない。
