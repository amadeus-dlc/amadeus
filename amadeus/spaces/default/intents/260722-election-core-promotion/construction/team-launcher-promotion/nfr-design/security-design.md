# Security Design — team-launcher-promotion

> 上流入力(consumes 全数): performance-requirements、security-requirements、scalability-requirements、reliability-requirements、tech-stack-decisions、business-logic-model(本文で参照)

## 設計

- security-requirements の「入力検証強化のみ・秘密情報なし」を実現: エラー文言は固定テンプレート(business-logic-model の4要素 — ツール名+公式入手先+docs 参照+exit 1)で動的入力を埋め込まない。doctor advisory(detectTeamPrerequisites)は PathProbe 注入の純関数で環境読取のみ
- tech-stack-decisions の外部コード非同梱により供給網面の増分ゼロ

## 検証設計

- security-requirements の N/A(追加検査なし)を維持。reliability-requirements のフェイルファスト分岐検証(integration)がエラー文言の固定性も同時に assert

## 他 NFR との整合

- performance-requirements の定数回探索・scalability-requirements の env 契約不変と同一実装点 — 検査関数の性質として一体成立
