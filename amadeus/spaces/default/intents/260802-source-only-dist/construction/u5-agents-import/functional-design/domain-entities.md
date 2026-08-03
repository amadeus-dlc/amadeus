# Domain Entities — u5-agents-import

上流入力(consumes 全数): component-methods(C4 契約)、requirements(FR-3.3)、components(C4)、unit-of-work(u5)、unit-of-work-story-map(Slice 2)、services(該当外部なし)。

## 対象エンティティ

本 Unit は合成経路の再編であり、新しいランタイム型を導入しない。対象は次の構成要素。

| エンティティ | 変更前 | 変更後 |
|---|---|---|
| root `AGENTS.md`(追跡) | 手書き 1-91 + 生成 suffix 92-162 の合成 | 手書き部 + import 2行のみ(凍結) |
| `.agents/rules/amadeus-codex-suffix.md` | 存在しない(suffix は AGENTS.md 内) | 未追跡・build 生成 |
| root `CLAUDE.md`(追跡) | PROJECT_INSTRUCTIONS + .claude/CLAUDE.md の合成 | 手書き正本として凍結 |
| `project-instructions`(core 正本) | promote-self.ts:65-74 のハードコード定数 | packages/framework/harness/claude/ のデータファイル |
| `composeRootAgents` / CLAUDE.md 合成 | promote-self.ts:83-99 / :422-437 | 撤去 |
| 整合テスト(新設 tNNN) | なし | CLAUDE.md 構成一致+AGENTS.md import 行ピン |

## 不変条件

1. promote-self --apply 実行後、`git status --short` に AGENTS.md / CLAUDE.md が現れない
2. AGENTS.md の import 解決後の実効内容 = 旧合成結果と意味的同等(切替 PR で実証)
3. root CLAUDE.md の冒頭節 = core 正本 project-instructions の byte(整合テストが強制)
