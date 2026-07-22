上流入力(consumes 全数): code-generation-plan, code-summary

# ユニットテスト手順

## 対象

本 intent の新規テストは実 FS を使うため integration 層に配置した(fs-tests-integration-first 規範。code-generation-plan のテスト設計参照)。unit 層への新規追加はなし。既存 unit 層のリグレッション確認はフルスイート(`bash tests/run-tests.sh --ci`)に含まれる。

## 実行

```bash
bun test tests/unit/t14.test.ts tests/unit/t17.test.ts   # state CLI 関連の既存 unit
```

`extractIntentSelector` の純関数部は t256 内のパーサ単体テスト群(in-process seam、exported 関数直接呼び出し)でカバーする(code-summary のテスト節参照)。
