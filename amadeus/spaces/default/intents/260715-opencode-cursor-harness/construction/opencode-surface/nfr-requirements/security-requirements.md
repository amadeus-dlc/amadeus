# Security Requirements — U2 opencode-surface

intent: 260715-opencode-cursor-harness / Unit: U2
上流入力: functional-design(business-logic-model.md / business-rules.md)、requirements.md、codekb の technology-stack.md(Bun/TS スタック実測)(R-U2-2 permission 例)、feasibility raid-log(R-4)。

## 要件

- SR-U2-1: opencode.json.example の permission 例は「絞り込み」方向のみ(既定全許可の緩和例を提示しない — R-4 緩和の一貫性)
- SR-U2-2: AGENTS.md・設定例にシークレット・実在トークンを含めない(プレースホルダのみ)
- SR-U2-3: U1 の SR-U1-1〜3 を継承(新規秘密経路なし・gitignore 維持・core ゲート不変)

## N/A(反証可能根拠付き)

- 入力サニタイズ: N/A — U1 と同一根拠(ビルド時静的合成のみ)
