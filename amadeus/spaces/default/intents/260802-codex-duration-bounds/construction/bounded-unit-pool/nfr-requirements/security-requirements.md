# Security Requirements — bounded-unit-pool

上流入力（consumes 全数）: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`

## Dispatch Authorization と Isolation

`requirements.md` FR-03／05、`business-logic-model.md` のStartPermit／effect query、`business-rules.md` BR-UP-12A〜16B、`technology-stack.md` のworktree分離を適用する。

| ID | Requirement | Verification |
|---|---|---|
| SR-UP-01 | valid StartPermit＋最初のclaimなしのworker dispatch 0件 | forged／replayed permitのnegative fixture |
| SR-UP-02 | assigned Unit worktree外のwrite／git操作0件 | protected path digestとworker task contract |
| SR-UP-03 | unknown effect時の再dispatch 0件 | claim／confirm crash各pointでsafe draining |
| SR-UP-04 | worker IDでUnit identity／attemptをreset 0件 | worker交代後も同じUnit budget |
| SR-UP-05 | capをadapter／driverが拡大0件 | `--concurrency > resolvedCap`をmutation前に拒否 |
| SR-UP-06 | prompt／credential／raw worker outputをqueue eventへ保存0件 | sentinel scan。typed outcomeとnative correlation factだけを保存 |

## Failure Classification と Compliance

- auth、permission、config、canonical write、unknown effectはsystemicとし、新規dispatchを止める。
- local failureだけがdependent cancellationと独立Unit継続を許す。LLMがsystemicをlocalへ昇格してはならない。
- cancelは既存人間権限を維持し、poolはauthorizationやapproval semanticsを変更しない。
- 本Unitは新規credential、network service、database、個人情報を導入しない。全supported harnessへ同じpool predicateを適用する。
- Codexのnative subagent制限はcapability factであり、Codex専用pool／hard capを別実装しない。
