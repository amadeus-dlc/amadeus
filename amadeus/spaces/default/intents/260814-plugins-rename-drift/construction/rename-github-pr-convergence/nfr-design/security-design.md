# Security Design — rename-github-pr-convergence

上流入力: `functional-design/business-logic-model.md`(改名手順・決定表)。nfr-requirements 群は本スコープ SKIP のため不在(expected)。

## セキュリティ影響の評価

本 Unit は挙動不変の改名(packaging)であり、新しい入力面・権限面・ネットワーク面を導入しない。評価対象は「同期漏れが生む完全性リスク」のみ:

| リスク | 対策 |
|---|---|
| scope-bindings キー同期漏れ → ステージの無音脱落(検証面の黙示的喪失 = pr-convergence ゲートが構成から消える) | scope-grid 検証テスト(落ちる実証付き — business-logic-model step 5) |
| センサー実行パス未同期 → 投影後のセンサー spawn が旧パスを探し、report-format 検査が無音欠落 | プラグイン自身 2 ファイルの明示的書換え(business-logic-model step 3)+ conformance/e2e green |
| 残存参照の見落とし | 2 述語の機械検査(FR-REN-6、exit code 記録) |

## 非該当項目

- 認証・認可・暗号化・入力検証の変更: なし(改名は識別子とパス文字列の同期のみで、コード挙動・権限・データフローを変えない — 1 行理由)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-14T09:02:18Z
- **Iteration:** 1
- **Scope decision:** none

security-design.mdの完全性リスク評価はbusiness-logic-model.mdのstep3/step5/FR-REN-6・落ちる実証と整合し、不在入力の捏造なく非該当項目にも1行理由がある

### Findings

- None
