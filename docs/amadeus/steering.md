# Steering Layer Reference

## AI-DLC v2 Reference

- [AI-DLC v2 Initialization Stage](https://github.com/awslabs/aidlc-workflows/blob/v2/docs/reference/04-stages/initialization.md)
- [AI-DLC v2 Rule System](https://github.com/awslabs/aidlc-workflows/blob/v2/docs/reference/08-rule-system.md)

## Positioning

Steering は、Amadeus DLC の phase ではない。

Steering は、Ideation、Inception、Construction へ進む前に、workspace 全体で共有する目的、方針、知識、用語、アクター、外部システム、Intent 一覧をそろえる基盤である。
AI-DLC v2 の space memory に相当する。

`amadeus-steering` は、この steering layer を greenfield または brownfield で作成、点検、補修する公開入口である。

Amadeus 自身を対象 workspace にする場合も brownfield として扱う。
自己開発専用の steering mode は作らず、既存資料と既存 `.amadeus/` を点検して、欠けている steering layer 成果物だけを補う。

Steering は、設計判断の管理元ではない。
Domain Map と Context Map は、steering layer の初期化では空の索引として作り、内容は Construction の承認済み成果物（Functional Design の反映候補の採用判断）から更新する。

## Responsibility

`amadeus-steering` は、作業場所の初期文脈と初期化に必要な成果物だけを扱う。

個別 Intent のライフサイクル成果物は作らない。
個別 Intent が必要になった場合は、単一入口 `amadeus` の Intake に渡す。

`amadeus-steering` は、Subdomain、Bounded Context、コンテキスト間依存、詳細な Domain Model、契約の採用判断を作らない。
これらは対象ステージの成果物、判断、追跡、承認に基づいて後続ステージで扱う。

## 成果物

| Artifact | Description |
|---|---|
| `.amadeus/README.md` | Amadeus 成果物の入口 |
| `.amadeus/steering.md` | steering layer のモジュールファイル |
| `.amadeus/steering/**` | 目的、方針、知識、技術、構造、アクター、外部システム |
| `.amadeus/glossary.md` | Amadeus DLC 全体の用語集 |
| `.amadeus/domain-map.md` | 採用済みまたは廃止済みの Subdomain と Bounded Context の索引（初期化時は空） |
| `.amadeus/context-map.md` | 採用済みまたは廃止済みのコンテキスト間依存の索引（初期化時は空） |
| `.amadeus/intents.md` | Intent 一覧（`IndexGenerate.ts` の生成物） |

## 自己開発 bootstrap

自己開発 bootstrap では、初回 `.amadeus/` が採用対象ではなく bootstrap 用になる場合がある。
昇格済み skill で `.amadeus/` を作り直す場合は、作り直し前の `.amadeus/` を `.amadeus-snapshots/previous/` に退避し、退避版は git 管理外で直近1世代だけ保持する。
差分確認の採用判断だけを、採用対象 `.amadeus/` の既存成果物に要約する。
この扱いは `amadeus-steering` の実行モードに依存しない。

## Notes

AI-DLC v2 の Initialization は Intent Record の作成を含む。
Amadeus DLC では、Intent の Birth は単一入口 `amadeus` の Intake に置き、Intent Record の具体化は Ideation の Stage 1.1 Intent Capture & Framing に置く。

そのため、`amadeus-steering` は AI-DLC v2 の Initialization と一対一には対応しない。
Amadeus DLC では、workspace 共有基盤を作る公開入口として扱う。

## Cross-References

- [Lifecycle Overview](lifecycle/overview.md)
- [Ideation Phase Stages](lifecycle/ideation.md)
- [ADR 0002: Intent Phase Directory Layout を採用する](../adr/0002-intent-phase-directory-layout.md)
