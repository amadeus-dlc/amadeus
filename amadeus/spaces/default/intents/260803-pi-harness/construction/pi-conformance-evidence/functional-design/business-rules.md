# Pi Conformance Evidence — Business Rules

## 上流契約

本規則は `unit-of-work` の `pi-conformance-evidence`、`unit-of-work-story-map` のSCN-001〜009とM1〜M10、`requirements` の全FR/NFRを検証へ結ぶ。`components` の `PiLiveJourneyHarness`、`component-methods` のtyped `runPiLiveJourney`、`services` のdeterministic / opt-in live / manual dogfood分離を維持する。

## Evidence eligibility

### BR-CON-000 起源認証

formal-eligible receiptは、実行前にtrusted challenge issuerが署名したsingle-use challengeへrun ID、run kind、expected OS、source commit、candidate/catalog/test-source/Pi executable/recorder binary digest、ephemeral recorder public keyを束縛しなければならない。実行後はrecorder run signatureに加え、live RPCでは許可CI workloadのartifact attestation、manual TUIでは許可operator SSH signatureを必須とする。digestだけのbundle、self-signed bundle、unattested local bundleはdevelopment evidenceでありformal evidenceではない。

公開trust policyはissuer/operator public-key fingerprintとCI OIDC issuer/repository/workflow identityだけを持つ。private key、CI token、provider credentialをframeworkやrepositoryへ配布しない。challenge issuer、recorder、operator/CI attestorの役割とsignature chainは別々に検証する。

### BR-CON-001 結果型を混ぜない

`DeterministicRunReceipt`、`SkippedLiveRun`、`VerifiedLiveRun`、`VerifiedTuiDogfoodRun`、`FormalPiConformanceEvidence` は別型とする。skip、manual checklist単体、captured fixture単体、開発中dirty runをformal greenへcastするAPIを作らない。

### BR-CON-002 正式 green の必要十分条件

正式greenは次の論理積である。

1. 同一clean検証commit / contract digest上のdeterministic suiteがgreen。
2. macOS TUI dogfoodがgreen。
3. Linux TUI dogfoodがgreen。
4. macOSまたはLinuxでskipなしlive RPC runが最低1件green。
5. requirements registryにある全M/SCN/FR/NFR IDへverified observableが結ばれる。
6. native Windows、Pi 0.82.x、untrusted / missing capabilityのnegative evidenceがgreen。
7. redaction、catalog completeness、audit-chain、pack verifierがgreen。
8. accepted run全件についてissuer challenge、trusted recorder identity、CI/operator attestation、single-use challenge consumptionがgreen。

固定件数ではなく正準registry setで判定する。

### BR-CON-003 日常CIのskip

live flag未設定、Pi binary不在、provider/auth不在、supported OS不在は日常CIで理由付きskip可とする。ただし理由はclosed enumと観測値を持ち、unknown errorをskipへ丸めない。deterministic test failure、liveを開始した後のfailure、redaction failureはskip不可。

## Human presence と gate

### BR-CON-004 RPCはhumanではない

RPC / extension-generated / replay inputはHUMAN_TURNをmintせず、gateを承認せず、stageをadvanceしない。自動live journeyはHUMAN_TURN=0 / GATE_APPROVED=0を成功条件とする。

### BR-CON-005 TUI recorderはinputを生成しない

human gateのpositive evidenceはPi TUI `input.source=interactive`だけから取得する。recorder、test harness、child driverは入力生成・paste注入・pseudo-TTY keystroke送信を行わない。evidence commandもinteractive source、fresh nonce、直前human turnを満たす場合だけreceiptを生成する。

### BR-CON-006 未回答終了

TUI/RPC sessionがgate未回答で終了した場合、awaiting state、HUMAN_TURN=0、GATE_APPROVED=0を記録し、再開前にsuccessへ変えない。

## Catalog と coverage

### BR-CON-007 信頼済み期待catalog

期待するrequirement、scenario、Unit inventory、test selector、observable、formal eligibilityはverifierと同じversionに束縛された`PiConformanceCatalog`から取得する。target test tree、evidence pack、test resultから期待集合を作らない。catalog missing / digest mismatch / unknown schemaは全体failure。

### BR-CON-008 双方向集合一致

requirements registryとcatalog、catalogとUnit inventory、inventoryと実行receipt、receiptとcoverage edgeをそれぞれ双方向比較する。missingだけでなくextra、duplicate、unknown IDもfailureにする。

### BR-CON-009 Test inventoryは実行可能である

inventory entryはowner、repository-relative selector、tier、required environment、requirement IDs、production observable、expected terminal kindを持つ。`passed` fieldを持たず、conformance runnerが実processを起動してterminal receiptを生成する。

### BR-CON-010 Test asset ownership

captured lifecycle fixture / adapter benchmarkはlifecycle Unit、driver/process fixtureはchild driver Unit、transaction fixtureはtransaction Unit、package parityはdistribution Unit、doctor snapshotはdoctor Unit、guide checkはguide Unitが所有する。conformance Unitはそれらを編集複製せずinventory経由で実行し、cross-unit journeyとformal packだけを所有する。

## Live environment

### BR-CON-011 Supported environment

formal positive evidenceはPi>=0.83.0のdarwin/linuxだけ。native win32は必ずnegative evidenceであり、WSLをnative Windowsのgreenと表現しない。versionはresolved executableの`--version`から取得する。

### BR-CON-012 Source binding

formal-eligible runはpre-run challengeとsignaturesを介してclean git commit、candidate digest、catalog digest、test-source digest、Pi/recorder executable digest、Pi/Bun version、OS/arch、provider identifierへ束縛する。branch名、install pathのversion label、moving git ref、receipt本文の自己申告だけをidentityにしない。

### BR-CON-013 Credential と secret

provider token/API key/OAuth bytes、prompt/response本文、home絶対pathをraw receipt、audit subset、stdout/stderr excerpt、evidence packへ入れない。provider identifierとcredential source kindだけを許可する。redaction scan自体が実行不能ならformal failure。

### BR-CON-014 Isolation と cleanup

live fixtureは専用temporary project / config / session / evidence directoryを使う。cleanupはreceipt/digest確定後に行い、失敗時もchildをkill/reapする。利用者のglobal Pi settings、project trust store、実project recordを変更しない。認証storeを共有する必要がある場合はread-through参照とし、refresh等の書込可能性を事前表示する。

## Receipt integrity

### BR-CON-015 Observableから結果を導出する

receipt statusはprocess exit、signal、file snapshot、audit events、state、counterからverifierが導出する。runnerが書いた`green: true`を根拠にしない。assertionごとにexpected、observed、source artifact digestを持つ。

### BR-CON-016 Audit chain completeness

session / parent-child / human turn / gate / continuation / tool / sensor / terminalの必須eventはcanonical event keyで照合する。sequenceだけでなくparent/session/run identityとaudit subchain digestを検証し、欠落・重複・順序逆転をfailureにする。

### BR-CON-017 Content address とappend-only

run bundleはcanonical manifest digestをIDとし、完成後に上書きしない。再実行は新bundle。失敗・skip・incomplete receiptも保存し、後続greenで削除しない。正式packは採用bundle IDを列挙する。

### BR-CON-018 Independent verifier

assemblerとverifierを別module / commandに分ける。verifierはraw receiptとtrusted catalogからdigest、coverage、eligibilityを再計算し、trust policyからchallenge issuer / recorder / CI OIDC / operator署名chain、challenge expiryと未消費→消費遷移を検証する。packのsummary、Markdown説明、assembler内部status、receipt内platform/self-declared identityを単独では信頼しない。

## Scenario rules

### BR-CON-019 Installation parity

setup fresh/update/recovery、Pi Package local/gitは別fixtureで実行し、同じcandidate provenanceに対するnormalized path/hash setを比較する。二つのobserved manifest同士が一致するだけでは不十分で、trusted expected candidate catalogとも各々一致する必要がある。

### BR-CON-020 Lifecycle / gate

captured fixture replayとlive eventの両方をcanonical mappingへ通す。duplicate native eventでmutation高々1回、agent_settled前continuation=0、settled後必要時=1、compaction後mission整合を要求する。

### BR-CON-021 Child / swarm

support/reviewer/swarmは同じdriver schemaを使い、role、workspace、parent-child/session、start/terminalを検証する。pool=1/2/4の最大値超過0、0/5のspawn 0、failure/timeout/cancelのdependent start 0を要求する。

### BR-CON-022 Doctor / fail-closed

capability欠落、Pi 0.82.x、native Windows、untrustedでworkflow-changing mutation=0。status/doctorはread-only完走し、check ID/observed/expected/remediationを返す。他harness固有failure=0。

### BR-CON-023 Guides / supply chain

日英typed fact、section/link、porting registry、generated inventoryの検査結果を実行receiptとして取り込む。任意コード実行性、source/pin/update/uninstall、Windows unsupportedのfact polarityが正しいことを要求する。

## Performance と決定性

### BR-CON-024 Adapter benchmark

lifecycle Unit所有benchmarkを同一host/processでKimi固定baselineとPiを10回warm-up後100回交互測定する。median(Pi) <= max(2 * median(Kimi), median(Kimi)+100ms)。model/network/filesystem I/Oを含むrunはinvalid benchmarkであり、pass/failに使わない。

### BR-CON-025 Regeneration

同じsource/configでpackage/promoteを連続2回実行しnormalized sha256集合一致、二回目diff=0を要求する。generated treeを直接編集してexpectedを更新する経路を許さない。

## Negative verification

### BR-CON-026 Guardは赤になることを実証する

新設guardは少なくとも次のmutationで失敗しなければならない。

- Pi registrationを一つ削除
- resourceとtarget manifest entryを同時削除
- lifecycle mappingまたはcaptured fixture inventoryを削除
- child failureをsuccessへ丸める
- RPC inputをinteractiveとして偽装する
- live skip receiptをformal inputへ渡す
- provider secret / home pathをreceiptへ混入
- evidence summaryとdigestを同時改変
- requirement coverage edgeを一件削除または未知IDを追加
- self-signed challengeまたは未知operator keyでreceiptを作る
- 正規receiptを別payloadへ再署名する
- 一度消費したchallengeを別runで再利用する
- recorder署名後にdarwin/linux claimだけを交換する
- 許可repository/workflowと異なるCI artifact attestationを添付する

mutation harness自身がproduction guardの期待結果を書き換えない。各mutationはbaseline green→treatment redの差分receiptを持つ。

## 完了不変条件

1. skip、dirty run、manual checklist単体はformal greenにならない。
2. 自動RPC inputはHUMAN_TURN/GATE_APPROVEDを生成しない。
3. macOS/Linux TUI dogfoodと最低1件のlive RPC greenが揃わなければ正式完了しない。
4. requirements / catalog / inventory / receipt / coverageは双方向完全一致する。
5. provider secret、prompt本文、home絶対pathはevidenceに残らない。
6. formal packはraw observableとtrusted catalogから独立再検証できる。
7. formal packの各runは、事前challengeからtrusted recorderとCI/operator attestorまで切れ目のない検証済み起源chainを持つ。
