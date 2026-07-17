# Team Allocation — opencode-plugins-hooks(Issue #1049)

> 上流入力(consumes 全数): `../requirements-analysis/requirements.md`(FR-1〜5)、`../application-design/components.md`(C1〜C5)、`../units-generation/unit-of-work.md`(U1)、`../units-generation/unit-of-work-dependency.md`(エッジなし)、`../units-generation/unit-of-work-story-map.md`(FR→U1)、`../practices-discovery/team-practices.md`(live 温存)。stories(user-stories)・mockups(rough/refined-mockups)は非実行(amadeus スコープ)。team-formation(1.5)も SKIP につき本表が割当の正本。2026-07-17。

## Bolt → mob 割当(全1 Bolt)

| Bolt | Unit | 担当 | レビュー |
|---|---|---|---|
| Bolt 1: opencode-plugin-adapter | U1 | 単一 builder(leader ディスパッチ、worktree 隔離 c2)。ディスパッチプロンプトに deviation-stop(既存様式準拠と判断する場合も停止対象)・同期完遂(builder-prompt-sync-completion)を標準文言で含める | 実装者以外のメンバー(independent-review-on-pr — PR 作成時に作成者が先行指名) |

## 運用条件

- 同時アクティブ builder 上限(1 intent あたり最大4)は単一 Bolt につき非該当 — 実働1名
- conductor(e3)は builder のディスパッチ結果を集約し、ゲート報告・PR 報告を leader へ push 型で行う(進捗ポーリングなし)
- team-formation SKIP スコープの既定(全 Bolt を amadeus-developer-agent が実行)に従い、実装ペルソナは amadeus-developer-agent
