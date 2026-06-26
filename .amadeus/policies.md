# Policies

## 役割

Policies は、Amadeus DLC の成果物を作る時に守る方針、禁止事項、判断基準を扱う。

## 成果物

- 空のプレースホルダーを増やさない。
- 未確認のまま必要な成果物は、未確認であることを本文に書く。
- 任意成果物は、必要性を判断した時点で作る。
- 作らない判断が追跡に影響する場合は、`traceability.md` に `なし` と書く。

## 命名

- ユーザーストーリー一覧は `user-stories.md` とする。
- `stories.md` や `stories/` は使わない。
- Unit 分割に使う Intent 固有の境界は `domain/bounded-contexts.md` に置く。
- Intent 固有のモデル一覧は `domain/bounded-contexts/<bounded-context-id>/models.md` に置く。
- Intent 固有のドメインモデル要素は DDD モジュール単位で `domain/bounded-contexts/<bounded-context-id>/models/<ddd-module-id>-<slug>/model.md` に置く。
- Intent 固有の契約は `domain/bounded-contexts/<bounded-context-id>/contracts.md` に置く。
- Intent 固有の未確定事項は `domain-notes.md` に置く。
- 境界づけられたコンテキストのディレクトリ名は `BCnnn-<slug>` にする。
- DDD モジュールのディレクトリ名は `DMnnn-<slug>` にする。

## ドメインモデル

- DDD モジュールは `DMnnn` の識別子を持つ。
- DDD モジュール一覧は `識別子`、`名前`、`役割`、`詳細` を持つ表で書く。
- 集約は `DAnnn`、エンティティは `DEnnn`、値オブジェクトは `DVOnnn`、ドメインサービスは `DSnnn`、ドメインイベントは `DEVnnn`、リポジトリは `DRnnn`、ファクトリは `DFnnn` の識別子を持つ。
- DDD 要素は種別ごとに表を分け、存在する種別だけを書く。
- DDD 要素の表は `識別子`、`名前`、`役割`、`根拠` を持つ。
- DDD 要素を `traceability.md` から参照する場合は、`BC001/DM001/DE001` のように、境界づけられたコンテキスト ID、DDD モジュール ID、DDD 要素 ID を `/` で連結する。
- `境界` は ID 化せず、`domain/bounded-contexts.md` の `外部境界` 表にある自然言語名で参照する。
- `外部境界` 表は `コンテキスト`、`名前`、`役割`、`根拠` を持つ。

## 契約

- `domain/bounded-contexts/<bounded-context-id>/contracts.md` には、事前条件、不変条件、事後条件を置く。
- 事前条件は `PREnnn`、不変条件は `INVnnn`、事後条件は `POSTnnn` の識別子を使う。
- 契約本文と根拠は空欄にしない。
- 根拠には、少なくとも1つの要求 ID またはユースケース ID を書く。

## 追跡

- Task は Requirement を必ず参照する。
- Task は原則として Use Case を参照する。
- 相互作用がない内部作業では、Use Case を参照しない理由を `traceability.md` に書く。
- Task は User Story を直接参照しない。
- 依存関係は順序や前提を示すが、成果物の内容説明の代わりにはしない。

## 昇格

- Intent 固有の発見が複数 Intent で共有される前提になった場合は、`.amadeus/` 直下の該当成果物へ昇格する。
- 未確定事項は、確定するまで `domain-notes.md` や `terminology-notes.md` に残す。
