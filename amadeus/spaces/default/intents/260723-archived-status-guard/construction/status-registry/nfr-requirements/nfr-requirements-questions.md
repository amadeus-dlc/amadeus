# NFR Requirements Questions — status-registry

Leader approval evidence: ユーザー承認 2026-07-23T08:48:10Z

## Q0. Interaction mode

NFR Requirementsの質問へどの形式で回答しますか。

A. Guided — 1問ずつ回答する（推奨）
B. All-at-once — 全質問へまとめて回答する
X. Other (please specify)

[Answer]: A — Guided（2026-07-23T08:45:15Z）

## Q1. Performance budget

strict registry validationとone-shot migrationの性能予算をどうしますか。

A. 10,000 entriesでvalidation p95 ≤ 100ms、migration p95 ≤ 250ms、追加RSS ≤ 64MiB（推奨）
B. 現在のfixture規模だけを測り、baseline比20%以内とする
C. 性能目標はN/Aとし、正確性だけを検証する
X. Other (please specify)

[Answer]: A — 10,000 entriesでvalidation p95 ≤ 100ms、migration p95 ≤ 250ms、追加RSS ≤ 64MiB（2026-07-23T08:45:57Z）

## Q2. Security boundary

registryとmigration inputへ、どのsecurity controlsを要求しますか。

A. 全JSONをuntrustedとしてstrict parseし、固定workspace path以外を書かず、診断値を長さ制限する（推奨）
B. status値の検証だけを行う
C. repository内ファイルはtrustedとしてsecurity requirementをN/Aにする
X. Other (please specify)

[Answer]: A — 全JSONをuntrustedとしてstrict parseし、固定workspace path以外を書かず、診断値を長さ制限する（2026-07-23T08:46:32Z）

## Q3. Scalability contract

単一JSON registryのgrowthに対し、どの契約を置きますか。

A. read/validate/migrationをO(n)時間・O(n)memoryとし、10,000 entriesまで性能予算を保証する（推奨）
B. 100,000 entriesまで保証し、それ以上を拒否するhard capを追加する
C. scalabilityはN/Aとする
X. Other (please specify)

[Answer]: A — read/validate/migrationをO(n)時間・O(n)memoryとし、10,000 entriesまで性能予算を保証する（2026-07-23T08:47:07Z）

## Q4. Reliability target

one-shot migrationの耐障害・冪等性目標をどうしますか。

A. atomic write失敗時は旧bytesまたは新bytesのどちらかだけ、成功後100回再実行でbytes不変（推奨）
B. 成功後1回の再実行だけを確認する
C. backup fileを恒久保存して手動復旧する
X. Other (please specify)

[Answer]: A — atomic write失敗時は旧bytesまたは新bytesのどちらかだけ、成功後100回再実行でbytes不変（2026-07-23T08:47:37Z）

## Q5. NFR plan

次のNFR方針で成果物を生成しますか。

- 10,000 entriesのp95/RSS性能予算
- untrusted JSON、固定workspace path、bounded diagnostics
- O(n) time/O(n) memory
- atomic old/new durabilityと100回idempotence
- 常駐service SLA、autoscaling、pagingはN/A
- PII/regulated dataなし。registryはinternal metadata
- TypeScript/Bun、既存atomic writer、Biome、tsc、bun testを継続
- 新しいdatabase、network、runtime dependency、telemetry基盤は追加しない

A. Approve Plan（推奨）
B. Revise Plan
X. Other (please specify)

[Answer]: A — Approve Plan（2026-07-23T08:48:10Z）
