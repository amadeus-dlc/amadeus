# Security Design — u2-birth-declaration

上流入力(consumes 全数): business-logic-model.md(carry・full 分岐)。nfr-requirements 系5成果物は SKIP により未生成(設計どおりの不在)。

## 認可境界の不変(最重要)

- **フラグは provenance にならない**(BR-U2-2、t450-branch:119 ピン維持)— 適用は実 HUMAN_TURN の実在を要求(u1 canonical 関数の既存検証)
- **full の grant 儀式は不可侵**(BR-U2-3)— birth 同時の full 宣言は「儀式の案内」までで、preview 表示 digest の人間確認なしに mode を設定する経路を一切作らない(FR-GRT-006)
- first-declaration ラッチ(`modeProvenance.kind === "system-default"` 間のみ受理)は不変 — birth 同時宣言が2度目以降の上書き経路にならない

## 注入・搬送面

- birth directive のコマンド行に載る値は検証済み enum(`none|semi|full`)のみ — 自由文字列を搬送しない(argv 抽出は t449 ピンの既存検証)
- ask 経路の loud 拒否は宣言の無音消失を防ぐ(t450-branch:83 の趣旨保存 — セキュリティ上は「ユーザーが宣言済みと誤信して自律走行を放置する」誤信頼の防止)
