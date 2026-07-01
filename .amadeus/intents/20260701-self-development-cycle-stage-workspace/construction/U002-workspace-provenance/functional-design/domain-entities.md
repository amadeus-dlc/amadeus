# Domain Entities

## 目的

workspace provenance に関係する Domain Entity を、Construction の設計判断として記録する。

Functional Design は詳細な Domain Model と Intent Contracts の管理元である。

## Domain Entity

| 識別子 | 名前 | 責務 | 関連 |
|---|---|---|---|
| DE001 | Workspace Correspondence | build workspace、host environment、target workspace、target artifacts の対応を表す。 | Tool Provenance、Verification Evidence |
| DE002 | Tool Provenance | 利用した skill、validator、開発用スクリプトの由来を表す。 | Workspace Correspondence |
| DE003 | Verification Evidence | validator と標準検証の結果を表す。 | Workspace Correspondence、Stage Adoption Decision |

## 関係

- Workspace Correspondence は Tool Provenance と Verification Evidence を持つ。
- Verification Evidence は stage0 採用判断の証拠候補になる。
- Tool Provenance は、実際に利用した skill、validator、開発用スクリプトを対象にする。

## Domain Map と Context Map への反映候補

| 対象 | 種別 | 候補内容 | 承認後の扱い | 根拠 |
|---|---|---|---|---|
| BC001 自己開発運用 | Domain Map | workspace provenance を BC001 の責務として維持する。 | 既存 adopted 行を維持する。 | [D002](../../../inception/decisions/D002-bc001-self-development-governance.md) |

## 未確認事項

- Context Map に追加する Upstream Context または Downstream Context は、この Unit では見つかっていない。
