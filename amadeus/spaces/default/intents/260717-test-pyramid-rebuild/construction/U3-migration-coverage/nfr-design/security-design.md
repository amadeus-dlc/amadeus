上流入力(consumes 全数): performance-requirements.md, security-requirements.md, scalability-requirements.md, reliability-requirements.md, tech-stack-decisions.md, business-logic-model.md

# セキュリティ設計 — U3 移設選定台帳と層別カバレッジ整合計画

本設計は `performance-requirements.md` のversioned evidence、`security-requirements.md` の最小出力、`scalability-requirements.md` の未知signal fail-closed、`reliability-requirements.md` の再現性、`tech-stack-decisions.md` のBun/TypeScript維持、および `business-logic-model.md` のrepository内データフローを具体化する。

## SEC-D1: 四つの信頼境界

信頼境界を次の4段に分ける。

1. **Ledger admission**: U1のcompleteな `SizeLedger` とnon-empty observed refだけを受ける。手入力のmeasured/signals、incomplete/fatal ledger、ref欠落を受けない。
2. **Evidence collection**: observed refで固定されたrepository sourceだけを読み、候補ごとに最大1回の読取から、人間/curatorがledgerのemitted signalごとの根拠を記録する。private classifier regexを複製せず、sourceの意味判断やlocatorをclassifier出力と偽装しない。
3. **Human approval resolution**: 具体的なEvidencePayload生成後の別HUMAN_TURNがdigestを明示したaudit eventをAudit Approval Resolverが読み、event実在・human origin・digest一致を検証してbranded `ApprovalProof` を返す。今回のQ1/Q3は方式の承認だけで、将来payloadのproofに流用しない。
4. **Evidence admission/evaluation**: 純粋validatorはEvidencePayloadとverified ApprovalProofを別入力で受け、schemaVersion・observedRef・canonical SHA-256 digestをexact照合する。承認をCandidate/Signal単位へ重複させない。

Git commitの存在やmutable envelope内のdigest field同士の一致だけでは人間承認を表さない。ledger/evidenceのref不一致、承認proof欠落/解決不能/non-human/digest不一致、候補・signalの欠落/重複/余剰、未知signal、壊れたlocator/fact/dispositionはREL-D1の `invalid-input` とし、actionable queueを返さない。

## SEC-D2: 安全な locator とデータ最小化

```text
LogicalRepoPath = non-empty, repository-relative, '/' separated, no '.' or '..' segment
SourceLocator = { file: LogicalRepoPath, startLine: positive-integer, endLine: positive-integer }
```

`startLine <= endLine` とし、両lineは `EvidencePayload.observedRef` のsourceに実在しなければならない。CandidateEvidence.fileとlocator.fileは一致させる。根拠はsignal kind、locator、短い反証可能fact、dispositionだけを保持し、source全文・断片、absolute/canonical path、環境変数、credential、token、stack trace、runtime例外messageを複製しない。

factは人間向け表示だけに使い、自由記述の文字列一致やLLM解釈でfinal stateを分岐しない。invalid pathや未知signalのraw値は診断へ載せず、安全なcandidate index / signal indexと閉じたfailure kindで示す。

## SEC-D3: integrity と fail-closed

- ledgerから抽出した候補file集合と `EvidencePayload.candidates` は全単射にする。missing、unexpected、duplicateを許さない。
- 各候補のledger signalsとSignalEvidenceはsignal kindごとに全単射にする。同じsignalのduplicateや欠落を許さない。
- `schemaVersion=1`、ledger.observedRef、各CandidateEvidence.observedRef、EvidencePayload.observedRef、人間承認対象refをexact一致させる。さらにcanonical payloadからdigestを再計算し、resolverがaudit eventから得た`approvedDigest`と一致させる。
- `lexical-false-positive` と `unknown` はvalid evidenceだが未確定なので `classification-review` とする。構造的不正を同variantへ変換しない。
- filesystem+spawn等の複数signalを、配列順やsignal優先だけで一括remediationしない。
- `invalid-input` は診断だけを返し、partial review/migration/coverage planを返さない。

## SEC-D4: threat と統制

| Threat | 適用 | 設計統制 |
| --- | --- | --- |
| evidence tampering | 適用 | observed ref一致、schemaVersion、`EvidencePayload` digest単位の別HUMAN_TURN承認、Git/audit参照 |
| 誤分類の否認 | 適用 | locator・fact・disposition・承認refを追跡し、決定表を閉じる |
| path traversal / 情報漏えい | 適用 | LogicalRepoPath検証、raw不正値・source・absolute path非出力 |
| lexical false positiveの自動retier | 適用 | `classification-review` へfail-closed |
| resource exhaustion | 限定適用 | O(N+B+E+S+C log C)、1候補1読取、無制限並列なし |
| spoofing / privilege escalation | N/A | identity provider、権限変更、外部principalなし |

認証、認可、CSRF/XSS、TLS、KMS、IAM、VPC、SAST/DASTの追加設計は、UI・外部API・cloud resource・機微データがないためN/Aである。既存CI検査を省略する根拠にはしない。

## SEC-D5: coverage とIssue境界

現行 `coverage/lcov.info` だけをexistingとし、存在しないper-tier path文字列を生成しない。pendingはpath不在、not-executedはCI非参加であり、PASSやN/Aへ変換しない。閉鎖済み [Issue #683](https://github.com/amadeus-dlc/amadeus/issues/683) は再オープン・責務拡大せず、per-tier実装は番号未定の新規follow-up所有のままとする。本intentではIssue起票も行わない。
