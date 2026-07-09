cat > amadeus/spaces/default/intents/260709-pbt-small-band/construction/functional-design/memory.md <<'EOF'
# Stage Diary — functional-design(3.1)

## Interpretations

- 2026-07-09T14:55:00Z — units 不在(refactor スコープで units-generation SKIP)のため単一ユニット `small-band` として設計成果物を construction/small-band/functional-design/ に配置(engine の per-unit resolver 契約に整合 — integrity-batch code-generation での学び)。
- 2026-07-09T14:55:00Z — frontend-components.md は CLI/テスト基盤 intent のため不作成(reviewer も妥当と確認)。

## Deviations

- (なし)

## Tradeoffs

- 2026-07-09T14:55:00Z — P-PL2 は「独立業務ルール文書からの導出」ではなく決定表の形状不変条件(全域性・部分域決定性・出現域排他)として定義; install 側 classifyAction に BR-* コメントが無いため。reviewer 判定: トートロジーには当たらず NFR-3 充足。実装時に BR-I* コメント追加の提案(Minor)あり。

## Open questions

- 2026-07-09T14:55:00Z — reviewer iter1 の教訓: プロパティカタログは起草時点で実装と逐条照合してから提出する(比較関数の strict/非 strict、分岐順序の優先関係は law の形を変える)。
