# Performance Design — U5 Apply Verify And UX

> Stage: construction / nfr-design  
> Unit: U5 Apply Verify And UX

## Design Goals

U5の性能設計は、承認済み `FileOperationPlan` を linear に表示・適用・manifest write・verificationすることに限定する。`performance-requirements.md` の通り、GitHub network、archive extraction、target-state detection、planning policy computation はU5の測定対象外である。

## Execution Budget

| Path | Budget | Design |
|---|---:|---|
| render plan for 2,000 operations | p95 <= 150ms | operation kindごとに集計し、stable columns `Operation` / `Files` / `Example` を生成する。 |
| apply 2,000 add/update operations totaling 50 MiB | p95 <= 20s | plan orderで逐次copyし、Bun filesystem primitivesでapplication-level string bufferingを避ける。 |
| back up and replace 500 shared files totaling 25 MiB | p95 <= 20s | `backup` completionを記録してからdependent copyへ進む。 |
| atomic manifest write 2,000 entries | p95 <= 250ms | manifest directory内temp fileへJSONを書き、renameで確定する。 |
| verification over 2,000 manifest entries | p95 <= 750ms | manifest required entries と readiness paths の existence check に限定する。 |
| classified no-write report | p95 <= 50ms | mutation portを呼ばず、reason code と next action をrenderする。 |

## Resource Strategy

File Applierはoperation orderを守るため逐次実行を基準にする。将来parallel copyを導入する場合も、backup dependency ordering と completed operation evidence を壊してはならない。

Reporterは大きな文字列連結を避け、operation rowsを配列で組み立てて最後にjoinする。large benchmarkではsnapshotを巨大化させず、canonical small snapshots と large case benchmarkを分ける。

Verificationはmanifest entriesと固定readiness checksだけを見る。full target tree traversalやmd5再計算は行わない。

## Benchmark Plan

U6で次を測る。

- 2,000 operation plan render;
- temp targetへの2,000 add/update copy;
- 500 backup then force-update;
- atomic manifest write with 2,000 entries;
- manifest-entry existence verification;
- no-write report without mutation calls.

機能不備は性能結果より優先する。operation order、backup durability、manifest sequencing、verification check naming が崩れた場合は時間内でもfailにする。

## Non-Goals

- network retry、archive extraction、version resolution は扱わない。
- U4 planning policyを再計算しない。
- rollback workflow は初期実装では導入しない。
- release publish、GitHub Actions release dispatch、npm publish は扱わない。

## Upstream Coverage

- `performance-requirements.md`: p95 budget、measurement protocol、resource constraints を設計に反映した。
- `security-requirements.md`: no-write mutation prevention と backup durability を性能経路でも維持する。
- `scalability-requirements.md`: 2,000 operations、500 backups、50 MiB copy、linear reporter を前提にした。
- `reliability-requirements.md`: partial apply evidence、manifest sequencing、verification failure naming を性能より優先する。
- `tech-stack-decisions.md`: Bun-first TypeScript、filesystem adapter、snapshot/fault tests 方針に従う。
- `business-logic-model.md`: apply、manifest、verification、reporter、prompt workflows に沿う。
