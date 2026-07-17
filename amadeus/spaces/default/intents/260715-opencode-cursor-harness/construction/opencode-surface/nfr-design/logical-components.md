# Logical Components — U2 opencode-surface

intent: 260715-opencode-cursor-harness / Unit: U2
上流入力: nfr-requirements(tech-stack-decisions.md TS-U2-1/2)、functional-design(business-logic-model.md)、U1 の logical-components.md。

## 論理コンポーネント構成(U1 表への追加分のみ)

| コンポーネント | 実体 | 責務 | NFR 割当 |
| --- | --- | --- | --- |
| emitAgentsMd | emit.ts 内関数 | AGENTS.md 合成(トークン置換経路) | SR(未置換 grep) |
| emitOpencodeJsonExample | emit.ts 内関数 | 設定例合成 | SR-U2-1(JSON.parse テスト) |
| skills 合成 | emit.ts 内関数群 | .opencode/skills/ の table エントリ化(ディスク discover) | SC-U2-1 |

依存方向は U1 と同一(変更なし)。

## 上流参照(consumes 全数)

本設計の入力: 同 unit の nfr-requirements 5点(performance-requirements.md / security-requirements.md / scalability-requirements.md / reliability-requirements.md / tech-stack-decisions.md)+ functional-design の business-logic-model.md。継承元 = U1 の nfr-design(U1 自身は本節が自己参照)。
