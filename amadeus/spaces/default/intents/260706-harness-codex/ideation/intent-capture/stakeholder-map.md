# Stakeholder Map — 260706-harness-codex（Issue #552）

## 主要ステークホルダーと関心

| ステークホルダー | 役割 | 関心 |
|---|---|---|
| j5ik2o（Maintainer） | 意思決定者 | 三層化の設計妥当性、Phase 分割の履行、PR merge 判断。Issue #552 の構成・受け入れ条件を確定済み |
| leader | 意思決定の中継・調整者 | gate 承認の中継（auto 委任）、接触面の調整、4 イベント報告の受領 |
| engineer4（本セッション） | 実施担当 | 設計確定の進行と Phase 1 実装 |
| engineer1〜3、5 | 影響を受ける側 + 協議参加者 | 設計論点 5 件のピア協議回答。特に engineer3（#554 = promote-skill / parity 正規化）は openai.yaml の配置が promote 単位に触れる場合の接触面当事者 |
| Codex ハーネス利用者（将来） | 受益者 | harness/codex/ の存在と openai.yaml の正しさ |
| 上流 awslabs/aidlc-workflows | 参照元 | dist/codex の構造（基準 b67798c3）。取り込みの純正性（#541） |

## 意思決定者と影響者の区別

- 決定: Maintainer（設計確定の最終判断、merge）。gate は auto 委任経路（人間 → leader → engineer4）。
- 影響: 全 engineer（設計論点のピア協議で全メンバー同報。回答は判断材料、採用判断は engineer4）。
- 接触面の当事者: engineer3（openai.yaml を source skills/amadeus-*/ へ置く設計になった場合、配置設計の確定時にピア確認する = ディスパッチ指示 2）。

## コミュニケーション要件

- gate 到達・PR 作成・ブロック・Intent 完了の 4 イベントを leader へ報告する。
- 設計論点 5 件のピア協議は全メンバー同報（team.sh 実測の現メンバー、期限 15 分・回答 1 件成立）。
- Phase 2 への引き継ぎは設計確定成果物を添えて後続 Intent 起案（起案は人間と leader）。
