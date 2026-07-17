# Logical Components — U3 cursor-port

intent: 260715-opencode-cursor-harness / Unit: U3
上流入力: nfr-requirements(tech-stack-decisions.md TS-U3-1〜3)、functional-design(domain-entities.md)、application-design(component-methods.md C2)。

## 論理コンポーネント構成

| コンポーネント | 実体 | 責務 | NFR 割当 |
| --- | --- | --- | --- |
| manifest | harness/cursor/manifest.ts | 宣言(authoredExempt = cursor アダプタ regex 込み) | SR(静的) |
| emit | harness/cursor/emit.ts | emission table(.mdc エントリ/hooks.json.example/AGENTS.md/commands/harness.json) | RL(U1 同一機構) |
| adapter | harness/cursor/hooks/amadeus-cursor-adapter.ts | envelope parse → tool_name 写像 → core hook pipe | SR(parse-don't-validate/EXIT 定数)、RL(単体テスト+seam export)、PR(直列4ステップ) |
| ToolNameMap | adapter 内 Readonly 定数 | 語彙写像(実測確定値のみ) | SC-U3-1 |

依存方向: manifest → emit、adapter は core hooks を読み取り実行のみ。循環なし。

## 上流参照(consumes 全数)

本設計の入力: 同 unit の nfr-requirements 5点(performance-requirements.md / security-requirements.md / scalability-requirements.md / reliability-requirements.md / tech-stack-decisions.md)+ functional-design の business-logic-model.md。継承元 = U1 の nfr-design(U1 自身は本節が自己参照)。
