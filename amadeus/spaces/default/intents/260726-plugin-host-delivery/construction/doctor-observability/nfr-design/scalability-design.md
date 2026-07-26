# スケーラビリティ設計 — U5 doctor-observability

> 上流入力(consumes 全数): performance-requirements、security-requirements、scalability-requirements、reliability-requirements、business-logic-model、tech-stack-decisions
> 技術前提(Bun 単独・runtime dependency 追加ゼロ・新規外部依存なし)は同 unit の tech-stack-decisions の決定を継承する。

## N/A 継承(稼働時スケール)

scalability-requirements「適用可否(N/A の判定)」のとおり、単発・読み取り専用 CLI(security-design の層 1・2 が固定する性質)に稼働体は存在せず、水平スケール・オートスケール等は **N/A を継承** する。

## 線形射影の設計(少数前提・ページング非導入)

scalability-requirements「プラグイン数少数前提と出力の線形性」の合否を、business-logic-model 分岐表の写像構造で担保する:

- 出力は「プラグインごとに 1 行+drops entry ごとに 1 行+activation 1 行(該当時)」の線形写像で、A-3 の少数前提のもとページング・集約・省略表示(「...and N more」型)を導入しない。省略表示の不在は security-requirements の silent drop 禁止(security-design の全 entry 出現 assert)と同じ規則の集合サイズ面であり、性能面の上限は performance-requirements の軽微追加合否を実装する performance-design の線形性が引き受ける
- reliability-requirements の DoctorLine 型正本継承(U2 正本+U5 追加のみ)により、行数拡張は variant 追加で行い、行の圧縮・統合という写像破壊で行わない

## 0-plugin 縮退という下限境界

scalability-requirements「0-plugin 縮退という下限境界」の合否(0-plugin baseline の doctor 出力 diff が追加 1 行のみ)を、分岐表の 0-plugin 行(`Plugins: 0 installed`)を写像の最初の分岐として実装することで担保する。0-plugin 判定は composition record の読取結果のみから導出し(security-design の判定非搬送)、既存 doctor 出力の他行へ影響しない(BR-U5-4 の diff 比較テストで固定)。
