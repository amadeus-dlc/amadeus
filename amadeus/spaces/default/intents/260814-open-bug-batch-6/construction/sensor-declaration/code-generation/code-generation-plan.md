# Code Generation Plan — U-2 sensor-declaration(#3026 / FR-2)

depth Minimal。D-2/D-3 (a) の実装。worktree bolt-sensor-declaration(base origin/main)、push-first。トレース: 全 step → FR-2。

## Steps

- [x] Step 1: センサー資産 `plugins/formal-model-check/sensors/amadeus-model-completeness.md` の manifest を実読し、発火面(どのステージ/シームで発火すべきか)を資産自身の宣言から導出(推測で広げない)。対照として git-drift / pr-convergence の宣言+配線様式を実読 → FR-2
- [x] Step 2: TDD Red — 「formal-model-check プラグインのセンサー資産が plugin.json の sensors に宣言され投影される」ことを検査する失敗テスト(または D-3 (a) の一般化: 各プラグインの sensors/ ディスク資産と plugin.json 宣言の突合検査)を既存 conformance/unit 系スイートへ追加し Red を実測 → FR-2 / Issue AC3
- [x] Step 3: plugin.json へ `"sensors": ["sensors/amadeus-model-completeness.md"]` を追加し、Step 1 で導出した発火配線(必要な場合のみ)を実装。Green を実測 → FR-2
- [x] Step 4: bun run build → `.claude/sensors/` の投影が 13→14 になることを実測(`ls -1 .claude/sensors/*.md | wc -l`)。追跡ファイル不変確認 → FR-2 受け入れ
- [x] Step 5: 落ちる実証 — 宣言を一時除去して検査が赤くなること(注入→赤→revert 残渣ゼロ)。#3078 の孤児 `advisory-model-check.ts`(tools 側)が本検査(sensors 突合)の射程外であることを検査述語に明記 → team.md Mandated
- [x] Step 6: coverage-registry regen(新規テストファイル時)、typecheck / lint / 対象テスト単体 green。コミット(英語)
- [x] Step 7: code-summary.md 作成

## テスト方針(Comprehensive)

Red→Green 1 slice + 落ちる実証。宣言突合検査は閉語彙(sensors キーのみ)で fail-closed、省略(sensors ディレクトリ不在のプラグイン)は検査対象外。
