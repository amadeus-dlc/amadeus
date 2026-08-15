# Code Summary — U-2 sensor-declaration(#3026 / FR-2)

depth Minimal。詳細実測は `implementation-notes.md`(測定 ref: worktree bolt-sensor-declaration、origin/main 39cd644d7 取込断面)。

## 変更ファイル(git diff --stat origin/main..HEAD の転記)

- `plugins/formal-model-check/plugin.json`(+3 — sensors 宣言)
- `plugins/formal-model-check/stages/formal-model-check.md`(frontmatter 配線回復+§Sensors 散文改訂)
- 新設 `tests/integration/t3026-plugin-sensor-declaration.integration.test.ts`(85 行 — 宣言突合検査、D-3 (a))
- record: implementation-notes.md

## 主要判断

- 発火配線は PR #2890 の除去履歴からの「回復」(新規発明ではない)。クロスレビュー r2 MAJOR(投影と発火は別ゲート)に対応
- 検査 domain は `plugins/*/sensors/*.md` のみ — #3078(tools 孤児)は構造的射程外とテスト冒頭で宣言
- 実装は builder サブエージェント起草(セッション上限で停止)を conductor が完成・検証(逸脱: 分担のみ、内容の逸脱なし)

## 検証

- 落ちる実証 Red(1 fail: 当該資産 undeclared)→ Green(2 pass / 4 expect)、残渣ゼロ
- 投影 13→**14** 実測(`ls -1 .claude/sensors/*.md | wc -l`)、追跡ファイル不変
- coverage registry --check OK / typecheck exit 0 / lint エラー 0。フル検証は PR #3086 の CI を正とする(push-first)
