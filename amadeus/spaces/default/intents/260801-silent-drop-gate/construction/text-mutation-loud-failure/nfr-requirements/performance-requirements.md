# Performance Requirements — text-mutation-loud-failure

## 上流入力

本書は `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md` を入力とし、`setCheckbox`／`setStageSuffix` とcaller transactionの性能契約を定義する。常駐service、network、database、request RPSは対象外である。

## 性能目標

| ID | 対象 | 合格条件 |
| --- | --- | --- |
| PERF-TM-01 | 単一mutation | initial validation parse 1回、setter適用 1回、setter内reparse 1回、caller final reparse 1回、atomic write最大1回 |
| PERF-TM-02 | idempotent mutation | PERF-TM-01の検証を省略せず、返却bytesがoriginalと同一ならphysical write 0回 |
| PERF-TM-03 | bulk mutation | target数を `T` としてinitial parse 1回、setter内postcondition reparse `T` 回、次step用 `ValidatedStageState` を作るcaller reparse `T` 回、final reparse 1回、atomic write最大1回。総parse回数は `2T + 2`、target順はcanonical key byte順 |
| PERF-TM-04 | failure | validation／not-found／duplicate-target／invariantでwrite、永続audit、success、retry、resyncが各0回 |
| PERF-TM-05 | latency | GitHub Actions `ubuntu-latest` 相当、Bun 1.3.13のwarm processで、256 stage・256 unique targetのbulk transactionを10回測り、各回1秒以内 |

## 計算量と資源予算

- document bytesを `D`、stage数を `S` とすると、validationと単一mutationは `O(D + S)`、bulkは上流が各step後reparseを要求するため `O(T × (D + S))` を許容上限とする。
- target探索はvalidated indexのkey lookupとし、各stepでraw document全体を検索する独立scanを追加しない。
- bulk処理が同時に保持する完全なdocument bytesはoriginal、current、candidateの最大3世代とし、全中間versionを配列へ蓄積しない。
- 256 stage・1 MiB document・256 targetのfixtureで、idle harness測定直前値からのpeak RSS増分を128 MiB以下とする。
- failure時の性能改善を理由にvalidation、reparse、非対象identity検査、byte不変検査を省略しない。

## 測定手順

1. GitHub Actions `ubuntu-latest` runnerで `ImageOS`／`ImageVersion`、`/etc/os-release`、Bun version、revisionを記録する。
2. `tests/perf/t-no-silent-drop-text-mutation.test.ts` のseed固定generatorで32／128／256 stage fixtureを生成し、fixture digest、document bytes、target数を記録する。random値とwall-clock値をfixtureへ入れない。
3. 各fixtureを独立したBun processで実行し、最初の3回をwarmupとして破棄した後、単一changed、idempotent、not-found、bulk success、bulk途中not-found、duplicate-targetを各10回測る。
4. latencyは各operation直前／直後の `performance.now()`、RSSはfixture読込後・warmup前の `process.resourceUsage().maxRSS` をbaseline、測定終了直後の同値をpeakとしてLinuxのKiB差分をMiBへ換算する。本Unitはchild processを起動しないため測定対象はこのBun process全体である。
5. parser、setter、writer、audit、success、retry、resyncのcall countをspyで採取し、bulk successのparse回数が `2T + 2` であることを検査する。
6. 実行commandは `bun test --timeout 120000 tests/perf/t-no-silent-drop-text-mutation.test.ts` とし、10値の最大値をPERF-TM-05の合否へ使う。
7. before／after state digestと全永続audit digestを同時に記録し、速度が副作用省略によるものではないことを示す。

## 受入条件

- PERF-TM-01〜05が自動テストまたは再現可能なbenchmarkで検証できる。
- 失敗fixtureではlatencyに関係なくwrite／永続audit／success／retry／resyncが0回である。
- 1秒またはRSS予算を超えた場合はwarning successへせず、計測証跡を残してcapacity reviewを行う。
- 新規cache、parallel worker、native dependencyを性能達成の前提にしない。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T07:12:08Z
- **Iteration:** 1
- **Scope decision:** none

必須セクションと上流成果物への参照は揃っているが、実装契約と測定オラクルに未解決の矛盾があり、現状では一意に実装・検証できない。

### Findings

- PERF-TM-03 は bulk のparse回数を initial 1 + step後 T + final 1 とするが、上流設計は各setter内のpostcondition reparseに加えて、次の ValidatedStageState を作るcaller側reparseを各stepで要求し、TextMutationResult.changed はcontentしか返さないため実際は initial 1 + setter内 T + caller側 T + final 1 となる。parse予算を訂正するか、validated stateを再利用できる戻り値契約へ上流と同時変更する必要がある。
- reliability-requirements.md の検証要件はwriter failureを含む各failureでstate bytesのbefore／after一致を要求する一方、REL-TM-02とBR-CALL-03はbyte不変をvalidation／not-found／duplicate-target／invariantに限定しており、rename後のdurability failureでは不変を保証できない。writer失敗点をcommit前・commit後に分け、各resultとbyte oracleを既存atomic writer契約に合わせる必要がある。
- SEC-TM-04とセキュリティ検証はtargetのcanonical slug検証および改行・引用符・backslash・Unicode separator・過長値の拒否を要求するが、許容文法、最大長、正規化、invalid-targetのtyped failure分類が定義されていないため、not-foundとの境界と互換error JSONを実装・テストできない。
- TS-TM-02／05が依存する既存state grammar parser、既存atomic writer、既存stderr JSON serializerは、許可済み契約内で具体的なowner path、export、call shape、failure shapeへ解決されておらず、ValidatedStageStateやtransaction adapterへ接続可能か検証できない。
- PERF-TM-05とL8 capacity判定はGitHub Actions ubuntu-latest相当のwarm process最大1秒およびpeak RSS増分128 MiBを合否にするが、実行コマンド、runner image、fixture生成条件、warmup、RSS採取手段・採取区間が未定義であり、同じ実装でも測定者ごとに異なる判定になり得る。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T07:16:32Z
- **Iteration:** 2
- **Scope decision:** none

第1回の指摘はすべて解消され、parse予算、writer障害境界、target文法、owner path、性能測定手順が上流契約と整合し、実装・機械検証可能な状態です。

### Findings

- None
