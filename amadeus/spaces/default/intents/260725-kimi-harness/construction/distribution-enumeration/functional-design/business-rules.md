上流入力(consumes 全数): unit-of-work, unit-of-work-story-map, requirements, components, component-methods, services

# Business Rules — distribution-enumeration

requirements.md の FR-5/FR-6 と components.md C5 から導出する不変条件。

## 列挙の不変条件

- BR-1: 本 Unit(U5)が所有する閉集合(plugin-projection の `PACKAGE_HARNESSES`・`SELF_INSTALL_HARNESSES`、promote-self の `managedDirs`・`PACKAGE_HARNESSES`)への追加は、同一変更内で原子に行い、コミット間で不整合にしない(project.md Mandated: 正本・配布物・セルフインストールの同期)。swarm `HARNESS_VALUES` は U4 で着地済みのため本 Unit の原子性対象外(中間状態は DAG が許容する順序どおり)
- BR-2: `dist/kimi/`・ルート `.kimi-code/` は生成物。`package.ts` と `promote:self` だけで作り、手編集しない(project.md Forbidden)
- BR-3: 検証は `bun run typecheck`・`bun run lint`・`bun run dist:check`・`bun run promote:self:check`・`bash tests/run-tests.sh --ci` の既存基準で行う(project.md Testing Posture)
- BR-4: dogfood の実機確認は結果を実行から導出する(実機出力の記録。推測で「動くはず」と書かない — team.md P2)

## 適用範囲

- U5 の完了定義(unit-of-work.md)と FR 対応(unit-of-work-story-map.md の FR-5/FR-6 行)に適用する
- services.md の導入経路(setup CLI → dist 配置 → セルフインストール)の最終検証として扱う
- component-methods.md は C5 のメソッド節を持たないため参照しない(C5 は列挙変更であり、公開インターフェースを新設しない)
