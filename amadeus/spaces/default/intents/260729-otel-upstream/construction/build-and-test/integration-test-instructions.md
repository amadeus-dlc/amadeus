# 統合テスト手順(integration-test-instructions)

上流入力(consumes 全数): code-generation-plan.md、code-summary.md — 各 unit の統合境界(subprocess spawn・削除ゲート CLI・OTLP Relay)を code-summary.md の「Key implementation decisions」から抽出した。

## 実行

```
bash tests/run-tests.sh --integration
bun tests/deletion-gate.ts --check          # 6条件ゲート(overall GREEN 確認)
bun tests/deletion-gate.ts --require-green  # 削除前提の fail-closed 判定(exit 0 = GREEN)
bun tests/callsite-guard.ts --check         # legacy call site census(shrink-only ratchet)

```

## 本 intent の主要統合面

- **migration-equivalence 証拠**(削除ゲート (d)): `tests/integration/t390-migration-equivalence.test.ts` ほか計5 suite(マーカー付き)。t390 の legacy 側は `6b453b05d` 時点の recorded fixture(`tests/harness/legacy-audit-rows.ts`)
- **subprocess span 境界**: t384(callsite migration subprocess)、W3C Trace Context 伝播(t: U5 系)
- **OTLP Relay**: t372/t373/t375(転送専用・Journal 非生成・collector endpoint)
- **削除ゲート CLI**: t371-deletion-gate-cli(exit code 契約・report artifact)
- **混在シャード読み**: 監査シャードの読みは常に `readJournalRecords` / `normalizeAuditRecord` 経由(v1 行 90,567 が恒久残存)

## 環境

追加サービス不要(HTTP server / DB なし)。Relay の実 endpoint 検証(t375)はローカル fixture サーバーで完結。
