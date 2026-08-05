# Scope Document — semi 再定義と --autonomy 起動宣言(#2253)

上流入力(consumes 全数): intent-statement.md

## In / Out 境界

`intent-statement.md` の Problem Statement(headless 起動宣言の不在・semi の不定形走行)と Success Metrics を境界の導出元とする。scope は `self-feature`(birth 時ユーザー既決)。

### In(本 intent で出荷する)

1. **semi の再定義(canonical 改訂)** — 質問を full と同一の無人解決4段(方針なしは3段縮退)で処理。`resolveAutoDecision:702` の full ハードゲートと `createGateAutoDecision:667` の question-throw の両改訂、`amadeus-stop.ts` の質問 carve-out 述語の grant 非依存化
2. **`--autonomy semi|full` 起動宣言** — semi は即時設定(HUMAN_TURN provenance 必須)、full は grant 実在時走行・不在時 preview 表示の fail-closed 停止(FR-GRT-006 不変)
3. **semi の事前裁定方針受付** — 任意入力。担体・確認 digest は requirements 段の裁定事項。`--policies-file` 非 full 無音破棄の loud 化
4. **表示の同一語彙** — `--status` に加え statusline への Autonomy 表示追加(#2067 旧本文の残余)
5. **旧仕様ピンの明示改訂** — テスト(`t431:313`、`t121:1138`)+ docs 11 ファイル(日英対訳同時)。走行単位の主張は「質問で止まらない」に限定(stop 継続予算 cap 8 は不変)
6. **落ちる実証** — grant 不在 `--autonomy full` の fail-closed 停止を回帰テストで固定
7. **advisory choice の無人解決経路**(ユーザー裁定 2026-08-05T06:03Z による追加) — **特定プラグインに依存しない一般の欠落**である。`applyPendingAdvisoryGuard`(`amadeus-orchestrate.ts:781-800`)は pending advisory が1件でもあれば `run-stage` を無条件に `await-advisory-choice` へ差し替え、`guardAdvisoryChoices`(`amadeus-advisory-choice.ts:592-602`)は `advisories: readonly Advisory[]` を受けるだけで `advisory.plugin` を分岐条件に使わない(`:609-617` のとおり plugin は記録フィールド)。autonomy 参照は同ファイル全域で grep 0 件であり、代わりに受理側が `humanTurn: HumanTurnProvenance` を必須とし監査シャードの実 `HUMAN_TURN` と timestamp 一致を照合する(`:60`、`:343-349`、`:564-565`)。したがって **advisory を発火しうる任意のプラグイン**(現行の formal-model-check は一実例にすぎない。将来追加されるプラグインも同様)が1件 pending になるだけで、full grant 下の headless 走行が切れる。full/semi の無人解決経路へ載せる。要件は plugin 非依存の一般形で書き、特定プラグイン名を条件に含めない(節目の扱い・`run_required: true` 時の強制実行との関係は requirements 段の裁定事項)

### Out(明示的にやらない)

- walking skeleton / phase 境界 / Intent 終端の semi 自動化(ユーザー裁定 2026-08-05: semi = full − 節目)
- 旧 semi 挙動の互換モード・フォールバック・移行シム(後方互換なし — 置き換えのみ)
- `--autonomy full --confirmed-display-digest` によるワンショット発行(#2253 代替案5で非採用)
- FR-GRT-004 の変更(semi は current grant = null を維持)
- stop 継続予算(AUTONOMOUS_BLOCK_CAP)の変更
- #1647(approve-batch の human-presence guard)・#1241(外部人間ゲート待ち)は別 Issue のまま

## 承認系譜(スコープ境界の変更)

- **当初裁定** 2026-08-05: ユーザー裁定「semi = full − 節目」+ Issue #2253 の完了条件 → In-1〜In-6
- **追加裁定** 2026-08-05T06:03Z: requirements-analysis 直前で `formal-model-check` の advisory が発火し、conductor が「full 自律でも人間ターンを要求する」ギャップを実測報告。ユーザーが AskUserQuestion で「#2253 のスコープへ取り込む」を選択 → **In-7 を追加**。同時に目の前の advisory は「リスクを承知して延期」で受理(receipt: advisory_instance `86bed4aa-d738-4fba-9834-1e4eb3db7b6a`、human_turn `2026-08-05T06:03:16Z`)
- 本節は `cid:requirements-analysis:approval-lineage-citation` に基づく申告。scope-definition ステージは 2026-08-05T05:16:04Z に承認済みであり、In-7 はその後の追加裁定による境界変更である

## バリューストリーム

headless 起動(`claude -p '/amadeus --autonomy semi'`)→ 起動宣言が監査記録 → phase 内を質問込みで無人前進(AUTO_DECIDED + unreviewed)→ phase 境界で人間が裁定+unreviewed 検収 → 次 phase。full は同じ流れが Intent 終端まで。

## スコープ確定の根拠

- Issue #2253(クロスレビュー2名成立、ESTABLISHED_WITH_REFINEMENTS、指摘反映済み)
- ユーザー裁定 2026-08-05(semi=full−節目 / walking skeleton 除外 / 後方互換なし / full grant 許可)
- 裁定 ID: scope-definition-questions.md の Q1〜Q5(いずれも unreviewed queue で事後検収可能)
