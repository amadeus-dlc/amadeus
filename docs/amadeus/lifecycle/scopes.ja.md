# Scope and Depth Reference（Scope と Depth リファレンス）

## AI-DLC v2 Reference

- [AI-DLC v2 Scopes and Depth](https://github.com/awslabs/aidlc-workflows/blob/v2/docs/guide/05-scopes-and-depth.md)
- [AI-DLC v2 Scope Definitions](https://github.com/awslabs/aidlc-workflows/tree/v2/core/scopes)

## Inputs

本文書はステージ単位の文書ではないため、ステージ契約の Inputs 表（[overview.md](overview.ja.md) の「ステージ契約の I/O 記法」）は適用しない。
本文書が入力として参照する契約は、エンジンの scope 定義（`.agents/amadeus/scopes/amadeus-<scope>.md`。1 scope 1 ファイル）と、各 stage 定義の実行条件（`execution` / `condition`）である。

## Scope 適応

**Scope 適応**：Intent の性質に応じて、実行するステージ集合と depth を縮退させる仕組みである。

Scope 適応は、小さい作業にフル儀式を課さないための中核契約である。
小ささ自体は害ではなく、小さい作業にすべてのステージが走ることが害である、という判断に基づく。

scope は Intake がキーワードから推定し、birth 提案で人間が確認する。
scope は Intent の `amadeus-state.md` に記録し、ステージ解決の入力にする。

## Scope 一覧

v2 の 9 scope をそのまま採用し、Amadeus 独自の追加として `pdm` を持つ（計 10 scope）。
`pdm` は上流に存在しないため、上流パリティ検査では例外として宣言している（[Issue #429](https://github.com/amadeus-dlc/amadeus/issues/429)）。

| Scope | Depth | キーワード | 説明 |
|---|---|---|---|
| enterprise | Comprehensive | なし（明示指定のみ） | 規制対応や監査証跡が必要な作業。全ステージを実行する。 |
| feature | Standard | なし（既定値） | 新機能の既定 scope。全ステージを実行対象にし、実行条件で絞る。 |
| mvp | Standard | mvp, minimum viable | 中核を早く出す。market-research、team-formation、approval-handoff を省く。 |
| poc | Minimal | proof of concept, prototype, poc, spike | 実現可能性の証明。動くコードへの最短経路だけ実行する。 |
| bugfix | Minimal | fix, bug, broken | 既存コードの特定バグ修正。理解、要求、修正、検証だけ実行する。 |
| refactor | Minimal | refactor, clean up, simplify | 振る舞いを保存する構造変更。bugfix に Functional Design を加える。 |
| infra | Standard | infrastructure, deploy, infra | インフラ変更。NFR 系と infrastructure-design、ci-pipeline に寄る。 |
| security-patch | Minimal | security, CVE, vulnerability, patch | 脆弱性対応。理解、セキュリティ要求、修正、検証を通す。 |
| workshop | Standard | workshop, lab, training | ファシリテーター主導の学習セッション。Ideation を省き、テスト水準を Minimal にする。 |
| pdm | Standard | pdm, prd, product-discovery | 企画、調査、要求定義で完結する PdM の Intent。Ideation 全体と Inception の要求系（requirements-analysis、user-stories、refined-mockups）を実行し、Construction 以降を持たない。終点成果物は PRD 一式（intent-statement、competitive-analysis、build-vs-buy、scope-document、initiative-brief、requirements、stories、personas、wireframes）。 |

Amadeus は Operation phase を対象外にするため、v2 で Operation ステージを含む scope（enterprise、feature、infra、security-patch、workshop）は、その分だけステージ集合が狭くなる。
security-patch の deployment 系ステージと infra の provisioning 系ステージは Amadeus では実行対象がなく、必要な場合は Intent の成果物にデプロイ手順を記録して人間に委ねる。

## Scope 推定規則

Intake は次の規則で scope を推定する。

- キーワードは単語境界で一致させる。部分文字列では発火させない。
- 一致しない入力、またはテーマ記述とみなせる長さの入力は `feature` を既定にする。
- 推定した scope は birth 提案に明示し、人間が訂正できるようにする。

日本語キーワードの対応表は未確定であり、入口 skill の実装時に確定する。

## Depth

**Depth**：ステージ内の作業の深さを表す 3 段階の設定である。

| Depth | 質問量の目安 | テスト戦略 |
|---|---|---|
| Minimal | 2〜4 問 | Nyquist 方式。要求 1 件につきテスト 1 件と、コンポーネントごとの happy-path を下限にする。 |
| Standard | 5〜8 問 | コンポーネント境界を検証する標準方式。 |
| Comprehensive | 8〜12 問以上 | エッジケース、コンプライアンス、失敗モードまで能動的に掘る。 |

depth の既定値は scope が決める。
workshop は depth と独立に、テスト戦略だけを Minimal に上書きする。
人間はステージゲートで depth の変更を要求できる。

## Scope とステージの対応表

EXECUTE はその scope でステージを実行対象にすることを表す。
実行対象のうち CONDITIONAL のステージは、さらに各ステージの Condition で実行可否を判定する。
空欄は SKIP を表す。

| Stage | enterprise | feature | mvp | poc | bugfix | refactor | infra | security-patch | workshop |
|---|---|---|---|---|---|---|---|---|---|
| 0.1 workspace-scaffold | EXECUTE | EXECUTE | EXECUTE | EXECUTE | EXECUTE | EXECUTE | EXECUTE | EXECUTE | EXECUTE |
| 0.2 workspace-detection | EXECUTE | EXECUTE | EXECUTE | EXECUTE | EXECUTE | EXECUTE | EXECUTE | EXECUTE | EXECUTE |
| 0.3 state-init | EXECUTE | EXECUTE | EXECUTE | EXECUTE | EXECUTE | EXECUTE | EXECUTE | EXECUTE | EXECUTE |
| 1.1 intent-capture | EXECUTE | EXECUTE | EXECUTE | EXECUTE | | | | | |
| 1.2 market-research | EXECUTE | EXECUTE | | | | | | | |
| 1.3 feasibility | EXECUTE | EXECUTE | EXECUTE | | | | | | |
| 1.4 scope-definition | EXECUTE | EXECUTE | EXECUTE | | | | | | |
| 1.5 team-formation | EXECUTE | EXECUTE | | | | | | | |
| 1.6 rough-mockups | EXECUTE | EXECUTE | EXECUTE | | | | | | |
| 1.7 approval-handoff | EXECUTE | EXECUTE | | | | | | | |
| 2.1 reverse-engineering | EXECUTE | EXECUTE | EXECUTE | EXECUTE | EXECUTE | EXECUTE | | EXECUTE | EXECUTE |
| 2.2 practices-discovery | EXECUTE | EXECUTE | EXECUTE | | | | EXECUTE | | EXECUTE |
| 2.3 requirements-analysis | EXECUTE | EXECUTE | EXECUTE | EXECUTE | EXECUTE | EXECUTE | EXECUTE | | EXECUTE |
| 2.4 user-stories | EXECUTE | EXECUTE | EXECUTE | | | | | | EXECUTE |
| 2.5 refined-mockups | EXECUTE | EXECUTE | EXECUTE | | | | | | EXECUTE |
| 2.6 application-design | EXECUTE | EXECUTE | EXECUTE | | | | | | EXECUTE |
| 2.7 units-generation | EXECUTE | EXECUTE | EXECUTE | | | | | | EXECUTE |
| 2.8 delivery-planning | EXECUTE | EXECUTE | EXECUTE | | | | | | EXECUTE |
| 3.1 functional-design | EXECUTE | EXECUTE | EXECUTE | | | EXECUTE | | | EXECUTE |
| 3.2 nfr-requirements | EXECUTE | EXECUTE | EXECUTE | | | | EXECUTE | EXECUTE | EXECUTE |
| 3.3 nfr-design | EXECUTE | EXECUTE | EXECUTE | | | | EXECUTE | | EXECUTE |
| 3.4 infrastructure-design | EXECUTE | EXECUTE | EXECUTE | | | | EXECUTE | | EXECUTE |
| 3.5 code-generation | EXECUTE | EXECUTE | EXECUTE | EXECUTE | EXECUTE | EXECUTE | | EXECUTE | EXECUTE |
| 3.6 build-and-test | EXECUTE | EXECUTE | EXECUTE | EXECUTE | EXECUTE | EXECUTE | | EXECUTE | EXECUTE |
| 3.7 ci-pipeline | EXECUTE | EXECUTE | EXECUTE | | | | EXECUTE | | EXECUTE |

この表は v2 の各ステージ定義の `scopes:` 宣言から転記した。
Initialization 3 ステージは全 scope が実行対象であり、この表に含める。
v2 のコンパイル済み scope grid（bugfix 7/32、refactor 8/32、poc 8/32 など）との差は、Amadeus が実行対象にしない operation 7 ステージの分だけである。

## 縮退時の入力代替

各ステージの入力表の「必須」は、供給ステージが実行された場合の関係を表す。

供給ステージが scope または Condition により `skipped` の場合、後続ステージは次の代替規則に従い、使った代替を自分の成果物に記録する。

| skipped の供給ステージ | 代替規則 |
|---|---|
| 2.3 Requirements Analysis（security-patch の場合） | 3.2 NFR Requirements が要求の捕捉を兼ね、`security-requirements.md` を要求の定義元にする。 |
| 2.6 Application Design | Reverse Engineering の `architecture.md` と `component-inventory.md` を構造の材料にする。greenfield では `requirements.md` から直接 Unit 境界を判断する。 |
| 2.7 Units Generation | Intent 全体を単一の暗黙 Unit として扱う。Unit の記述は `requirements.md` で代替する。 |
| 2.8 Delivery Planning | Intent 全体を単一の暗黙 Bolt として扱う。walking skeleton ゲートはその Bolt に適用する。 |
| 3.1 Functional Design | `requirements.md` と Reverse Engineering の成果物を設計の材料にする。 |
| 3.2 NFR Requirements | 3.3 NFR Design と 3.4 Infrastructure Design は実行しない（3.3 の Condition が保証する）。 |

暗黙 Unit と暗黙 Bolt は独自の成果物を作らない。
`amadeus-state.md` と audit の記録では識別子として `implicit` を使う。
Unit 単位ステージ（3.1〜3.5）は、暗黙 Unit に対して Intent 全体を対象に 1 回実行する。

## 再 scope

poc で実現可能性が確認できた場合は、同じ Intent を続けずに feature または mvp へ再 scope し、本実装のライフサイクルを回す。
mvp が本番運用へ進む場合は、feature または enterprise へ再 scope する。

再 scope は新しい Intent の birth として扱い、Intake の確認を通す。
元の Intent の成果物は、新しい Intent の入力として参照する。
