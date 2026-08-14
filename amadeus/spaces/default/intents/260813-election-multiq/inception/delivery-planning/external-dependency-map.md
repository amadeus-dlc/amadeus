# External Dependency Map — Election CLI 多問対応

## Scope

[requirements](../requirements-analysis/requirements.md)、[components](../application-design/components.md)、[unit-of-work](../units-generation/unit-of-work.md)、[unit-of-work-dependency](../units-generation/unit-of-work-dependency.md)、[unit-of-work-story-map](../units-generation/unit-of-work-story-map.md) を確認した。外部API、database、AWS account、顧客data window、他team hand-offはない。以下はrepository外のtool availabilityだけを扱う。

## Tooling dependencies

| Dependency | Owner | Lead time | Blocks | Mitigation / workaround |
|---|---|---:|---|---|
| Bun 1.3.13 compatible runtime | repository/dev environment | preinstalled | B1〜B5 | `mise`/startup setup、version確認、Bun-only commandを使用 |
| Java/TLC runtime | formal-model-check plugin/environment | minutes | B4 | 実行前doctor、既存formal plugin toolchainを使用。未導入ならB4をNo-goとして明示 |
| GitHub/CI availability | GitHub | external | B5のremote confirmation | local full gatesを先に完了し、remote outage時はCI証拠だけpendingにする |
| optional `lizard==1.23.0` | developer environment | minutes | optional complexity observationのみ | 未導入時は既存contractどおりskip。必須quality gateの代替にはしない |

## Approval dependencies

Intent autonomyはfullで、stage gateはactive grantによりauto-approveされる。破壊的migration、外部write、commit、PR作成は本planの自動権限に含めず、明示要求がある場合だけ実行する。通常のsource/test/artifact更新は各Boltのscope内で継続する。

## External hand-offs

なし。single AI delivery lineが全Boltを所有する。必要なarchitecture/quality/formal lensはrepository内artifactとstage gateで提供し、別組織のSLAや待ち時間を仮定しない。
