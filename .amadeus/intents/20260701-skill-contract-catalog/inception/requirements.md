# 要求

## 一覧

| 識別子 | 概要 | 状態 | 依存 | 詳細 |
|---|---|---|---|---|
| R001 | Skill Contract の TypeScript 型と catalog を `amadeus-contracts` に追加できる。 | 採用済み | なし | [R001-skill-contract-type-catalog.md](requirements/R001-skill-contract-type-catalog.md) |
| R002 | 初期対象 skill の実行契約を、事前条件、不変条件、事後条件、読み取り境界、書き込み境界、委譲、grilling、feedback 条件として表現できる。 | 採用済み | R001 | [R002-representative-skill-contracts.md](requirements/R002-representative-skill-contracts.md) |
| R003 | Skill Contract から JSON、Markdown、validator 用 TypeScript を生成できる。 | 採用済み | R001, R002 | [R003-generated-skill-contract-artifacts.md](requirements/R003-generated-skill-contract-artifacts.md) |
| R004 | `contracts:generate` と `contracts:check` で Skill Contract 生成物の生成とずれ検出を扱える。 | 採用済み | R003 | [R004-skill-contract-generation-check.md](requirements/R004-skill-contract-generation-check.md) |
| R005 | validator、evaluator、decision review、learning review が Skill Contract を入力として参照できる入口を持つ。 | 採用済み | R003, R004 | [R005-skill-contract-consumer-entry.md](requirements/R005-skill-contract-consumer-entry.md) |

## 依存関係

| 要求 | 依存 | 理由 |
|---|---|---|
| R001 | なし | 型と catalog が、代表 skill 契約と生成物の前提であるため。 |
| R002 | R001 | 代表 skill の契約要素は TypeScript 型で制約する必要があるため。 |
| R003 | R001, R002 | 生成物は catalog の契約内容から導出するため。 |
| R004 | R003 | ずれ検出は生成対象が確定してから確認できるため。 |
| R005 | R003, R004 | consumer は安定した生成物と差分検出を前提に参照するため。 |

## 受け入れ状態

| 要求 | 状態 | 証拠 |
|---|---|---|
| R001 | 採用済み | 未登録 |
| R002 | 採用済み | 未登録 |
| R003 | 採用済み | 未登録 |
| R004 | 採用済み | 未登録 |
| R005 | 採用済み | 未登録 |

## Requirements Review Gate

| 観点 | 状態 | 根拠 |
|---|---|---|
| Ideation scope との対応 | passed | SC-IN-001 から SC-IN-006 までを R001 から R005 に対応付けた。 |
| 対象外の維持 | passed | 全 skill 一括適用、全面再構成、意味検証エンジン化、skill 本文完全生成、手書き契約を要求に含めていない。 |
| 依存関係 | passed | 型、代表契約、生成物、生成確認、consumer 参照入口の順に依存を整理した。 |

## 未確認事項

- なし。
