# Business Rules — U2 plugin-skeleton

上流入力(consumes 全数): unit-of-work、unit-of-work-story-map、requirements(FR-1/FR-2)、components、component-methods、services

## ルール一覧

- BR-U2-1(汎用発見): walk 拡張は plugin 名を問わない汎用機構。formal-model-check 固有の分岐・ハードコードを持たない(FR-1.1)
- BR-U2-2(loud 衝突): slug 重複は compile 段で loud reject(FR-1.2)。エラーメッセージに衝突 slug と両ファイルパスを含める
- BR-U2-3(baseline 不変): plugin 0件時の compile 出力は拡張前と byte-identical。drop 後の再 compile も同様(FR-1.3 — 落ちる実証はダミー plugin 注入で「増える」ことも確認する両側実測)
- BR-U2-4(実機 E2E): 受け入れは実 compile+実 orchestrate の E2E(FR-1.4)。verify スタブ・モック代替を禁止
- BR-U2-5(opt-in 文書): README に JDK/Docker 依存の適用面別明文化(Bun-only Forbidden の文書化要件 — FR-2.3)と self-hosted 前提(ADR-7)を記載
- BR-U2-6(sensors 参照): frontmatter `sensors: [model-completeness]` はコア sensor(U5)への id 参照。U5 未着地の状態で compile しない(Bolt 順序 = U5 が Bolt 2、U2 が Bolt 3 — DAG 保証)
- BR-U2-7(コア無改変境界): plugin-composition.ts / plugin-projection.ts は無改変。変更はコア框架では amadeus-graph.ts(walk 拡張)のみで、dist 6面再生成+dist:check/promote:self:check green を伴う(FR-6.1)

## テスト観点(Comprehensive)

- unit: discoverPluginStageFiles(空/1plugin/複数/読取不能 throw)、slug 衝突 reject
- integration(実FS): compose→**doctor(composed 確認)**→compile→--single 実行→drop→**doctor(除去確認)**→baseline 一致の E2E 1本(fixture plugin ではなく実 formal-model-check plugin で — FR-2.1 の compose/doctor/drop 全ライフサイクルをこの1本で通す)、0-plugin baseline byte-identical、ダミー plugin 注入の両側実測。manifest path 規約(`plugins/<name>/stages/<slug>.md`)の着地先=走査対象一致もこの E2E が実証する
