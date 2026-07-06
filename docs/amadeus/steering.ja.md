# Space Reference（Space 契約）

## AI-DLC v2 Reference

- [AI-DLC v2 Initialization Stage](https://github.com/awslabs/aidlc-workflows/blob/v2/docs/reference/04-stages/initialization.md)
- [AI-DLC v2 Rule System](https://github.com/awslabs/aidlc-workflows/blob/v2/docs/reference/08-rule-system.md)

## Positioning

Space は、Amadeus DLC の phase ではない。

Space は、Ideation、Inception、Construction へ進む前に、workspace 全体で共有する目的、方針、知識、用語、アクター、外部システム、Intent 一覧をそろえる基盤である。
AI-DLC v2 の space memory に相当する。

Space の足場作りはエンジンが持つ。workspace-scaffold（Initialization Stage 0.1）がこの Space（`amadeus/spaces/<space>/`）を greenfield または brownfield で作成し、`space` / `space-create` utility verb が Space の一覧、切替、作成を担う。

Amadeus 自身を対象 workspace にする場合も brownfield として扱う。
自己開発専用の steering mode は作らず、エンジンが既存資料と既存 `amadeus/` を点検して、欠けている Space 成果物だけを補う。

Space は、設計判断の管理元ではない。
Domain Map と Context Map は、Space の初期化では空の索引として作り、内容は Construction の承認済み成果物（Functional Design の反映候補の採用判断）から更新する。

## Responsibility

Space の足場作りは、作業場所の初期文脈と初期化に必要な成果物だけを扱う。

個別 Intent のライフサイクル成果物は作らない。
個別 Intent が必要になった場合は、単一入口 `amadeus` の Intake に渡す。

Space の足場作りは、Subdomain、Bounded Context、コンテキスト間依存、詳細な Domain Model、契約の採用判断を作らない。
これらは対象ステージの成果物、判断、追跡、承認に基づいて後続ステージで扱う。

## 成果物

| Artifact | Description |
|---|---|
| `memory/org.md` | Amadeus DLC の組織既定 |
| `memory/team.md` | チームの働き方（org.md を上書き） |
| `memory/project.md` | プロジェクト固有の判断材料（team.md を上書き） |
| `memory/phases/` | phase 別の補足（任意） |
| `memory/templates/` | プロジェクト固有のテンプレート上書き（任意） |
| `knowledge/glossary.md` | Amadeus DLC 全体の用語集 |
| `knowledge/actors.md` | アクター一覧 |
| `knowledge/external-systems.md` | 外部システム一覧 |
| `knowledge/background.md` | 背景、前提、未確認事項 |
| `knowledge/domain-map.md` | 採用済みまたは廃止済みの Subdomain と Bounded Context の索引（初期化時は空） |
| `knowledge/context-map.md` | 採用済みまたは廃止済みのコンテキスト間依存の索引（初期化時は空） |
| `knowledge/event-storming/` | Intent 作成前の Event Storming |
| `codekb/<repo>/` | コードベース知識（v2 の codekb）。brownfield で作る任意ディレクトリ |
| `intents/intents.json` | Intent registry（正準台帳）。初期化時は空の `[]`。人間向け一覧は必要時に都度生成する（`intents.md` 索引は廃止 — GD009） |
| `intents/active-intent` | カーソル（gitignore）。値は Initialization が書く |
| `intents/<dirName>/`（record） | 個別 Intent の成果物。Initialization が作る |

## 自己開発 bootstrap

自己開発 bootstrap では、初回 `amadeus/` が採用対象ではなく bootstrap 用になる場合がある。
昇格済み skill で Space を作り直す場合は、作り直し前の Space を `.amadeus-snapshots/previous/` に退避し、退避版は git 管理外で直近1世代だけ保持する。
差分確認の採用判断だけを、採用対象 Space の既存成果物（自己開発 cycle 全体なら `knowledge/background.md`、特定 Intent の再生成なら対象 phase の `decisions.md`）に要約する。
この扱いは、Space の足場作りの実行のされ方に依存しない。

## Notes

AI-DLC v2 の Initialization（Stage 0.1〜0.3）は、単一入口 `amadeus` が Birth 承認の直後に直接実行し、Intent record の scaffold と `amadeus-state.md` を作る。
Intent Record の内容の具体化は、続く Ideation の Stage 1.1 Intent Capture & Framing に置く。

Space の足場作りは、個別 Intent の record ではなく Space（`amadeus/spaces/<space>/`）の共有基盤を作る点で、Initialization の個別 Intent 向けの処理とは範囲が異なる。
Space の `memory/`、`knowledge/`、`intents/` の器は Space の足場作りが用意し、個別 Intent の record は Initialization が作る。

## Cross-References

- [Lifecycle Overview](lifecycle/overview.md)
- [Ideation Phase Stages](lifecycle/ideation.md)
- [ADR 0002: Intent Phase Directory Layout を採用する](../adr/0002-intent-phase-directory-layout.md)
- [Extension Guide](extension-guide.ja.md) — `memory/`、`knowledge/`、`codekb/` などの拡張ポイントの使い分けと人間編集の可否
