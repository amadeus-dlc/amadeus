# Scalability Requirements — u5-docs-and-distribution

上流入力(consumes 全数): business-logic-model, business-rules, requirements, technology-stack

## 配布面の規模

- dist 再生成の対象は7ハーネス+self-install の**固定集合**(business-rules BR-U5-3 — cid:build-and-test:bt-dist-regen-seven-harnesses)。ハーネス数は本 intent で変化しない(technology-stack: 配布経路不変の断面)。ハーネス追加時の拡張は将来 intent の事項であり、U5 は現行集合の全面同期のみを規定する。
- docs は既存4文書体系(business-logic-model — en/ja 対訳ペア×2)への追記であり、文書数は増えない(business-rules BR-U5-1 — 新文書を増やさない)。

## スケーリング方針(非適用の明示)

- 負荷スケーリング・キャッシュ等のランタイム機構: N/A — U5 は静的成果物(docs・生成物)と検収のみで実行コードを追加しない(business-logic-model 冒頭)。requirements FR-12b の配布同期は build 時の機械的再生成であり、規模の変数を持たない。
- 検収(requirements FR-12a — テスト完備確認)の規模はテストスイート全体の実行1回分 — 既存 CI の枠内で完結し、新しい実行基盤を要しない(cid:nfr-design:c1 の CLI 適用と同旨)。
