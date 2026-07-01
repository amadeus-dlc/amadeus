# D001: Inception 境界判断

## 背景

Issue #263 は、Skill 実行契約を `amadeus-contracts` に追加し、skill 実行契約を生成参照できるようにすることを求めている。

Ideation では、TypeScript 型、代表 skill 契約、生成物、`contracts:generate`、`contracts:check`、validator または evaluator の参照入口、#257 と #259 への入力化を Inception へ渡している。

## 判断

Inception の対象境界を、Skill Contract catalog、生成物、ずれ検出、consumer 参照入口に固定する。

この Inception では、要求、受け入れ状態、User Story、Use Case、既存コード分析、Unit、Unit Design Brief、Bolt、追跡、判断を作る。
Spec、実装、Task、全 skill 一括適用、`SKILL.md` 全面再構成、semantic validator 化は作らない。

## 理由

Issue #263 の受け入れ条件は、型、代表契約、生成物、生成確認、参照入口に分かれている。
これらは Construction で実装する前に、Inception で要求と作業境界へ分ける必要がある。

## 影響

Construction では `amadeus-contracts`、生成処理、validator または evaluator の参照入口を対象にする。

全 skill 一括適用、skill 本文完全生成、#257 と #259 の全実装は後続候補として扱う。
