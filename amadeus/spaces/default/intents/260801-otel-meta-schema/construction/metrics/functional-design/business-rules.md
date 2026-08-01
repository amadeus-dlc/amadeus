# Business Rules — U5 metrics

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md — U5 の責務は unit-of-work.md U5 行(按分150行: instruments 60+meter arm 20+bootstrap meter 部 15+計測点配線 55)から、API 形は component-methods.md の metrics-instruments 節から、FR 契約は requirements.md FR-MET-1〜4 から、価値は story-map 段5から、store 境界(metrics-*.jsonl、Relay 無改変)は services.md から導出した。

## ルール(FR 対応)

- **BR-U5-1**(FR-MET-1): observability 有効時のみ metrics-*.jsonl が生成される。無効時は全ヘルパ no-op(テスト: 両分岐)
- **BR-U5-2**(FR-MET-2): 計器5つの name/kind/attrs は INSTRUMENTS と1:1(#1868 §6)。リテラル計器名の混入は grep ガードで検出
- **BR-U5-3**(FR-MET-3): token 供給は供給時のみ記録・未供給沈黙・二重供給拒否(supplier 契約)
- **BR-U5-4**(FR-MET-4): 計測 throw 注入で emit 経路無傷(落ちる実証)
- **BR-U5-5**: 属性の低 cardinality 閉集合をテスト固定(intent id / agent id の混入で赤)

## 実装・検証義務

- record への resource 載せは U1 の成果を消費(本 Unit では meter-provider の record 組み立てに currentResource を配線するのみ)
- registry 変更なし(metrics はイベントでなく計器 — event-registry 非接触、78-pin 無関係)
- NFR-4: package.ts+promote:self 同一 PR
