# Code Summary — revise-model-commit(U1 / #2289)

上流入力: `code-generation-plan.md` / FD 3 成果物 / `nfr-design/security-design.md` / `unit-of-work.md` U1 / `requirements.md` FR-REG-1〜5。数値は builder 完了報告と CI ログからの転記(測定 ref = worktree commit `ce6cf1601`、着地 = PR #3363 squash `e28ed4cf3`、2026-08-20T21:00:35Z マージ)。

## 実装実測

- **規模**: 4 ファイル、+124 / −12(見積 実装 120〜180 + テスト 250〜350 に対し、leaf 6 行 + registration +45/−7 + t448 +72/−5 — テスト行は既存ファイル拡張のため下振れ)
- **新設**: `authoring-routes.ts`(6 行、import ゼロ)、plugin.json tools[] 1 行(alphabetical 位置、advisories[] 非接触)
- **fail-open 赤ベースライン(逐語)**: 2引数 compose に revise-model + 不在名 draft → `composed.ok === true` かつ models = ["Absent","Mirror"](append された)— 1 pass / 4 expect で現行欠陥を実測固定
- **Red→Green**: 目標 assertion 記述後 exit 1(26 pass / 2 fail — 面 (a)(b) が期待どおり赤)+ typecheck exit 2 → 実装後 exit 0(28 pass / 59 expect)
- **t3078 落ちる実証**: leaf 宣言行を除去 → exit 1(1 fail)→ 復元 → exit 0、残渣ゼロ(git diff は意図した +1 行のみ)
- **census(BR-1)**: 定義(`= new Set(`)は leaf :6 と tla-applicability.ts:302(U4 所有で残存 — 期待どおり)のみ。tla-registration.ts は import 行 + 消費のみ
- **検証**: typecheck 0 / lint 0 / t448 28 pass / t3078 0 / tla 系 unit 10 ファイル 183 pass / integration 6 ファイル 119 pass / registry --check 0(regen 差分なし)
- **判断記録**: AuthoringRoute 型は tla-registration.ts 側に配置(FD の実装裁量内)、route は precondition 証明付き単一 assertion で運搬(不変 entity への非接触保存)

## 逸脱

なし(builder 申告の判断2件はいずれも FD の明示的裁量内 — code-generation-plan.md 参照)。

## 配送・クローズ

PR #3363(converged:true・CLEAN・unresolved 0 実測、provenance は member units 宣言込みで整合)→ 常任承認条件でマージ → Issue #2289 クローズ(着地面実読: leaf 実在 + revise-target-missing 2 hit)。pr-convergence-report.md(kind: converged)同梱。FR-REG-6 の改訂裁定・旧 FD への改訂ポインタは FD ステージで記録済み。
