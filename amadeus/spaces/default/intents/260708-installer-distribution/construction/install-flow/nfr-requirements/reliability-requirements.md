# Reliability Requirements — install-flow

> ステージ: nfr-requirements (3.2) / Unit: install-flow / 作成: 2026-07-08
> 出典: `../functional-design/business-rules.md`(BR-I07〜I16)・`business-logic-model.md`(失敗分岐)、requirements NFR-002/003

## REL-I01: 部分適用の検出可能性

apply 部分失敗時はマニフェストを書かない(BR-I16 の逆条件)→ 次回実行の `Installation.detect` が partial を分類し、ユーザーは `--force` 付き再実行で回復できる。**「成功と報告したのに壊れている」状態を作らない**(NFR-002)。

## REL-I02: 再実行安全性(実質的冪等)

同一バージョン・同一ターゲットへの install 再実行は、導入済み検出(FR-004)で中断されるか、`--force` 時は同一結果に収束する(退避ファイルは増えるが、これは監査証跡であり欠陥ではない — FR-008 の設計どおり)。

## REL-I03: レポートと実適用の一致(NFR-003)

適用されるのはプランのエントリのみ・全エントリ(applier はプラン外の操作を行わない — application-design の境界)。ApplyResult がエントリ単位の成否を保持し、レポートとの突合テストが可能。

## REL-I04: 終了コードの機械判別性

0/1/2 の規約(BR-I06)を全経路で維持。E2E テストが各失敗分岐の終了コードをアサートする。
