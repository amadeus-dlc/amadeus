---
name: amadeus-domain-modeling
description: Amadeus 成果物内の対象ドメイン用語、概念、ドメインモデル、契約を整理する。`.amadeus/glossary.md`、`.amadeus/intents/<intent-id>/domain-notes.md`、`.amadeus/intents/<intent-id>/domain/**`、`.amadeus/domain/**` へ用語やモデルを記録、昇格、補修したい場面では必ず使う。repo 開発用の `CONTEXT.md` や `docs/adr` を更新するための skill ではない。
---

# amadeus-domain-modeling

## 目的

Amadeus 成果物が扱う対象ドメインの用語、概念、ドメインモデル、契約を保守する。

この skill は、Amadeus repo 自体の開発用語ではなく、`.amadeus/` 配下に記録する対象プロダクトのドメイン知識を扱う。
`CONTEXT.md` と `docs/adr` は更新しない。

## 前提

`.amadeus/` が存在することを前提にする。

少なくとも次が存在しない場合は、作業を止めて `amadeus-steering` を案内する。

- `.amadeus/glossary.md`
- `.amadeus/domain/subdomains.md`
- `.amadeus/domain/bounded-contexts.md`
- `.amadeus/intents.md`

Intent 固有の用語、概念、モデル、契約を扱う場合は、対象 Intent ID を確定する。
対象 Intent が存在しない場合は、作業を止めて `amadeus-intent-init` を案内する。

## 入力

- 検証対象の作業ディレクトリ。
- 対象 Intent ID。Intent 固有の候補やモデルを扱う場合は必須。
- 見つかった用語、概念、契約、モデル候補。
- 実行モード。指定がなければ `guided` にする。

## 実行モード

### `guided`

既定モード。
既存の `.amadeus/glossary.md`、対象 Intent の `domain-notes.md`、`.amadeus/domain/**`、対象 Intent の `domain/**` を読み、既に定義済みのことは質問しない。

質問は `/amadeus-grilling` を使って行う。
複数の論点が残っている場合でも、一度に並べず一問ずつ質問する。
質問総数は最大5つにする。

質問候補は次である。

- その語は全 Intent で共有する確定用語か、対象 Intent 内の候補か。
- 既存用語と同じ意味か、別概念か。
- その概念は、サブドメイン、境界づけられたコンテキスト、DDD モジュール、集約、エンティティ、値オブジェクト、ドメインサービス、ドメインイベント、契約のどれか。
- どの BC、DDD モジュール、要求、ユースケース、Unit、Bolt を根拠にするか。
- 全体モデルへ昇格するか、Intent 固有の記録に留めるか。

質問した場合は、その場で成果物を更新せず、ユーザーの回答を待つ。
回答を受け取ってから、該当する Amadeus 成果物だけを更新する。

### `capture`

ユーザーが明示した場合、または意味が未確定の場合に使う。
見つかった用語や概念を、対象 Intent の `domain-notes.md` に候補として記録する。

確定用語として `.amadeus/glossary.md` に追加しない。
モデル要素として `domain/**` に追加しない。

### `promote-glossary`

ユーザーが明示し、意味が確定している場合だけ使う。
Intent 内候補または会話で確定した用語を `.amadeus/glossary.md` に追加する。

対象 Intent の `domain-notes.md` がある場合は、昇格した事実と反映先を記録する。

### `promote-model`

ユーザーが明示し、BC、DDD モジュール、モデル要素、契約の位置づけが確定している場合だけ使う。
対象 Intent の `domain/**` を更新する。

全体モデルへも反映する場合は、ユーザーが明示した場合だけ `.amadeus/domain/**` を更新する。

## 更新先の選び方

| 見つかったもの | 更新先 | 条件 |
|---|---|---|
| 未確定の語、概念、問い | `.amadeus/intents/<intent-id>/domain-notes.md` | 意味、境界、採用可否がまだ確定していない |
| 全 Intent で共有する確定用語 | `.amadeus/glossary.md` | 意味が確定し、複数 Intent で使う可能性がある |
| Intent 固有のサブドメイン、BC、モデル、契約 | `.amadeus/intents/<intent-id>/domain/**` | 対象 Intent の要求、ユースケース、Unit、Bolt の根拠がある |
| Intent 固有モデルの追跡 | `.amadeus/intents/<intent-id>/traceability.md` | モデル要素や契約の ID を追加、削除、変更し、追跡表に影響する |
| 全体として採用済みのサブドメイン、BC、モデル、契約 | `.amadeus/domain/**` | Intent 側で確定し、全体モデルへ昇格する判断がある |

`domain-notes.md` は候補と履歴の入口である。
`.amadeus/glossary.md` は確定した共有用語の置き場である。
Intent 側の `domain/**` は、その Intent で使うモデルと契約の記録である。
対象 Intent の `traceability.md` は、モデル要素や契約 ID の参照整合を保つために必要な場合だけ更新する。
トップレベルの `.amadeus/domain/**` は、全体として採用済みの最新モデルである。

## `domain-notes.md`

対象 Intent に `domain-notes.md` がない場合は、必要に応じて作る。

最低構造は次である。

- `未確定事項`
- `課題`
- `ドメインモデルへの昇格候補`
- `反映済み`

候補を追加する場合は、次を含める。

- 用語または概念。
- 現時点の意味。
- 未確定の理由。
- 確認すべき問い。
- 参照した成果物。

## `.amadeus/glossary.md`

確定用語だけを追加する。
未確定語、仮称、実装詳細、検討メモは追加しない。

既存用語と意味が近い場合は、追加前に既存用語へ統合できるか確認する。
避ける語や禁止ワードに抵触する場合は、その語を追加せず、代替語を `/amadeus-grilling` で確認する。

## DDD モデル要素

確定済みの識別子は次である。

| 種別 | 識別子 |
|---|---|
| DDD モジュール | `DMnnn` |
| 集約 | `DAnnn` |
| エンティティ | `DEnnn` |
| 値オブジェクト | `DVOnnn` |
| ドメインサービス | `DSnnn` |
| ドメインイベント | `DEVnnn` |

リポジトリ、ファクトリなど、識別子規則が未確定の種別は推測で作らない。
必要な場合は `domain-notes.md` の候補または未確定事項に記録し、識別子規則を確認する。

## 契約

契約は、事前条件、不変条件、事後条件として扱う。

識別子は次である。

| 種別 | 識別子 |
|---|---|
| 事前条件 | `PREnnn` |
| 不変条件 | `INVnnn` |
| 事後条件 | `POSTnnn` |

契約を追加する場合は、根拠として要求 ID、ユースケース ID、Unit ID、Bolt ID のいずれかを少なくとも1つ記録する。
根拠がない場合は契約へ昇格せず、`domain-notes.md` に候補として残す。

## 手順

1. 作業ディレクトリを確認する。
2. `.amadeus/` と必須成果物の有無を確認する。
3. 対象 Intent ID が必要か判断する。
4. 既存の `.amadeus/glossary.md`、対象 Intent の `domain-notes.md`、`.amadeus/domain/**`、対象 Intent の `domain/**` を読む。
5. 見つかった語や概念が、既存用語と同じか別概念か確認する。
6. 意味や更新先が未確定なら `/amadeus-grilling` で一問ずつ確認する。
7. 未確定なら `domain-notes.md` に記録する。
8. 共有用語として確定したら `.amadeus/glossary.md` に追加する。
9. モデルまたは契約として確定したら、対象 Intent の `domain/**` に反映する。
10. モデル要素や契約 ID が `traceability.md` に出る場合は、対象 Intent の `traceability.md` も整合させる。
11. 全体モデルへの昇格が明示された場合だけ `.amadeus/domain/**` に反映する。
12. 昇格済みの `amadeus-execution-validator` が使える場合は、対象 Intent ID を指定して検証する。

## 禁止事項

- `CONTEXT.md` を更新しない。
- `docs/adr/**` を作成または更新しない。
- repo の開発用語と、`.amadeus/` が扱う対象ドメイン用語を混ぜない。
- 未確定語を `.amadeus/glossary.md` に追加しない。
- BC、DDD モジュール、モデル要素、契約の識別子を推測で作らない。
- リポジトリ、ファクトリなど未確定の識別子規則を作らない。
- 対象 Intent ID が必要な更新を、Intent ID なしで行わない。
- `.amadeus/intents.md` に新しい Intent を追加しない。
- `requirements.md`、`acceptance.md`、`user-stories.md`、`use-cases.md`、`units.md`、`bolts.md` を作らない。
- repo の開発用文書や開発用スクリプトを実行時参照として書かない。

## 次の skill

- steering layer が不足している場合: `amadeus-steering`
- Intent の入れ物がない場合: `amadeus-intent-init`
- Ideation 成果物が必要な場合: `amadeus-intent-ideation`
- 成果物の構造を検証する場合: `amadeus-execution-validator`
