# Pi Conformance Evidence — NFR Design Questions

## 回答方針

engine-resolved inputは `business-logic-model` のみで、条件付きの `security-requirements` / `tech-stack-decisions` は期待どおり非適用である。IssueやFunctional Designを再質問せず、formal challenge、recorder、CI/operator attestation、ledger、raw receipt、independent verifierのsecurity/component境界だけを確定する。

## Questions and Answers

### Q1. content digestだけでformal runの実行起源を証明するか

[Answer]: しない。issuer-signed single-use challenge、trusted recorder ephemeral signature、CI workload artifact attestationまたは登録operator SSH signatureのchainを必須にする。digestは改変検出であり、producer/platform/human provenanceの認証ではない。

### Q2. challenge issuer/consumptionに新しい常駐serviceやdatabaseを作るか

[Answer]: 作らない。CIは既存workload identity/attestation機構、manual TUIは登録issuer keyとowner-only append-only local ledgerを使う。ledgerはhash chain、file lock、atomic append/fsync、signed issued/consumed recordを持つ。安全なissuer/ledgerを利用できなければdevelopment runに限定する。

### Q3. recorder/operator/CIのprivate keyやtokenをevidenceへ保存するか

[Answer]: 保存しない。recorder private keyはrun memory内のephemeral Ed25519 key、CI tokenはattestation発行へだけ使用、operator SSH signingはagent/key storeへ委譲する。evidenceにはpublic key/fingerprint、key ID、signature、credential-free identity claimsだけを置く。

### Q4. raw stdout/stderrやaudit全量を正式packへ入れるか

[Answer]: 入れない。verificationに必要なbounded raw receiptとsafe audit subsetをowner-only scratchで検証し、secret/prompt/home path redaction scan後にdigest/structured assertionを保存する。scan不能・oversize・redaction失敗はformal non-acceptedで、raw fallbackしない。

## 曖昧性分析

- material ambiguityはない。
- operator signatureはhuman assertionの起源認証で、hardware/platform attestationを主張しない。
- development/skip/unattested resultにはformal converterを提供しない。
- 新しいcloud service、database、専用test runner、provider credential配布は行わない。
