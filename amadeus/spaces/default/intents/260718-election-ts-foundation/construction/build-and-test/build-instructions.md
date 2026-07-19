# Build Instructions — election-ts-foundation

> 上流入力(consumes 全数): code-generation 各ユニットの code-generation-plan.md と code-summary.md、requirements.md、bolt-plan.md、team-practices.md

## ビルド

本 intent の成果物は Bun 直接実行の TS(scripts/amadeus-election*.ts 4本+contrib SKILL)でビルド工程を持たない(requirements.md NFR-1 — 各ユニット code-summary.md の生成物一覧)。依存導入のみ:

```
bun install
```

## 静的検査(マージ前必須 — team-practices.md Testing Posture の CI gate 列)

```
bun run typecheck   # tsc --noEmit(本体+tests)
bun run lint        # Biome
bun run dist:check  # 配布ドリフト(本 intent は dist 非対象 — 不変であることの確認)
bun run promote:self:check  # contrib SKILL の self-install 投影同期(Bolt 5)
```

(検証対象の実装スコープは各ユニット code-generation-plan.md の Bolt 分割宣言に従う)
