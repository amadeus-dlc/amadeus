# Build and Test Results — 260817-inception-cost-batch

実行主体と断面を明記した実測記録。ローカルは remote-first ノルムの範囲(typecheck / lint / targeted)に限定し、blocking 検証はリモート CI を正とする。

## U1: issue-evidence-upstream(**main 着地済み**)

- **PR [#3190](https://github.com/amadeus-dlc/amadeus/pull/3190) → squash `d8834194f`(2026-08-18T03:32:42Z、merge queue 経由)** — merge group で必須 CI green を通過して着地(required check = CI Success 集約)
- PR CI の経緯(全て実測・是正済み): 1周目 = census 台帳2件(mechanism ratchet の EXPECTED_NONE_TO_CLI、t65 の optional_produces 非対応)→ 是正 commit `ff856c64c`。2周目 = Patch coverage 27行 → テスト追加+dispatch-case allowlist(`0b22a4eeb`、閉語彙 audit exit 0)。3周目 = t2967 の coverage-job 限定 flake(同 run の Tests job で pass を突合)→ `gh run rerun 32093105069 --failed` で全 green
- CodeRabbit レビュー 8 スレッド: 全件実否検証 → 修正(`d56a42de7`)→ 返信 → resolve(未解決 0 を GraphQL 全数で実測)
- pr-convergence: `converged: true`(4条件成立を CLI 実測)→ merge 後に merged arm で receipt を merge 事実(`d8834194f` / mergedAt)へ再 attest、report-format sensor PASSED

## U2: re-input-exclusion(PR 収束中)

- **PR [#3191](https://github.com/amadeus-dlc/amadeus/pull/3191)**(main へ rebase 済み直列後続)。本記録起草時点の CI: **12 pass / 0 fail / 3 pending**(Tests・Coverage 2本が実行中 — `gh pr checks 3191` 転記、2026-08-18)
- worktree 実測(builder、head `5e0b1cb0d`): typecheck 0 / lint 0 / build 0(tracked 不変)/ registry --check 0 / t2415×2+t3181-contract+t66 = 116 pass / t72 live SDK 1 fail は ablation で base 由来を確定(CI では self-skip)
- 収束完了(required green + converged 実測 + queue 着地)は pr-convergence ステージで閉包する

## conductor tree での Step 10 実測(main + record checkpoint 断面、2026-08-18)

| コマンド | 結果 |
|---|---|
| `bun run typecheck` | exit 0 |
| `bun run lint` | exit 0 |
| `bun test`(t3181 全6ファイル) | **74 pass / 0 fail**(2.62s)、exit 0 |
| `bun run build`(rebase 後) | exit 0 |

## 落ちる実証・TDD の集約

- U1: 7 slice Red→Green + FR-EVD-7/8 落ちる実証1セット(実 dispatcher、revert 残渣ゼロ)
- U2: 全 slice Red 先行 + FR-EXC-6 落ちる実証2アーム(正本 drift / 配送ツリー drift)
- 一次証跡は各 Unit の `code-summary.md` と builder summary(コマンド+exit code 逐語)

## カバレッジ

- Patch Coverage Gate: U1 3周目で green(27行是正後)。allowlist 追加は dispatch-case 3エントリのみ(意味的セレクタ・reason・閉語彙適合を実測)
- Project Coverage Gate(絶対+相対 AND): U1 merge group で green。U2 は PR CI で実測中
