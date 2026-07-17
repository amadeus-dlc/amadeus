# Build Instructions — answer-evidence-sensor(Bolt 1)

上流入力(consumes 全数): `../answer-evidence-sensor/code-generation/code-generation-plan.md`・`../answer-evidence-sensor/code-generation/code-summary.md`

## 前提・依存インストール

- Bun(リポジトリ既定ランタイム)。追加の外部依存なし — 本 Bolt は runtime dependency を追加しない(project.md Forbidden 遵守)。
- `bun install` 済みの標準開発環境で完結する。

## ビルドコマンド

本プロジェクトはトランスパイル型ビルドを持たず、「ビルド」= 配布物再生成+drift 検査:

```bash
bun scripts/package.ts        # 正本 → dist/{claude,codex,cursor,kiro,kiro-ide,opencode}
bun run promote:self          # dist → セルフインストールツリー(.claude/.codex)
```

## ビルド検証

```bash
bun run typecheck             # tsc --noEmit(本体+tests)
bun run lint                  # Biome
bun run dist:check            # dist drift guard
bun run promote:self:check    # self-install drift guard
bun .claude/tools/amadeus-runner-gen.ts check   # stage graph → runner drift guard
```

## トラブルシューティング

- dist:check 赤: 正本(packages/framework/core/)編集後の `bun scripts/package.ts` 忘れ。dist/ の手編集は禁止(Forbidden)。
- t89 赤(unknown sensor id): stage frontmatter へ新 sensor id を追加した場合、t89 fixture センサ dir(tests/fixtures/v05-mr7b-sensor-resolution/ の full 5 dir)への manifest 伝播が必要。
