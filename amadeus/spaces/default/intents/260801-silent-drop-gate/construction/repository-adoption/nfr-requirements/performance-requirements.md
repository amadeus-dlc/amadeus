# Performance Requirements — repository-adoption

## 上流入力

本書は `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md` を入力とし、repository corpusへ接続したno-silent-drop gateとCI wiringの性能合否を定義する。常駐service、HTTP、database、request RPSは対象外である。

## 性能目標

| ID | 対象 | 合格条件 |
| --- | --- | --- |
| PERF-RA-01 | cold gate | GitHub Actions `ubuntu-latest`、Bun 1.3.13、frozen install済みの独立fresh workspace 5件で、各最初の `bun run no-silent-drop -- --base-revision <full-sha>` がすべて15秒以内 |
| PERF-RA-02 | warm gate | PERF-RA-01の各workspaceで直後に同じcommandを1回実行し、5件すべて15秒以内 |
| PERF-RA-03 | invocation | 1回のCI stepでroot gateをちょうど1回呼び、rule別、root別、finding別に再起動しない |
| PERF-RA-04 | outer deadline | root gateをGNU `timeout`で30秒後TERM、さらに5秒後KILLし、124／137をblocking failureとして保持する |
| PERF-RA-05 | evidence決定性 | 同一full revision、roots、rules、semantic contract、ledger、base revisionの反復でraw evidenceとGateResultがbyte-identical |

30秒deadlineとno-silent-drop **step** にだけ設定する `timeout-minutes: 1` はrunner占有の上限であり、PERF-RA-01／02の15秒合否を緩和しない。lint job全体の既存timeoutは変更しない。

## 測定境界

1. checkoutのbase object materialization、Bun setup、`bun install --frozen-lockfile` を完了する。
2. runnerの `ImageOS`／`ImageVersion`、`/etc/os-release`、Bun version、current／base full SHA、manifest digest、baseline／exemption digestを記録する。
3. base objectの存在を確認した直後、root command起動の直前からprocess終了までを単調時計で測る。checkout、fetch、install時間は15秒sampleへ含めない。
4. 独立したfresh workspaceを5件用意し、各workspaceでcold 1回、その直後にwarm 1回を実行する。
5. cold／warmを別群として全10値を保持し、各群の最大値だけで合否を判定する。平均、中央値、外れ値除外は使わない。
6. exit 0、母集団digest一致、expected／scanned全単射を満たす実行だけを時間sampleとする。非0、timeout、母集団差異は測定失敗である。

## CI予算

- trusted base選択、SHA形式検証、object確認、必要時のliteral fetchはgate前に一回だけ実行する。
- objectが既に存在する通常経路ではfetch 0回、欠落時だけ同一originからfull SHAを1回fetchし、再確認は1回とする。
- lint job内のblocking stepは既存lintとは分離し、`continue-on-error`や後続成功commandで終了codeを上書きしない。
- performance超過時にauthored root、semantic判定、manifest再hash、ratchet、exemption検査を省略しない。
- CI側でstdout JSONを再parseしてdetector処理を重複しない。

## 受入条件

- cold／warm各5値、各群最大、revision、runner image、argv、母集団digestをevidence reportから再現できる。
- hang fixtureは30秒TERM／5秒KILLで124または137となり、CI successにならない。
- fetchが必要なfixtureと不要なfixtureを分け、gate測定値へfetch時間を混入しない。
- PERF-RA-01〜05のいずれか未実行または不合格ならrepository adoption全体をgreenにしない。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T07:23:35Z
- **Iteration:** 1
- **Scope decision:** none

基本的な fail-closed、証跡、ratchet、CI 統合方針は上流要件と整合するが、依存バージョン、CI timeout、capacity 契約に実装・合否判定を一意化できない問題が残る。

### Findings

- FR-01／NFR-08 が ast-grep の固定バージョンを要求する一方、security-requirements はU1がexact指定と参照するだけで、tech-stack-decisions と technology-stack のいずれにも @ast-grep/cli の具体的バージョンがないため、frozen lockfile、再現環境、脆弱性対象を実装者が確定できない。
- 既存 lint job に追加する gate の backup ceiling を job timeout-minutes: 1 としているため、GitHub Actions では gate だけでなく checkout、install、既存 lint を含む job 全体を1分で打ち切り、対象外の既存 CI 挙動を壊し得る。step-level timeout なのか job-level timeout なのかを明示し、前者なら正しい配置を契約化する必要がある。
- scalability-requirements は R4 を60秒以内なら合格とする一方、performance／reliability／tech-stack は同じ root gate を30秒TERM・5秒後KILLで必ず blocking failure にするため、30〜60秒の負荷は scalability 合格かつ実CI失敗となる。運用上の支持容量とdeadlineを同じ境界へ統一する必要がある。
- R2／R4 は files、bytes、candidates、findings、ledger identities をそれぞれ2倍／4倍にするとしか定義されず、相互依存する値や0件の軸をどうidentity-safeに生成するか、fixture seed・manifest・期待集合が未定義で、別実装が異なる母集団を測定できる。
- 集合演算を O(n log n) 以下とする要求に対し、検証は R0／R2／R4 のelapsed記録だけであり、二次実装でも閾値内なら合格するため計算量を機械判定できない。構造検査、操作回数計測、規模比率の許容上限のいずれかが必要である。

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T07:28:07Z
- **Iteration:** 2
- **Scope decision:** none

第1回指摘の大半は解消され、必須セクションと上流参照も満たすが、timeout配置の上流矛盾と、capacity検証が未定義のU1 interfaceへ依存するため、実装を一意に開始できない。

### Findings

- performance-requirements.md と tech-stack-decisions.md は timeout-minutes: 1 をno-silent-drop step限定とする一方、消費元の business-logic-model.md と business-rules.md はjob-level backup ceilingと明記しており、既存lint全体へのblast radiusが異なる二つの契約が併存している。
- scalability-requirements.md のR2／R4検証は、固定3 authored rootsへ合成corpusを供給するseamと、identityOps の計測・reset・取得interfaceをU1へ要求するが、許可済み契約ではU1をschema／algorithmの最終writer、U4を非変更ownerとしているだけで当該interfaceが定義されておらず、U4単独では本番censusを汚染またはalgorithmを複製せずに受入試験を実装できない。

## Revision Cycle 3 Resolution

- `business-logic-model.md`、`business-rules.md`、本NFR、tech stackのbackup ceilingを、すべてno-silent-drop stepの `timeout-minutes: 1` へ統一した。lint job全体のtimeoutは変更しない。
- R2／R4は本番checkoutではなく正規の3 authored rootを持つ使い捨て隔離Git workspaceで実行する。U4は公開CLIとreview済みfixture receiptだけを消費し、`identityOps` seamやU1 algorithmを新設・複製しない。複雑度証明はU1所有focused testのrevision-bound receiptを受入条件へ接続する。
