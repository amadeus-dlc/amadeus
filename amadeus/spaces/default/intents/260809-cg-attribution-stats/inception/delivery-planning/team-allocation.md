# Team Allocation — CG 観測可能区間と帰属不能残余

上流入力（consumes全数）は `requirements.md`、`components.md`、`unit-of-work.md`、`unit-of-work-dependency.md`、`unit-of-work-story-map.md` である。team-formationはscopeでSKIPされているため、stage規定どおり全Unitを`amadeus-developer-agent`へ割り当てる。

## Bolt-to-mob assignment

| Bolt | Owning mob | Units | Interaction |
|---|---|---|---|
| B-01 `stage-stats-attribution-walking-skeleton` | `amadeus-developer-agent`（AI） | U-01〜U-04 | 1 stream-aligned mob。既存public contractsをX-as-a-Serviceとして消費 |

`amadeus-architect-agent`は`unit-of-work-dependency.md`と`components.md`の依存方向を検証するsupport perspectiveであり、別のdelivery mobやsource ownerではない。各Construction stageのreviewer/quality agentはengine directiveに従うverification roleであり、実装ownershipを共有しない。

## Unit execution ownership

| Unit | Source ownership | Test ownership | Entry condition |
|---|---|---|---|
| U-01 | `amadeus-stage-attribution-domain.ts` | `t486-stage-attribution-domain.test.ts` | なし |
| U-02 | `amadeus-stage-attribution-candidates.ts` | `t486-stage-attribution-candidates.test.ts` | U-01 public contract Green |
| U-03 | `amadeus-stage-attribution-intervals.ts` | `t486-stage-attribution-intervals.test.ts` | U-01 public contract Green |
| U-04 | `amadeus-stage-stats.ts`、`amadeus-stage-attribution-report.ts` | existing `t486-stage-stats.test.ts`、`t487-stage-stats.integration.test.ts` | U-01/U-02/U-03 Green |

U-02/U-03はDAG上並行可能だが、利用可能なbuilder数とは独立である。並行実行する場合も専用worktreeと非交差file ownershipを使い、coverage計測は単独ownerで直列化する。

## Human and conductor boundaries

- ユーザーはB-01のwalking-skeleton gate、PR merge、release相当の不可逆操作を明示裁定する。
- conductorはengine directive、question/quality ladder、Unit build order、gateを管理し、実装ownershipを持たない。
- B-01完了前にversion bump、tag、GitHub Release、npm publishを行わない。これらはteam `Deployment`の手動release境界に残す。

## Cognitive-load check

`unit-of-work.md`の4 Unitはdomain contract、evidence decode、interval algebra、CLI/report integrationへ変更理由で分かれ、各Unitが専用test seamを持つ。単一mobが所有しても同時に全内部詳細を編集する必要はなく、U-04はproviderのpublic contractだけを消費する。新しいteam、service、deployment responsibilityは追加しない。
