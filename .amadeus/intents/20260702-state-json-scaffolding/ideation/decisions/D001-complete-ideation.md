# D001: complete ideation

## 背景

Issue #311 は、phase 遷移時の `state.json` 手書きが validator の要求構造と合わず、修正往復が発生する問題を扱う。
Discovery `20260702-phase-cycle-deterministic-contract` の候補判断で、ゲート契約（#306+#307）の確定後に扱う依存順が確定しており、前提の Intent `20260702-phase-gate-approval-contract` は cycle 完了済みである。

## 判断

Ideation を完了し、Inception へ進める。

Inception では、スクリプトの配置先、対象遷移ごとの入出力契約、既存 state を上書きしない更新規則、eval の置き場所、生成済み契約の再利用可否を具体化する。

## 理由

Issue #311 の対象、対象外、受け入れ条件と Discovery の候補判断から、対象境界、実行スコープ、成果物深度、検証戦略を判断できる。
残る未確定事項 5 件は、Inception の要求化と既存コード分析（validator の生成済み契約、既存 state 実データ、Issue #309 の同梱スクリプト方式）で扱える。

## 影響

Inception では、スクリプトの配置先（各 phase skill に分けるか、共有の 1 箇所か）を最初に確定する。
