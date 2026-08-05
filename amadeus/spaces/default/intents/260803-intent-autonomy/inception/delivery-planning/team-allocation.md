# Delivery Plan — Team Allocation

## 上流入力

担当とhandoffは`requirements-analysis/requirements.md`、`application-design/components.md`、`units-generation/unit-of-work.md`、`units-generation/unit-of-work-dependency.md`、`units-generation/unit-of-work-story-map.md`を正本とする。`stories.md`、`mockups`、`team-practices`は対応stageがSKIPのため存在しない。Team FormationがSKIPなので、stage fallbackどおり全Boltを`amadeus-developer-agent`へ割り当てる。

## Bolt担当

| Bolt | Unit | 実行mob | 必要な専門観点 | Handoff条件 |
|---|---|---|---|---|
| 1 | `loop-monitor-runtime` | `amadeus-developer-agent` | Core state machine、audit/replay、harness packaging | U1 contractがgreenで、generic Monitor / live authorization seamが公開される |
| 2 | `quality-repair-runtime` | `amadeus-developer-agent` | Plugin composition、reviewer/sensor evidence、convergence | U2 contractがgreenで、replan / stalled / resume behaviorが固定される |
| 3 | `intent-autonomy-runtime` | `amadeus-developer-agent` | grant、decision、gate/question、atomic commit | mode/grant/decision/park/resume matrixがgreenになる |
| 4 | `autonomy-review-observability` | `amadeus-developer-agent` | audit query、status UX、Event Registry / OTel | active/completed reviewとseal維持がgreenになる |
| 5 | `five-harness-intent-completion` | `amadeus-developer-agent` | native harness、live receipt、package/promote drift | 5harness opt-in live seamと、liveから独立したCore terminal transactionがgreenになる |

## 実行・reviewモデル

- 5 Boltを直列実行し、同時に複数のowner moduleを編集するmobは置かない。
- 各BoltはConstructionのFunctional Design、NFR Design、Code Generation、Build and Testを一巡する。各stageのlead / support / reviewer規則はstage graphに従い、本表で別チームを創作しない。
- 次Boltは前Boltの公開contractとgreen evidenceをhandoffとして受け取る。後続でcontractを変更した場合、影響する中間contract testを再実行する。
- すべて同じ`amadeus-developer-agent`担当でも、Bolt境界を潰さず、1 Bolt = 1 deployable sliceとして検証可能性を維持する。

## Branch・統合境界

- repository practiceに従い、Boltは`main`を基点とする独立branch / worktreeで扱い、Bolt単位のsquash可能な変更境界を保つ。
- owner moduleの重複と依存DAGのため、前Boltの統合済みrevisionを次Boltのbaseとする。
- GitHub PRの作成・review・mergeは外部integration concernであり、AI-DLC CoreのBolt進行条件にしない。外部PRが未mergeでも、Core側は自身のartifact / verification / gate semanticsだけで進行可否を判定する。

## Capacityとescalation

- Team FormationがSKIPのため、人員数・velocity・calendar capacityは仮定しない。行数見積りは相対規模の補助であり、日程commitmentではない。
- deterministic contract failureは当該Bolt内で修復する。credentialやnative環境が不足する場合はU5 liveを理由付きskipとし、Core Intentを`AWAITING_HUMAN`へparkしない。
- PR不備はCore外のconvergence loopで扱い、修正種別は内容に応じてself-fix / self-featureを選ぶ。PR状態をgrantやworkflow stateへ混入させない。
