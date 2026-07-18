上流入力(consumes 全数): performance-requirements.md, security-requirements.md, scalability-requirements.md, reliability-requirements.md, tech-stack-decisions.md, business-logic-model.md

# セキュリティ設計 — U2 層責務仕様と tier-aware 判定

本設計は `performance-requirements.md` の in-memory 判定、`security-requirements.md` の台帳信頼境界、`scalability-requirements.md` の tier 拡張、`reliability-requirements.md` の fail-closed、`tech-stack-decisions.md` の依存非追加、および `business-logic-model.md` の静的序数比較を具体化する。

## SEC-D1: 信頼境界と入力 admission

U2 は U1 の `LedgerBuildOutcome` と `logical-components.md` LOG-D1 の固定 policy だけを入力とする。raw source、任意 path、環境変数、allowlist、network response を判定 IF の暗黙入力にしない。Evaluation Boundary は `LedgerBuildOutcome → TierEvaluationResult` を所有し、`incomplete → upstream-incomplete`、`fatal(observed-ref-missing) → observed-ref-missing`、その他の `fatal → upstream-fatal`、`complete` でも observed ref が欠落または空なら `observed-ref-missing` の `admission-rejected` を返す。この場合は行評価、observation、diagnostics、reportを構成しない。complete かつ non-empty observed ref の場合だけ admission が成功する。

admission 後の各行は境界で次のように検証する。

- `file` は U1 が正規化した repository 相対 logical path、`measured` は既存 `TestSize` の exact valueとし、不正値は行レベル indeterminate にする。
- tier は exact match で NamedTier、承認済み補助 tier `harness|lib`、invalid の3分類にする。case fold、prefix、編集距離による類推をしない。
- 新しい補助 tier は registry と規約の同時更新を要し、未登録値を自動的な補助扱いにしない。
- 複数 field が不正でも `file → tier → measured` の優先順位で1行1診断とし、invalid file は raw値を保持せず zero-based `rowIndex` だけで識別する。valid file がある `invalid-tier` / `invalid-measured` だけが正規化済み logical path を保持できる。

これにより `unti` を補助 tier として無音除外する fail-open を防ぐ。

## SEC-D2: source 非実行と最小出力

NamedTier 行は `allowedMaxSize` と既存 `SIZE_ORDER` の値比較だけを行い、`eval`、dynamic import、test execution、child process、FS、network を呼ばない。出力を admission拒否の閉じた reason、measurement ref、検証済みrepo相対 fileまたは `rowIndex` を持つ閉じた診断、tier、allowed、measured、各件数、比率に必要な size countへ限定する。

source 本文・断片、raw不正値、absolute/canonical path、credential、token、環境変数、stack trace、任意 runtime error message を result へ複製しない。認証、認可、TLS、暗号化 at rest、IAM、VPC、PCI-DSS、HIPAA、GDPR の追加制御は、principal、外部通信、機微データ、永続 store がないため N/A とする。

## SEC-D3: threat と統制

| Threat | 適用 | 設計統制 |
| --- | --- | --- |
| 台帳・policy tampering | 適用 | observed ref、complete admission、exact value、単一 `allowedMaxSize` owner |
| tier typo の無音除外 | 適用 | Named / approved auxiliary / invalid の明示3分類、unknown は fail-closed |
| source execution | 適用 | 台帳上の label と `SIZE_ORDER` 比較だけに限定 |
| information disclosure | 限定適用 | repo 相対 path と分類 label・件数だけを出力 |
| denial of service | 限定適用 | O(N) 単一走査、FS再走査・network retry・無制限並列なし |
| spoofing / privilege escalation | N/A | identity、権限変更、特権操作なし |

## SEC-D4: 現行実装 gap と非破壊境界

現行 purity ratchet は local repository FS と committed allowlist を直接読み、unknown tier を `other` として skip する。また `rel` の POSIX separator 前提により Windows で absolute path が診断へ漏れる可能性がある。これらを target 設計の達成済み統制とは扱わない。

将来収束時は U1 の normalized file/tier を消費し、現行 ratchet assertion と CI 到達性を保ったまま単一 policyへ寄せる。本 intent は現行 test、allowlist、公開 docs、runner、CI を変更せず、既存 declared-vs-measured gateも迂回しない。
