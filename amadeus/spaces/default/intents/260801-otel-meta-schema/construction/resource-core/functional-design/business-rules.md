# Business Rules — U1 resource-core

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md — U1 の責務境界は unit-of-work.md の U1 行(按分 350行)から、API 形は component-methods.md の resource.ts / resource-suppliers.ts 節から、FR 契約は requirements.md FR-RES-1〜4 から、価値文脈は story-map 段1から、store/Relay 境界は services.md から導出した。

## ルール(FR 対応)

- **BR-U1-1**(FR-RES-1): 3シグナル(spans-/監査 v2 行 or logs store/metrics-)の全レコードに同一 ResourceBag が載る。差異は不変条件違反
- **BR-U1-2**(FR-RES-2): 解決不能キーは省略。省略は emit を止めない(fail-open)。CI env では deployment.environment.name = "ci"
- **BR-U1-3**(FR-RES-3): supplier は1回設定・二重設定 throw・bootstrap 前後いずれも可。未供給4キーは bag 不在
- **BR-U1-4**(FR-RES-4): resource は **write-time = buildResource の bag 完成時 redaction(新設 — span/metrics 経路に write-time 層が現存しないため組み立て点で一元化)**+export 境界(redactRecord ほか)の二層を通る。落ちる実証: credential 形値の供給で (a) bag 時点 masked (b) store 上 masked の両層を assert
- **BR-U1-5**: 中立8+vcs2 と supplier 4 のキー集合は互いに素(衝突時は実行時 throw = caller bug)

## 実装・検証義務

- **BR-U1-6**(NFR-4): core 変更につき package.ts+promote:self を同一 PR で回す
