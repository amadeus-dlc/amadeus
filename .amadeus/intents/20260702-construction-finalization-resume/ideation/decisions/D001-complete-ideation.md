# D001: complete ideation

## 背景

Issue #309 は、merge 後の Construction finalization がハーネスによって自動化されず、人間の記憶頼みになる問題を扱う。

## 判断

Ideation を完了し、Inception へ進める。

Inception では、再開規則の判定証拠、検出スクリプトの入出力契約、検証の置き場所、auto 判定での検出結果の位置を具体化する。

## 理由

Issue #309 の対象、対象外、受け入れ条件から、対象境界、実行スコープ、成果物深度、検証戦略を判断できる。
残る未確定事項4件は、Inception の要求化と既存 skill 分析で扱える。

## 影響

Inception では、merge 済み判定の証拠（成果物と state だけで判定するか、GitHub 照会を許容するか）を最初に確定する。
