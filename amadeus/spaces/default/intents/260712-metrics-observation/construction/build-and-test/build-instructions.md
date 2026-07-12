# ビルド手順

## 前提と上流成果物

- Bun 1.3.13、Node.js、TypeScript、Python 3、`lizard==1.23.0` を利用する。
- 依存関係は `bun install --frozen-lockfile` で導入する。追加の環境変数、外部サービス、credential は不要である。
- 対象と判断根拠は各unitの `code-generation-plan.md` と `code-summary.md` に置く。

## 実行手順

1. `mise trust`
2. `bun install --frozen-lockfile`
3. `bun run dist:check`
4. `bun run promote:self:check`
5. `bun run typecheck`
6. `bun run lint:check`
7. `bun tests/complexity-gate.ts --check`

`dist:check` は配布tree同期、`promote:self:check` はproject-local self install、`typecheck` は本体とtest用TS構成を検証する。lintの既存warningはexit 0なら非blockingとし、新規errorを許容しない。

## 成功条件とトラブルシュート

- 全コマンドがexit 0であること。
- `dist:check` が不一致なら生成物を手編集せず、source-of-truth側の差分を特定する。
- typecheck失敗時は最初の診断を修正し、対象commandとfull CIを再実行する。
- AWS資格情報が無効な場合、既存runnerがlive SDK/substrate testsをskipする。今回のfeatureは外部AWS境界を持たないため、skipを記録してローカル検証を継続する。
