# Scalability Design — metrics-observation

- **SC-1(16KB 上限)**: 保証機構 = FR-5 スキーマテストに serialize サイズの assert(16_384 bytes)を含める(U2)。集計値のみのスキーマ(per-file 明細なし)が構造的な抑制。
- **SC-2(蓄積)**: 設計上の対処なし(オーダー見積りで問題規模でない)— B2 留保のまま。metrics/ の読み時集計はファイル数線形で、年間規模では jq/スクリプトの実用域。
- **SC-3(水平拡張)**: collector 配列(D4)+ schema_version。collector 追加 PR の定型: 配列1要素+スキーマテストの期待値1行。
