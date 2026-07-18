上流入力(consumes 全数): business-logic-model.md, business-rules.md, requirements.md, technology-stack.md

本 NFR は codekb `technology-stack.md` の TypeScript/ESM・Bun・既存 CI を前提とし、新規の認証、外部サービス、シークレット、セキュリティ製品を追加しない。

# セキュリティ要件 — U2 層責務仕様と tier-aware ドリフト判定

本書は `business-logic-model.md` の判定入力と fail-closed 方針、`business-rules.md` の 4 named tier 規約、`requirements.md` の FR-3/FR-7 を信頼境界と脅威の観点から具体化する。本 intent は設計のみで、ゲート実装・CI 配線は別 intent である。

## SEC-1: データ分類と信頼境界

入力は同一リポジトリ内で生成された U1 `SizeLedger` の `{ file, tier, measured }` と、既決の tier→上限規約に限定する。

- `file` は repo 相対パス、`tier` はディレクトリ第1階層、`measured` は `classifyTestSize` 由来の `small | medium | large` である。
- 出力は violation の `tier`・`allowed`・`measured` と件数集計だけに限定し、テスト本文、環境変数、資格情報、token、任意のログ本文を含めない。
- 認証・認可・個人データ・決済・医療データ・外部通信は存在しない。したがって OAuth、RBAC、暗号化、PCI-DSS、HIPAA、GDPR 等の追加制御は N/A である。これは未検証ではなく、入出力契約に該当データと外部境界が存在しないという反証可能な非適用である。

## SEC-2: STRIDE による最小脅威分析

| 分類 | 判定 | 要件 |
| --- | --- | --- |
| Spoofing | N/A | 利用者 identity や認証主体を扱わない |
| Tampering | 適用 | `measured` を手入力せず `classifyTestSize` 由来の台帳だけを受け、measurement ref を保持する |
| Repudiation | 適用 | measurement ref、総行数、violation 件数を成果物・監査へ残し、どの入力から導出したか追跡可能にする |
| Information Disclosure | 適用 | repo 相対パスと分類ラベル以外を出力しない。ソース本文やシークレットを転記しない |
| Denial of Service | 限定適用 | 判定は O(N) の単一走査とし、再帰再読込・無制限並列・ネットワーク再試行を追加しない |
| Elevation of Privilege | N/A | 権限境界、特権操作、外部実行を持たない |

## SEC-3: 入力不正時の fail-closed 契約

規約対象行で `tier` または `measured` が欠落・不正なら、規約内として黙って通さず判定不能の failure とする。harness/lib 等の補助 tier は「不正」ではなく、既決規約により明示的に対象外として台帳へ残す。この区別により、未知値を無音で安全扱いする fail-open と、正当な補助 tier の偽陽性を同時に避ける。

既存 declared-vs-measured ゲートは変更・迂回せず温存する。新しい tier-aware 判定は別観点であり、既存セキュリティ検査の置換根拠に使わない。実際の failure 表現、stderr、exit code、落ちる実証は別 intent の実装要件とする。
