# アクター

この文書は、要求の根拠やシステムとの相互作用に登場する人の役割を扱う。

外部システムは `external-systems.md` に定義し、この文書には置かない。

## 一覧

| 識別子 | 名前 | 役割 | 関心 | 状態 |
|---|---|---|---|---|
| ACT001 | Maintainer | Amadeus 本体の方針、PR、merge 判断を行う。 | 変更範囲、検証結果、次回 stage0 採用可否を判断できること。 | 採用 |
| ACT002 | Agent | skill、validator、example、docs の変更を提案または実行する。 | 参照元、target workspace、target artifacts を混同せず作業できること。 | 採用 |
| ACT003 | Reviewer | PR の妥当性、検証、コメント対応を確認する。 | Issue、Intent、PR の対応関係と検証結果を追えること。 | 採用 |
