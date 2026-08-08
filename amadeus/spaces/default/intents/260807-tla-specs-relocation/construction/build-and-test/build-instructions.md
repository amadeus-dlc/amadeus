# Build Instructions — Intent 260807-tla-specs-relocation

上流入力(consumes 全数): `code-generation-plan.md`、`code-summary.md`

対象変更: `specs/tla/` → `amadeus/spaces/<space>/specs/tla/` 移設 + 単一 spec root resolver 新設(変更ファイル目録は `code-summary.md` の「Files created / modified」、ビルド面の検収基準は `code-generation-plan.md` の Step 8/Step 12 と「検収基準」節から導出)。

## 依存・環境

- Bun 1.3.13(`bun install --frozen-lockfile`)。外部依存の追加なし(NFR-2)
- ローカルで TLC(formal-model-check)を実行する場合のみ: JDK Temurin **26.0.1** ピン + sandbox-exec。**注意**: グローバル mise が JAVA_HOME を 26.0.2 へ上書きするため、`mise x java@temurin-26.0.1+8 -- bun ...` で固定する(cid:requirements-analysis:java-home-mise-shim-override、恒久対応は Issue #2410)
- 本変更のビルド・テスト自体に Java は不要(TLC 実行は advisory/手動 runner のみ)

## ビルド

```
bun install --frozen-lockfile
bun run build        # scripts/package.ts(dist 8 ハーネス)+ promote-self.ts(self-install 面)
```

- 正本は `packages/framework/core/` と `plugins/formal-model-check/`。plugin 鏡像(`plugins/formal-model-check/tools/amadeus-formal-verif-model-map.ts` / `tla-module-deps.ts`)は build が byte-identical に再生成する。**手編集禁止**(guard: t-package-generated-plugin-sources)
- `dist/`・self-install 面は生成物。コミットしない(source-only 境界)

## ビルド検証(実測済み)

| 検査 | コマンド | 結果 |
|---|---|---|
| 隔離2回ビルド再現性 | CI `reproducible-build` ジョブ相当(2 tree clone → build → release-dist → `diff -qr` on dist/.claude/.codex/.agents/.cursor/.opencode/.kimi-code/AGENTS.md/CLAUDE.md/release-assets) | OK(ローカル実施 2026-08-07、byte-identical)。CI でも pass |
| source-only 境界 | `bun run source-only:check` | clean |
| グラフ不変量 | `bun .claude/tools/amadeus-graph.ts compile --check` | OK (i)-(v) |
| typecheck | `bun run typecheck` | exit 0 |
| lint | `bun run lint` | exit 0(443 warnings = cognitive-complexity baseline、新規エラーなし) |
| no-silent-drop | `bun run no-silent-drop -- --base-revision d98dd9039db3949eeb140941deeb4468f717e57a` | NO_SILENT_DROP_OK |

## トラブルシューティング

- `ENVIRONMENT_UNAVAILABLE` (TLC 実行時): JAVA_HOME が 26.0.1 系を指しているか確認。mise shim 経由の `bun` は JAVA_HOME を上書きする(上記)。
- 旧レイアウトの workspace で `LegacySpecError`: 移設手順(`git mv specs/tla amadeus/spaces/<space>/specs/tla` + 参照更新)はエラーメッセージに含まれる(FR-6 の設計どおりの fail-closed)。
