# Build and Test Summary — silent-drop-gate

## 上流成果物と戦略

4 Unitの `code-generation-plan.md` と `code-summary.md` を入力とし、active test strategy `Comprehensive` を適用した。Build、unit、integration、performance、security、full regression、coverageをすべて合否対象とした。

## Test inventory

| 種別 | 対象 | 状態 |
|---|---|---|
| Build | typecheck、lint、distribution、package、promotion、diff | PASS |
| Unit | typed result、parser、mutation、mirror、receipt validator | PASS |
| Integration | CLI、Git、filesystem、CI workflow、4 Unit連携 | PASS |
| Performance | cold／warm、R0／R2／R4、L8、call-count | PASS |
| Security | SAST、symlink、SHA、tampering、failure injection | PASS |
| Coverage | project aggregate、patch、allowlist lifecycle | PASS |

## 実測結果

| 種別 | 実測 | 判定 |
|---|---|---|
| Build | 全command exit 0、生成投影drift 0 | PASS |
| Focused unit | 129 pass／0 fail／357 expects | PASS |
| Semantic／adoption focused | 77 pass／0 fail／283 expects | PASS |
| Performance | 4 pass／0 fail／52 expects | PASS |
| Full normal | 750 files／10,179 assertions／0 failure | PASS |
| Coverage normal | 750 files／10,179 assertions／0 failure | PASS |
| Project coverage | 90.5646%（59,577／65,784） | PASS |
| Patch coverage | 2,515 measured／2,509 covered／6 justified allowlisted／0 uncovered／0 stale | PASS |
| Text mutation L8 | 最大55.193ms、RSS増分20.27 MiB | PASS |

## Readiness assessment

- Build-ready: YES。compile、lint、distribution、生成投影に失敗なし。
- Test-ready: YES。機能、統合、security、performance、full regression、coverageがgreen。
- Deployment-ready: YES。blocking no-silent-drop gate、patch coverage、証跡registryがすべて閉じている。
- 修正ループ: 1回。初回patch gateで見つかった7未到達行だけを対象にtest／計測形状／allowlistを補正し、再計測で収束した。
- Host limitation: macOS local実行。AWS／Claude live substrateは環境条件により自己skipした。

## 既知の制約

1. patch coverageの6行は正当化済みspawn-only／runtime-erased例外であり、期限切れ項目は0。将来in-process driverまたはchild coverage mergeが導入された時点で削除する。
2. live cloud／Claude journeyは外部環境依存のため本実行では未検証。repository-local blocking CI contractへの影響はない。
3. rebase後の実装・証跡は現在のHEAD系列へ再固定済みで、pushは未実施。
