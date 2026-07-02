# R004 skill 手順からの参照

## 要求

対象 phase skill の state 更新手順から、雛形生成スクリプトの利用が参照されている。

## 背景

スクリプトが存在しても、phase skill の手順が手書きを前提にしたままでは、エージェントは先例の手書き再現を続ける。
手順からの参照が、雛形生成を既定の動きにする。

## 受け入れ条件

- state 更新を記述する対象 skill（intent-capture、inception、functional-design、bolt-preparation、construction traceability-finalization）の該当手順から、スクリプトの利用が読める。
- 参照は、遷移種別を含めて 1 行程度で書ける粒度になっている。

## 依存

- R001
- R003

## 対応する対象境界

- SC-IN-003

## 未確認事項

- 参照を追加する手順の正確な範囲（公開入口 skill にも書くか、内部 skill だけか）は、Unit Design Brief と Construction で確定する。
