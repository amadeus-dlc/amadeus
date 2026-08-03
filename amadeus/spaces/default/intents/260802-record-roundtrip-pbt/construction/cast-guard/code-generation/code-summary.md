# Code Summary — cast-guard (#1980)

上流入力(consumes 全数): business-logic-model.md(処理フローと不変量 — 実装手順の骨格)、business-rules.md(BR 群を実装契約としてそのまま採用)、domain-entities.md(型・生成器のシグネチャ)、performance-design.md(実行時間の合否基準と予算配分)、security-design.md(fail-closed 境界と入力検証の所有)、unit-of-work.md(本 unit の Bolt 境界・規模見積・共通実装制約)、requirements.md(FR/NFR の受け入れ基準 — 出荷条件の導出元)

## 着地

- PR: **#2113**(squash マージ済み、ユーザー承認後に conductor が実行)
- ブランチ側コミット: `2edba38ac / 0c7cadb1e / c7dff1ece`

## 実装内容

`tests/unchecked-cast-guard.ts` を新設 — AST 述語(`ts.isAsExpression` かつ型が `unknown` でない、`JSON.parse` 起点限定、`unwrapExpression` 剥がし)による (file,kind) 単位カウントの shrink-only allowlist ratchet。ci.yml lint ジョブへ callsite-guard 直後の1ステップとして配線。

## テスト

t420 unit(純関数層)/ t420 integration(CLI 面を in-process 駆動)計34 tests + `tests/.unchecked-cast-allowlist.json`

## 検証(実測)

full CI 764 files/0 failed、patch gate 183/183 covered、project gate 90.30%、complexity gate 0、formal-verif baseline 再発行、dist:check/promote:self:check 0

## 逸脱の申告と裁定

なし(TDD スライス1で予測的実装になった点を mutation 検証で補完、unit fixture の loadText 化を申告)

## 補足

初期台帳は base 前進(#2092)後の最終 base で採り直し(33/18 → 36/19)。レビュー指摘(配列 `sites` を空台帳として受理し、台帳故障を「ソース退行」と誤報する反転)を `c7dff1ece` で修正し pre-fix 面切替で非空虚性を実証。潜在債務(多段 `as` 連鎖の過剰カウント)は #2112 へ起票。

## レビュー

独立レビュアー(amadeus-architecture-reviewer-agent、builder と別個体)による実装レビューで **READY**。

## 上流入力の参照箇所

- `business-logic-model.md` / `business-rules.md` / `domain-entities.md` — 実装方針・BR 実装契約・型/生成器シグネチャの出典(本書「実装内容」節)
- `performance-design.md` — 実行時間の合否基準(本書「検証(実測)」節の時間実測はこの基準に対する判定)
- `security-design.md` — fail-closed 境界の所有と入力検証の責務分界(本書「実装内容」節の棄却契約)
- `unit-of-work.md` — 本 unit の Bolt 境界・規模見積(逸脱申告の基準)・全 unit 共通の実装制約
- `requirements.md` — FR/NFR の受け入れ基準(本書「検証(実測)」節の出荷条件の導出元)
