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

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-15T02:35:33Z
- **Iteration:** 1
- **Scope decision:** none

FR-2 の受け入れ2点(投影14実測・AC3 突合検査の実装と落ちる実証)は充足、plan の7 step は全て [x]、スコープ外変更・互換シム・無申告逸脱なし。発火配線の解決実測と配線の回帰ガードが未閉包のため FOLLOW-UP 4件。

### Findings

- FOLLOW-UP | 発火面が未実測。frontmatter を `sensors: []` から `sensors: [model-completeness]` へ回復したが、implementation-notes.md / code-summary.md の実測は plugin.json 起点の投影(`ls -1 .claude/sensors/*.md | wc -l` → 14)のみで、コンパイル後に id `model-completeness` が当該ステージの `sensors_applicable` へ解決されたことを示す測定がない。FR-2 が現状として挙げる `?? []` 系の無音フォールバックが本件のバグクラスそのものであり、`bun run build` の成功は id 解決の証拠にならない。id は投影名 `amadeus-model-completeness.md` の規約一致かつ PR #2890 が同ファイルから除去した実績値であり誤りの蓋然性は低いため受け入れは阻害しないが、解決後の `sensors_applicable` を1本の述語で実測して記録するのが閉包。
- FOLLOW-UP | 回復した配線に回帰ガードがない。新設 `tests/integration/t3026-plugin-sensor-declaration.integration.test.ts` の domain は `plugins/*/sensors/*.md` とその plugin.json 宣言の突合のみで、ステージ frontmatter の `sensors:` は射程外(テスト冒頭 DOMAIN 節の宣言どおりで実装と一致)。したがって PR #2890 と同型の退行(frontmatter を `[]` に戻す)は本検査で赤くならず、今回の発火配線は無防備のまま残る。
- FOLLOW-UP | 新設テスト冒頭の `// covers: file:packages/framework/core/tools/amadeus-plugin-compose.ts` が実態と不一致。テストは `parseSensors` を呼ばず plugin.json を直接 JSON.parse して宣言判定を再実装しており、compose 経路を一度も実行しない。したがって compose 側が `sensors` キーの解釈を落としても本テストは緑のままで、`cid:build-and-test:pbt-oracle-cancellation`(不変量を被検実装から独立に再実装しない)と同型の相殺リスクを持つ。是正は covers から当該ファイルを外すか、実 compose 経路を駆動して投影結果まで assert するか。
- FOLLOW-UP | 横断検証が未確定。pr-convergence-report.md は `kind: created` / `converged: false` であり、フルスイート・coverage は PR #3086 の CI を正とする(code-summary 記載)。push-first ノルム下では code-generation 時点のこの順序は正しいが、`cid:code-generation:c3-conductor-runs-full-suite`(新規テストファイル追加時のフルスイート1周)は未閉包の面として pr-convergence へ申し送りが必要。
- NIT | 落ちる実証の実測が pass/fail 件数(Red 1 pass/1 fail → Green 2 pass/0 fail・4 expect)のみで exit code の転記がない。typecheck と `gen-coverage-registry.ts --check` は exit 0 を併記しており、証跡の粒度が不揃い。
- NIT | 「投影 13→14」の 13 側は本 bolt での再測定ではなく上流 FR-2 の実測値の引用、「lint 警告 464 は既存ベースライン」も base 側の測定 ref がない。いずれも測定 ref を1行併記すれば P2 の実測規律が閉じる。
- NIT | code-generation-plan.md のトレースは `全 step → FR-2` で要件へ張られているが、user-stories(2.4)が SKIP された条件そのものは plan にも code-summary にも書かれていない。stage 契約(.claude/amadeus-common/stages/construction/code-generation.md:96)が求める degraded input の明記は、上流に requirements が実在するため「intent only」ではないものの、ストーリー不在の事実を1行残すのが契約の趣旨に沿う。
