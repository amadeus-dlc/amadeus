# Stakeholder Map — canonical-settings

> intent 260709-canonical-settings(Issue #623)のステークホルダー整理。運用形態は leader 中継のエージェントチーム(選挙プロトコル)であり、通信要件はその実態に合わせる。

## Key Stakeholders and Interests

| ステークホルダー | 役割 | 関心事 |
|---|---|---|
| j5ik2o(ユーザー/Issue 起票者) | 最終意思決定者 | #622 実装の土台が正しく固まること。設定の置き場所・形式・型・読み込み順の確定。ゲート承認・マージ承認の最終判断 |
| フレームワーク開発チーム(保守者) | 受益者(対等 1/2) | ハーネス別設定への重複記述の排除、1形式の source of truth、整合維持コストの削減 |
| amadeus 導入チーム(エンドユーザー) | 受益者(対等 2/2) | どのハーネスでも同じ設定が同じ場所・同じ既定値で扱えること。設定不備の検出可能性 |
| claude-leader | 中継・ゲート執行 | 選挙の配信・集計、ユーザーへのエスカレーション中継、PR/Issue 管理 |
| claude-engineer-1(本セッション) | conductor | ワークフロー実行、成果物品質、チェックポイントコミット |
| codex-engineer-1 ほかメンバー | レビュアー/投票者 | 成果物レビュー(READY 判定)、選挙投票 |
| #622 の将来実装者 | 下流消費者 | interactionModes スキーマの安定性、settings loader API の使いやすさ |

## Decision-Makers vs. Influencers

- **Decision-maker**: j5ik2o(ゲート承認・PR マージ承認・3対3同数時の裁定。AI は PR マージを自発実行しない — team.md Forbidden)
- **委任された集合的判断**: エージェント間選挙(明確化質問の多数決。既決規範は選挙にかけない)
- **Influencers**: レビュアー(READY/NOT-READY 判定で品質に影響)、Architect 視点(設計整合性の助言)、本家 AI-DLC 方法論(構造上の前提)

## Communication Requirements

- **進捗報告**: 報告制(push 型)。ステージ完了・ブロッカー発生時に conductor が claude-leader へ agmsg で自発報告。leader からのポーリングはしない(team.md 学習)
- **明確化質問**: 質問文を claude-leader へ送付 → 全メンバーへ配信・投票・集計 → 確定回答を conductor へ返す。同数(3対3等)のみユーザーへエスカレーション
- **ゲート承認**: conductor が成果物サマリを leader へ送付し、leader がユーザーへ中継。承認が返るまでステージを完了扱いにしない
- **工程記録**: チェックポイント(ステージ完了時等)で `amadeus/` ツリーを conductor のブランチへコミット。実装 PR とは分離(PR 分割規範)
- **Issue 起票**: スコープ外だが関連する発見(既存設定の移行候補等)は発見時点で GitHub Issue 化し、リンクを会話と stage diary に残す
