# Domain Entities

## 目的

stage 採用判断に関係する Domain Entity を、Construction の設計判断として記録する。

Functional Design は詳細な Domain Model と Intent Contracts の管理元である。

## Domain Entity

| 識別子 | 名前 | 責務 | 関連 |
|---|---|---|---|
| DE001 | Stage | stage0、stage1、stage2 の区分を表す。 | Stage Adoption Decision |
| DE002 | Stage Adoption Condition | stage2 を次回 stage0 として扱うための条件を表す。 | Stage、Stage Adoption Decision |
| DE003 | Stage Adoption Decision | Maintainer が stage2 を次回 stage0 として採用するかを表す。 | Stage、Stage Adoption Condition |

## 関係

- Stage Adoption Decision は Stage Adoption Condition を根拠にする。
- Stage Adoption Condition は、merge 状態、基準 commit、build workspace の参照 commit、検証結果、人間判断を含む。
- Stage は Amadeus DLC 自己開発の運用語彙であり、個別 Intent の Domain Model ではない。

## Domain Map と Context Map への反映候補

| 対象 | 種別 | 候補内容 | 承認後の扱い | 根拠 |
|---|---|---|---|---|
| BC001 自己開発運用 | Domain Map | stage 採用判断を BC001 の責務として維持する。 | 既存 adopted 行を維持する。 | [D002](../../../inception/decisions/D002-bc001-self-development-governance.md) |

## 未確認事項

- Context Map に追加する Upstream Context または Downstream Context は、この Unit では見つかっていない。
