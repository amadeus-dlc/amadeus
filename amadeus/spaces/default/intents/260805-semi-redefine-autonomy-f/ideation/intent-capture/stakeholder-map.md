# Stakeholder Map — semi 再定義と --autonomy 起動宣言(#2253)

上流入力(consumes 全数): なし(本ステージは consumes を宣言しない。一次入力は Issue #2253 とユーザー裁定)

## 主要ステークホルダーと関心

| ステークホルダー | 役割 | 関心 |
|---|---|---|
| リポジトリオーナー(j5ik2o) | 意思決定者・第一利用者 | headless 運用の再現性、モード軸の一貫性(none=全部人間 / semi=節目だけ人間 / full=事後検収)、PR は自らレビュー・マージ(no-AI-merge 維持) |
| Amadeus conductor(AI エージェント) | 実行者 | 起動時にモードが決定的に判る入口、質問裁定の grant 非依存な認可基体の明確化 |
| 将来の Amadeus 利用チーム | 影響を受ける利用者 | semi の意味変更(質問が推奨回答で進む)の明示的な docs 改訂、推奨回答を許容しない場合の none への退避先 |
| ハーネス保守者 | 影響を受ける開発者 | 全ハーネス self-install 面への同期投影、directive contract(`intent_autonomy_mode`)の語彙整合 |

## 意思決定者 vs 影響者

- **意思決定者**: リポジトリオーナー — canonical 仕様の改訂(#2067 の自律レベル表)はユーザー専権。本 intent の裁定はすべて 2026-08-05 の会話で確定済み(semi=full−節目 / walking skeleton は semi で人間 / 後方互換なし / full grant 許可)
- **影響者**: conductor 実装・reviewer subagent(改訂後の semi 意味論で動作する側)、クロスレビュー2名(#2253 の実在性と精密化を確定済み)

## コミュニケーション要件

- 進行記録は intent record と mirror Issue #2260 の一方向同期
- 自動裁定(agent recommendation / solo election 由来)は unreviewed queue に積み、ユーザー帰宅後に検収可能な状態を維持する
- Bolt ごとに PR を発行し、レビュー・マージはユーザーが実施(承認境界は維持)
- park(NORM_CONFLICT / REPAIR_STALLED / scope 外)時はセッションに状態を報告して待機
