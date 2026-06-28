---
name: amadeus-construction-bolt-preparation
description: >-
  Amadeus Construction の内部 skill。Inception 完了済み Intent の対象 Bolt に対して、Bolt 実行準備だけを進める。
  対象 Bolt、Task、前提、作業順序、検証入口を確認し、bolts/<bolt-id>/construction-design.md、notes.md、Design Gate ready、
  traceability の Construction Design 追跡を作成または補修する場面では必ず使う。実装とテスト実行はしない。
---

# amadeus-construction-bolt-preparation

## 目的

Construction phase の Bolt 実行準備だけを進める。
対象 Bolt の Domain Design、Logical Design、実装設計、検証設計を `construction-design.md` に確定し、Implementation Execution が進める `ready` 状態まで到達させる。

この skill は `amadeus-construction` の内部 skill である。
公開入口としての `amadeus-construction` から呼び出されることを主な用途にする。

## 前提

対象 Intent が Inception を完了していることを前提にする。

少なくとも次を読む。

- `.amadeus/intents.md`
- `.amadeus/intents/<intent-id>-<slug>/intent.md`
- `.amadeus/intents/<intent-id>-<slug>/state.json`
- `.amadeus/intents/<intent-id>-<slug>/requirements.md`
- `.amadeus/intents/<intent-id>-<slug>/acceptance.md`
- `.amadeus/intents/<intent-id>-<slug>/units.md`
- `.amadeus/intents/<intent-id>-<slug>/bolts.md`
- `.amadeus/intents/<intent-id>-<slug>/units/<unit-id>-<slug>/design.md`
- `.amadeus/intents/<intent-id>-<slug>/bolts/<bolt-id>-<slug>/bolt.md`
- `.amadeus/intents/<intent-id>-<slug>/bolts/<bolt-id>-<slug>/tasks.md`
- `.amadeus/intents/<intent-id>-<slug>/traceability.md`
- 作業ツリーの関連コード、テスト、設定

`state.json.inception.gate` が `passed` でない場合は停止する。
対象 Bolt が確定できない場合は、`amadeus-construction` に戻して一問だけ確認する。

## テンプレート

新規作成または構造補修では、`amadeus-construction/templates/intents/construction/` のテンプレートを使う。

プロジェクト固有テンプレートが `.amadeus/settings/templates/intents/construction/` にある場合は、そちらを優先する。

## 成果物

作成または更新できる Amadeus 成果物は次だけである。

- `.amadeus/intents/<intent-id>-<slug>/bolts/<bolt-id>-<slug>/construction-design.md`
- `.amadeus/intents/<intent-id>-<slug>/bolts/<bolt-id>-<slug>/notes.md`
- `.amadeus/intents/<intent-id>-<slug>/traceability.md`
- `.amadeus/intents/<intent-id>-<slug>/state.json`

既存成果物がある場合は、既存の見出しと記録を尊重する。
不明な値は空欄にせず、`未確認` と書く。

## 手順

1. 対象 Bolt の完了条件、対象 Unit、Task、依存を確認する。
2. 対象 Bolt が参照する Unit Design Brief の設計戦略、責務境界、検証観点、Construction への引き継ぎを確認する。
3. 作業ツリーから実装対象候補、既存テスト、検証コマンドを確認する。
4. `construction-design.md` に `概要`、`Domain Design`、`Logical Design`、`実装設計`、`検証設計`、`設計変更記録` を作る。
5. 各設計セクションに対象 Task を `B001/T001` の形式で明示する。
6. 既存コード調査の詳細は `notes.md` に残し、設計判断に効く制約の要約だけを `construction-design.md` に書く。
7. `notes.md` に実行方針、対象 Task、作業順序、未確認事項を記録する。
8. `traceability.md` に `Construction Design からの追跡` を追加または更新し、`Construction Design | Task | 実装 | 検証 | PR | 状態` の表を作る。
9. `state.json.construction.requiredBoltArtifacts` に対象 Bolt の `construction-design.md` を含める。
10. `state.json.construction.bolts[]` に対象 Bolt の `designGate` を作り、実装へ進める粒度なら `status` を `ready` にする。
11. 実装やテスト実行は行わない。

## 禁止事項

- 実装コードやテストコードを変更しない。
- `tasks.md`、`acceptance.md`、`decisions.md` を更新しない。
- Design Gate の evidence は対象 Bolt の `construction-design.md` 以外にしない。
- PR 記録を作らない。
- Spec、`.kiro/specs/**`、`openspec/**` を作らない。

## 次の skill

- 実装実行へ進む場合: `amadeus-construction-implementation-execution`
- Construction 全体を進める場合: `amadeus-construction`
