# Performance Requirements — mirror-distribution-docs

> 上流入力（consumes 全数）: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`

## Build-time Budgets

| ID | Workload | Target | Verification |
|---|---|---|---|
| PERF-DD-01 | 6 surface package generation | p95 ≤ 30秒、peak RSS ≤ 512 MiB | temporary output benchmark |
| PERF-DD-02 | `dist:check` | p95 ≤ 30秒、checked-in output write 0件 | CI benchmark＋git diff |
| PERF-DD-03 | 4 self-install surface projection／check | p95 ≤ 20秒、check mode write 0件 | promote benchmark |
| PERF-DD-04 | Guide／Reference各JA/EN semantic parity | p95 ≤ 2秒 | docs fixture benchmark |
| PERF-DD-05 | 12 dist payload＋8 self-install payload＋core比較元2 payloadのdigest matrix検証 | p95 ≤ 2秒、peak RSS ≤ 128 MiB | digest fixture benchmark |

## Benchmark Protocol

GitHub Actions `ubuntu-24.04`／X64／同一runner image、pin済みBunで独立3 jobを実行する。warm-up 3回後に20 runし、nearest-rank p95の3 job中央値を判定する。最大／最小比2.0超、image不一致、欠損はinconclusive failureとする。

## Resource Constraints

- generatorはmanifest一覧を1回走査し、surface数S、payload数Pに対してO(S×P)とする。
- checkはtemporary directoryを使い、checked-in outputを変更しない。
- content全量を重複保持せず、1 artifactずつdigest／比較する。
- runtime workflowにpackage／docs validation latencyを持ち込まない。

## Acceptance

1. PERF-DD-01〜05を固定repository fixtureで満たす。
2. check command前後でtracked／untracked生成対象が変化しない。
3. timestamp、absolute path、machine newlineをoutputへ含めない。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-24T07:22:52Z
- **Iteration:** 1
- **Scope decision:** none

数値目標、固定fixture、配布面の母数は概ね測定可能だが、生成物更新の原子性契約が内部矛盾しており、障害時にchecked-in配布物が部分更新され得る。また、projection registryの依存方向とセキュリティ検査範囲が実装者に一意ではない。

### Findings

- [Critical] reliability-requirements.md REL-DD-04、Failure and Recovery／business-logic-model.md Failure and Rollback: generation failureではchecked-in outputを部分更新しない要求と、sync途中failureでは次回generateで再構築する記述が矛盾する。commit point、旧tree保持、rollback、crash recovery、複数root更新順序を定義し、各commit pointでkill後のchecked-in tree digestが旧版または新版に完全一致することを要求する。
- [Major] tech-stack-decisions.md TS-DD-03、Dependency Direction／business-logic-model.md Packaging Workflow／scalability-requirements.md Growth Rules: harness manifestを唯一のprojection registryとする一方、promote-self.tsがManifestを参照せず二重管理を防げない。manifest schemaにself-install stance/pathを所有させ、PackageとPromoteの双方が同じregistryを読む。
- [Major] security-requirements.md SEC-DD-05、Compliance／business-logic-model.md Six-surface Projection: secret sentinel scanがskill/docsに限定され、公開されるtool、wrapper、registration、manifest-derived outputを対象に含めていない。6 dist面と4 self-install面の公開生成物全体について対象path、scanner policy、許容除外、sentinel fixtureを固定する。
- [Minor] performance-requirements.md PERF-DD-05: SHA-256を各1回は性能目標ではなく比較元digestを含むかも不明。digest matrixの完全性要件へ移すか、固定母数のwall-clock、CPU、RSS上限を定義する。
- [Minor] scalability-requirements.md Capacity Model: 全projection最大64 MiBの集計境界が不明。集計対象root、重複payloadの数え方、計測時点を明記する。

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-24T07:27:53Z
- **Iteration:** 2
- **Scope decision:** none

第1回の5指摘のうち、共通projection manifest、公開生成物secret scan、digest性能目標、64 MiB集計境界は解消済み。root単位原子性と複数root recoveryには実装不能・内部矛盾が残る。

### Findings

- [Critical] reliability-requirements.mdとbusiness-logic-model.mdのdirectory二段階renameではdestination不在期間があり、Node.js標準APIで非空directoryをportableに不可分交換できない。さらにdot root丸ごとの置換はmanifest管理外fileを巻き込む。manifest所有subtreeの安全なmerge、または原子的indirectionとreader契約を定義する。
- [Major] check mode read-onlyと、check開始時に未完journalをrollbackする記述が矛盾する。checkは未完journalを報告してfailするだけにし、明示的なgenerate/recoverだけがrollbackするようowner commandを分離する。
- [Resolved] 共通projection manifestはpackage/promote双方の唯一のregistryとして統一済み。
- [Resolved] secret scanは6 dist面、4 self-install面、全artifact種別、scanner入口、除外、fixtureまで固定済み。
- [Resolved] digest性能は比較元を含む22 payload、p95、RSS、runner、反復方式が測定可能。
- [Resolved] 64 MiB境界は対象root、文書、重複copy、実byte、計測時点、除外対象が明確。

## Review Iteration 2 Remediation

- surface root丸ごとのdirectory renameを撤回し、projection manifest管理fileだけを同一親directory内のatomic file renameで更新する契約へ変更した。
- generate／recoverのexclusive lockとcheck／validationのshared lockを共通化し、準拠readerがcommit途中のsnapshotを観測しない契約を追加した。
- checkは未完journalを`recovery-required`としてread-onlyでfailし、明示recoverまたは次回mutating generateだけがrollbackするようownerを分離した。
- kill injectionで管理file集合の復元と管理外file不変を検証するacceptanceへ変更した。
