# Code Summary — state-pbt (#1980)

上流入力(consumes 全数): business-logic-model.md(処理フローと不変量 — 実装手順の骨格)、business-rules.md(BR 群を実装契約としてそのまま採用)、domain-entities.md(型・生成器のシグネチャ)、performance-design.md(実行時間の合否基準と予算配分)、security-design.md(fail-closed 境界と入力検証の所有)、unit-of-work.md(本 unit の Bolt 境界・規模見積・共通実装制約)、requirements.md(FR/NFR の受け入れ基準 — 出荷条件の導出元)

## 着地

- PR: **#2097**(squash マージ済み、ユーザー承認後に conductor が実行)
- ブランチ側コミット: `513836902 / c1026eca4 / 25f8434f9`

## 実装内容

プロダクション改修ゼロ。state 境界2層(構造フィールド = `serializeMirrorBoundaryReceipts`(:278)⇔`parseMirrorBoundaryReceipts`(:239) / テキストフィールド = `setField`(:5237)⇔`getField`(:5179))へ PBT を追加。`setField` のサイレント no-op は仕様維持(A-2)。

## テスト

t418(P-ST1 正規化後同値 round-trip + P-ST2 5棄却分岐の否定側)/ t419(P-ST3 条件付き round-trip + P-ST4)+ arbitraries 2本

## 検証(実測)

coverage:ci PASS(10128 assertions/0 fail)、patch gate 107/107、5棄却分岐 lcov DA 全 >0(:247=32 / :256=32 / :261=65 / :266=144 / :269=32)、落ちる実証4件(注入→赤→復元 不可分)

## 逸脱の申告と裁定

3件を conductor 執行受理: 行数超過(376 vs 200-280)/ coverage registry・ratchet 再生成(covers ヘッダ由来の機械的必然、162→164 の単調増加)/ helper export 1件追加(BR-ST-4 の検証手段が要求)

## 補足

受理ドメインを実測で精密化 — 行終端子4種(LF/CR/U+2028/U+2029)+ `String.prototype.replace` 置換パターン `$` を除外(AD が生成器側へ委ねた内容の実測充填)。

## レビュー

独立レビュアー(amadeus-architecture-reviewer-agent、builder と別個体)による実装レビューで **READY**。

## 上流入力の参照箇所

- `business-logic-model.md` / `business-rules.md` / `domain-entities.md` — 実装方針・BR 実装契約・型/生成器シグネチャの出典(本書「実装内容」節)
- `performance-design.md` — 実行時間の合否基準(本書「検証(実測)」節の時間実測はこの基準に対する判定)
- `security-design.md` — fail-closed 境界の所有と入力検証の責務分界(本書「実装内容」節の棄却契約)
- `unit-of-work.md` — 本 unit の Bolt 境界・規模見積(逸脱申告の基準)・全 unit 共通の実装制約
- `requirements.md` — FR/NFR の受け入れ基準(本書「検証(実測)」節の出荷条件の導出元)
