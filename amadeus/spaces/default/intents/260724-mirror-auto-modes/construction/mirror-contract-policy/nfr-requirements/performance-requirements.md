# Performance Requirements — mirror-contract-policy

> 上流入力（consumes 全数）: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`

## 測定境界

本Unitは常駐serviceではなく、lifecycle boundaryまたは明示CLIから呼ばれるローカルのconfig収集／pure policyである。利用者向けservice SLI、同時利用者数、月間availabilityは存在しないため、架空のlatency SLOを置かない。性能を処理量とI/O回数の上限で定義する。

## 要件

| ID | Metric／Load condition | Target | Measurement |
|---|---|---|---|
| PERF-CP-01 | 1回のconfig resolutionにおけるconfig payload read数 | Global、Space、Intentの最大3件。selector内部のcursor／metadata I/Oはこのmetricから除外する | config payload reader portだけのcall count unit test |
| PERF-CP-01A | workspace selector invocation数 | 1 resolutionにつきexactly 1回。selector内部I/Oは既存selector ownerの契約とし、本Unitで再計数しない | injected selector portのinvocation count |
| PERF-CP-02 | `parseMirrorConfig`／`decideMirrorAction`／event identity生成の外部I/O | filesystem、process spawn、network、clock accessが各0件 | pure moduleのimport境界検査とfake port call count |
| PERF-CP-03 | 1回のpolicy評価が扱う設定layer数 | 常に3以下、時間・追加memoryともO(1) | 0〜3 layerのtable-driven unit test |
| PERF-CP-04 | workflow completionのoperation選択 | 1回の評価で返すoperationは最大1件。成功後の再評価を含めcreate→sync→closeの最大3件 | completion chain unit test |
| PERF-CP-05 | background workload | daemon、polling、scheduler、background network requestは0件 | dependency／process-spawn scanとintegration test |
| PERF-CP-06 | pure policy benchmark | 下記固定fixtureでp95 ≤ 1 ms／evaluation | in-process Bun benchmark |
| PERF-CP-07 | selector＋3 payload read＋policyのlocal path | 下記固定fixtureでp95 ≤ 50 ms／resolution | temporary filesystem integration benchmark |
| PERF-CP-08 | process startupを含むread-only CLI policy path | 下記固定fixtureでp95 ≤ 250 ms／invocation | built CLI subprocess benchmark |

## Benchmark Protocol

- Environment: GitHub Actions `ubuntu-latest`、repositoryがpinするBun version、network disabled、同一job内。
- Fixture: Global／Space／Intentの3 config fileが各1 KiB以下、Intent 1件、receipt 3件、warning 1件、mode=`auto`、completion `sync`評価。
- PERF-CP-06: warm-up 1,000回後、10,000回測定し、`performance.now()`の1 evaluation durationでp95を算出する。
- PERF-CP-07: warm-up 100回後、temporary filesystemを使って1,000回測定する。selectorは1 invocation、payload readは3件とする。
- PERF-CP-08: warm-up 10回後、100 subprocessを逐次実行する。`gh`は呼ばず、process startからtyped decision取得までを測る。
- CI判定はPERF-CP-06〜08の固定absolute thresholdだけを使用する。main branch artifactや過去runをbaselineとして参照せず、missing／stale baselineによる判定揺れを作らない。

## Resource Constraints

- C1は設定bytesをreadしてtyped layer inputへ変換するだけで、cache、worker、queueを追加しない。
- C2はcurrent input以外を探索せず、過去Intent、全stage、GitHub Issue一覧をscanしない。
- event identityは1つのversioned tupleをUTF-8／base64urlへ変換し、timestampやsession historyを連結しない。
- 性能検証に新しいbenchmark frameworkを追加せず、Bun testのcall countと決定表で回帰を検出する。

## Acceptance

1. 3層すべて存在するcaseでもconfig readは3件で終了する。
2. pure policy testでfilesystem／`gh`／clock fakeの呼出しは0件になる。
3. completion evaluationが複数operationを同時に返すmutationはtestで失敗する。
4. background process、timer、polling loopの追加はscope violationとして失敗する。
5. 同一job内でPERF-CP-06〜08をそれぞれ3 run実行し、各runのp95から中央値を選び、その値が各absolute threshold以下ならpassとする。3 runの欠損／timeout／非数値結果はfail closedにする。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-24T06:02:21Z
- **Iteration:** 1
- **Scope decision:** none

品質属性の多くはUnit境界に合わせて定量化されているが、event identityの正本契約に冪等性を破る矛盾がある。また、観測可能性、性能測定境界、依存方向が実装可能な精度に達していない。

### Findings

- Blocker — REL-CP-02と機能設計はevent keyへdetailを含める一方、上流FR-10およびCP-E01はIntent identity × boundary type × boundary instance × operationを一意性の正本としている。同一boundary instanceでもdetailが変化すれば別keyとなり、resume時のskip・receipt・operation identityが分裂し得る。detailをidentityから除外するか、不変性と正規化規則を上流契約へ追加する必要がある。
- Major — stageが必須評価するObservabilityについて、auditの開始・成功・失敗・skip・reconciliation、status表示、warning相関の測定可能な要件がない。reliability-requirements.mdはevent identityとreasonの保持を述べるだけで、FR-6.7／FR-8を満たすsignal、必須field、発火条件、重複抑止、検証方法、下流ownerへの受渡し契約を定義していない。
- Major — tech-stack-decisions.mdのDependency Direction図は実行時data flowとcompile-time dependencyを混同している。図ではTypes --> C2、C2 --> Coordinatorだが、実装依存は通常C2とCoordinatorが下位contractをimportする向きになる。C0をleaf contractとする記述とも整合せず、循環依存を避けるimport規則を開発者が確定できない。
- Major — PERF-CP-01は設定file read最大3件を要求する一方、測定をfilesystem port全体のcall countとしている。C1はworkspace selectorによるGlobal／Space／Intent path解決も行うため、cursor／selector I/Oを数えるかが未定義で、適合実装でも試験結果が変わる。config payload readとselector I/Oを別metricとして定義する必要がある。
- Major — stage出力要件に含まれるbenchmark／latency budgetに対し、performance-requirements.mdはI/O回数とO(1)だけを定義し、代表入力、測定環境、回帰閾値を持つbenchmarkを定義していない。常駐serviceではないことはmonthly SLOの非適用理由にはなるが、明示CLIやlifecycle hookの回帰上限まで非適用にする根拠にはならない。

## Review Iteration 1 Remediation

- event identityから表示用detailを除外し、FR-10の4要素＋operationによる一意性へ上流設計から統一した。
- `ARTIFACT_UPDATED`への状態遷移projection、status／warning signal、重複抑止とownerをReliabilityへ追加した。
- compile-time import方向とruntime data flowを別図へ分離し、C0 leaf contractへの一方向依存を固定した。
- config payload read、selector invocation、selector内部I/Oを別metricとして定義した。
- pure evaluation、local resolution、CLI process pathに固定fixture、環境、p95 budget、relative regression閾値を追加した。

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-24T06:06:41Z
- **Iteration:** 2
- **Scope decision:** none

Iteration 1のObservability、依存方向、config read測定境界、benchmark不足は概ね解消された。一方、event identityの正本契約がsecurity成果物に未反映であり、成果物間で実装仕様が分岐している。また、相対性能回帰のbaseline取得契約が未定義で、CI判定を一意に実装できない。

### Findings

- Blocker — security-requirements.mdはTrust BoundaryとSTRIDEの両方でevent identityへboundary detailを含めるよう要求しているが、reliability-requirements.mdのREL-CP-02、business-logic-model.md、business-rules.mdのCP-E01、上流FR-10はIntent identity × boundary kind/type × boundary instance × operationを正本とし、表示用detailを明示的に除外している。detail変更時に同一boundaryのkeyが分裂し、skip抑止・resume・receipt照合の冪等性を破る実装がsecurity適合として成立する。Iteration 1のblockerは全成果物では解消していないため、security成果物からdetailをidentity要素として扱う記述を除外し、正本tupleへ統一する必要がある。
- Major — performance-requirements.mdの相対閾値『直前のmain baselineより10%超悪化』は、baselineの生成commit、保存先、取得失敗時の扱い、同一runner classの識別方法、比較する統計値を定義していない。さらにAcceptanceは3 benchmark jobの中央値を判定値とするが、各jobのp95とmain baselineをどう集約・比較するかが不明である。開発者が同じ入力から同じCI判定を実装できるよう、baseline artifactのownerとversion、比較式、missing/stale baseline時のfail policyを固定する必要がある。
- Minor — security-requirements.mdはSOC 2相当のprocessing integrityを担保すると断定する一方、対象Trust Services Criteria、control owner、証跡、評価境界を定義していない。本Unitが認証・適合性を主張しないのであれば表現をprocessing integrity上の設計目標に限定し、主張するのであれば測定可能なcontrol mappingを追加する必要がある。

## Review Iteration 2 Remediation

- Security成果物のevent identityをIntent UUID、boundary kind、boundary instance、operationへ統一し、表示用detailを明示的に除外した。
- 性能判定から未定義のmain相対baselineを削除し、同一job内3 runのp95中央値を固定absolute thresholdと比較する単一規則へ簡素化した。
- SOC 2適合の断定をやめ、fail-closed検証と決定性をprocessing integrity上の設計目標として限定した。
