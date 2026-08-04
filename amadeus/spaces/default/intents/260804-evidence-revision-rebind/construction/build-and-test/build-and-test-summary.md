# Build and Test サマリー

上流入力(consumes 全数): `code-generation-plan.md`、`code-summary.md`

## 全体判定

Build、型検査、lint、複雑度、distribution、focused test、full coverage suite、project coverage、source-only、隔離2回ビルドはすべてPASSした。rebase後に到達不能となったadoption evidenceは正規CLIでclean HEADへ再バインドし、`t413`を `9 pass / 1 fail` から `10 pass / 0 fail` へ復旧した。evidence-only commit自身に対するreconcileは `REBIND_NOOP` で停止している。

コード・workflow・テストはbuild-ready／test-ready／PR統合readyと判定する。ただし、承認済みAC-6の「mainへスカッシュ着地後、botがlanding SHAへrebind commitを追加し、最新main tipの `CI Success` が緑へ収束する」という実run証拠は、PR着地前には観測できない。このため最終受入は **CONDITIONAL PASS** とし、[Issue #2156](https://github.com/amadeus-dlc/amadeus/issues/2156) をmain着地後の証拠回収まで閉じない。

## テスト種別

| 種別 | 対象 | 判定 |
| --- | --- | --- |
| Unit観点 | 3層再計算、正準digest、JSON envelope、冪等性、rollback | PASS |
| Integration | pure rebind、2段階tree証明、関連PR解決、Git競合、workflow構造 | PASS |
| E2E | plugin conformance journey | PASS |
| Full regression | smoke、unit、integration、coverage | PASS |
| Performance | 有限timeout、安定concurrency、full runner完走 | PASS（専用数値NFRなし） |
| Security | 最小権限、secret非露出、3 path allowlist、fail-closed | PASS |
| Dependency audit | repository全体のtransitive dependency | CONDITIONAL（既存advisory 22件、依存差分0） |
| Post-merge acceptance | AC-6の実main run、bot commit、最新tipのCI収束 | PENDING |

## 実測品質ゲート

- 再接地base: `ed89cbbb98f04430085d3582f53bed5f90f1b253`（[PR #2167](https://github.com/amadeus-dlc/amadeus/pull/2167)）。conflict 0でrebase完了。
- Build: 7 harness（claude、codex、cursor、kimi、kiro、kiro-ide、opencode）を生成し、source-only境界はclean。
- 隔離再現性: 2つのlocal cloneでinstall／build／release-distを実行し、10出力面をbyte比較。両方とも4,009 files、SHA-256 `0b8e5058d7b9f20191a630785c11d288b2310e1906dccbfe6c0f4a050c8abc4e` で一致。
- Focused 5 files: 70 pass / 0 fail / 358 expect。`t413`は10 pass / 0 fail。
- Plugin conformance: 3 pass / 0 fail / 41 expect。
- Full coverage suite: 796 files / 10,718 assertions / 0 failure。Claude substrate不在の23 filesはrunner契約どおり理由付きSKIP。
- Project coverage gate: 91.4351%（baseline 40.9395%、delta +50.4956pp）。
- Patch coverage gate: added lines 812 / 812 covered、allowlist 0、uncovered 0。
- Typecheck: exit 0。Lint: exit 0、403 warnings / 12 infos。Complexity: new violation 0、regression 0。
- Distribution: 412 payloads、4 docs / 44 topics、416 public projectionsがPASS。
- No-silent-drop gate: `NO_SILENT_DROP_OK`。

## 矛盾・抜け漏れ

1. Code Generation計画はAC-6の実run回収先を「main着地後のDeployment Execution」としたが、本intentの実行計画ではOperation全stageがSKIPで、Build and Test directiveの `next_stage` も `null` である。したがって、現workflow record内にpost-merge証拠を回収する実行stageは存在しない。これは実装コードの欠落ではなく、受入責任のrouting欠落である。
2. engine directiveのBuild and Test consumesは `{unit-name}` を未解決のまま返した。実在する `construction/evidence-revision-rebind/code-generation/` を参照して検証を継続したが、placeholderを正常状態とは扱わない。
3. stage proseの実行結果名は `test-results.md`、engineの必須成果物名は `build-test-results.md` で不一致である。routing authorityであるengineの名前を採用した。
4. `bun audit` はHigh 6 / Moderate 15 / Low 1を報告した。`package.json` と `bun.lock` に本intent差分はなく、NFR-2の変更面はfocused security testでgreenであるため機能受入と分離する。ただしrepository全体のrelease readinessを無条件greenとはしない。

## 準備度と残作業

- Build-ready: YES。
- Test-ready: YES。
- PR統合ready: YES。rebase時点のbaseと全ローカル品質ゲートはgreen。
- Deployment-ready: CONDITIONAL。workflow contractはgreenだが、AC-6の実main経路は未観測。
- 最終受入: main着地後に、対象landing revision、reconcile workflow run、bot rebind commit、rebind commit自身の `REBIND_NOOP`、最新main tipの `CI Success` を[Issue #2156](https://github.com/amadeus-dlc/amadeus/issues/2156)へ記録して閉じる。
