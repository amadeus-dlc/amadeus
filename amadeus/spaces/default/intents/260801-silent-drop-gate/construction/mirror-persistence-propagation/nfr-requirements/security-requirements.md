# Security Requirements — mirror-persistence-propagation

## 適用範囲とデータ分類

本書は `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md` を入力とする。対象データはAmadeusのローカルworkflow state、audit payload、transactional outbox、operation identityであり、分類は内部データとする。資格情報、決済情報、PII、PHI、外部サービスへの送信は対象外である。

認証・認可の新設は行わない。信頼境界は「検証済みのmodule-internal型」と「filesystemから読み込む未検証bytes」の間、および「canonical source」と「生成投影」の間に置く。

## セキュリティ不変条件

| ID | STRIDE | 要求 | 検証 |
|---|---|---|---|
| SEC-MPP-01 | Tampering | state／outboxをparseして型検証するまでbusiness transitionへ渡さない | malformed state／outbox fixtureがtyped failureとなりbytes不変 |
| SEC-MPP-02 | Tampering | auditの冪等成功はtransaction identityだけでなくdigest、revision、operation identity、transition kindの完全一致を要求する | identity一致・payload不一致fixtureがfail-closedでoutbox保持 |
| SEC-MPP-03 | Repudiation | commit済みtransitionはtransaction identityに結合したauditまたは完全なoutboxを必ず持つ | clean／outbox-pendingの各snapshot assertion |
| SEC-MPP-04 | Information Disclosure | 診断へstate全文、outbox payload、秘密値、絶対パスを出さない | stderr／Result snapshotで許可fieldのみを確認 |
| SEC-MPP-05 | Denial of Service | retry loop、再帰drain、無制限backoffを導入しない | 全failure injectionで同一invocation内retry 0回 |
| SEC-MPP-06 | Elevation of Privilege | 新しい権限境界、network access、外部credentialを追加しない | production diffと依存差分で0件 |

## File I/O防御

atomic adapterはlock、read、parse、render、temp create／write／close／lstat、rename、directory fsyncをtyped phaseで区別する。summary prefixや例外messageの文字列解析を制御に使ってはならない。rename前の失敗はstate／audit／outbox bytesを呼出前と同一に保ち、rename後directory fsync失敗は `durability-unknown` として成功を禁止する。

symlinkや想定外file typeを既存lstat境界で拒否し、canonical state path外へwriteしない。temp fileとoutboxの作成時は既存の権限・atomic rename規則を維持し、本Unitだけの緩いfallback pathを追加しない。

## 監査とコンプライアンス

特定のPCI-DSS、HIPAA、GDPR規制対象データは導入しないため、個別framework controlは非適用である。ただし監査完全性は製品要件として必須であり、次を満たす。

- transaction identityごとのaudit recordは最大1件
- identity一致・正本field不一致は破損または衝突としてfail-closed
- commit前failureを新しいworkflow auditへappendしない
- commit後audit失敗ではbusiness stateと完全なoutboxを保持
- outbox clear失敗ではauditとstale outboxを保持し、後続maintenanceで重複なしに収束

証跡は `requirements.md` の FR-10／FR-15 と `business-rules.md` の AR-02〜AR-05、AR-08、AR-11へtraceし、production診断の内容とtest fixtureの内容を混同しない。

## セキュリティ検証

Build and Testでmalformed input、identity collision、payload mismatch、pre-commit failure、durability-unknown、audit append failure、outbox clear failureを注入する。DAST、penetration test、cloud posture scanは外部attack surfaceが存在しないため生成しない。既存dependency／supply-chain検査とBun frozen installは全体契約として維持する。
