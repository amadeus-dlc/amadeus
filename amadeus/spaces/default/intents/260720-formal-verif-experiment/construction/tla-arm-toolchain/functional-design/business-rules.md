# Business Rules — tla-arm-toolchain

## Traceability

以下は`unit-of-work.md` のU4完成条件、`unit-of-work-story-map.md` のS-3/S-4/S-6/S-8、`requirements.md` のFR-3/FR-4/FR-7/FR-8・NFR-1/NFR-3、`components.md` のTLA / TLC境界、`component-methods.md` のfinite exploration、`services.md` のoffline lifecycleを具体化する。

| Rule | Requirement / scenario |
| --- | --- |
| BR-01〜06 | NFR-1/NFR-3、S-8 |
| BR-07〜13 | FR-3/FR-8、S-3/S-4 |
| BR-14〜20 | FR-4、NFR-1/NFR-2、S-3/S-6 |
| BR-21〜23 | Unit境界、E-FVEU3FD1 |

## Toolchain規則

- **BR-01 Fixed descriptor:** version 1.7.4、固定HTTPS URL、固定SHA-256、3 origin redirect allowlist、128 MiB stream hard cap以外を拒否する。content lengthはidentityにせずhash-only integrityを使う。
- **BR-02 Verify before publish:** temporary download完了後にhash / lengthを再計算し、一致時だけimmutable cacheへatomic publishする。
- **BR-03 No cache trust:** model check前にjarを毎回再hashし、receiptとdescriptorへ照合する。
- **BR-04 Offline run:** run portはnetwork / download capabilityとproxy環境を持たず、cache miss時に取得へfallbackしない。
- **BR-05 JVM provenance:** OpenJDK 26.0.1、java executable hash、`-Xms256m -Xmx1024m`、UTF-8 / en_US / UTC flags、jar identity、argv、cwdをclosed run profileとして記録・照合する。
- **BR-06 Corruption is error:** checksum、partial file、同一path異bytes、receipt driftを`HARNESS_ERROR`根拠とし、正常cacheへ昇格させない。

## Finite model規則

- **BR-07 Closed domain:** voters=3、valid choices=3+unknown choice token、submitted tokens=5、received tokens=3、dynamic accepted ref+unknown ref、GoA=1..8、initial / amend各voter最大1、hold global最大1、workers=1を固定する。
- **BR-08 Timestamp separation:** submittedAt tokenとCoordinator receivedAtを別domain / variableとして持ち、暗黙変換しない。
- **BR-09 Finite actions:** original / amendはvalid inputだけをappendし対応budgetを消費する。reject precedenceはunknown choice、invalid timestamp、amend unknown refの順。tallyはGoA cardinality式でhold / winnerを固定し、RecordHoldはtally由来reasonを1回だけ記録、terminal後だけstutteringを許す。
- **BR-10 Named predicates:** ChoiceWinner / UnknownChoiceRejected / ReceivedAtAxis / InvalidTimestampRejected / AmendSubmission / UnknownRefRejected / PerVoterResolutionを、append delta、budget、argmax、late iff条件まで明示した独立invariantとする。
- **BR-11 Blind input:** fixture ID、patch、branch、期待failure、既存regression名をmodel、cfg、run manifestへ含めない。
- **BR-12 Frozen bundle:** module / cfg / profile / public contract identityをcontent-addressし、freeze後の変更は別revisionとする。
- **BR-13 No fixture oracle:** U4はsubjectの期待verdict、D-COUNT、eligibility、winnerを知らない。

## Invocation / verdict規則

- **BR-14 Safe argv:** Java / TLC commandをargv arrayで構築し、shell補間しない。
- **BR-15 Deadline:** cell deadlineはsuite残時間と120秒の小さい方とし、timeout時はprocess groupを終了してraw streamsを保存する。
- **BR-16 Version grammar:** parserは1.7.4のexact success、statistics+queue、depth、invariant、trace header/state marker tableだけをverdict根拠にし、unknown error/warning、duplicate / contradictory terminal、truncated outputを拒否する。
- **BR-17 Detected proof:** named invariant violation、frozen invariant map由来source span、完全なordered traceが同じrunで検証できる場合だけ`DETECTED`とする。
- **BR-18 Complete proof:** exit 0、公式completion marker、generated / distinct states、queue=0、search depth、`EXHAUSTED`、warning 0、profile / workers一致の場合だけ`NOT_DETECTED`とする。
- **BR-19 Harness error:** timeout、tool / parse failure、不完全探索、checksum / JVM / profile driftを`HARNESS_ERROR`とし、他verdictへ丸めない。
- **BR-20 Deterministic replay:** 同一model / jar / JVM / profile / seed-bound入力でverdictとcounterexample identityが一致しなければrunを不成立とする。

## Boundary規則

- **BR-21 Arm-specific only:** U4はTLA model / TLC adapterだけを所有し、TS oracle、Registry、Evidence Store、Evaluatorを実装しない。
- **BR-22 U3 unresolved propagation:** E-FVEU3FD1によりU3はREADYではないため、U3 public portを使う設計は可能でもintegration readinessを主張しない。
- **BR-23 No chained lifecycle:** acquire、prepare、run、normalize後にfixture reveal、evaluate、reportを自動実行しない。

## Negative scenarios

wrong URL / version / checksum、partial cache、offline cache miss、JVM / workers / profile drift、fixture情報混入、choice+timestamp+ref同時invalidのprecedence、hold reason / budget drift、unknown / contradictory marker、truncated trace、invariant map欠損、queue非0、stats / completion欠損、exit 0+warning、timeout、counterexample順序drift、U3未裁定でのintegration完成主張をred fixtureとして固定する。
