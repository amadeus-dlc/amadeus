# Performance Requirements — workspace-inspection

> 根拠: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。on-demand local filesystem inspectionであり、network serviceのlatency/throughput SLOは追加しない。

## 有界走査要件

| ID | 要件 | 合格条件 |
|---|---|---|
| PERF-U06-01 | rootを一度列挙し、既存root signalまたはparse可能submodule signalがあればdepth-1 fallbackを実行しない。 | root signal fixtureでcandidate traversal 0。 |
| PERF-U06-02 | root無信号時だけworkspace直下candidateをcanonical sortで走査し、depth>1 container discoveryをしない。 | depth-2 only fixtureをnested hitにしない。 |
| PERF-U06-03 | nested候補はrootと同じsignal evaluatorを使い、known source dirを二重集計しない。 | primary language反転fixtureが期待値一致。 |
| PERF-U06-04 | birth、detect、doctor、auditは同一`WorkspaceScanResult` snapshotをpure projectionし、consumer別に再走査しない。 | 1 invocation内のscan結果差分0。 |
| PERF-U06-05 | 未初期化submoduleの表示はsorted先頭5件と残数へboundedにする。 | 6件以上fixtureで5 path+`(+N more)`。 |

既存secondary-language thresholdは変更せず、新しいscan time limit、candidate上限、retry、polling、background workerを追加しない。

## Resource・verification境界

network、database、cache、daemon、submodule command executionを追加しない。targeted nested/submodule/permission/projection testsと、`bun run typecheck`、`bun run lint:check`、`bun run dist:check`、`bun run promote:self:check`、`bash tests/run-tests.sh --ci`を同一最終SHAでexit 0とする。未実施・非0・stale結果をgreenへ読み替えない。

push前local lcovでpatch追加行の未カバー0を確認し、spawn blind spotは対象moduleの計測状況を実測後、計測済みmoduleへのin-process seamで覆う。waiverは既決の二段判定と権威あるpatch/CI lcov証拠を満たす残余行だけに限定する。

## トレーサビリティ

PERF-U06-01〜05は`business-rules.md`のBR-U06-01〜19、`business-logic-model.md`のWorkspace/Submodule pipeline、`requirements.md`のFR-3とNFR-1〜8、`technology-stack.md`のBun/TypeScript/test stackに対応する。

## Review — Iteration 1

- Reviewer identity: `amadeus-architecture-reviewer-agent`
- Reviewed at (UTC): `2026-07-20T23:30:45Z`
- Verdict: **READY**
- Scope decision: **none**

### Findings

| Severity | Finding |
|---|---|
| CRITICAL | 0件 |
| MAJOR | 0件 |
| MINOR | 0件 |

### Confirmed checks

- BR-U06-01〜24、FR-3、C3、およびquestions正本が示すADR-6境界は、root signal時のfallback停止、depth-1限定、canonical sort、単一候補だけの`nestedRoot`、複数候補の非自動選択として5成果物へ一貫している。
- submodule pathは非空relativeに限定され、absolute、drive absolute、`..`、空pathをprobeしない。symlink・excluded・hidden・non-directoryも探索対象外で、root外readとsubmodule init/repairを禁止するread-only境界を実装・対照fixtureへ落とせる。
- E-USSU06FD1=Aの`classified | inconclusive`判別unionが維持され、read/lstat/parse不完全時はbirth/stateをstate・plan・graph・audit・workspaceの全mutation前にrejectする。detect/doctor/auditは同一snapshotをpure projectionし、birth reject時はemitterを呼ばない。
- nested/submodule観測なしのclassified経路はhuman、detect JSON全体、state、auditのbytesを不変にし、観測fieldは必要時だけadditiveに出す。consumer別再走査、候補自動選択、既存language threshold変更はない。
- NFR-5のtargeted testsと同一最終SHAのfull verification、NFR-6のpatch追加行未カバー0・in-process seam・既決waiver条件が明記され、未実施・非0・stale結果をgreenへ読み替えない。
- Bun/TypeScript、既存read-only I/O、formatter/generator/test stack、6 harness/4 self-install境界を再利用し、新dependency、service、database、network、UI、SLO、retention、audit event、failure policy、projector、public APIを追加していない。

### Sensor results

- Applicable sensor results: **11/11 PASS**。
- `required-sections`、`upstream-coverage`、`answer-evidence`: **PASS**。
- `linter`、`type-check`: Markdown成果物のため非該当。

### Summary

5成果物は既決のworkspace inspection契約を測定可能なNFRとpositive/negative fixtureへ機械導出している。追加のarchitecture judgmentなしで実装できる。
