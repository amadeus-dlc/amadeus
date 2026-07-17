# External Dependency Map — codekb diff3 cleanup(Issue #1129)

上流入力(consumes全数): `requirements.md`、`components.md`、`unit-of-work.md`、`unit-of-work-dependency.md`、`unit-of-work-story-map.md`、`team-practices.md`。

## Construction Dependencies

B001のConstruction内にexternal API、data availability window、AWS resource、external team serviceの依存はない。`unit-of-work-dependency.md` はexternal edge 0件であり、B001はversion-controlled repository内の証拠で完了可能である。

human judgmentとCIはstage gate / handoffの証拠として必要だが、main landingやIssue closeをConstruction完了に含めない。

## External Close Pipeline

| Gate | Owner | Lead time | Blocks | Required evidence | Workaround |
|---|---|---|---|---|---|
| E1 CI green | CI / leader | TBD | landing handoff | required checks green、push SHA | non-greenのまま進まない |
| E2 independent reviews | 起票者以外の2名 | TBD | landing handoff | reviewer identity、independence、verdict | 1名や起票者reviewで補完しない |
| E3 human landing approval | leader / human | TBD | main landing | 明示承認、review / CI証拠 | AI conductorは代行しない |
| E4 landed-main remeasurement | leader / human-owned follow-up | TBD | Issue close | landed main SHA、marker 0、最新 / 履歴H2各1 | branch証拠を流用しない |
| E5 Issue #1129 close | leader / human | TBD | initiative external close | E4 greenより後のclose証跡 | OPENのままhandoff |

## Dependency Sequence

external closeは `B001 complete -> E1 -> E2 -> E3 -> E4 -> E5` の証拠順序で扱う。E1 / E2はB001のrecordに既存証拠がある場合も、landing時の対象SHAに対して再確認する。いずれかがmissing / non-greenなら後続gateへ進まない。

## Ownership Boundary

`team-practices.md` のno-AI-mergeに従い、conductorの最終handoffはE1〜E5の状態を実施済み / pendingで分離して報告する。本workflowでPR操作、main merge、Issue closeを行わない。
