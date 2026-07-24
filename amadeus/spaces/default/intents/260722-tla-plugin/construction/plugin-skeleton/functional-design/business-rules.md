# Business Rules — U2 plugin-skeleton

上流入力(consumes 全数): unit-of-work、unit-of-work-story-map、requirements(FR-1/FR-2)、components、component-methods、services

## ルール一覧

- BR-U2-1(汎用発見): walk 拡張は plugin 名を問わない汎用機構。formal-model-check 固有の分岐・ハードコードを持たない(FR-1.1)
- BR-U2-2(loud 衝突): slug 重複は compile 段で loud reject(FR-1.2)。エラーメッセージに衝突 slug と両ファイルパスを含める
- BR-U2-3(baseline 不変): plugin 0件時の compile 出力は拡張前と byte-identical。drop 後の再 compile も同様(FR-1.3 — 落ちる実証はダミー plugin 注入で「増える」ことも確認する両側実測)
- BR-U2-4(実機 E2E): 受け入れは実 compile+実 orchestrate の E2E(FR-1.4)。verify スタブ・モック代替を禁止
- BR-U2-5(opt-in 文書): README に JDK/Docker 依存の適用面別明文化(Bun-only Forbidden の文書化要件 — FR-2.3)と self-hosted 前提(ADR-7)を記載
- BR-U2-6(sensors 参照): frontmatter `sensors: [model-completeness]` はコア sensor(U5)への id 参照。U5 未着地の状態で compile しない(Bolt 順序 = U5 が Bolt 2、U2 が Bolt 3 — DAG 保証)
- BR-U2-7(変更境界、2026-07-25 Option 1で置換): forward-fixのauthoritative変更面は`amadeus-graph.ts`(trusted index合流/hot path)、`plugin-composition.ts`(source/host path分離、trust grant/index、drop/recovery)、`amadeus-orchestrate.ts`(実行直前body検証)、packaging、日英docs、tests、intent recordとする。旧`amadeus-graph.ts`限定・`plugin-composition.ts`無改変の境界は適用しない。`plugin-projection.ts`等の列挙外コア面は変更せず、dist 6面再生成、self-install同期、full quality gateを必須とする(FR-6.1)
- BR-U2-8(path二面契約): plugin authoring / neutral bundle manifestはplugin-root相対`stages/<slug>.md`を宣言し、compose後host targetだけが`plugins/<name>/stages/<slug>.md`となる。`plugins/<name>/plugins/<name>/stages`は常に禁止
- BR-U2-9(trust分離): compose時にfrontmatter/content digest/grantを同一transactionで検証・保存し、compileはmetadata indexを検証して利用する。実行時は選択bodyを同一fd digestで再検証し、性能最適化によってbody trustを省略しない

## テスト観点(Comprehensive)

- unit: discoverPluginStageFiles(空/1plugin/複数/読取不能 throw)、slug 衝突 reject
- integration(実FS): compose→**doctor(composed確認)**→compile→--single実行→drop→**doctor(除去確認)**→baseline一致のE2E。manifest source `stages/<slug>.md`からhost target `plugins/<name>/stages/<slug>.md`への一度だけのprefix付与、index改竄・未compose・body drift拒否、二重layout 0件も実証する
