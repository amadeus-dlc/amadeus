# Team Allocation — Election CLI 多問対応

## Allocation basis

[requirements](../requirements-analysis/requirements.md)、[components](../application-design/components.md)、[unit-of-work](../units-generation/unit-of-work.md)、[unit-of-work-dependency](../units-generation/unit-of-work-dependency.md)、[unit-of-work-story-map](../units-generation/unit-of-work-story-map.md) を根拠とする。team-formation成果物が存在しないため、全Boltのaccountable driverを `amadeus-developer-agent` とする単一AI delivery体制を採用する。下記mob名は責務の切替を示し、同時実行する別チームを意味しない。

## Bolt assignments

| Bolt | Accountable mob | Driver | Required review lenses | Handoff evidence |
|---|---|---|---|---|
| B1 | AI Core Mob | amadeus-developer-agent | architect、quality | canonical type/API、PBT、legacy equivalence |
| B2 | AI Core Mob | amadeus-developer-agent | architect、quality | tally/store tests、blind/repair evidence |
| B3 | AI Integration Mob | amadeus-developer-agent | architect、quality、design(API UX) | directive fixtures、record/e2e demo |
| B4 | AI Verification Mob | amadeus-developer-agent | quality、formal-model-check | migration digest、TLC/model-map receipt |
| B5 | AI Release Mob | amadeus-developer-agent | quality、delivery、operations | full gate、benchmark、projection、norm evidence |

## Execution policy

- BoltはB1→B5の順で直列にgateする。
- B2のU2/U3、B4のU6/U7は所有ファイルが非交差する場合だけBolt内並行可とする。
- shared core fileに触れる作業は同一driverが統合し、他作業の変更をrevertしない。
- 各Bolt完了時にDefinition of Doneの証拠を残し、次Boltは未解決BLOCKERが0件の場合だけ開始する。
- commit/PR作成はユーザーが明示的に依頼した場合に限る。

## Program board

単一delivery lineのためcross-team dependency boardは不要である。状態は `Ready → In Progress → Review → Done` の4列でBolt単位に追跡し、同時にIn ProgressとなるBoltは最大1件とする。Bolt内の独立unitだけをsub-laneとして併行できる。

## Escalation

- canonical schema変更が後続contractを破る場合: B1へ戻し、digest/schemaVersionの再裁定を行う。
- append-only/established不変性が破れる場合: 当該Boltを停止し、B2のdomain/store境界を修正する。
- formal modelとTypeScriptが不一致の場合: B4を完了扱いにせず、model-map identityを更新する。
- full gate失敗がcold timeoutだけの場合:該当testをtimeout 120000で単独再実行し、実failureと区別する。
