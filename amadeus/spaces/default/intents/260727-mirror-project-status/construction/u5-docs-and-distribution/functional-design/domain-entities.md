# Domain Entities — u5-docs-and-distribution

上流入力(consumes 全数): unit-of-work, unit-of-work-story-map, requirements, components, component-methods, services

U5 は新しいドメインエンティティを導入しない — unit-of-work の U5 定義は docs・配布・検収であり、ドメイン型は U1〜U4 で確定済み(component-methods の C0〜C6 正本)。ここでは U5 が同期・検収の対象として消費する**契約構造(台帳・文書集合)**だけを列挙する。story-map ジャーニー5の成果物面。requirements FR-12b の「閉じた台帳」列挙が正、記述内容の正本は services(認証・境界)と components の UI/UX 4接点。

## 消費する契約構造(新設なし)

| 構造 | 所在(実測) | U5 での扱い |
|---|---|---|
| `MIRROR_TOOL_FILES` | packages/framework/harness/projections.ts:22 | 不変検収(ADR-4 新設モジュールゼロの機械確認 — BR-U5-4) |
| `MIRROR_USER_CONTRACT` | packages/framework/core/tools/amadeus-mirror-presentation.ts:16 | 設定キー `mirror-projects`・repair status 診断項目の追記(component-methods C8 の記載どおり)。`scopeExclusions`(:127)は不変 |
| mirror docs 4文書 | docs/guide/22-intent-mirror.md(+.ja)、docs/reference/20-intent-mirror.md(+.ja) | 設定・認証・診断節の追記(en/ja 対訳同期 — BR-U5-1) |
| docs TOPICS 台帳 | docs contract の TOPICS 列挙(t291 parity の照合対象) | 文書追記と同一変更で同期(FR-12b の閉じた台帳4項目のうちの1つ) |
| parity・registry テスト | t291-mirror-docs-parity.integration.test.ts / t285-mirror-projection-registry.test.ts | docs⇔契約の parity 維持と projection 件数の不変検収 |
| dist 7ハーネス面+self-install | dist/<harness>/ ほか(生成物 — 手編集禁止) | `bun scripts/package.ts`+`bun run promote:self` による再生成のみ(BR-U5-3) |

## 不変条件

- U5 はドメイン型(MirrorProjectRef / MirrorProjectSyncEntry 等 — component-methods C0)を変更しない。型変更が必要になった場合はそれ自体が逸脱シグナル(BR-U5-4 と同じ停止規律)。
- 生成物(dist / self-install)を独立の正本として編集しない(project.md Forbidden)— 変更は必ず packages/framework/core 起点。
- docs の認証記述は services の認証節(`project` scope、gh credential store 委譲、自動 scope 変更なし)から導出し、独自の権限説明を発明しない。
