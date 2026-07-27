# Evidence — practices-discovery(plugin-host-delivery)

上流入力(consumes 全数): code-structure.md, technology-stack.md, dependencies.md, code-quality-assessment.md, architecture.md, business-overview.md

## 証跡の出所(practices-discovery:c1 — RE codekb 代用)

| スキャン面 | 代用した codekb 証跡(いずれも observed 0d83aa48b) |
|---|---|
| アーキテクチャ / 配布 | architecture.md「plugin 導入 UX と第7ディストリ面の現況」節(plugin-projection closed five = scripts/plugin-projection.ts:60、plugin-composition / formal-model-check / dist/plugins の区間内無変更反証、Kimi 第7面) |
| コード構造 | code-structure.md(kimi 8 ファイル、setup kimi-hooks 2 ファイル、opencode vocab の plugin/→lib/ 改名、面別件数 packages 33 / tests 86 / scripts 7 / .github 1) |
| テスト / CI | code-quality-assessment.md(新規テスト 29 件 / 15 本、plugin-discovery-overhead-gate 再設計 #1535、CI の Complexity gate ratchet・lizard pin・metrics render/drift-check) |
| 依存・セキュリティ | dependencies.md(新規外部依存なし)、technology-stack.md(ルート package.json / bun.lock diff 0 件) |
| 価値面 | business-overview.md(区間内の業務境界変化なし — timestamp に理由明記) |

## 差分ギャップ判定の実測

- affirmed 済み team.md・project.md(Testing / Deployment / Code Style / Mandated / Forbidden、2026-07-24/25 の plugin・認可系 affirm 含む)と本 intent の作業面(plugins 正本・投影 packaging・フック配線・適合テスト・docs)を突き合わせ、未カバーの慣行は 0 件
- 唯一の不整合は既存 Mandated の固定件数「six」の陳腐化(`grep -n "six harness" amadeus/spaces/default/memory/project.md` → `project.md:111` の 1 hit)— discovered-rules.md の是正提案として成文
