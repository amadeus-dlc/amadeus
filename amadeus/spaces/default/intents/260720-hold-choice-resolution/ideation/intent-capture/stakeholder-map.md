# Stakeholder Map — 260720-hold-choice-resolution

上流入力(consumes 全数): (本ステージは consumes 宣言なし)

## Key Stakeholders and Interests

| ステークホルダー | 関心 | 種別 |
| --- | --- | --- |
| ユーザー(j5ik2o) | hold 裁定の表現力。ユーザー可視契約変更該当時の承認者(正準リスト(4)) | 意思決定者 |
| leader | hold-resolved の運用者(CLI 実行)・ゲート執行 | 意思決定者(執行) |
| e4 | #1254/#1255/#1257 バッチで amadeus-norm-metrics.ts+record.ts(GoaLineCode 面)を並行変更 — record.ts 関数単位の交差調整相手 | 影響者(調整対象) |
| e2(本 conductor) | 実装責任。E-TCRCG/E-TCRRA1〜4 の投票当事者として裁定文脈を保持 | 実行者 |

## Decision-makers vs. Influencers

意思決定者: ユーザー(契約変更・マージ)、leader(執行)、エージェント選挙(CLI 構文・後方互換の設計裁定 — 要件(5) 単独決定禁止)。影響者: e4(交差面)。

## Communication Requirements

完了・ブロッカー自発報告 / 設計判断は選挙依頼 / e4 との交差確認結果は leader へ即時報告(autonomous-decision-immediate-report)/ 逸脱は実装前停止。
