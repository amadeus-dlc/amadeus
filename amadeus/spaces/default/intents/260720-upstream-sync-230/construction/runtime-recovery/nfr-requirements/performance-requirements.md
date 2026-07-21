# Performance Requirements — runtime-recovery

> 根拠: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。ローカルartifact/cache/audit recoveryであり、network serviceのlatency/throughput SLOは追加しない。

## 有界実行要件

| ID | 要件 | 合格条件 |
|---|---|---|
| PERF-U02-01 | DAG recoveryはruntime cacheと単一dependency正本をparseし、canonical batchを比較する。 | consumer別fallbackやdirectory sweep 0。 |
| PERF-U02-02 | per-unit loop、coverage guard、swarmは同じresolution resultを共有する。 | 同一snapshotでUnit集合差分0。 |
| PERF-U02-03 | revision evidenceは関連6 eventだけをTimestamp+buffer positionでinterleaveする。 | shard filename順への依存0。 |
| PERF-U02-04 | approve recoveryは5 blockをmemory上で生成・検証後、既存lock内で単一commitする。 | 5回の逐次emit 0、中間state write 0。 |

絶対処理時間を契約化せず、入力件数に対する決定的parse/sortと無制限retry・pollingなしを要求する。read-side healはpersistent writeを行わず、次のruntime compileへ修復を委ねる。

## Verification・resource境界

new daemon、network、database、queue、cache layerを追加しない。targeted DAG/revision/failure-injection testsと、`bun run typecheck`、`bun run lint:check`、`bun run dist:check`、`bun run promote:self:check`、`bash tests/run-tests.sh --ci`を同一最終SHAでexit 0とする。未実施/stale結果をgreenへ読み替えない。

push前local lcovでpatch追加行未カバー0を確認し、spawn blind spotは実測後に計測済みmoduleへのin-process seamで覆う。waiverは既決条件の明示証拠を満たす残余行だけに限定する。

## トレーサビリティ

PERF-U02-01〜04は`business-rules.md`のBR-U02-01〜24、`business-logic-model.md`のDAG/Gate recovery、`requirements.md`のNFR-1〜8、`technology-stack.md`のBun/TypeScript/test stackに対応する。

## Review — Iteration 1

- Reviewer identity: `amadeus-architecture-reviewer-agent`
- Reviewed at (UTC): `2026-07-20T15:35:11Z`
- Verdict: **READY**
- Scope decision: **none**

### Findings

- **BLOCKER: 0 / MAJOR: 0 / MINOR: 0**

### Architecture checks

- E-USSU02FD1=AとBR-U02-01〜24をNFRへ機械導出しており、dependency artifact absentだけを`none`、valid sourceを`ok`、unreadable/malformed/cyclic sourceを`malformed`とするclosed resultを維持する。broken sourceをzero-unitへ降格しない。
- canonical artifact優先、read-side mutation 0、per-unit loop・coverage guard・swarmの同一resolved Unit集合が一貫し、consumer別fallbackやpersistent read-side healを追加していない。
- audit evidenceは関連6 eventをTimestamp昇順＋同値buffer position順へ正規化し、organic anchor、human pivot、declared-produces write、reject absenceのclosed predicateへ限定する。reviewer append、memory、questions、他Unit、non-producesを証拠へ広げない。
- approve recoveryは5 blockを事前生成・全数検証し、既存audit lock内の単一atomic commit後に最終stateを1回だけwriteする。生成・検証・commit失敗はaudit/state双方を不変にする。
- atomic audit commit後のstate write失敗は既決transaction identityと完全batch検出により、次回audit追加0で同じ最終stateへ収束する。不完全batchを成功扱いするrecoveryはない。
- NFR-5のtargeted testsと5つの最終gate、NFR-6のpatch追加行未カバー0、計測済みmoduleへのin-process seam、既決waiver条件が明記されている。
- transaction identity、recovery policy、atomicity、failure classificationを新規具体化せず、availability/latency/RTO/RPO等の未承認SLOや追加public APIも導入していない。公開seamは`recoverBoltDag`と`recoverGateRevision`に限定される。

### Sensor results

- **11/11 PASS**: `required-sections` 5/5、`upstream-coverage` 5/5、`answer-evidence` 1/1。
- `linter` / `type-check`: 対象となるTypeScript/JavaScriptコード成果物なし。
