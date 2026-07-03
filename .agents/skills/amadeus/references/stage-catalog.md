# Stage Catalog

`amadeus` 入口がステージ解決に使う対応表である。

## ステージと skill の対応

ステージはこの表の順序で解決する。

| Stage | Phase | Slug | Execution | Skill |
|---|---|---|---|---|
| 0.1 | initialization | workspace-scaffold | ALWAYS | `amadeus`（入口が直接実行する） |
| 0.2 | initialization | workspace-detection | ALWAYS | `amadeus`（入口が直接実行する） |
| 0.3 | initialization | state-init | ALWAYS | `amadeus`（入口が直接実行する） |
| 1.1 | ideation | intent-capture | ALWAYS | `amadeus-ideation-intent-capture` |
| 1.2 | ideation | market-research | CONDITIONAL | `amadeus-ideation-market-research` |
| 1.3 | ideation | feasibility | CONDITIONAL | `amadeus-ideation-feasibility` |
| 1.4 | ideation | scope-definition | ALWAYS | `amadeus-ideation-scope-definition` |
| 1.5 | ideation | team-formation | CONDITIONAL | `amadeus-ideation-team-formation` |
| 1.6 | ideation | rough-mockups | CONDITIONAL | `amadeus-ideation-rough-mockups` |
| 1.7 | ideation | approval-handoff | ALWAYS | `amadeus-ideation-approval-handoff` |
| 2.1 | inception | reverse-engineering | CONDITIONAL | `amadeus-inception-reverse-engineering` |
| 2.2 | inception | practices-discovery | CONDITIONAL | `amadeus-inception-practices-discovery` |
| 2.3 | inception | requirements-analysis | ALWAYS | `amadeus-inception-requirements-analysis` |
| 2.4 | inception | user-stories | CONDITIONAL | `amadeus-inception-user-stories` |
| 2.5 | inception | refined-mockups | CONDITIONAL | `amadeus-inception-refined-mockups` |
| 2.6 | inception | application-design | CONDITIONAL | `amadeus-inception-application-design` |
| 2.7 | inception | units-generation | ALWAYS | `amadeus-inception-units-generation` |
| 2.8 | inception | delivery-planning | ALWAYS | `amadeus-inception-delivery-planning` |
| 3.1 | construction | functional-design | CONDITIONAL | `amadeus-construction-functional-design` |
| 3.2 | construction | nfr-requirements | CONDITIONAL | `amadeus-construction-nfr-requirements` |
| 3.3 | construction | nfr-design | CONDITIONAL | `amadeus-construction-nfr-design` |
| 3.4 | construction | infrastructure-design | CONDITIONAL | `amadeus-construction-infrastructure-design` |
| 3.5 | construction | code-generation | ALWAYS | `amadeus-construction-code-generation` |
| 3.6 | construction | build-and-test | ALWAYS | `amadeus-construction-build-and-test` |
| 3.7 | construction | ci-pipeline | CONDITIONAL | `amadeus-construction-ci-pipeline` |

`ALWAYS` は、scope が実行対象にする場合に必ず実行する。
`CONDITIONAL` は、scope が実行対象にし、かつステージの Condition が真の場合だけ実行する。

## Scope とステージの対応

EXECUTE はその scope で実行対象にすることを表す。
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

## Depth の既定値

| Scope | Depth |
|---|---|
| enterprise | Comprehensive |
| feature、mvp、infra、workshop | Standard |
| poc、bugfix、refactor、security-patch | Minimal |

workshop はテスト戦略だけを Minimal に上書きする。

## 縮退時の入力代替

必須入力の供給ステージが `skipped` の場合は、次の代替に従い、使った代替を成果物に記録する。

| skipped の供給ステージ | 代替規則 |
|---|---|
| 2.3 requirements-analysis（security-patch の場合） | 3.2 nfr-requirements が要求の捕捉を兼ね、`security-requirements.md` を要求の定義元にする。 |
| 2.6 application-design | reverse-engineering の `architecture.md` と `component-inventory.md` を構造の材料にする。greenfield では `requirements.md` から直接判断する。 |
| 2.7 units-generation | Intent 全体を単一の暗黙 Unit として扱う。Unit の記述は `requirements.md` と Intent のモジュールファイルで代替する。 |
| 2.8 delivery-planning | Intent 全体を単一の暗黙 Bolt として扱う。walking skeleton ゲートはその Bolt に適用する。 |
| 3.1 functional-design | `requirements.md` と reverse-engineering の成果物を設計の材料にする。 |
| 3.2 nfr-requirements | 3.3 nfr-design と 3.4 infrastructure-design は実行しない。 |

暗黙 Unit と暗黙 Bolt は独自の成果物を作らず、`aidlc-state.md` と audit の記録では識別子として `implicit` を使う。
