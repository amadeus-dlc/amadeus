# Business Rules — U1 fmc-retirement

上流入力: `business-logic-model.md`、`inception/requirements-analysis/requirements.md`(NFR-1〜4)、`inception/application-design/components.md`・`component-methods.md`・`services.md`(ADR-1〜6・配送制約)、`inception/units-generation/unit-of-work.md`・`unit-of-work-story-map.md`(U1 write scope・ストーリー trace)。

## 配送・検証規律

- **BR-1(green-throughout)**: どの中間コミットでも targeted 群(t341・B1・A2 温存・O-5 代替)を赤にしない。フルスイート合否はリモート CI 正本(push-first)
- **BR-2(非接触)**: `plugins/github-pr-convergence/**` へ書き込まない。コア advisory 機構(`amadeus-advisory-choice.ts` / `amadeus-advisory-declaration.ts`)は fixture 再配線に伴う import 変更以外変更しない(O-1 温存裁定)
- **BR-3(no-compat)**: 互換シム・スタブ・アーカイブ dir・`if:false` を作らない。削除は削除(org.md Forbidden)

## テスト規律

- **BR-4(TDD 適用判定 — §12a NIT の明確化)**: O-5 代替 2 本は「被覆源の付け替え」だが、**新規テストファイルの追加**であり既存 seam への失敗テスト先行(Red = 対象関数の欠陥注入でなく、テスト自体が最初に正しく赤くなる assert を書いてから緑化)を適用する。fixture 差し替え(B1/A2)と B2 の参照除去は振る舞い不変のリファクタリングとして適用外 — 前後 green(characterization)で担保。**t2415 ×2** は正本(RE ステージ本文)の仕様変更に追随する pin テストの期待値更新であり、Red は「正本を先に更新すると旧 pin が赤くなる」ことで実測される(正本+テストは同一コミット — ADR-5。テスト単独の先行 Red は正本未変更では構成不能なため、この形を TDD 既定の適用形とする)
- **BR-5(台帳整合)**: regen は build 後(c5-regen-needs-build)。patch-allowlist は行シフト時 createSemanticSelector で再アンカー(c5-ratchet-census-at-final-base)
- **BR-6(assertion 保全)**: B1/t341 の差し替え diff に assertion 削除 0(FR-TEST-3 (b))。skip 化・期待値の弱体化も同罪
## 表現・記録・引き継ぎ規律

- **BR-7(表現制約)**: docs 休眠明記と新設 fixture の散文に禁止語彙リテラル(formal-model-check / tla-authoring / specs/tla)を使わない(FR-DEL-1 両立規定)。fixture の名称・語彙は `conformance-fixture` 系で統一
- **BR-8(引き継ぎ)**: FR-NORM-1 の設計非対称(application-design §12a FOLLOW-UP)の閉包点は上流原文どおり **code-generation 成果物**(code-generation-plan.md にノルム PR の所有者・時期・成果物形を 1 節で記載)であり、本 FD では閉じない。台帳 5 件の実名(business-logic-model の表)は RE census 引用の**設計時仮説**であり、code-generation 着手時に実 grep/diff で独立再実測して確定する
- **BR-9(実測のみ)**: 完了報告の件数は削除 diff・grep 出力からの転記のみ(P2)。census 表との照合差は申告して確定
