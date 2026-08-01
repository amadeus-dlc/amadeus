# Business Rules — U3 exception

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md — U3 の責務は unit-of-work.md U3 行(按分95行: tracer recordException 部 20+redaction 60+registry exception 部 15)から、API 形は component-methods.md の redactStacktrace / recordException 節から、FR 契約は requirements.md FR-EXC-1〜4 から、価値は story-map 段3(バグ改修の直接材料)から、store 境界は services.md から導出した。

## ルール(FR 対応)

- **BR-U3-1**(FR-EXC-1): registry の optional 2属性追加のみで redaction safe-key が自動追従する(機械導出 REGISTRY_ATTRIBUTE_KEYS)。t385 static admission / t-otel-redaction の集合 assert を同一 PR で更新
- **BR-U3-2**(FR-EXC-2): recordException が err.name/err.stack を供給。非 Error 入力(文字列 throw 等)は message のみ(type/stacktrace 省略)
- **BR-U3-3**(FR-EXC-3): 落ちる実証 — ホームパス・repo 絶対パス・credential 形トークンを含む合成 stack の注入で (a) repo 相対化 (b) `<home>` マスク (c) scrub の3面を assert。実 stack サンプル(bun の実 throw)でも検証
- **BR-U3-4**(FR-EXC-4): telemetry 分類不変。canonical 化の試みは実行時検査+drift guard の両方で赤(既存の落ちる実証を characterization として維持)
## 実装・検証義務

- **BR-U3-5**: registry 交差(event-registry.ts)は U4 と直列(DAG エッジ済み)— 本 Unit が先行し、U4 は本 Unit の着地後に積む
- **BR-U3-6**(NFR-4): package.ts+promote:self 同一 PR
