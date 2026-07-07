# Security Design — U4 Operation Planning And Safety

> Stage: construction / nfr-design  
> Unit: U4 Operation Planning And Safety

## Security Boundary

U4はdestructive-operation preventionの境界である。`security-requirements.md` の通り、U4はtargetに書かないが、U5が受け取る executable plan を安全に制限する。`canApply:false` はU5 mutation blockであり、`conflict` operation は実行可能操作ではない。

## Safety Controls

| Control | Design |
|---|---|
| `canApply:false` | no-write planには `noWriteReason` を必須にする。 |
| backup-before-overwrite | changed/unknown shared file の `update` / `force-update` の直前に `backup` を置く。 |
| `--force` limit | collision prompt を迂回するだけで、missing harness/target validation と backup requirement は迂回しない。 |
| `--yes` limit | prompt suppressionのみ。collision without force は no-write のまま。 |
| user-preserved | 常に `skip`、overwrite operation を生成しない。 |
| conflict isolation | `conflict` は `canApply:false` planにだけ現れる。 |
| source integrity | sourceからtargetへcopyする operation は `sourcePath` と source md5 を持つ。 |

## Target State Policy

`TargetDetection` はU3から受け取り、U4は再検出しない。

| Target state | Policy |
|---|---|
| `manifest-installed` | version decision後に upgrade planning を行う。 |
| `manual-or-unknown` | shared unknown/changed files は user-modified とみなし backup required にする。 |
| `partial` | `--force` がない場合は no-write `partial-target-force-required`。`--force` がある場合は `manual-or-unknown` と同じ conservative planning に進み、changed/unknown shared files は必ず backup before `force-update` にする。 |
| `none` | upgrade は no-write with install guidance。 |
| `unsupported-layout` | no-write。 |
| `ambiguous-harness` | U3で解決済みでない限り no-write。 |

## Plan Traceability

`FileOperationPlan` はReporterとU5の単一契約である。Reporterはplanを表示し、U5はplanを実行するだけで、policyを再計算しない。これにより、pre-apply reportと実行内容が乖離しない。

sourceからtargetへcopyする operation、つまり `add`、`update`、`force-update` には `sourcePath` を含める。`backup` は target existing file から backup path へのmutationなので `sourcePath` を持たず、`path` と `backupPath` を持つ。U5が別のdistribution objectから暗黙にsourceを引き直す設計は禁止する。

## Abuse Resistance

- malformed input があっても unsafe `canApply:true` を返さない。
- downgrade、installed-newer-than-latest、already-up-to-date は file planning へ進まず no-write にする。
- backup path collision は injected predicate でdeterministicに処理し、filesystem direct read を導入しない。
- final CLI wording はU5 Reporterの責務にし、planner内の文言driftを避ける。

## Upstream Coverage

- `performance-requirements.md`: security controls は pure in-memory planning の範囲で実行する。
- `security-requirements.md`: destructive-operation prevention、force/yes limits、backup ordering、traceability を設計した。
- `scalability-requirements.md`: target states と file classes の拡張時に明示policyを要求する。
- `reliability-requirements.md`: `canApply:false` reason、confirmation reason、mutating `sourcePath` requirement を保持する。
- `tech-stack-decisions.md`: pure functions、no filesystem access、injected predicate、one timestamp per plan に従う。
- `business-logic-model.md`: planning workflow、decision tree、output contract、integration boundaries に沿う。
