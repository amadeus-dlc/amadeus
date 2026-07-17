# Security Requirements — U1 opencode-skeleton

intent: `260715-opencode-cursor-harness` / Unit: U1
上流入力: functional-design(business-logic-model.md / business-rules.md)、requirements.md、codekb の technology-stack.md(Bun/TS スタック実測)(business-rules R-U1-2/R-U1-6)、application-design の decisions.md(ADR-1)、feasibility の raid-log(R-4)。

## 要件(検証可能形)

- SR-U1-1: 認証情報・API キー・シークレットを配布物に含めない — emit の合成内容は静的テキストのみ(検証: dist/opencode/ への secret scan は既存 CI の適用範囲。新規の秘密情報経路を作らない)
- SR-U1-2: `dot-gitignore` の projectRoot 配置は codex 前例と同一内容(cursors・machine-local runtime の除外)— 機密データのコミット防止線を新ツリーでも維持
- SR-U1-3: core の認証・認可・ゲート機構に変更を加えない(AC-4d grep で担保 — バイパス経路の新設なし)

## N/A(反証可能根拠付き)

- 入力サニタイズ: **N/A** — U1 はユーザー入力を処理しない(ビルド時の静的合成のみ)。opencode 側 permission モデルの差分対策(R-4)は U2(opencode.json.example)の担当
