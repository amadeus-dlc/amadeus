# Unit of Work Story Map — opencode-plugins-hooks(Issue #1049)

上流入力(consumes 全数): `../application-design/components.md`(C1〜C5)、`../application-design/component-methods.md`、`../application-design/services.md`、`../application-design/component-dependency.md`(直列依存)、`../application-design/decisions.md`(ADR-1〜5)、`../requirements-analysis/requirements.md`(FR-1〜5)、`../user-stories 非実行(amadeus スコープ)につき story 面は requirements のトレース表を正とする`。

## 要件 → Unit 写像(全数 — user-stories 非実行スコープにつき FR/AC 粒度)

| FR(AC) | Unit | 検証手段 |
| --- | --- | --- |
| FR-1(写像表 — AC-1a/1b/1c) | U1(C3) | 表の3値充足 grep+一次ソース verbatim |
| FR-2(plugin 実装 — AC-2a〜2e) | U1(C1/C2) | 純関数テスト+advisory 実測 |
| FR-3(検証 — AC-3a〜3d) | U1(C4) | テスト2系+落ちる実証+exit code |
| FR-4(配布 — AC-4a/4b) | U1(C5) | regen+dist:check/promote:self:check |
| FR-5(docs — AC-5a/5b) | U1(C5) | 機能表 grep+measurement-ref |

orphan なし(全5 FR → U1、測定 ref: requirements.md の FR 全数)。実装順序は dependency.md の component 順(C3→C5)に従う(FR 単位の追加順序制約なし)。

## 視点の充足

調査(工程0)/実装/検証/配布/文書の全面が U1 の検証列に対応 — 欠落なし。
