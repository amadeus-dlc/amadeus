# Build Instructions — fix-1449-watcher-guard

上流入力（consumes 全数）: `amadeus/spaces/default/intents/260725-teamup-attach-latency/construction/fix-1449-watcher-guard/code-generation/code-generation-plan.md`、`amadeus/spaces/default/intents/260725-teamup-attach-latency/construction/fix-1449-watcher-guard/code-generation/code-summary.md`

- `code-generation-plan.md` — 変更面（正本1 + dist 6 + self-install 4 = 11コピー）を引き、下記の再生成手順の対象を確定した。
- `code-summary.md` — 実装が `watcher_verification_applies` に限定されることを引き、ビルド不要（TypeScript 変更なし）の判断根拠とした。

測定 ref: `294df1281`（実装）/ `22829d0b8`（成果物）。ブランチ `fix/1449-watcher-verification-applicability-guard`。

## ビルド対象

本変更は POSIX シェルスクリプト `packages/framework/core/tools/team-up.sh` のみで、コンパイル成果物を持たない。ビルドに相当するのは**配布物の再生成**である。

## 手順

```
bun scripts/package.ts        # 正本 → dist/<harness>/ 6面
bun run promote:self          # 正本 → self-install ツリー 4面
```

## ドリフト検査（マージ前必須、project.md Mandated）

```
bun run dist:check            # exit 0 を要求
bun run promote:self:check    # exit 0 を要求
```

## 実測結果

| コマンド | exit code |
| --- | --- |
| `bun run typecheck` | 0 |
| `bun run lint` | 0 |
| `bun run dist:check` | 0 |
| `bun run promote:self:check` | 0 |

conductor が独立に再実行して確認済み（`cid:code-generation:evidence-discipline`）。§12a reviewer も `diff` で dist/claude と self-install が正本と byte-identical であることを個別確認した。
