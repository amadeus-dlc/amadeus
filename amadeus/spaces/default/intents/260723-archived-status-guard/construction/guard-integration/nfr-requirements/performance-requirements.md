# Performance Requirements — guard-integration

`business-logic-model` の shared rejection flow と `business-rules` の副作用前終了を、`requirements` の FR-05〜FR-07・NFR-04、および `technology-stack` の Bun/TypeScript CLI 境界で定量化する。

## Latency targets

- archived 対象の `select`、`next`、`unpark` は、同一 fixture の許可 status に対する基準処理との差分 p95 を 100 ms 以下とする。各組の差分を `max(0, archived_ms - allowed_ms)` として100個算出し、昇順95番目を採る。個別系列の p95 同士は減算しない。
- 各入口を独立 process で warm-up 10 回後に 100 回実行し、100 回すべてが期待した typed rejection と副作用不変条件を満たした場合だけ latency sample を有効とする。
- 各 pair の直前に同じ seed snapshot から registry、cursor、state、marker、audit、journal を復元する。基準処理と archived 処理の実行順は pair ごとに交互反転し、filesystem cache の偏りを抑える。

## Resource targets

- archived rejection の peak RSS 差分 p95 は基準処理比 16 MiB 以下とする。
- `/usr/bin/time -v` の Maximum resident set size を、入口ごとに独立 process の基準処理と archived 処理を交互に100組測定して差分化する。明示的 GC は要求しない。
- CPU、network、常駐 service の budget は、本機能が短命なローカル CLI であるため適用しない。

## Benchmark environment

- `.github/workflows/ci.yml` の既存 `ubuntu-latest` x64 check job、標準 4 vCPU / 16 GiB class を基準環境とし、`bun install --frozen-lockfile` 後に実行する。
- capacity point は registry 10,000 entries、intent record 10,000 dirs、audit 100,000 rows、selector UTF-8 128 bytes、state 64 KiB、park marker 1 KiB とする。対象 entry は registry の末尾に置く。
- fixture、Git SHA、Bun version、runner image、各標本、nearest-rank p95 を保存する。runner class が異なる場合は合否を出さず fail closed とする。
- fixture は strict `archived` registry、対象を指す stale cursor、park marker 有無を入口別に固定し、各 pair の復元後に SHA-256 で同一性を確認する。未完了 journal は置かず、recovery 性能は lifecycle-transaction Unit の別要件で測定する。

## Acceptance

- 3入口の各100回がすべて正しい rejection を返し、registry、cursor、state、marker、audit の対象 bytes を変更しない。
- correctness が1回でも失敗した測定、runner provenance が欠けた測定、基準処理が失敗した測定は性能合格に使用しない。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T09:13:00Z
- **Iteration:** 1
- **Scope decision:** none

guard ordering、typed rejection、8-process lock envelope、AST corpus検査、配布drift、observabilityのN/A根拠は概ね具体化されている。一方、preflight recoveryが行う正当なmutationと拒否時bytes不変の測定基準が衝突し、性能fixtureの規模と差分p95算出も未確定である。診断pathの情報保護にも成果物間矛盾が残るため、QAが一意に合否判定できない。

### Findings

- BLOCKER — bytes不変のbaselineをrecovery完了直後に置き、call-entryからpost-recoveryの期待差分とpost-recoveryからrejection-returnの不変を分離する。
- MAJOR — benchmark fixtureのregistry entry数、audit row数、intent数、selector長、state/marker bytesを固定する。
- MAJOR — latency差分の算出式、負値、pairごとのfixture resetを一意にする。
- MAJOR — fatal diagnosticのjournal pathをworkspace-relative等へ統一する。
- MAJOR — corpus analyzerのcomplexity regressionを検出する定量条件を置く。
- MINOR — local filesystem attacker boundaryとsymlink差替えの保証範囲を明記する。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T09:15:46Z
- **Iteration:** 2
- **Scope decision:** none

前回6指摘は解消された。preflight recoveryによる正当なmutationとguard rejection区間の不変性が分離され、性能capacity point、pairwise差分式、fixture resetも再現可能に固定された。fatal diagnosticはworkspace-relative pathへ統一され、corpus analyzerには1x/2xの時間・RSS・sink件数gate、filesystemにはsame-user raw actorの明示的な対象外境界が設定された。上流のFR-05〜FR-07、NFR-01〜04および既存Bun/TypeScript stackと整合し、追加の設計判断なしで実装可能である。

### Findings

- RESOLVED — journalなしと未完了journalありのbaselineを分離した。
- RESOLVED — benchmark capacity pointを固定した。
- RESOLVED — pairwise latency差分式とseed復元を固定した。
- RESOLVED — journal位置をworkspace-relative pathへ統一した。
- RESOLVED — corpus analyzerへ1x/2xの定量gateを設定した。
- RESOLVED — same-user raw filesystem actorの対象外境界を明記した。
