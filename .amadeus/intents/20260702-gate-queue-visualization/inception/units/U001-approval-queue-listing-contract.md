# U001 承認待ちキュー一覧契約

## ユニット

複数 Intent の `state.json` 横断スキャン、確定済みゲート語彙契約に準拠した承認待ち判定、Markdown 表と 0 件表示の出力、配布先ユーザー環境での実行、検証の先行追加を、承認待ちキュー一覧の契約として成立させる Unit である。

## 対象要求

- R001
- R002
- R003
- R004
- R005

## 価値境界

この Unit は、承認待ち判定の導出規約、`.amadeus/intents/*/state.json` の横断スキャン、Markdown 表と 0 件時表示の出力契約、`amadeus-validator` への同梱と手順記載、検証の先行追加を扱う。

承認そのものの自動化、通知基盤、gate 値の書き換え、Discovery gate の扱い、並行実行の他候補（並行運用ポリシー、Bolt の依存 wave 並行実行）は扱わない。

## 検証観点

- 承認待ちを含む検証データで、Intent、phase、ゲート、待ち理由の Markdown 表が 1 回の実行で得られる。
- 承認待ち 0 件の検証データで、その旨の表示が得られ、実行失敗と区別できる。
- 判定結果が確定済みゲート語彙契約（`gateResultByStatus`）の定義と矛盾しない。
- 同じ `state.json` の集合からの再実行が同じ出力を返す（決定論性）。
- 検証が実装前に失敗した記録があり、実装後に pass する。
- 昇格済み成果物だけで `bun` から実行でき、実行手順が利用者向け文書から読める。

## 未確認事項

- 待ち理由の文言への写像規約、スクリプト名と CLI 契約、行の並び順規則は Construction Functional Design で確定する。
- phase の `status: waiting_approval`（gate 以外の待ち表現）を検出対象に含めるかは Construction Functional Design で確定する。

## 実装対象

| 識別子 | repository | path | branch | PR | CI |
|---|---|---|---|---|---|
| IT001 | amadeus-dlc/amadeus | `skills/amadeus-validator/scripts/`（一覧スクリプト新設）と `.agents/skills/amadeus-validator/scripts/` | 未確認 | なし | 未確認 |
| IT002 | amadeus-dlc/amadeus | `skills/amadeus-validator/evals/` 配下の検証 | 未確認 | なし | 未確認 |
| IT003 | amadeus-dlc/amadeus | `skills/amadeus-validator/SKILL.md`（手順記載）と `.agents/skills/amadeus-validator/SKILL.md` | 未確認 | なし | 未確認 |

## 関連成果物

- [design.md](U001-approval-queue-listing-contract/design.md)
