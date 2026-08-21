# Code Generation Plan — applicability-arms(U4 / #3186)

上流入力: `construction/applicability-arms/functional-design/business-logic-model.md`(段挿入手順 1〜9 + 二層落ちる実証 — 本 plan の正本。2026-08-20 の述語改訂注記込み)/ `business-rules.md`(BR-1〜10)/ `domain-entities.md` / `nfr-design/security-design.md` / `inception/units-generation/unit-of-work.md` U4 / `inception/requirements-analysis/requirements.md` FR-ARM-1〜7 + FR-REG-5 後半。

## 実行形態

swarm batch 2(直列末端 — U1 leaf / U3 撤去断面が origin/main に着地済みの base から fork)で `amadeus-builder-agent` へ委譲。worktree `bolt-applicability-arms`。dispatch prompt は FD の二層落ちる実証(tier (i) = 実 corpus 直接入力・着地順非依存、tier (ii) = 合成 fixture)と leaf 実在確認・非バイパス規律を明記した。

## 実行した計画(FD 手順の写像)

1. leaf 実在確認 → `tla-applicability.ts:302` の定義削除 → leaf import(FR-REG-5 完結 — census 完成形)
2. 新モジュール `tla-applicability-arms.ts`: 値集合 parse / クラスタ述語 / cfg プロパティクラス / vocabulary 自己整合 / defectRecurrence / coverageCheck の純粋述語群
3. judge 後・receipt 前に armCheck + coverageCheck 段挿入(J1..J6・route 語彙・receipt 契約 #3262 非接触)、drift 検出時の impl-only 静落禁止 → revise-model 明示評価強制(閉包は既存 terminal-route receipt のみ)
4. CLI シーム: `--issue-evidence` / `--changed`(plugin→core import 新設なし・GitHub 照会なし)、applicability verb 出力への腕結果露出
5. tier (i) 実 corpus: PrConvergenceGate/BoltPrAttestationGate 陽・MirrorLifecycle 非空虚陰・FormalElection 空虚陰(明示 assert)
6. tier (ii) fixture 両側 + defectRecurrence 両側 + 閾値 0<1<2 両側固定 + fail-closed 6 様式
7. stage 契約 + docs 2面(en/ja): 発火述語 + two-layer 整合文
8. patch coverage 是正(CI 指摘の未カバー 9 行 = fail-closed 枝 + 空 `--changed` usage)を落ちる実証(注入→赤6件→revert 残渣0)つきテストで閉包

## 発火述語の改訂(裁定済み)

FD 文字形が MirrorLifecycle governed 面で自陰例要求と矛盾する偽陽性を実測 → 単調強化形(宣言済み値集合の完全被覆 ∧ 全語彙不在リテラル≥1)へ改訂。選挙 **E-260820-FMC-CG-U4DEV** 2-0、FD 本文へ改訂注記追補済み。

## 配送

Bolt 3 PR(#3374)として record checkpoint 同梱で発行。CI 1周目 = Patch Coverage Gate 赤(9 行)→ テスト追加(5e1fb8ede)→ create 再 mint → CI 緑 → converged:true → 常任承認条件で merge queue 経由スカッシュマージ。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-21T00:06:47Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 の FOLLOW-UP 2件は追補で真に解消(covered=TerminalVerdicts の明示は改訂述語と整合、write scope 追補は U4 宣言リスト不在と所有権非交差を実証確認)。NIT 2件は非対応のまま非ブロッキング、CLI report 非編集。検証中に新規 FOLLOW-UP 1件(domain-entities の述語所在セルが改訂前のまま)を検出 — 次回 FD 接触時に同期。

### Findings

- FOLLOW-UP | domain-entities.md の『値集合クラスタ述語』行が『内部関数』のまま — business-logic-model.md 改訂注記(実装 = tla-applicability-arms.ts)と非同期。次回 FD 接触時に別ファイル名へ更新(ゲート申し送り)
- NIT | plan のチェックボックス様式・fail-closed ラベルの分類は iteration 1 のまま(表記のみ)
