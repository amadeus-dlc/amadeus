# 実装ノート — U-2 sensor-declaration(#3026 / FR-2)

測定 ref: worktree `bolt-sensor-declaration`(origin/main = 39cd644d7 取込済み断面)。実装の起草は builder サブエージェント(セッション上限で停止)、完成・検証・記録は conductor が直接実施。

## 変更

- `plugins/formal-model-check/plugin.json` — `"sensors": ["sensors/amadeus-model-completeness.md"]` を追加(対照様式: git-drift / github-pr-convergence)
- `plugins/formal-model-check/stages/formal-model-check.md` — frontmatter `sensors: []` → `sensors: [model-completeness]`(PR #2890 が sensors: [] へ落とした配線の回復。クロスレビュー r2 の MAJOR「宣言追加は投影のみ回復し発火は frontmatter 配線に依存」への対応)。§Sensors 節の散文を宣言・投影・解決の実態へ改訂
- 新設 `tests/integration/t3026-plugin-sensor-declaration.integration.test.ts` — D-3 (a) の宣言突合検査: `git ls-files 'plugins/*/sensors/*.md'` の全数が各 plugin.json の `sensors` に宣言されていることを検査。domain は sensors/*.md のみ(#3078 の tools 孤児は構造的に射程外 — テスト冒頭の DOMAIN 節に明記)

## 実測

- 落ちる実証(Red→Green): plugin.json の宣言を `git stash -- plugins/formal-model-check/plugin.json` で退避 → `bun test t3026` → **1 pass / 1 fail**(undeclared に `plugins/formal-model-check/sensors/amadeus-model-completeness.md`)→ stash pop → **2 pass / 0 fail(4 expect)**。残渣: `git status` は想定3ファイルのみ
- 投影: `bun run build` 後 `ls -1 .claude/sensors/*.md | wc -l` → **14**(受け入れ 13→14)、`amadeus-model-completeness.md` の存在を実測。追跡ファイルの想定外変更なし
- coverage registry: `bun tests/gen-coverage-registry.ts --check` → `OK (fresh, guards green, ratchet held)` exit 0(本テストは registry 追記不要の分類)
- `bun run typecheck` → exit 0 / `bun run lint`(Biome)→ エラー 0(警告 464 は既存ベースライン)

## 帰属・スコープ

- 発火配線の導出根拠: PR #2890 の diff(frontmatter から `model-completeness` を除去した履歴)— 「回復」であり新規配線の発明ではない
- ソース変更は plugins/formal-model-check 配下 2 ファイル+テスト 1 ファイルのみ。互換シム・フォールバックなし
