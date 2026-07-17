# Security Design — U2 opencode-surface

intent: 260715-opencode-cursor-harness / Unit: U2
上流入力: nfr-requirements(security-requirements.md SR-U2-1〜3)、U1 の nfr-design(security-design.md)。

## 設計(モジュール別)

| 対象 | 保証機構 |
| --- | --- |
| opencode.json.example | 静的リテラル合成+単体テストで JSON.parse 可能性を検証(SR-U2-1: permission は絞り込み例のみ — レビュー観点に「緩和例の不在」grep を含める) |
| AGENTS.md | トークン置換後の未置換 grep(R-U2-3)— プレースホルダ残存の検出面を機械化 |
| 継承分 | U1 security-design のモジュール表を継承(emit 外部入力なし・core 不変) |

## 上流参照(consumes 全数)

本設計の入力: 同 unit の nfr-requirements 5点(performance-requirements.md / security-requirements.md / scalability-requirements.md / reliability-requirements.md / tech-stack-decisions.md)+ functional-design の business-logic-model.md。継承元 = U1 の nfr-design(U1 自身は本節が自己参照)。
