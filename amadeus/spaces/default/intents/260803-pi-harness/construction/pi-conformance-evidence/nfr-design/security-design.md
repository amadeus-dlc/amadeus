# Pi Conformance Evidence — Security Design

## 適用範囲

本設計はdeterministic suite、opt-in live RPC、macOS/Linux TUI dogfoodから、改変・自己生成・replay・platform claim差替え・secret漏洩に耐えるformal Pi conformance evidenceを構成する境界を保護する。engine-resolved inputは `business-logic-model` のみで、条件付きの `security-requirements` / `tech-stack-decisions` は期待どおり不在である。

新しい常駐service、database、専用test runner、provider credential配布は導入しない。既存Bun test infrastructure、CI workload identity/attestation、登録issuer/operator key、owner-only local ledger/fileを使用する。

## Trust roots and identities

`FormalEvidenceTrustPolicy`はtrusted conformance catalogと同じdistributionへ束縛し、次をclosed entryとして持つ。

- challenge issuer key ID/public key、algorithm、validity window、allowed run kind
- trusted recorder binary digest/contract version
- CI OIDC issuer、audience、repository owner/name、workflow identity/path、ref policy
- operator SSH public key fingerprint、allowed signature namespace、allowed OS/run kind
- catalog/requirement registry version、clock skew bound、signature algorithm suite

unknown algorithm/key、self-signed key、unregistered operator、wildcard repository/workflow、missing audience、expired/revoked policy entryをformalに受理しない。key rotationはold/new key IDとvalidityを明示し、challenge issued timeとattestation timeの双方で有効性を検証する。revocation informationを取得・検証できない場合は該当formal runをblockedにし、development successへ縮退する。

private key/tokenをrepository、catalog、fixture、artifactへ置かない。issuer/operator signingはOS key store/SSH agent/CI identity providerへ委譲し、recorder private keyはrun process memory内だけのephemeral Ed25519 keyとする。

## Canonical signed payloads

署名対象はdomain-separated、versioned canonical bytesにする。JSON表示をそのまま署名せず、field order、Unicode normalization、integer/time encoding、optional field absenceをschemaで固定する。

各署名payloadには最低限、domain/schema、run ID/kind、256-bit challenge nonce digest、source full commit、candidate/catalog/test-source/recorder/Pi executable digest、expected/observed OS、recorder public key、issuer/operator/CI identity、issued/expiry、evidence/bundle digestを該当範囲で含める。

signature wrapper内のpayload digestだけを検証せず、canonical payload bytesを再構成してsignatureを検証する。異なるdomain/schemaのsignatureを流用できない。SHA-256 digestはsecret maskingやproducer identityを主張せず、signature/attestation chainと組み合わせる。

## Challenge issuer and append-only ledger

formal runは実行前にchallengeを取得する。issuerはrequestのrun kind、expected OS、source/candidate/catalog/test/recorder/Pi executable digest、recorder ephemeral public keyをpolicyへ照合し、CSPRNG 256-bit nonceとrun IDを発行する。

manual issuer ledgerはtrusted issuer machineのrepository外owner-only rootに置き、0700 directory、0600 regular file、no-follow、same ownerを必須にする。CI issuer/consumerは既存CI attestation/append-only run artifact portを使い、同じlogical result unionを返す。

ledgerはdomain-separated hash chainを持つappend-only `issued | consumed | rejected` recordで、各recordをissuer keyが署名する。

- target ledger identity単位のexclusive mkdir lockを使い、owner nonce/host/PID/process-start identityを検証する。
- previous record digest、monotonic sequence、run ID/nonce一意性、state transitionをclosed parserで検証する。
- temp write→file fsync→atomic rename/append record→parent fsync後だけissued/consumed receiptを返す。
- issued challengeは一度だけ `consumed`へCASし、expiry/rejected/consumedから再利用しない。
- malformed/truncated/forked chain、multiple head、permission/clock uncertaintyではformal issuance/consumptionを停止する。
- ledger file削除やcopyをfresh ledgerとみなさず、policyに登録されたledger identity/genesis digestを照合する。

verifierはbundle/signature/coverage/redactionを検証した後、formal pack assembly前にchallenge consumptionをatomic commitする。consumption後のpack write失敗ではchallengeを再利用せず、failed assembly receiptを保持して新challengeで再実行する。

## Recorder security boundary

trusted recorderは起動前に自身のexecutable/source digestを測定し、policyと一致しなければformal challengeを要求しない。ephemeral Ed25519 keypairはOS CSPRNGで生成し、private keyをdisk/env/argvへ保存せず、run終了後参照を破棄する。

recorderは同じprocess/sessionで次を直接観測する。

- platform syscall、process ID/parent、exact Pi executable identity
- RPC/TTY event sourceとsession/run correlation
- candidate/catalog/test-source digests
- canonical audit subchain、doctor/child/transaction outcomes
- start/end/deadline/terminal state

runnerから渡された `os=darwin` や `interactive=true` をそのまま署名せず、recorder observationと一致を検証する。TUI recorder extensionはinput生成、trust承認、gate回答、workflow mutationを行わず観測だけをする。

recorded receiptはchallenge digest、ephemeral public key、observation digests、bounded structured assertionsへ署名する。recorder signatureだけではformal greenにならず、issuer signatureとCI/operator attestationも必要である。

## CI workload attestation

formal live RPCは既存CI workload identityがbundle digest、source commit、runner OS、repository/workflow/ref/run identityへ発行したartifact attestationを要求する。

verifierはOIDC issuer/audience、subject、repository owner/name、workflow path/ref、run ID/attempt、commit、artifact digest、signing timeをpolicyとexact compareする。fork PR、pull-request target混同、reusable workflow caller混同、wrong repository/workflow、unsigned local artifactを拒否する。

OIDC token自体をartifactへ保存せず、verificationに必要なsigned attestation bundle/certificate chain/identity claimsだけを保持する。certificate/issuer metadata取得が必要な場合は既存CI attestation verifierへ委譲し、offline verification bundleが不完全ならformal non-acceptedにする。

## Manual operator attestation

TUI runはtrusted recorder signatureに加え、policy登録済みoperator SSH keyでnamespace固定署名する。署名payloadはbundle digest、challenge digest、observed OS、interactive checklist version/completion、source commit、signing timeを含む。

operatorはTUI内に表示されたdigest/checklistを確認後に署名する。RPC/extension sourceはinteractive completion receiptを生成できない。operator signatureはhuman assertionの起源を認証するがhardware OS attestationではないことをevidence metadataへ明記する。

同じoperatorがmacOS/Linux両方を署名できても、recorderの別challenge、platform syscall、Pi executable/session observation、別environment keyを要求する。同一receiptのOS field差替え、別run signature replay、未登録key、wrong namespaceを拒否する。

## Isolated runner and credential handling

live RPC/TUI scratchは`mkdtemp`したproject、`PI_CODING_AGENT_DIR`、session、evidence raw rootを分離し、owner-only、symlinkなし、bounded retentionとする。formal sourceはclean full commitに束縛し、dirty/untracked sourceはdevelopment receiptに限定する。

provider/auth credentialはPiの通常environment/credential storeへ委譲する。recorder/runnerは値をparse、copy、hash、preview、persistしない。argv、challenge、receipt、audit subsetへ置かない。provider identifierとcredential source kindだけをsafe enumとして許可する。

processはexact resolved Pi executable、supported OS/version、bounded stdout/stderr、deadline、closed/controlled stdin、process group reapを使う。external update/downloadをrun途中に混ぜず、prebuilt candidate digestを固定する。

test harnessがtrust optionを明示しても、installer/extensionのautoapprove成功証拠にしない。fresh-untrusted negative journeyを独立実行する。

## Raw receipt and artifact safety

raw stdout/stderr、audit subset、file snapshotsはowner-only scratchにbounded保存し、formal persistent packへ入れる前にsecret/path/prompt redaction scannerを通す。scan不能、decoder ambiguity、oversize、control character、secret canary検出はfailureで、raw fallbackしない。

artifact parserはclosed schema、byte/file/count/depth limits、path normalizationを持ち、archive absolute/`..`/symlink/hardlink/deviceを拒否する。可能ならarchiveを展開せずcontent-addressed file listをstream検証する。

receiptはprocess exit/signal、stdout/stderr digest、structured assertion、production observable digest、source/test/candidate identityを持つ。self-reported `status=green`を信用せず、independent verifierがactual files/audit/state/process outputから再計算する。

failure/skip/retry receiptを削除・上書きしない。採用runは理由と全prior run IDsを参照し、greenだけを選択表示して履歴を隠さない。

## Independent verification and challenge consumption

verifier processはrunner/recorder code pathから分離し、次の順で検証する。

1. trusted policy/catalog/requirement registry digest。
2. issuer-signed challenge、expiry、ledger issued/unconsumed state。
3. recorder binary digest、ephemeral signature、challenge/bundle binding。
4. CI artifact attestationまたはoperator SSH signature/namespace/identity。
5. source/candidate/catalog/test/Pi executable/OS/run digest exact match。
6. raw process/audit/file observationからassertionを再計算。
7. secret/redaction pass、required deterministic/live/TUI/negative receipt。
8. requirement registry ID setからcoverage edgeを再計算。
9. challengeをatomic consumeし、signed consumption receiptを取得。
10. canonical formal packを構成し、別processのverify commandで再検証。

skip、unattested development、incomplete、cancelled、redaction failure、coverage gap、stale source、consumption失敗にformal converterを提供しない。

## Threat matrix

| Threat | Control | Negative verification |
|---|---|---|
| 自己生成green bundle | issuer challenge + recorder + CI/operator chain | self-signed/unknown key拒否 |
| 別payloadへ再署名 | canonical payload/domain/digest binding | field/digest mutation全拒否 |
| challenge replay | append-only ledger + atomic consume | consumed nonce別run再利用拒否 |
| OS claim差替え | recorder syscall + attested environment key | darwin/linux flip拒否 |
| wrong CI workflow/repo | exact OIDC identity policy | fork/wrong workflow attestation拒否 |
| operatorなりすまし | registered SSH fingerprint/namespace | unknown key/wrong namespace拒否 |
| recorder binary差替え | policy-bound executable digest | recorder byte mutationでissuance/verify fail |
| raw artifact zip slip/bomb | bounded closed parser/no-follow | traversal/symlink/oversize拒否 |
| credential/prompt漏洩 | no-copy policy + persistent scan | canaryがpack/report 0件 |
| skipをgreen変換 | discriminated result/no converter | skipped/unattested assembly拒否 |
| coverage自己申告 | trusted requirement registry recomputation | catalog/evidence edge同時削除でgap |
| ledger rollback/fork | genesis/head/hash-chain identity | truncated/copied/forked ledger blocked |

## Failure policy

| Failure | Result | Formal policy |
|---|---|---|
| policy/catalog unavailable | blocked | runner/evidenceからfallback 0 |
| issuer/ledger uncertainty | development-only | formal challenge 0 |
| signature/identity mismatch | non-accepted receipt | partial trust 0 |
| CI/operator attestation missing | unattested development | formal converter 0 |
| raw receipt/redaction invalid | failed/incomplete | pack inclusion 0 |
| coverage/required environment gap | not formally green | manual checkbox fallback 0 |
| challenge consumption failure | assembly blocked | pack write 0/replay 0 |
| pack write after consumption failure | failed assembly receipt | same challenge reuse 0 |

## Verification gate

- issuer/recorder/operator/CI key、payload field、domain/schema、commit/digest/OS/workflow/repository/refを一件ずつmutateし、formal受理を拒否する。
- challenge issued→consumedのconcurrent verifierをbarrier実行し、accepted consumer最大1にする。replay、expiry、ledger truncate/fork/copy/genesis mismatchを拒否する。
- recorder binary差替え、ephemeral key差替え、same receipt OS flip、separate run replayを検証する。
- fake CI fork/wrong workflow/audience/repository/run attempt attestation、unknown/wrong-namespace SSH signatureを拒否する。
- archive traversal/symlink/hardlink/device/oversize/deep JSON/control characterをartifact importerへ通す。
- provider/Git/API token、prompt、home/worktree/private backup canaryがchallenge、receipt、pack、report、test snapshotで0件であることをscanする。
- skip/unattested/incomplete/cancelled/redaction-failed resultにformal assembly APIが存在しないことをtype/contract testする。
- requirements/catalog/evidence edgeを同時削除してもtrusted registryからcoverage gapとなることを確認する。
- final packをfresh processで再検証し、source変更後はstaleとして拒否する。

検証はproducerの自己申告status、content digest、文書checklistだけでなく、trust policy、signature/attestation chain、ledger consumption、actual raw observation、trusted requirement registryから判定する。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T15:14:45Z
- **Iteration:** 1
- **Scope decision:** none

domain-separated署名、exact workload/operator policy、signed one-time ledger、independent observable再計算、secret非観測境界が整合し、confused-deputy・replay・自己申告を許す具体的な経路を認めない。

### Findings

- None
