# Code Summary — scope-ledger (#1980)

上流入力(consumes 全数): business-logic-model.md(処理フローと不変量 — 実装手順の骨格)、business-rules.md(BR 群を実装契約としてそのまま採用)、domain-entities.md(型・生成器のシグネチャ)、performance-design.md(実行時間の合否基準と予算配分)、security-design.md(fail-closed 境界と入力検証の所有)、unit-of-work.md(本 unit の Bolt 境界・規模見積・共通実装制約)、requirements.md(FR/NFR の受け入れ基準 — 出荷条件の導出元)

## 着地

- PR: **#2098**(squash マージ済み、ユーザー承認後に conductor が実行)
- ブランチ側コミット: `5facf7b9f`

## 実装内容

`bug-scope-ledger.md`(50行)を新設。根拠バグ9件 × 5列(番号/1行要約/射程3値/分担先/根拠)。判定は FD §4 写像表からの転記のみで再判定なし。

## テスト

該当なし(文書 unit)。合否は FR-6a の A1〜A5 機械検査で担保。

## 検証(実測)

A1(パス実在 exit 0)/ A2(distinct 9件)/ A3(射程 2+2+5、語彙外 0)/ A4(9行・順序一致)/ A5(FD §4 と byte 一致 diff exit 0)。builder とレビュアーの二重実測で全 PASS。プロダクション・テスト無変更。

## 逸脱の申告と裁定

なし。BR-SL-5 により #1904 は「未割当(出典に記載なし)」と記載(推測補完しない)。

## 補足

出典の行番号オフセット(FD 記載 :72/:65/:16-24 → 実測 :71/:64/:15-23)を verbatim 断片で同定し、両方を台帳へ記録。三点併記規則(locator+取得コマンド+断片)の実施。

## レビュー

独立レビュアー(amadeus-architecture-reviewer-agent、builder と別個体)による実装レビューで **READY**。

## 上流入力の参照箇所

- `business-logic-model.md` / `business-rules.md` / `domain-entities.md` — 実装方針・BR 実装契約・型/生成器シグネチャの出典(本書「実装内容」節)
- `performance-design.md` — 実行時間の合否基準(本書「検証(実測)」節の時間実測はこの基準に対する判定)
- `security-design.md` — fail-closed 境界の所有と入力検証の責務分界(本書「実装内容」節の棄却契約)
- `unit-of-work.md` — 本 unit の Bolt 境界・規模見積(逸脱申告の基準)・全 unit 共通の実装制約
- `requirements.md` — FR/NFR の受け入れ基準(本書「検証(実測)」節の出荷条件の導出元)
