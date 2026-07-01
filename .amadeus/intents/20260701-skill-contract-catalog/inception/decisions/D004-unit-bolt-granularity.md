# D004: Unit と Bolt の粒度判断

## 背景

Issue #263 の受け入れ条件は、Skill Contract 型、代表 skill 契約、生成物、生成確認、consumer 参照入口に分かれている。

一つの Unit にまとめると、catalog の型設計、生成物の差分検出、review/validator/evaluator の参照入口が混ざる。

## 判断

Unit を次の3つに分ける。

- U001: Skill Contract の型、catalog、代表 skill 契約。
- U002: Skill Contract 生成物と `contracts:check` のずれ検出。
- U003: validator、evaluator、decision review、learning review の Skill Contract 参照入口。

Bolt も同じ境界に合わせ、B001、B002、B003 に分ける。

## 理由

U001 は契約の表現を固定する作業である。
U002 は catalog から生成物を導出し、手編集と生成漏れを検出する作業である。
U003 は生成済み契約を consumer に渡す入口を作る作業である。

この順序にすると、Construction で型と catalog を先に固め、生成物を追加し、最後に参照入口を接続できる。

## 影響

B002 は B001 に依存し、B003 は B001 と B002 に依存する。

consumer 側の本格的な評価ロジックや #257/#259 の全実装は、この Intent の Bolt には含めない。
