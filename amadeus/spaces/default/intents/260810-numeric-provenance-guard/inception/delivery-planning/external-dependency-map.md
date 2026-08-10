# External Dependency Map — 成果物数値の provenance ガード

上流参照: `requirements.md`、`components.md`、`unit-of-work.md`、`unit-of-work-dependency.md`、`unit-of-work-story-map.md`。runtime productは外部API、cloud service、database、data availability window、external-team hand-offを必要としない。

## Runtime external dependencies

なし。sensorはrepository内の成果物fileとGenerated Mappingだけを読み、既存dispatcherへverdict JSONを返す。network access、AWS resource、registry、認証secretは不要である。

## Build and coordination gates

| Gate / dependency | Owner | Lead-time treatment | Consuming point | Mitigation / workaround |
| --- | --- | --- | --- | --- |
| Repository corpusとruntime graph snapshot | `numeric-provenance-mob` | Bolt開始時の同一HEADで固定 | Runtime checkpoint | base前進で分布が変化した場合は最終baseでsweepを再実行 |
| Mapping再計算のquality approval | `amadeus-quality-agent` | Runtime checkpoint内で同期 | Runtime checkpoint完了 | 閾値未達は回避せずBLOCKER。要件変更だけが別経路 |
| GitHub Actionsの必須checks | repository maintainers / CI provider | 外部serviceの完了待ち。SLA値は仮定しない | PR merge readiness | 同等のlocal checksで診断は継続できるが、required check自体は省略しない |
| Walking-skeleton approval | active Intent grant | 品質READY後に同期裁定 | Bolt完了後のConstruction handoff | grant IDとAUTO_DECIDED監査を検証し、品質失敗は承認しない |
| PR merge approval | user | human turn待ち。期限を仮定しない | `main` landing | CI/reviewの鮮度を再確認し、明示承認後だけleaderがmerge |

## Non-gating local dependencies

- Bun toolchainとrepository dependenciesは既存workspace bootstrapで供給される。
- optional `lizard` がない環境ではcomplexity testの既存skip契約に従う。新しいruntime dependencyにはしない。
- live model/provider testはcapability不在時の既存self-skipを維持し、本featureのacceptance代替には使わない。

## Failure ownership

- schema/fixture不整合はU1、corpus/mapping不成立とruntime predicate/verdict不一致はU2、build/delivery driftはU3が所有する。
- CI provider unavailableは外部coordination状態として記録し、greenを捏造しない。
- PR mergeのhuman gate待ちはblockerやscope縮小ではなく、明示された不可逆境界での正常な待機である。
- 外部dependency追加が必要になった場合は本mapを暗黙変更せず、requirements/design逸脱として停止する。
