上流入力(consumes 全数): code-generation-plan, code-summary

# Unit Test Instructions — 260725-kimi-harness

Test Strategy: **Comprehensive**(state 実測)。unit 層の実行手順。対象は全 unit が code-generation で作成した純粋ロジック。

## 対象と実行

```sh
bun test tests/unit/                          # unit 層全体
bun test tests/unit/setup-kimi-hooks-domain.test.ts   # B3 純粋ロジック(19件)
bun test tests/unit/setup-engine-layout.test.ts        # B5 列挙(4件)
bun test tests/unit/t-kimi-swarm-resolve.test.ts       # B4 swarm 分岐(10件)
bun test tests/unit/t-kimi-print-drive.test.ts         # B6 driver 決定的部(13件)
bun test tests/smoke/t150-kimi-dist-structure.test.ts  # B1 dist 構造(2件)
```

## カバレッジ期待(Comprehensive)

- 各新規モジュールは公開面の全分岐(正常・境界・失敗経路)を unit で網羅: domain/kimi-hooks の add/replace/noop/重複/不正/除去、swarm resolve の全ドライバ分岐、driver の gate 分岐
- 既存の coverage ratchet/registry ゲートは CI ベースラインに含まれる(後述の build-test-results.md で確認)

## テストデータ

- 純粋ケースはインライン fixture。fs に触れるものは test-size 純度ゲートにより integration 層へ(B3 の code-summary の配置どおり)
