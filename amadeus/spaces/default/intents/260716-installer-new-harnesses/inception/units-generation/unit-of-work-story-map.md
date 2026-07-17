# Unit of Work Story Map — installer-new-harnesses(Issue #1048)

> 上流入力(consumes 全数): `../application-design/components.md`(C1〜C7)、`../application-design/component-methods.md`、`../application-design/services.md`、`../application-design/component-dependency.md`(実装順序)、`../application-design/decisions.md`(ADR-1〜4)、`../requirements-analysis/requirements.md`(FR-1〜6)、`../user-stories/stories.md`(US・MoSCoW)。

## US → Unit 写像(全数)

| US(MoSCoW) | Unit | 検証手段 |
| --- | --- | --- |
| US-1.1 / 1.2(Must) | U1 | fixture in-process 完走 |
| US-1.3(Must) | U1 | exit 2+6値列挙 |
| US-1.4(Must) | U1 | README grep |
| US-2.1(Must) | U1 | 契約テスト+落ちる実証 |
| US-2.3(Must) | U1 | npm pack --dry-run |
| US-2.2(Should) | U1 | FR-4 AC-4b チェックリスト(requirements 収載済み) |
| US-3.1(Should) | U1 | doctor advisory assert |

orphan なし(全8 US → U1 — 表は7行、US-1.1/1.2 は同一検証手段のため1行統合)。3視点(導入/保守/運用)は単一 unit 内で全て充足。

Story implementation order: story 単位の追加順序制約なし — 実装順序は unit-of-work-dependency.md の component 順(C1→C2→C3→C4→C5 / C6 / C7)に従う(US-1.x は C1〜C5 完了後に AC 成立、US-2.x/3.1 は対応 C のテスト・文書面)。

## 視点の充足

導入(E1)/保守(E2)/運用(E3)の3視点すべてが U1 の検証列に対応 — 視点欠落なし。
