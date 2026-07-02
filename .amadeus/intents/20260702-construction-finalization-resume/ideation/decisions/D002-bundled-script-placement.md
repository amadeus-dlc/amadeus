# D002: 同梱スクリプト配置の判断

## 背景

未 finalize 検出スクリプトの置き場所には、repo root の dev-scripts と、`amadeus-construction` の同梱スクリプト（`skills/amadeus-construction/scripts/**`）の2案があった。

Issue #309 の初稿は dev-scripts 案だったが、Maintainer の指摘で修正された（[Issue #309 コメント](https://github.com/amadeus-dlc/amadeus/issues/309#issuecomment-4861065833)）。

## 判断

検出スクリプトは `amadeus-construction` の同梱スクリプトとして置く。

repo root の dev-scripts への配置は対象外にする。

## 理由

repo の開発用スクリプトは skill の実行時参照にできず、配布先ユーザー環境に存在しない。
同梱スクリプトは promote で昇格先成果物に含まれ、配布先でも実行できる。

## 影響

- scope の SC-IN-002 と SC-OUT-001 を確定する。
- Inception では、同梱スクリプトの検証の置き場所を、昇格先に evals を混ぜない制約と両立させる形で確定する。
