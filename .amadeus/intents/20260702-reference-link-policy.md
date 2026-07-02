# Amadeus 成果物の参照リンク化方針

## 概要

Amadeus 成果物の参照リンク化方針を定義する。

## 依存

| 依存 | 理由 |
|---|---|
| 20260701-self-development-cycle-stage-workspace | Issue #243 は、自己開発 cycle と workspace 対応記録で作成された Functional Design を観察例にし、Amadeus 成果物の参照リンク化方針を後続 Intent として扱うため。 |

## 目標プロファイル

| フィールド | 値 | 説明 |
|---|---|---|
| goalType | technical | Amadeus 成果物の traceability と参照移動性を改善する技術目標である。 |
| scope | refactor | 既存の成果物契約を保ちながら、参照表記の扱いと検出方針を整理する Intent である。 |
| labels | reference-link, traceability, markdown, validator, self-development | 参照リンク、traceability、Markdown、validator、自己開発を表す。 |

## 目的

Amadeus 成果物に記載する ID、PR番号、Issue番号、ファイルパス、成果物名を、参照先へ移動できる Markdown リンクとして扱う方針を定義する。

この Intent は [Issue #243](https://github.com/amadeus-dlc/amadeus/issues/243) を根拠にする。

Task 生成、実装判断、review、traceability 確認時に、根拠へたどれる状態にする。

## 成功条件

- 参照先が一意に決まる ID、PR番号、Issue番号、ファイルパス、成果物名のリンク化方針が説明できる。
- GitHub 上のファイルパスまたはコード参照を commit SHA 付き permalink として扱う方針が説明できる。
- workspace 内成果物を相対 Markdown リンクとして扱う方針が説明できる。
- template、validator、eval、example、既存成果物のどこへ方針を適用するかが整理されている。
- validator で検出する場合は、未リンク参照の検出対象と対象外が説明できる。
- 対象 Intent の validator が pass する。

## 範囲

含めるもの:

- Amadeus 成果物に現れる参照 ID のリンク化方針。
- PR番号、Issue番号、ファイルパス、成果物名のリンク化方針。
- GitHub 上のファイルパスまたはコード参照に対する commit SHA 付き permalink の扱い。
- workspace 内成果物に対する相対 Markdown リンクの扱い。
- template、validator、eval、example、既存成果物への影響範囲整理。

含めないもの:

- Functional Design の内容そのものの変更。
- Unit と Bolt の再分割。
- Domain Map と Context Map の採用判断変更。
- machine-readable evidence の導入。
- Ideation の段階で要求、ユースケース、Unit、Bolt、Task、実装を作ること。
