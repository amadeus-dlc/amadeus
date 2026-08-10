# ユニットテスト手順 — 260810-plugin-harness-dir-token

Test strategy: **Comprehensive**（要件駆動 + リスク駆動 + NFR 駆動）/ Depth: Minimal

## フレームワークと実行

`bun test`。スイート全体は `bun tests/run-tests.ts`（`bun run test:ci` / `test:all`）。

```
bun test ./tests/unit/t146-core-hygiene.test.ts
```

**注意**: 単一ファイルを指す場合はパスに `./` を付ける。付けないと bun がフィルタ文字列として
解釈し、同名前方一致の複数ファイルにマッチして「no matches」になる（本 intent で実際に踏んだ）。

## 本 intent が触れるユニットテスト

`tests/unit/t146-core-hygiene.test.ts`（2 → 4 テスト）

| テスト | 対応 FR | 判定内容 |
|---|---|---|
| stray harness-dir path literals in core/ or plugins/ | FR-6 | 走査根に `plugins/` を追加。ハーネス固有ディレクトリのリテラル混入で赤 |
| the guard catches an injected literal for every packaged harness dir | FR-7 | `allHarnessDirs()` を回して temp root へ注入し、7 dir すべてで捕捉されることを固定 |
| both named carve-outs still match the pattern and are still excused | FR-7 | carve-out 2 件が「広い述語になおマッチし、なお除外される」ことを固定（黙って死ぬ／広がるの両方を防ぐ） |
| core `.md` のトークン保有下限 | FR-8 | `walkMd(CORE)` のみ走査。plugins を巻き込まない |

## ヘルパ

`tests/helpers/harness-dir-fixture.ts` — `harnessDir` を `packages/framework/harness/*/manifest.ts`
から読む唯一の入口。**テスト側にハーネス名をハードコードしない**ための機構。
ハーネスが増えたとき述語が自動追随することを担保する。

## カバレッジ期待

Comprehensive だが、本 intent の変更面は狭い（prose 1 行 + seeding 2 箇所 + ガード述語）。
数の目標ではなく、**FR の受け入れ述語と 1:1 で対応するテストが存在すること**を基準とする。
FR-1〜FR-8 のうちユニット層で判定するのは FR-6 / FR-7 / FR-8。
FR-2 / FR-3 / FR-4 は統合層（別ファイル参照）。

## テストデータ

固定データなし。すべて実コーパス（`packages/framework/core/`、`plugins/`）または
`allHarnessDirs()` 由来の一時 root。一時挿入で陽性を測る場合は測定後に必ず復元し、
`git diff --stat` が空であることを確認すること。
