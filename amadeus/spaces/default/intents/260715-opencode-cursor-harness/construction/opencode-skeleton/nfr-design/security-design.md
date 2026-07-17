# Security Design — U1 opencode-skeleton

intent: 260715-opencode-cursor-harness / Unit: U1
上流入力: nfr-requirements(security-requirements.md SR-U1-1〜3)、functional-design(business-rules.md R-U1-2)。

## 設計(モジュール別の保証機構 — 一枚岩の断定を避ける)

| 対象 | 保証機構 |
| --- | --- |
| manifest.ts | 静的データのみ(実行時入力なし)— 秘密情報の混入面が構造的に不在 |
| emit.ts | 合成内容はリポジトリ内 authored ソースからのみ導出(外部入力・env 読みなし)— SR-U1-1 |
| dot-gitignore | codex 前例と同一内容の複製(cursors/runtime 除外)— SR-U1-2。検証: diff で codex 版との意図的差分のみ確認 |
| core ゲート機構 | 変更ゼロ(AC-4d grep が PR ごとに検証)— SR-U1-3 |

## 上流参照(consumes 全数)

本設計の入力: 同 unit の nfr-requirements 5点(performance-requirements.md / security-requirements.md / scalability-requirements.md / reliability-requirements.md / tech-stack-decisions.md)+ functional-design の business-logic-model.md。継承元 = U1 の nfr-design(U1 自身は本節が自己参照)。
