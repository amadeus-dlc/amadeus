# Security Test Instructions

Unit: overlay-reverse（bugfix scope、Test Strategy: Minimal）

## 適用判断

本変更は配布物のセキュリティ姿勢を悪化させない。逆変換は source の宣言（`dev-scripts/data/model-overrides.json`）だけを入力に取り、配布物側だけへ作用する（source 無変更 = FR-2.2）。

- 信頼境界: overlay 宣言は source（この repo、開発者管理）側にあり、#543 で扱った target 側 manifest（利用者可変 = 信頼境界外）とは別。逆変換は target 側の入力に依存しないため、新たな信頼境界越えは生じない。
- fail-open（FR-1.3）: 宣言ファイル不在・不正 JSON では逆変換せず素通しする。これは install を止めないための設計であり、素通し時に配布されるのは source の実値そのものである（新たな情報漏洩・権限昇格を生まない）。
- 逆変換ロジックは既存 export 済み helper（`readModelOverrideLine` / `setModelOverrideLine`、#554 でテスト済み）を再利用し、新規のパース経路を増やさない。

専用のセキュリティテストは設定せず、上記判断と実装レビュー（§12a architecture-reviewer READY）へ分担する。
