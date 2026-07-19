# Scalability Requirements — harness-wiring(swarm-dispatch-enum / Issue #1157)

上流入力(consumes 全数): `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。

## 要件

- SCR-W1(NFR-3): バッチ unit 数の増加に対し wave 分割で線形対応(スロット上限は harness 実行時制約 — 固定値を SKILL に焼き込まない。受け入れ = SKILL 手順が「slot 不足時は wave」の条件形で記述)
- SCR-W2: harness 追加時の配線コストは「SKILL 1 節+t181 トークン」に閉じる(`business-rules.md` BR-W1 の様式統一の帰結。受け入れの検証機構は t181 トークン拡張を第一候補とし nfr-design で確定 — 構造同型の直接検査機構は現存しないため本段では要求水準の宣言に留める)

## 検証

- インフラスケーリングは非該当(AWS 変更なし C-21)— 根拠付き N/A
