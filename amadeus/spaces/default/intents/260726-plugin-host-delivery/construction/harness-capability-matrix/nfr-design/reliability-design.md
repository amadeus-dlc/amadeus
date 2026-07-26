# 信頼性設計 — U1 harness-capability-matrix

> 上流入力(consumes 全数): performance-requirements、security-requirements、scalability-requirements、reliability-requirements、business-logic-model、tech-stack-decisions
> 技術前提(Bun 単独・runtime dependency 追加ゼロ・新規外部依存なし)は同 unit の tech-stack-decisions の決定を継承する。

## 決定性の設計(セル → ProbeRecord の trace 構造)

reliability-requirements「プローブの決定性と再現手順」の合否(第三者再実行で同一クラス判定)を、次の様式で担保する:

- **参照 ID 規約**: 各セルは `P-<harness>-<面>` 形式の probe-id で ProbeRecord へ trace する(security-design のフィールド表と同一 ID 空間)。42 セル(scalability-design の固定列挙)全てが ID を持つか空でないかを §12a で count 照合できる
- **測定 ref の明記**: 成果物冒頭に測定 ref(HEAD SHA)を 1 行で置く(measurement-ref-in-artifacts)。reliability-requirements 起草時点の ref `7bce53dc6` から前進していた場合はプローブ実施時点の実測 SHA を記載する(手動展開禁止 — rev-parse 出力の転記のみ)
- **判定の機械性**: business-logic-model「判定ロジック(決定的)」の 3 値(native-manifest / folder-drop-auto / manual-only)への割当は、ProbeRecord の evidence から一意に導出できる形で書く。判定文には根拠 probe-id を併記し、希望的割当(evidence なしのクラス断定)を様式段階で不能にする

## fail-closed 縮退の設計(silent skip 禁止)

reliability-requirements「silent skip の禁止」の合否を、セルの許容状態を 3 値に閉じることで実装する:

1. **measured**: probe-id+evidence あり。composeTrigger 面は書き手の起動条件(発火するモード・設定 — seam-writer-mode-precondition)まで ProbeRecord に含む場合のみ measured(reliability-requirements「書き手の起動条件までの実測」合否。security-requirements の前処理再現合否を記録する security-design の `preprocessing` フィールドが記録面)
2. **⚠ deferred(実装時実測)**: 確定条件 1 行を必須併記
3. **manual-only degrade 契約**: 利用者の手動床 1 コマンド+doctor 表示の明文(BR-U1-6)

裸の空欄・行省略は様式違反として §12a で不合格(状態が上記 3 値のいずれでもないセルの grep が 0 件であること)。存在のみの確認で measured を名乗るセルは 1 → 2 へ降格する。

## 依存障害面の N/A 継承

reliability-requirements「依存障害面の不在」のとおり外部サービス障害の伝播経路は存在せず、可用性・リトライ設計は **N/A を継承** する(performance-requirements / scalability-requirements の N/A と同根)。信頼性設計は上記 2 節(決定性・fail-closed 縮退)に閉じる。
