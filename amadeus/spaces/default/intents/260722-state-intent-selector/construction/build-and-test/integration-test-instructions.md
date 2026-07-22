上流入力(consumes 全数): code-generation-plan, code-summary

# 統合テスト手順

## 本 intent の中核テスト

```bash
bun test tests/integration/t256-state-intent-selector.test.ts
```

t256(16 テスト)が受け入れ基準を全数カバーする(code-generation-plan のテスト設計、code-summary のテスト節):

- セレクタパーサ単体(抽出・rest 保持・値保存)
- (b) 無指定既定の不変(active intent 対象、state file バイト確認)
- (a) `--intent` での非 active intent への round-trip(active record バイト不変)
- (c) 不在 intent/space の fail-closed(spawn で実 CLI exit 1 契約)
- (e) `get`/`count` の対象 intent 読取
- (d) `ERROR_LOGGED` の対象 intent シャード帰属(spawn、落ちる実証済み)

## 隣接リグレッション

```bash
bun test tests/integration/t145-state-lock-concurrency.test.ts   # ロックバケット直列化(既定不変の担保)
```
