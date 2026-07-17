# Team Allocation — codekb diff3 cleanup(Issue #1129)

上流入力(consumes全数): `requirements.md`、`components.md`、`unit-of-work.md`、`unit-of-work-dependency.md`、`unit-of-work-story-map.md`、`team-practices.md`。

## Bolt Assignment

| Bolt | Unit | Construction owner | Support by stage | Parallel slot |
|---|---|---|---|---|
| B001 | `U001-codekb-hygiene-verification-handoff` | `amadeus-developer-agent` | engine directiveのArchitect / Quality / DevSecOps等のstage persona | single sequential slot |

Team Formationはengine planでSKIPされたため、stage defaultに従いB001を `amadeus-developer-agent` へ割り当てる。これは人間teamの割当てを発明するものではなく、各Construction stageのengine directiveが指定するlead / support責務を維持する。

## Responsibility Boundaries

| Responsibility | Owner | Boundary |
|---|---|---|
| Construction artifacts and verification | conductor + directive指定persona | B001のengine stagesとversion-controlled record |
| Architecture validation | `amadeus-architect-agent` | U001 / B001境界、DAG、content-lineage分離 |
| Quality evidence | `amadeus-quality-agent` またはstage指定quality role | 件数、CI、sensor、test evidence |
| Main landing approval | leader / human | AI conductorの権限外 |
| Landed-main remeasurement | leader / human-owned follow-up | 明示main refを新たに解決 |
| Issue #1129 close | leader / human | post-landing greenの後だけ |

## Collaboration Model

B001は単一Boltであり、multi-mob coordinationとProgram Boardは不要。`team-practices.md` に従い、branch上の作業はcommit / pushしてreview可能にし、AIはmain mergeと不可逆な外部操作を行わない。

## Capacity and Escalation

並列Boltがないため負荷分散は非該当。human judgment、起票者以外の独立2名review、CI、main landing、Issue closeはleaderへ証拠付きでescalateする。lead timeは根拠がないため `TBD` とする。
