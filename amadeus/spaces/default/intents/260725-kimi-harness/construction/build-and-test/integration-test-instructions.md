上流入力(consumes 全数): code-generation-plan, code-summary

# Integration Test Instructions — 260725-kimi-harness

Test Strategy: **Comprehensive**。integration 層の実行手順。unit 境界をまたぐ検証(B2-B5 の code-summary が作った成果物)。

## 対象と実行

```sh
bun test tests/integration/                               # integration 層全体
bun test tests/integration/t-kimi-adapter.test.ts         # B2 adapter 契約(37件・fixture 駆動)
bun test tests/integration/t-kimi-hooks-merge.test.ts     # B3 実 snippet + tmp fs(15件)
bun test tests/integration/t-kimi-doctor-arm.test.ts      # B4 doctor arm(17件)
bun test tests/integration/t-kimi-cli-wiring.test.ts      # B5 cli 配線(5件)
bun test tests/integration/t145-packaging-parity.test.ts  # B1 byte-parity(全 harness 自動カバー)
bun test tests/integration/setup-install-flow.test.ts tests/integration/setup-upgrade-flow.test.ts
```

## カバレッジ期待(Comprehensive)

- 境界: adapter ↔ core hooks(fixture の実機 payload)、merge module ↔ 実 config 形状(マーカー欠落含む)、doctor arm ↔ tmp fixture、cli wiring ↔ tty fake
- live journey(B6)は integration 層ではなく `AMADEUS_KIMI_PRINT_LIVE=1` の opt-in e2e で、本層には含めない

## 環境

- tmp ディレクトリと実 snippet 正本を使用。ユーザーの実 `~/.kimi-code` には触れない(t-kimi-cli-wiring は `KIMI_CODE_HOME` を mkdtemp に向ける)
