# Scope Definition — 明確化質問

**Intent**: Amadeus Grilling 統合 / **Stage**: scope-definition (1.4) / **Depth**: Standard
**前提**: intent-capture で In/Out の粗い境界は確定済み(In: Grill me モード+スタンドアロンスキル+4ハーネス展開+帰属表示 / Out: 既存3モード変更、新監査イベント)

---

## Q1. 最小の価値提供(MVS)はどれですか?

2つの成果物のうち、どちらが欠けても価値が成立しないのか、片方だけでも出荷価値があるのかを確認します。

A. Grill me モード単体でも価値が立つ — スタンドアロンスキルは追加価値
B. スタンドアロンスキル単体でも価値が立つ — モード統合は追加価値
C. 両方揃って初めて価値(不可分の1パッケージ)
X. Other (please specify)

[Answer]: C — 両方揃って初めて価値(不可分の1パッケージ)

## Q2. 成果物の MoSCoW 振り分けは?

対象: (a) Grill me モード (b) スタンドアロンスキル (c) docs 更新 (d) MIT 帰属 (e) テスト

A. すべて Must — 1リリースで完結させる
B. モード(a)+帰属(d)+テスト(e)= Must、スキル(b)+docs(c)= Should(後続でも可)
C. スキル(b)+帰属(d)= Must、モード(a)= Should
X. Other (please specify)

[Answer]: A — すべて Must。1リリースで完結(同一コミットでの dist 再生成・docs 更新のチームルールとも整合)

## Q3. 実装のシーケンス優先は?

A. リスク順 — 最大の仮説「1問ずつ規律を question-rendering の枠内で表現できるか」の検証を最初に
B. 依存順 — 共有の grilling 規律定義 → モード統合 → スキル、と土台から
C. 価値順 — 使う頻度が高い Grill me モードを先に完成させる
X. Other (please specify)

[Answer]: A — リスク順。「1問ずつ規律を question-rendering の枠内で表現できるか」の検証を最初に

## Q4. 期限の制約はありますか?

A. なし — 品質優先で進める
B. あり(Other で具体的に)
X. Other (please specify)

[Answer]: A — 期限なし。品質優先

## Q5. grilling 対話の終了条件のスコープは?

元スキルは「共通理解に達するまで」無制限に問い続けます。Amadeus に載せる際の境界を決めます。

A. depth 設定に連動 — Minimal/Standard/Comprehensive の質問量ガイドラインに従わせる(既存契約と整合)
B. 元スキルに忠実 — 共通理解までの無制限。ユーザーの「done」だけが打ち切り手段
C. ハイブリッド — depth を目安としつつ、ユーザーが「続けて」「done」でいつでも延長/打ち切りできる
X. Other (please specify)

[Answer]: C — ハイブリッド。depth を目安としつつ、ユーザーが「続けて」「done」でいつでも延長/打ち切りできる
