# セキュリティ設計 — U1 harness-capability-matrix

> 上流入力(consumes 全数): performance-requirements、security-requirements、scalability-requirements、reliability-requirements、business-logic-model、tech-stack-decisions
> 技術前提(Bun 単独・runtime dependency 追加ゼロ・新規外部依存なし)は同 unit の tech-stack-decisions の決定を継承する。

U1 は文書 Unit のため、セキュリティ設計 = **ProbeRecord 様式と §12a 検証手順の設計** である(performance-requirements / scalability-requirements が確定した N/A 境界により、稼働時セキュリティ機構は対象外)。

## ProbeRecord 様式(read-only の機械検証可能化)

security-requirements「プローブの非破壊性(read-only)」の合否(mutation 系サブコマンド 0 件の grep 走査)を機械検証可能にするため、ProbeRecord の各エントリは次の固定フィールドを持つ:

| フィールド | 内容 | 対応する要件 |
|---|---|---|
| `probe-id` | セルから trace される参照 ID(reliability-requirements の trace 契約と共有) | security-requirements / reliability-requirements |
| `command` | 実行コマンドの verbatim(1 コマンド 1 行 — grep 走査の単位) | security-requirements 合否 1 |
| `evidence` | コマンド出力抜粋 or file:line 引用 | BR-U1-2(実測性) |
| `preprocessing` | 本番経路前処理の再現内容(陰性判定エントリでは必須。probe-preprocessing-parity) | security-requirements「本番経路前処理の再現」合否 |
| `isolation` | ライブ起動プローブの場合の検査環境(実 self-install ツリー・record 非汚染の宣言) | security-requirements 合否 2 |

- 設計決定(fail-closed): `preprocessing` が空欄の陰性判定エントリは、business-logic-model ステップ 3 の規定どおり判定根拠から除外し、セル側は `⚠ deferred(実装時実測)` へ降格する。「空欄でも陰性成立」という fail-open 読みを様式段階で不能にする

## §12a 検証手順(層別)

一枚岩の「構造的に安全」断定は置かず、検証は 2 層に分ける:

1. **機械走査層**: ProbeRecord の `command` 列全行に対し、mutation 系サブコマンド(install / compose / drop / rm / mv / 書込リダイレクト)の grep が 0 件であることを確認。token・資格情報・provider 生レスポンスの grep も 0 件(security-requirements「認証情報の非保持」合否)
2. **目視照合層**: 陰性判定セル → `preprocessing` フィールドの実在、ライブ起動エントリ → `isolation` フィールドの実在を、セル→ProbeRecord の参照 ID 経由で照合

- 合否対応: security-requirements の全 4 合否(mutation 0 件 / 汚染回避明記 / 前処理再現の記録 / 資格情報非保持)は上記フィールドの grep+照合で判定できる
