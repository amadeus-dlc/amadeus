# Stakeholder Map — 260727-plugin-verb-skills

上流入力(consumes 全数): なし(本ステージは consumes を宣言しない)

## Key Stakeholders

| ステークホルダー | 関心 | 役割 |
|---|---|---|
| ユーザー(j5ik2o) | plugin 運用の入口が他機能と対称になること。Issue 記述のフル実装(スコープ削減なし) | 意思決定者 — スコープ裁定・ゲート承認・PR マージ承認 |
| Amadeus 利用開発者 | `/amadeus plugin <verb>` / `/amadeus-plugin` / `/amadeus-<slug>` の一貫した入口 | 受益者 |
| plugin 作者(formal-model-check 等の同梱 plugin 含む) | INSTALL 手順の摩擦低減(install verb)、compose 後の単段実行入口(#1598) | 受益者・影響を受ける側 |
| upstream(awslabs/aidlc-workflows) | 2.3.0 で deferred にした wrapper CLI 面の先行実装事例 | 参照元(決定権なし) |

## Decision-Makers vs. Influencers

- **意思決定**: ユーザー(スコープ・ゲート・マージ)。ソロモードのため選挙は適用外、未決事項はユーザーへエスカレーション
- **影響**: 既存の同型前例 — `amadeus-mirror` スキル(ガード付きライフサイクル CLI ラップの様式)、`amadeus-runner-gen.ts`(runner 生成+drift guard の様式)、`11-contributing.md` の Utility Handler チェックリスト

## Communication Requirements

- 進捗・裁定は本 record(intent record が正本)へ記録。Issue #1597 / #1598 へは着地時にクローズコメントで反映(close-after-landing 準拠)
- ゲート・マージは AskUserQuestion で個別明示的に諮る(no-AI-merge)
