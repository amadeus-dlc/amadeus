# Business Rules — u3-scope-promotion

上流入力(consumes 全数): requirements(FR-0.1〜0.3)、component-methods(C6 契約)、components(C6)、unit-of-work(u3 = FR-0 対応)、unit-of-work-story-map(Slice 2)、services(外部依存なしの確認)。

## ルール一覧

- **BR-U3-1(正本配置)**: self-* 4種 + installer-distribution の正本は `packages/framework/core/scopes/` のみ。root 面・dist はすべて投影(第2正本を作らない)
- **BR-U3-2(grid は compile 導出)**: scope-grid の15キー化は stage frontmatter タグ付け+compile で導出し、grid JSON を手書きしない(COMPILED_DATA — package.ts:148)。本則は C6(components.md「比較器は既存を流用し、期待値側だけ15キーへ」)の字面を compile 機序の実測に基づき精密化したものであり、上流からの逸脱ではない(申告)
- **BR-U3-3(全面対称)**: installer-distribution を含む5 scope は全 dist 面・全 dogfood 面へ対称投影(RA Q1 裁定 — 面別例外機構を新設しない)
- **BR-U3-4(採用源の同一性実証)**: 正本の内容は現行 `.claude` 面の byte を採用し、移行 PR で `diff` 実証を添付(#2041 同期済み断面の保全)
- **BR-U3-5(センサー期待)**: self-scope-consistency の期待は「全面一致」。root-only 生存を前提とする検査分岐は撤去
- **BR-U3-6(既存機構の不変)**: `scopeGridInSync` / `mergeScopeGrid` の composed-scope extras 生存は変更しない(per-user 第3カテゴリ不可侵)
- **BR-U3-7(タグ付けの検証)**: compile 後 grid と現行 root grid(15キー)の deep-equal テストを新設し、落ちる実証(故意のタグ削除で赤)を同 PR に含める

## 受け入れ基準との対応

| BR | requirements AC |
|---|---|
| BR-U3-1/2/3 | FR-0.1 / FR-0.2(正本昇格・15キー全面同一) |
| BR-U3-4 | FR-0 受け入れ(クリーン checkout からの生成で全面再現) |
| BR-U3-5 | FR-0.3(センサー追随) |
| BR-U3-7 | 落ちる実証必須(org.md Mandated) |
