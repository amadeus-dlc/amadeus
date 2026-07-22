# Code Generation Plan — tla-invalid-timestamp-skeleton

## 計画境界

本計画は U5 `tla-invalid-timestamp-skeleton` の dedicated integration harness だけを対象とする。上流は `requirements.md` の FR-3/FR-4/FR-8・NFR-1/NFR-2、scenario S-2/S-4/S-8、U5 Functional Design / NFR Requirements / NFR Design、および engine が完了済みと認識した U1〜U4 の公開契約である。設計時点の U3/U4 reviewer blocker は後続 Code Generation review と engine state により解消済みであり、過去の設計 artifact は遡及変更しない。

所有するのは、freeze 後の #1252 専用 composition identity、起動直前 worktree receipt、同一入力の local exactly 2 attempts、CI exactly 2 rows の trust / archive metadata、循環しない execution manifest / summary、U1 pass/fail transaction、failure 後の stop proof である。Arm S authoring、残 fixture fan-out、promotion、benchmark、eligibility、final CLI root、新 CI workflow、remote dispatch は実装しない。

application code は `scripts/formal-verif/`、test は既存 `tests/` tier に置く。Git、Registry materialization、TLC、Evidence Store、CI metadata/archive、Provenance Store は注入 port とし、本 Unit は closed validation と orchestration を担当する。secret 値、absolute path、branch の会話名、wall-clock を identity preimage に含めない。

## 既存 reuse と変更対象

| 区分 | 対象 | 方針 |
| --- | --- | --- |
| reuse | `canonical.ts` | domain-separated canonical SHA-256 |
| reuse | `contract.ts` | `Result`、`CellResult`、UTC / SHA contract |
| reuse | `provenance.ts` | `T_FROZEN` / skeleton terminal transition、deterministic transaction、store port |
| consume | U2/U3/U4 public surface | issuer-verified disclosure / evidence / TLC outcomeを adapter port 経由で受ける |
| new | `tla-skeleton.ts` | closed entities、capabilities、replay / CI / trace verifier、coordinator、outcome commit |
| modify | `index.ts` | U5 の必要最小 façade / type export |
| new | unit / integration / E2E tests | negative-first contract、U1〜U4 bridge、dedicated command surface |

## Comprehensive test 配置

| Tier | 主な反証 |
| --- | --- |
| Unit | exact schema、#1252 / overlay order、HEAD/tree/clean、attempt 0/3、verdict / invariant / semantic drift、CI trust root、archive cap/path/link/secret、identity cycle |
| Integration | injected U2/U3/U4 receiptsから local 2 attempts→CI proof→summary→U1 pass transaction、deterministic failure、response-loss lookup、failure stop |
| E2E | dedicated harness の command surface が U5 だけを実行し、Arm S / promotion / benchmark / report handler を持たない |

各 positive に少なくとも boundary と 2 negative を対応させる。外部 network、実 GitHub Actions、他 branch / intent artifact は使わない。

## 実装 Steps

- [x] **Step 1: U5 public boundary の RED tests を作る。** root から issuer / raw constructor / Arm S・promotion・benchmark surface が見えず、fixture alias が #1252 以外なら拒否する。Trace: S-2/S-8、BR-01〜06/19〜23。
- [x] **Step 2: composition / precondition parser の RED tests を作る。** baseline→Arm T→#1252 順、SHA / tree / clean、freeze / seal / model / jar / JDK / profile / evidence root continuity、merge / path escape / dirty driftを固定する。Trace: S-2/S-4、BR-01〜05/14。
- [x] **Step 3: unforgeable precondition capability を GREEN にする。** closed raw inputを再検証した façade だけが後続 run に渡せる ready valueを発行する。Trace: S-2/S-4、BR-01〜05。
- [x] **Step 4: local replay の RED tests を作る。** exactly `{1,2}` serial、同一 composition/input/model/subject/tool、`DETECTED`、`InvalidTimestampRejected`、完全 counterexample、distinct bundle、valid evidence proofを要求し、attempt 0/3・duplicate・driftを拒否する。Trace: S-4、BR-07〜13。
- [x] **Step 5: local replay verifier / coordinator を GREEN にする。** 起動直前 receiptを各 attemptへbindし、first deterministic failureで停止し、attempt 3を発行しない。Trace: S-4/S-8、BR-04/07〜13/18。
- [x] **Step 6: execution manifest の RED/GREEN を行う。** local proof、expected CI keys `{1,2}`、schema identityをCI前manifestへ閉じ、CI receipt / final summaryをpreimageから除外する。Trace: S-4/S-8、BR-15/16。
- [x] **Step 7: CI trust / artifact の RED tests を作る。** trusted repository、workflow_dispatch、baseline workflow blob/ref、runAttempt=1、minimal permissions、checkout SHA、success、compressed/uncompressed cap、exactly 13 safe entries、2-row bijection、secret / absolute path 0を固定する。Trace: S-8、BR-14〜17、Security NFR。
- [x] **Step 8: verified CI capability を GREEN にする。** machine-readable metadataとartifact rowをmanifest/local semantic tupleへ再bindし、raw proof constructorを公開しない。Trace: S-8、BR-14〜17。
- [x] **Step 9: summary / outcome の RED/GREEN を行う。** manifest→CI receipt→summaryのacyclic identity chain、deterministic pass/fail reason、verified partial evidence、pass/fail二重 outcome拒否を実装する。Trace: S-8、BR-15〜18。
- [x] **Step 10: U1 transaction integration を RED/GREEN にする。** expected head、canonical transaction、append response loss後のlookup、same bytes retry、head/transport/lookup/corruptionをdomain failureへ変換しないことを検証する。Trace: S-8、BR-16〜18。
- [x] **Step 11: StopReceipt を RED/GREEN にする。** failure event後の Arm S start、残fixture reveal、promotion、benchmarkを0件に固定する。Trace: S-8、BR-18/20。
- [x] **Step 12: dedicated integration / E2E harness を GREEN にする。** U1〜U4 public portを結線し、local 2→CI 2→passと deterministic failure→stopを通す。Trace: S-2/S-4/S-8、全U5 rule。
- [x] **Step 13: export / dependency boundary を確定する。** `index.ts`へ必要最小 surfaceだけを追加し、U6〜U8、new workflow、package/lockfile、framework/setup/dist、他 branch / intent差分を0件にする。Trace: S-8、BR-06/13/19/20。
- [x] **Step 14: Comprehensive verification と sensors を実行する。** focused、formal全回帰、Unit/Integration/E2E、type/check/lint/dist、coverage、変更TS全数sensor、禁止領域diffを実行する。Trace: 全scenario / requirement / rule。
- [ ] **Step 15: code-summary と独立 review を完了する。** file/LOC/test/assertion/coverage/sensor/identity/boundary/deviationを実測で記録し、architecture reviewerのfindingをiteration上限内でnegative-firstに閉じる。Trace: S-8、全U5 rule。

## LOC forecast と hard stop

Functional/NFR Design は 8 logical componentsを列挙するが、U5は外部実装を所有せず、closed validatorsと注入portへ集約する。当初は production 650〜950 LOC、tests/support 650〜1,050 LOCをforecastし、production 950 LOCをhard stopとした。

negative-firstの最初のGREENで、runtime logicに加えてCI trust metadata、13 archive entries、attempt / manifest / summary / transactionのclosed TypeScript schemaが約480 physical LOCを占め、単一fileは1,279 LOC・CCN警告7件になった。外部client追加やUnit越境ではなく、NFR Design既決の8 componentを型で閉じた結果である。この時点で機能追加を止め、責務を `contract / coordinator / outcome` の最大3 production filesへ分割し、全function CCN 15以下・各file 750 LOC以下を新しいhard stopとする。production合計上限を1,500 LOC、tests/support上限を1,100 LOCへ再評価する。これを超える場合、またはfilesystem Git/CI clientが必要になった場合は再度停止する。

## Approval

本計画は、公式文書・既決norm・完了済みU1〜U4 public contractから一意に導出できる。人間が明示したsolo modeの自律判断により承認し、negative-first実装を開始する。
