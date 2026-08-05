<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-08-05T13:22:00Z — 起点は Issue-first の #2279。`project.md` § Scope Overrides が「Issue-first の Issue から intent を起動する場合はクロスレビュー2名成立を前提」と定めるため、#2279 がコメント0件だったことを受け、intent-capture の質問起草より先にクロスレビューを実施する順序を採った。
- 2026-08-05T13:24:00Z — `intent-capture:c1`(事前裁定済みの事項は質問せず前提知識として反映)と `requirements-analysis:c5`(既存実装の流儀で決まる事項は問わない)を適用し、質問は Issue 本文で確定していない判断のみに絞る方針とした。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-08-05T13:20:00Z — intent 誕生時のツリーが別 intent のブランチ `tla-authoring`(origin/main から 73 commits 遅れ)だったため、intent-capture 本体に入る前に `origin/main`(`7060956c`)起点の新ブランチ `260805-subagent-type-guard` へ移設した。`intents.json` の7行純追加は移設後に再適用し、`bun -e` の JSON parse と active-intent カーソルで整合を実測。ステージ本文の指示にはない前処理だが、`cid:reverse-engineering:measurement-ref-in-artifacts` と `cid:code-generation:base-advance-regrounding` の趣旨(陳腐化した base で実測しない)に従った。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-08-05T13:33:00Z — Q1 は A(`(a)` 型の許可集合照合 + `(b)` model 属性の記録のみ、`(c)` 汎用 builder persona は別 Issue)を採用。理由: `(c)` は「ad-hoc 名起動の受け皿をどう設計するか」であり、`(a)` の検出が入って実際の型内訳が測れてから決めるほうが根拠を持てる。先に受け皿を作ると実態を知らないまま形を固定することになる。非採用の B は `(c)` 込み、C は `(a)` のみの段階実行。
- 2026-08-05T13:33:00Z — Q2 は C(検出の即時性 + 事後集計の両方)を採用。D(集合外 spawn が運用で実際に減った実証)は本 intent の完了条件ではなく運用後の観測に置く — 完了条件に入れると intent の終了が運用期間に依存してしまうため。

## Conductor spot-check(測定 ref `7060956c5617125dd2f4e284957aa180cb306484` = origin/main)
- 2026-08-05T13:36:00Z — `packages/framework/core/tools/amadeus-lib.ts:4082` 逐語 `  return raw?.trim() ? raw : "unknown";` — Issue の C1 主張(空は "unknown")と一致。
- 2026-08-05T13:36:00Z — `subagentStartFields`(同 :4127-4140)が構成する SUBAGENT_STARTED のフィールドは `"Agent Type"` / `"Agent ID"` / `Purpose` の3つのみで、model 属性は不在。Issue の C3 主張と一致。
- 2026-08-05T13:36:00Z — `ClaudeCodeHookInput`(同 :4703 近傍)は `model` を宣言していないが `[key: string]: unknown` を持つため、ハーネスが供給する場合の読み取り余地は構造的にある。実際に供給されるかは reviewer の C10 実測に委ねる。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-08-05T13:47:00Z — R-1(RE 2.1 へ): Claude Code / Codex の **live** hook payload に `model` が実際に載るか。クロスレビューの C10 は不一致で、reviewer-2 の根拠は fixture(`tests/fixtures/codex-hook-payloads/payloads.json:91-98`)、reviewer-1 は本番供給呼び出しの不在。reviewer-1 自身が「read-only のため live payload をダンプできず、Claude Code の SubagentStop が `model` を一切含まないことは証明していない」と明記している。`cid:reverse-engineering:c1-xrev-mechanism-resolution` により裁定先は RE の scan 段。
- 2026-08-05T13:47:00Z — R-3(RE → RA): 「実効 model」の解決順(明示指定 > agent 定義の model ピン > セッション継承)の各段が実際に取得可能かを実測で固定する。
- 2026-08-05T13:47:00Z — R-4(RE): 許可集合に含める「ハーネス組込型」の実際の語彙(`explore` / `coder` 等)を実測列挙する。定義済み persona 側は `.claude/agents/*.md` から機械導出できるが、組込型は harness 依存。
- 2026-08-05T13:47:00Z — R-2(RA): C4 の集計値を測定 ref 付きで再計測し、出典 intent 名を訂正する(`260805-docs-impl-sync` は実在しない)。
- 2026-08-05T13:47:00Z — R-5(AD 2.6): advisory の出力面(audit 警告イベント / stderr / sensor / doctor)の選択。

## §13 学習選定の裁定(E-STG-S13、2026-08-05)

採用: **choice 1「c3 のみ採用」2-0**。GoA[E-STG-S13]: 2x2(両票 GoA 2 = 軽微な留保付き合意)。
票タイムライン: 配信 2026-08-05T13:48:49Z → subagent-2 受理 13:51:57Z → subagent-1 受理 13:52:23Z → 開票 13:52:39Z。
選挙記録: `amadeus/spaces/default/elections/260805-e-stg-s13/record.md`。persist 先: `project.md:317`。

### 留保の逐語転記(GoA 2 の必須留保 2件 / 転記 2件)

- **留保(subagent-2, GoA2)**: 「c3 は独立した新規 cid ではなく cid:code-generation:base-advance-regrounding への追補(intent 誕生時点の base 面)として、branch 名・commit SHA・73 という intent 固有の値を落とした一般形で persist すること — 同 cid には既に c5-ratchet-census-at-final-base という『既存 cid の未被覆面を追補で埋める』先例があり、独立 cid の新設はノルム層の分散を招く。」
  → **履行済み**: persist 文は追補形式・一般形(branch 名 / SHA / 具体コミット数を落とし「本線から前進遅れ」「二桁コミット遅れ」と記述)。
- **留保(subagent-1, GoA2)**: 「c1 の不採用理由は『価値がない』ではなく『既存ノルムに覆われており、かつ現文言のまま persist すると上位ノルムを弱める』である旨を裁定に明記すること — c1 が示した実効(reviewer 実測が Q3/Q4 の選択肢を規定した)は既存の起動前レビュー規範の裏付け実例として intent record 側に保存し、その保存を不採用の条件とする。」
  → **履行済み**: 直下の2項に明記。

### c1 の不採用理由(subagent-1 留保の履行)

c1 を採用しなかったのは価値がないからではない。(i) `team.md` の
`cid:requirements-analysis:bug-zero-goal` が「Issue-first のクロスレビュー2名成立は種別を問わず着手前提」と既に定め、
`project.md` § Scope Overrides と `cid:reverse-engineering:c1-preexisting-pr-inventory` が
「Issue 起点 intent の開始時(RE/RA 前)」の事前棚卸しファミリを確立しているため**既存ノルムに覆われている**。
(ii) c1 の現文言のまま persist すると「intent-capture の質問起草より先」という**局所的な順序**が
上位の「着手前提」より狭い表現として並置され、上位ノルムを弱める。

### c1 の実効の保存(subagent-1 留保の履行 — 不採用の条件)

クロスレビューを質問起草より先に置いたことは実際に成果を変えた。この事実は既存の
起動前レビュー規範の裏付け実例として以下に保存する:

- reviewer-2 の C10 実測(Codex は `model` を供給済み / Claude Code は `CXR-33` 制約)が **Q3 の選択肢そのものを生成**した。順序が逆なら Q3 は「model 属性を載せるか否か」という粗い問いに留まっていた。
- reviewer-1 の start seam 不発の実測(live `.claude/settings.json` に `PreToolUse` 不在、型未指定199件は100%が `completed` 行)が **Q4 を新設させた**。この質問は Issue 本文からは導けない。
- reviewer 双方の C4 再現不能が、requirements への申し送り R-2(再計測と測定 ref 明記)を生んだ。
- 保存先: 本日誌および `intent-statement.md` の「下流へ引き継ぐ未解決事項」表(R-1〜R-5)。

## Sensor verdict の帰属(2026-08-05T13:47:00Z)
- 本ステージ3成果物への最新 verdict は全て PASSED(required-sections / upstream-coverage / answer-evidence)。
- 本 intent のシャードに現れた `SENSOR_FAILED` 8件のうち **6件は別 intent 由来**(`260805-cross-harness-resume`、worktree `.claude/worktrees/tla-kimi-repro/`、stage slug `requirements-analysis`)。非 active intent への発火が active カーソル側のシャードへ記録される既知挙動(`cid:requirements-analysis:manual-sensor-fire-before-gate-report` 追補3)。
- 残る2件は自分の `intent-capture-questions.md` に対する `answer-evidence` の FAILED(13:28:10Z / 13:28:46Z)で、chat モードにより回答記入前のヘッダのみの状態で自動発火したもの。回答記入後の 13:33:16Z 以降は全て PASSED で、最新は 13:46:20Z PASSED。
