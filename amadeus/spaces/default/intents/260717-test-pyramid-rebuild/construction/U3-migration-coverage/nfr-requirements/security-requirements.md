上流入力(consumes 全数): business-logic-model.md, business-rules.md, requirements.md, technology-stack.md

本 NFR は codekb `technology-stack.md` の TypeScript/ESM・Bun と既存リポジトリ内台帳を前提とし、`business-logic-model.md`・`business-rules.md`・`requirements.md` にない認証基盤、外部サービス、シークレット管理製品を追加しない。

# セキュリティ要件 — U3 移設選定台帳と層別カバレッジ整合計画

本書は、移設候補の根拠情報と coverage 整合計画が扱う信頼境界、データ最小化、fail-closed 条件を定める。本 intent は設計・計画までであり、実移設や CI 配線を行わない。

## SEC-1: 入出力をリポジトリ内部メタデータへ限定する

- 入力は U1 `SizeLedger` の repository 相対 `file`、`tier`、`measured`、`signals`、measurement ref と、候補ファイルの repository 内エビデンスに限定する。
- 絶対パス、`..` を含む repository 外参照、環境変数、credential、token、provider 応答、ソース全文を成果物へ保存しない。
- 根拠は versioned `CandidateEvidence` として、measurement ref、repository 相対 file、各 emitted signal に対応する repository 相対 locator、反証可能な事実要約、disposition を保持する。秘密情報や無関係なソース本文を複製しない。
- 出力は移設候補の状態・優先度・根拠参照と、NamedTier・`ledgerKeys[]`・coverage 状態に限定する。

これらは内部開発メタデータであり、PII、PHI、決済情報、認証情報を処理しない。PCI-DSS、HIPAA、GDPR の追加統制、暗号化方式、データ residency は反証可能な N/A であり、未検証を PASS と表現しない。

## SEC-2: STRIDE による最小脅威分析

| STRIDE | 適用 | 要件 |
| --- | --- | --- |
| Spoofing | N/A | identity、認証主体、外部 caller を扱わない |
| Tampering | 適用 | `measured` と `signals` を手入力で上書きせず、`classifyTestSize` 由来の台帳と measurement ref を保持する |
| Repudiation | 適用 | 各 final state に根拠を結び、ユーザー決定と再測定 ref を追跡可能にする |
| Information Disclosure | 限定適用 | repository 相対パス以外の環境情報やソース本文を成果物へ出さない |
| Denial of Service | 限定適用 | 候補確認 O(N + B)、queue sort 込み O(N log N + B) の有界な処理とし、ネットワーク再試行・子プロセス連鎖・無制限並列を追加しない |
| Elevation of Privilege | N/A | 権限変更、特権操作、外部サービス操作を持たない |

## SEC-3: 誤分類と不正入力を fail-closed で扱う

- 既知 signal の重複は排他的バケットへ正規化してから判定し、filesystem + spawn 90件を優先順位だけで一括分類しない。各 emitted signal に evidence がちょうど1件対応しない入力は failure とする。
- `tests/unit/setup-cli-wiring.test.ts` の network 検出は fake port を使う本文中の文字列による lexical false positive であるため、`retier-to-e2e` へ自動送致せず `classification-review` とする。
- ファイル欠落、重複 file、未知 signal、壊れた台帳行、根拠参照不能が1件でもあれば、完全な移設計画として成功扱いしない。
- `classification-review` は安全な既定値ではなく、後続で classifier/source の是正と再測定を要する非完了状態である。
- 現行 combined coverage と存在しない per-tier path を混同せず、path 存在状態と CI 参加状態を別フィールドにする。未存在の per-tier path は **PENDING**、e2e の現行 `coverage:ci` 参加は **NOT EXECUTED** と同時に表現する。

## SEC-4: 既存境界を拡大しない

閉鎖済みの Issue #683 の完了範囲を変更したり再オープン扱いにしたりしない。per-tier path と配線の所有先は新規 follow-up Issue/intent とし、その起票・実装は本パイロット外である。認証・認可、SAST/DAST、IaC scan、外部監査基盤は実在する攻撃面がないため追加しないが、既存 CI の必須検査を省略する根拠にも使わない。
