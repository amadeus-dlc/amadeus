# Code Generation Plan — revise-model-commit(U1 / #2289)

上流入力: `construction/revise-model-commit/functional-design/business-logic-model.md`(route 依存 compose 手順 1〜9 — 本 plan の正本)/ `business-rules.md`(BR-1〜9)/ `domain-entities.md` / `nfr-design/security-design.md` / `inception/units-generation/unit-of-work.md` U1 / `inception/requirements-analysis/requirements.md` FR-REG-1〜5。

## 実行形態

swarm batch 1(engine の invoke-swarm、autonomy full)で `amadeus-builder-agent` へ委譲。worktree `bolt-revise-model-commit`(base origin/main d21c86acc)。dispatch prompt は FD 手順 1〜9 を TDD 順序(赤ベースライン先行)込みで運んだ。

## 実行した計画(FD 手順の写像)

1. leaf `authoring-routes.ts` 新設(定数のみ・import ゼロ)+ plugin.json tools[] 1行宣言(t3078 強制、条件付き write scope の確定どおり)
2. tla-registration.ts:87 の定義削除 → leaf import
3. TDD Red 先行: fail-open(XR-260820-2289 F1)の現行挙動を赤ベースラインとして固定 → 3面テスト(置換成功 / 置換対象不在 / author-new 同名衝突)
4. `composeRegisteredMap(snapshot, draft, route)` の route 必須引数(default なし)、revise-model = 同名置換(他 entry bytes 保存)、新 kind `revise-target-missing`
5. commit の route 伝搬(precondition (a) 検証済み値の運搬 — parse-don't-validate)
6. provenance last-writer-wins(スキーマ optional 不変)
7. t448 再スコープ + zero-assertion 早期 return の明示失敗化(:74-82 自己参照ブロックは FR-X-4 起票対象で非接触)

## 配送

Bolt 2 PR(#3363)として record checkpoint 同梱で発行(member units 宣言 = revise-model-commit,boundary-three-face)。CI 収束(Coverage base cancel の rerun 1 回のみ・レビュースレッド 0)後、常任承認条件で merge queue 経由スカッシュマージ。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-20T23:57:49Z
- **Iteration:** 1
- **Scope decision:** none

3成果物は FD 9手順・FR-REG-1..5・BR-1..9 へ忠実に trace し、fail-open 赤ベースライン逐語・Red→Green 数列・LOC 算術・census 判別が相互整合。裁量判断2件は FD の明示的許容内とラベル済み、converged kind もマージ前 mint の正規挙動。残余は監査精度 FOLLOW-UP 2件(build-and-test 実測 / 申し送り)と NIT 1件。

### Findings

- FOLLOW-UP | t448 の zero-assertion 早期 return 閉鎖(FR-REG-4/BR-8 の受け入れ基準)が summary に明示確認されない — build-and-test で origin/main の t448 へ当該パターン残存 0 の grep 実測で閉じる
- FOLLOW-UP | code-generation-plan.md がステージ様式のチェックボックス・step→FR trace 形式を欠く(内容は明瞭) — ゲート申し送りへ(swarm 配送の record 事後化に伴う様式差として記録)
- NIT | member units の並び順が plan と CLI report で逆(同一集合・表記のみ)
