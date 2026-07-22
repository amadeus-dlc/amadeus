# Unit of Work — 260720-goa-sparse-family

上流入力(consumes 全数): requirements.md、components.md、component-methods.md、services.md、component-dependency.md、decisions.md

## U1: goa-sparse-acceptance(単一 Unit)

- 内容: requirements.md の FR-1(parseGoaLine スパース受理 — decisions.md ADR-1/2/4)+FR-2(GoaLineCode 複節拡張+撤去 — ADR-3)+FR-3(ECODE_RE 整合)+FR-4(検証・配布)。実装順序は component-dependency.md の AD→FD→CG 単一 Bolt を継承
- 規模見積り: 185-280行(components.md の数値見積り — norm-metrics 60-90+extractGoaRecords 追加+record.ts 5-10+election.ts 1-2+テスト 115-175)
- 変更面: packages/framework/core/tools/amadeus-norm-metrics.ts(dist 再生成対象)/ scripts/amadeus-election-record.ts / scripts/amadeus-election.ts / tests/unit/t-norm-metrics.test.ts / tests/unit/t238-election-record.test.ts
- 完了条件: services.md の出力契約4点(スパース受理成功形・handleOpen 表記・count 不変対照・corpus 21 occurrence sweep 両側 = extractGoaRecords→parseGoaLine 2段)+component-methods.md のメソッド契約どおりの実装+全 CI ゲート green
