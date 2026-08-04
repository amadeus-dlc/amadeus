# Risk and Sequencing Rationale — ハーネス横断 live E2E

入力参照: `requirements`、`components`、`unit-of-work`、`unit-of-work-dependency`、`unit-of-work-story-map`。`stories`、`mockups`、`team-practices`成果物は未生成であり、Issue #1717のPhase順序とspace memoryのwalking-skeleton規律を用いる。

## Sequencing Heuristic

採用方式はhybridである。

1. **Walking-skeleton-first:** B01でC1〜C9とCodex transportをend-to-endに通し、共通architectureを最初に検証する。
2. **Risk-first hardening:** B02でpolicy、credential、timeout、cleanup barrier、ledger commitの失敗を注入し、adapter横展開前に共通failure contractを固定する。
3. **Issue-mandated phase gates:** Phase 1のCodex/Claude、Phase 2のKimi/Kiro、Phase 3のCursor/OpenCodeを順に閉じる。
4. **Parallelism inside a proven boundary:** 同一Phase内でDAG edgeのないBoltだけを最大4並列にする。

WSJF数値スコアは使用しない。IssueがPhase順序とmust-green対象を既に定め、user-business value・time criticality・job sizeの校正値がないため、任意の数値は意思決定を精密に見せるだけで再現性がない。代わりに、依存制約、failure blast radius、must-green義務、external substrate不確実性を明示的に用いる。

## Why This Order

| Sequence | Reason | Risk retired |
|---|---|---|
| B01 | 1 Unit / 1 PRで全integration pointを実証 | 共通contractが水平分割のまま統合不能になるrisk |
| B02 | 横展開前に共通negative contractを固定 | adapterごとに安全規則が分岐するrisk |
| B03 | must-green Claude headlessとfamily seamを先に確立 | SDK/TUIが別config contractを作るrisk |
| B04/B05 | Claude family内で相互独立に閉じる | SDK/TUI固有substrateの不確実性 |
| B06〜B09 | Phase 1証跡を入力にKimi/Kiroを並行検証 | CLI/ACP/TUI/IDEのtransport差とcredential risk |
| B10/B11 | 成熟した共通contract上で未知能力をprobe | unsupported能力を実装済みと誤認するrisk |

Unit DAGから逸脱するBolt順序はない。6 batchは`unit-of-work-dependency`のtopological levelsと一致し、Phase境界は架空のコード依存ではなくregistry、cleanup barrier後にcommitされたledger、matrix、Issue evidenceの消費として表現される。

## Risk Register

| ID | Risk | Earliest Bolt | Mitigation | Terminal evidence |
|---|---|---|---|---|
| R1 | GHAやopt-inなしでbinary/auth probeが走る | B01 | GHA precedenceとstrict `"1"`、probe/process 0回negative test | policy test green |
| R2 | C4 runnerとC6 journey specificationが二重化する | B01 | Application Designのownershipを固定しreviewで検証 | component ownership review READY |
| R3 | ambient env/credentialがscratchやreceiptへ漏れる | B01、各adapter | child env allow-list、credential cleanup、leak corpus、barrier失敗時C8未記録 | sanitized receiptとnegative test |
| R4 | timeout後にprocess/tmux/app/lockが残る | B01/B02、B04〜B09 | Abort/cancel/finally、private resource、stale-lock recovery、cleanup barrier | cleanup/failure-injection evidence |
| R5 | must-green CLIがlocal substrate不足で未検証になる | B01/B03/B06 | preflightを早期実行し、capable maintainer環境で明示opt-in | 実green receipt必須 |
| R6 | Kiro IDE/CDPがflakyで再現不能になる | B09 | generated profile、readiness anchor、bounded timeout、debug保持からsecret除外 | greenまたは受入条件付きIssue |
| R7 | Cursor/OpenCodeをsilent skipで閉じる | B10/B11 | probe/test、typed unsupported entry、Issue、matrixを必須化 | non-empty closure package |
| R8 | 並行PRがregistry/ledger projectionで競合する | B04/B05、B06〜B09、B10/B11 | owner-stamped entry、生成正本、batch統合時drift check | projector drift test green |

## Gate Strategy

- B01完了後は必ずwalking-skeleton gateを置く。
- 以降のgate頻度はwalking-skeleton承認後のConstruction autonomy promptで決定するが、Phase closure barrierと失敗時halt-and-askは常に維持する。
- must-green未達、secret leak、cleanup barrier failure、ledger永続化失敗、`closure-committed`前のPASS/materializationはBLOCKERである。
- conditional transportのevidence Issueは、再現手順、阻害要因、推奨seam、受入条件、registry/matrix反映が揃った場合だけ完了扱いにする。
