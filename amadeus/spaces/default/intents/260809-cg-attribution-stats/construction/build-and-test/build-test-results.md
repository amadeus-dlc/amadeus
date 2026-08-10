# Build Test Results

## Execution status

Overall Verdictは`READY`である。4 Unitの`code-generation-plan.md`と`code-summary.md`を入力として、branch `codex/issue-2695-self-feature-efdc`上でbuild、typecheck、unit/PBT、integration、packaging、lint、source-only、diff、performance、securityを再検証した。

## Result matrix

| Check | Command | Result |
|---|---|---|
| Build | `bun run build` | PASS（exit 0） |
| Typecheck | `bun run typecheck` | PASS（exit 0） |
| Unit/PBT | t486 domain/candidates/intervals/stats 4 files | PASS（107 tests、1,606 assertions） |
| Integration | `tests/integration/t487-stage-stats.integration.test.ts` | PASS（22 tests、123 assertions） |
| Packaging | `tests/unit/t150-codex-packaging.test.ts` | PASS（10 tests、121 assertions） |
| Lint | `bun run lint` | PASS（exit 0、既存454 warnings / 16 infos） |
| Source-only | `bun run source-only:check` | PASS（generated surfaceのGit混入なし） |
| Diff hygiene | `git diff --check` | PASS |
| Full CI | `bun run test:ci` | 940 files / 12,657 assertionsを実行。初回は11 files・52 assertionsが環境負荷timeoutでFAIL |
| Timeout isolation | 失敗11 filesを`--timeout 120000 --max-concurrency 1`で再実行 | PASS（237 tests、672 assertions、0 fail） |

## Full CI failure classification

初回の失敗ファイルは`tests/unit/t147-kiro-hook-adapter.test.ts`、`t149-codex-hook-adapter.test.ts`、`t17.test.ts`、`t188-human-presence-gate.test.ts`、`t19.test.ts`、`t191-composed-scope-write.test.ts`、`t194-recompose.test.ts`、`t198-compose-surfaces.test.ts`、`t20.test.ts`、`t202-hook-project-dir-worktree-marker.test.ts`、`tests/integration/t-pi-child-driver.integration.test.ts`の11件だった。

unit 10 filesは30秒上限付近の終了コード`-1`だけで、Piは1秒deadlineの1件だけだった。同じ11 filesを並列度1で隔離すると237/237 testsがGreenになり、失敗した各ケースも通常は数百ms〜数秒で完了した。したがって実装回帰ではなく、全体並列走行時のwall-clock driftとして分類する。Claude CLI/API認証を要するlive substrate testsはpreflightで規定どおりSKIPされ、local acceptanceの未検証項目には数えない。

## Performance and pipe evidence

`t487-stage-stats.integration.test.ts`は229 shards・136,011 rowsを事前assertし、同一CLI processでscan、decode、account、compose、render、drainを完走した。Markdown 134,039 bytes、CSV 95,972 bytes、JSON 456,935 bytesで、各形式が65,536 bytesを超えた。producer/consumerはともにexit 0、full captureとpipe captureのSHA-256は一致し、JSONは`JSON.parse`と`jq empty`の両方を通過した。全t487は5.55秒、実workspace scanは3.36秒、oversized pipe caseは1.78秒だったが、NFR-5に新しい時間上限は設定していない。

## Security and data-safety evidence

- 対象5 source filesの`writeFile`、`appendFile`、`mkdir`、`unlink`、`rename`、`fetch`、URL参照をscanし、該当なし。
- `package.json`と`bun.lock`は統合前SHA `8051ba19a`から無変更で、新規dependencyはない。
- malformed payload、digest欠落/不一致、duplicate identity、typed accounting invariantはfail-closedで、typed invariant時はexit 1・stdout空を確認した。
- Markdown/CSV escaping、JSON parse、入力corpus前後byte同一、unsafe writer import不在をunit/integrationで確認した。
- buildが生成した`dist/`およびself-install surfaceは検証用途に限定し、Gitへ追加していない。

## NFR coverage

| NFR | Evidence | Result |
|---|---|---|
| NFR-1 Accounting correctness | interval/accounting PBT、population/ratio恒等式、semantic aggregate | PASS |
| NFR-2 Determinism and reproducibility | shuffle/order tests、全3形式の反復byte一致、pipe digest parity | PASS |
| NFR-3 Fail-closed evidence policy | malformed/digest/identity/invariant rejection、partial stdout抑止 | PASS |
| NFR-4 Pipe and process reliability | 3形式すべて65,536 bytes超、producer/consumer exit 0 | PASS |
| NFR-5 Current-corpus scale | 229 shards・136,011 rowsの単一process完走 | PASS |
| NFR-6 Maintainability and testability | Unit別test seam、typecheck、lint、source-only、public seam test | PASS |
| NFR-7 Read-only and data safety | writer API不在、input byte不変、dependency非追加、safe escaping | PASS |

## Residual limitations

PRは未作成のためremote PR checksは未実行であり、本stageのlocal PASSへ代用していない。AWS/Claude等の外部credentialを要するlive testsは環境前提がないためSKIPされたが、Issue #2695のlocal read-only CLI、3format出力、current-corpus scale、pipe完全性の受入れ範囲には未検証ギャップを残していない。
