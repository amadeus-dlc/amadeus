# Feasibility Assessment — answer-preemption-guard(Issue #922)

上流入力(consumes 全数): `../intent-capture/intent-statement.md`(問題定義・スコープ境界・成功基準)。

## 技術的実現可能性(実測ベース)

| 前提 | 実測 | 判定 |
|------|------|------|
| 共有述語の実在 | `packages/framework/core/tools/amadeus-lib.ts:1173` に `export function checkQuestionsEvidence` を grep 確認(#1101/PR #1106 マージ済み) | ✅ 確定 |
| sensor 実装様式 | 既存4 sensor = `.claude/sensors/amadeus-<id>.md` manifest(frontmatter: id/kind/command/matches/schemas)+ `.claude/tools/amadeus-sensor-<id>.ts` 実装 + `amadeus-sensor.ts fire <id>` ディスパッチ。正本は `packages/framework/core/sensors/` に確認 | ✅ 確定 |
| 発火宣言の seam | stage frontmatter `sensors: [...]` リスト(compile 時解決 → `sensors_applicable`)。例: intent-capture.md:16 | ✅ 確定 |
| 述語の再利用 | sensor 実装 ts から `amadeus-lib.ts` の import は既存 sensor と同型(同ディレクトリ相対 import)| ✅ 確定 |
| enforcement cutoff の継承 | 述語は cutoff 判定を持たない(gate-start 側 handleGateStart が保持)— sensor 側でも cutoff 適用が必要(corpus false-red 回避)。cutoff 定数の共有化は設計判断 | ⚠ 設計で確定 |

## 選択肢の実現性

- **(a) sensor 化**: 既存様式の機械追随で実装可能。advisory(非ブロック)+ `.amadeus-sensors/` finding + 監査 SENSOR_FAILED 行 — 早期 loud 検知の要件に適合。リスク低。
- **(b) lint 化**(テスト/lint スクリプトへの組込): repo の questions ファイル全数を CI で走査する形。CI 面の常時ガードになるが、**cutoff 前 corpus 111 件が対象に入るため cutoff 適用が必須**。走査対象は record ツリー(コミット済み)に限られ、編集中の未コミット先取りは捉えない — sensor(PostToolUse 発火)より検知が遅い。
- 併用可否は application-design で判断(pre-approved)。本評価の見立て: (a) が主経路として十分、(b) は増分価値が cutoff 後 corpus の常時再検査に限られる。

## 工数・規模(保守的見積り)

- sensor manifest 1 + sensor 実装 ts 1(述語呼び出しの薄い adapter)+ stage frontmatter への宣言追加(対象ステージ集合は設計で確定)+ dist×5/self-install×2 再生成 + テスト(落ちる実証 fixture + corpus sweep)。単一 Bolt 規模。
- 前提条件フラグ: stage frontmatter 変更はグラフ compile 対象 — runner-gen drift guard の再生成確認が必要(`bun .claude/tools/amadeus-runner-gen.ts check`)。

## 結論

**実現可能(確信度高)** — 全前提を実測で確認済み。未確定は cutoff 共有化と (a)/(b) 併用の2点で、いずれも設計段の判断事項として引き継ぐ。
