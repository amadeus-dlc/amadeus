# D001: complete ideation

## 背景

Issue #334 は、すべての Intent と Discovery が共有インデックス `intents.md` と `discoveries.md` を更新するため、並行 branch 間で追記衝突が起き、水平並行の構造的な障害になっている問題を扱う。
Discovery `20260702-parallel-execution` の候補判断で 4 候補の recommended に選定されており、依存する既存 Intent はない。

## 判断

Ideation を完了し、Inception へ進める。

Inception では、インデックスに残す情報と配下モジュールへ移す情報の境界、依存関係表の移行先、生成入口の配置先、手書き編集とのすみ分け、examples snapshot への影響を具体化する。

## 理由

Issue #334 の目的、対象、対象外、受け入れ条件と Discovery の候補判断から、対象境界、実行スコープ、成果物深度、検証戦略を判断できる。
残る未確定事項 5 件は、Inception の要求化と既存コード分析（validator の Index ID 参照検査、Issue #311 で確立した同梱スクリプト方式、examples snapshot の構成）で扱える。

## 影響

Inception では、インデックスに残す情報と配下モジュールへ移す情報の境界を最初に確定する。
この境界が `intents.md` の依存関係表の移行先と生成入口の契約を決める。
