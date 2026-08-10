# Build and Test Summary

## Overall status

- Overall Verdict: `READY`
- Build / typecheck / lint / source-only / diff hygiene: PASS
- Unit/PBT: 107 tests、1,606 assertions、0 fail
- Integration: 22 tests、123 assertions、0 fail
- Packaging: 10 tests、121 assertions、0 fail
- Full CI: 940 files・12,657 assertionsを完走。初回の11-file負荷timeoutは隔離再実行237 tests・672 assertionsで全件PASS
- Performance/pipe: 229 shards・136,011 rows、3形式とも65,536 bytes超、producer/consumer exit 0、digest parity
- Security/read-only: writer API不在、input非破壊、dependency追加なし、fail-closed境界Green

4 Unitの`code-generation-plan.md`と`code-summary.md`を入力に、25 FR、7 NFR、完了条件1〜10をBuild and Testで独立再検証した。deploymentは本scopeに非適用で、Issue #2695に記載された範囲を縮小していない。

## Test inventory

| Type | Primary files | Verified coverage |
|---|---|---|
| Unit/PBT | t486 domain/candidates/intervals/stats | constructor、9 family decoder、interval/accounting、report、legacy compatibility、shuffle/PBT |
| Integration | t487 stage-stats | filesystem、CLI、3format parity、exit ladder、real corpus、read-only、oversized pipe |
| Packaging | t150 | sourceからCodex配布面への投影と新規report module収録 |
| Performance | t487 oversized fixture | 229 shards、136,011 rows、3形式の完全drainとdigest一致 |
| Security | t486/t487 + source scan | fail-closed、escaping、read-only、input不変、dependency非追加 |
| Repository regression | full `test:ci` + isolated rerun | 940-file corpus完走、負荷timeout 11 filesを237/237で切り分け |

## Per-unit verification

- U-01: opaque value、closed error/reason contract、finite/safe integer、fixed precedenceをtable/PBTで確認した。
- U-02: 9 family、Event Set integrity、explicit identity、primary/secondary理由、digest欠落/不一致、collision拒否を確認した。
- U-03: candidate単一disposition、same intent/stage、idle、category/global union、window bijection、全恒等式を確認した。
- U-04: legacy先頭bytes互換、single orchestration、semantic parity、exit ladder、3format scale/pipe、read-onlyを確認した。

## Requirement and completion coverage

FRはCLI/domain、Event Set/candidate、interval/population、statistics/output、compatibility/testの各群をunit・integrationへ追跡した。NFR-1〜7はaccounting correctness、determinism、fail-closed、pipe reliability、current-corpus scale、maintainability/testability、read-only/data safetyの各実測でPASSした。

完了条件1〜10について、population ledger、恒等式/finite、互換先頭section、3形式の同一semantic model、reference/hypothesis、9 family×17 reason、red-path tests、実corpus完走、read-only、oversized pipeをすべて機械検証した。詳細なcommand、件数、timeout分類、byte数は`build-test-results.md`を正本とする。

## Known limitations

full CIの初回結果は環境負荷によりexit 11だったが、失敗11 filesを並列度1・120秒上限で再実行し237/237 testsがPASSした。Claude live substrateは認証不在で規定どおりSKIPされた。PR/remote checksはPR未作成のため未実行であり、local readinessとは分離して扱う。
