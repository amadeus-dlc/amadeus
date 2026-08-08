# Stakeholder Map — autonomy-reachability(#2378)

上流入力(consumes 全数): なし(本ステージは consumes を宣言しない)

## 主要ステークホルダーと関心

- **リポジトリオーナー(j5ik2o)** — 意思決定者。自律運用の実効性と表(#2253 の12概念表)どおりの挙動を要求。マージ承認・仕様変更裁定の専権
- **headless/自律運用の利用者** — `--autonomy` 宣言が発見可能で、宣言どおりに走行し、止まった理由が audit で読めること
- **conductor(各ハーネスの orchestrator セッション)** — SKILL.md/stage-protocol の操作手順が semi/full の質問裁定を過不足なく規定していること
- **後続 intent の計測者** — 回帰計測が committed corpus から第三者再現できること(計測 ref・イベント形の明記)

## 意思決定者 vs 影響者

- 意思決定者: ユーザー(仕様変更・マージ・優先度)
- 影響者: クロスレビュー2名の verdict(訂正6点)、engine の既存契約(FR-GRT-006 grant 儀式は緩めない)

## コミュニケーション要件

- 進捗は forwarding loop のゲートと PR で可視化。PR には Issue #2378 を Refs で紐付け(closing keyword は最終 PR のみ)
- 仕様変更に当たる事項(例: birth 同時宣言の可否の意味論)は実装前にユーザーへエスカレーション(正準リスト(4))
