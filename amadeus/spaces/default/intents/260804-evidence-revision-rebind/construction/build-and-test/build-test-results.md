# Build and Test 実行結果

上流入力(consumes 全数): `code-generation-plan.md`、`code-summary.md`

実行日: 2026-08-04 / base: `ed89cbbb98f04430085d3582f53bed5f90f1b253` / evidence commit: `96f33c9851d6bd045275b91f46c7edb6d5e888b9`

## Build結果

| コマンド | 結果 | 証拠 |
| --- | --- | --- |
| `git rebase origin/main` | PASS | [PR #2167](https://github.com/amadeus-dlc/amadeus/pull/2167) のbaseへconflict 0で再接地 |
| `bun run build` | PASS | 7 harness生成 |
| `bun run source-only:check` | PASS | `source-only boundary: clean` |
| `bun run typecheck` | PASS | exit 0 |
| `bun run lint` | PASS | exit 0、403 warnings / 12 infos |
| `bun tests/complexity-gate.ts --check` | PASS | new violation 0、regression 0、baseline 33、worst CCN 38 |
| `bun run distribution:check` | PASS | 412 payloads、4 docs / 44 topics、416 projections |
| 隔離2回のinstall／build／release-dist／diff | PASS | 10出力面byte一致、4,009 files、同一SHA-256 |
| `git diff --check` | PASS | whitespace error 0 |

## Test結果

| コマンド／対象 | Passed | Failed | 証拠・注記 |
| --- | ---: | ---: | --- |
| focused 5 integration files | 70 | 0 | 358 expect、18.18s |
| `t413` rebase直後baseline | 9 | 1 | evidence revision到達性で意図どおり赤 |
| `t413` 正規rebind後 | 10 | 0 | 48 expect |
| plugin conformance `t341` | 3 | 0 | 41 expect、2.21s |
| `bun run coverage:ci` | 796 files / 10,718 assertions | 0 files / 0 assertions | `RESULT: PASS`、Claude substrate不在23 filesは理由付きSKIP |
| no-silent-drop gate | 1 | 0 | `NO_SILENT_DROP_OK` |

full suiteのwall-clock driftは7 filesで観測されたがassertion failureは0である。既定runnerは各fileを完走し、timeout failureへは至っていない。

## Evidence再バインド結果

1. rebase後のclean HEAD `a8b24263f019e82fa28dcf93bfc65218cd29b60d` をtargetにpure rebindを実行した。
2. revision field 24 / 24 / 25、artifact digest 25、receipt digest 23を更新し、変更pathは許可された3 JSONだけだった。
3. validatorは `ok=true`、evidence-only commitは `96f33c9851d6bd045275b91f46c7edb6d5e888b9`。
4. 同commitをevent revisionにreconcileした結果は、binding `a8b24263…`、target `null`、`REBIND_NOOP`、validation `ok=true`。追加commitは生成していない。
5. 操作中に誤った未解決SHAを1回入力したが、CLIは `REBIND_REVISION_UNRESOLVED` で書込み前に拒否し、bundle差分を残さなかった。正しい完全SHAで再実行して上記結果へ閉じた。

## Coverage結果

- Project coverage gate: PASS — current 91.4351%、baseline 40.9395%、delta +50.4956pp。
- Patch coverage gate: PASS — clean snapshotでadded lines 812 / 812、allowlist 0、uncovered 0。
- LCOVと全体test totalsは同一のfresh `coverage:ci` 実行から生成した。

## Performance結果

独立したthroughput／latency／load数値NFRは存在しないため、負荷試験やbenchmarkを新設していない。性能に関係する契約は次で確認した。

- workflow contract testで有限 `timeout-minutes`、安定concurrency、`cancel-in-progress: false`、PR critical path非結合を検証。
- full coverage suiteは796 filesをfailure 0で完走。
- 隔離2回buildは同一bytesへ収束。

## Security結果

- 最小権限、既存GitHub App token、追加secretなし、credential fallback禁止、secret redaction、pure rebind／identity proofの3 path境界、reconciliationの5 path allowlist、force push禁止、validation／commit／push失敗の非0化をfocused testで確認した。
- `bun audit`: High 6 / Moderate 15 / Low 1、合計22 advisories。本intentは `package.json`／`bun.lock` を変更していない。主な到達経路は既存のAnthropic SDK／MCP／HTTP stackとrelease toolingのtransitive dependenciesである。
- 依存advisoryはrepository全体のrelease readinessをCONDITIONALにするが、今回のNFR-2変更面にsecurity regressionは検出されていない。

## 失敗・未完了詳細

- 実装、build、focused test、full suite、coverage、distribution、source-only、再現性に未解決failureはない。
- 必須AC-6のpost-merge実runは時系列上まだ実行不能である。fixture／workflow contractはPASSしたが、実main runとbot commitを観測済みとは扱わない。
- Code Generation計画が回収先としたDeployment Executionは本scopeでSKIPのため、現workflow内の回収経路がない。[Issue #2156](https://github.com/amadeus-dlc/amadeus/issues/2156) を実run証拠の継続トラッカーとする。

## 判定

**CONDITIONAL PASS**。PR内で実行可能な機能・品質・安全性検証はgreenで、統合を阻害するコードblockerはない。最終受入だけはAC-6のmain着地後証拠に条件付け、workflow完了と受入条件充足を同義にしない。
