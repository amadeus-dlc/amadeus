# Practices Discovery — ステージメモリ

## Interpretations

- 2026-07-13T08:16:02Z — 同日 Reverse Engineering の CodeKB と現行リポジトリの差分実測を証拠スキャンとして採用した。project.md の `practices-discovery:c1` に従い、CI・テスト・コードスタイル・セキュリティの全スキャンを重複実施せず、鮮度確認へ絞った。
- 2026-07-13T08:16:02Z — 5領域に未決ギャップがないため、追加インタビュー質問は0件とした。既存の team.md／project.md、Ideation の決定、現行コード証拠が Way of Working、Walking Skeleton、Testing Posture、Deployment、Code Style をすべて確定している。

## Deviations

- 2026-07-13T08:16:02Z — ステージ本文 Step 2 の4 Task 並列指定ではなく、engine directive の `mode: inline` と stage-protocol の inline support-agent 規則に従い、4 persona を同一セッション内の観点として適用した。独立スキャンは同日 CodeKB で完了済みであり、追加 Task は生成していない。
- 2026-07-13T08:19:05Z — ステージ本文が単一行を要求する `practices-discovery-timestamp.md` は、共通 `required-sections`／`upstream-coverage` の per-output 自動発火要件を構造上満たせない。timestamp の正規契約を維持し、全上流を参照する `evidence.md` で両センサーの明示PASSを取得した。自動発火側の失敗は advisory mismatch として監査に残した。

## Tradeoffs

- 2026-07-13T08:16:02Z — 再実行で変更のない5 practice section を再記述せず、recognized section を含まない無変更の部分ドラフトを選んだ。`practices-promote` の absent-section 温存契約と project.md の `practices-discovery:c2` により、既存 live practice の不要な churn を防ぐ。

## Open questions
