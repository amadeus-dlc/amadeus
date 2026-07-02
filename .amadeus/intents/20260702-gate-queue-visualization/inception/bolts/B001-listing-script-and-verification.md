# B001 一覧スクリプトと検証

## 概要

複数 Intent の `state.json` を横断スキャンして承認待ちを Markdown 表で一覧する同梱スクリプトを、検証先行（RED から GREEN）で実装する。
確定済みゲート語彙契約からの判定の導出規約と、0 件表示を含む出力契約の確定を含む。

## 対象ユニット

- U001

## 設計

- [design.md](../units/U001-approval-queue-listing-contract/design.md)

## 完了条件

- 一覧スクリプトが `skills/amadeus-validator/scripts/` に置かれ、workspace を指定して実行できる。
- 承認待ちを含む固定入力で、Intent、phase、ゲート、待ち理由の列を持つ Markdown 表が得られる。
- 承認待ち 0 件の固定入力で、その旨の表示が得られ、正常実行として終了する。
- 判定結果が `task-generation-contract.ts` の `gateResultByStatus` の定義と矛盾しない。
- 決定論性（同じ入力から同じ出力）の検証が実装前に失敗した記録（RED）を持ち、実装後に pass する。

## 依存

なし。

## 実装対象

| 識別子 | repository | path | branch | PR | CI |
|---|---|---|---|---|---|
| IT001 | amadeus-dlc/amadeus | `skills/amadeus-validator/scripts/`（一覧スクリプト新設）と `.agents/skills/amadeus-validator/scripts/` | 未確認 | なし | 未確認 |
| IT002 | amadeus-dlc/amadeus | `skills/amadeus-validator/evals/` 配下の検証 | 未確認 | なし | 未確認 |

## 未確認事項

- スクリプトの名前、CLI 契約（workspace 引数、exit code）、待ち理由の文言、行の並び順は Construction Functional Design で確定する。
- 検証の repo test chain への組み込みは Task Generation で確定する。
