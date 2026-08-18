# Requirements — 260818-priority-bug-batch-4

## Upstream Inputs

- `<record>/ideation/intent-capture/issue-evidence.md` — PRIMARY(#2837 / #3106 の本文 verbatim + 独立2名のクロスレビュー、run xrev-2837-20260818 / xrev-3106-20260818、target SHA `127be70c5`)。確立済み事実(機序・file:line・受け入れ条件)は本書へ転記せず同 artifact を引く
- `amadeus/spaces/default/codekb/amadeus/business-overview.md` — 本 intent 節が記すとおり、focus 2 件はいずれも Construction 実行経路を「止める」側の欠陥であり、inception 固定費削減(47分→35分未満目標)の次の焦点が実行経路の信頼性にある
- `amadeus/spaces/default/codekb/amadeus/architecture.md` — 本 intent 節が記す focus 2 件のアーキテクチャ上の位置(batch identity を保持しながら emit 境界で捨てる経路 / 同一監査ストリームへの 2 読み口の可視性不一致)
- `amadeus/spaces/default/codekb/amadeus/code-structure.md` — 本 intent 節が記す患部配置(除外後差分 2551 行に focus 機構の変更なし)とテスト置き場(t533 integration :786-801 の対)

## Intent Analysis

クロスレビュー成立済みの S3 バグ2件を修正し、Construction 実行経路の構造停止クラスを2面閉じる。(1) #2837: swarm dispatch の directive が batch identity と convergence check コンテキストを搬送せず、conductor が engine-owned routing を推測再導出しないと実行できない。(2) #3106: per-unit 経路で cancelled になった unit が terminal outcome 行を持たず、下流 consume が `producer-outcome-pending` で構造停止する(reviewer-1 が end-to-end 再現済み — issue-evidence.md の再現手順5段)。

2 Issue = 2 Unit(units-generation / delivery-planning EXECUTE へ recompose 済み)。両 unit は `amadeus-orchestrate.ts` を共有するため直列化が必要。

## Functional Requirements

### FR-2837-1: invoke-swarm directive の実行コンテキスト搬送

新規 batch arm の `invoke-swarm` directive で、conductor が推測なしに fixed Unit pool 手順(prepare / check / finalize)を実行できる契約にする。搬送すべき値: 1-origin batch 番号、再進入時に旧 terminal pool と衝突しない batch/pool identity。実装形は application-design の設計裁定(選挙)事項 — A: directive フィールド拡張(起票者推奨。既存 `prepared_batch` / `retry_unit` arm との整合必須 — C15)/ B: read-only context verb 新設。受け入れ: 全配送先 tree の conductor 面が engine-owned routing を再導出せずに batch 番号を取得できること。

### FR-2837-2: convergence check コンテキストの供給契約

`check` / `finalize` に渡す check_cmd(必要なら protected test_file)の供給責任者を確定し契約に明記する。現行は「conductor の知識」(amadeus-swarm.ts:233 の設計コメント)だが、engine 側の明示宣言は不在(reviewer-1 未解決6)。design で供給責任者を裁定し、conductor 面の手順が正規の取得元を名指す形にする。受け入れ: 供給責任者と正規取得元が契約文書(directive 契約または conductor 面本文)に明記され、全 conductor 面の手順から取得元記述を grep で実測できること(各面 1 hit 以上 / exit 0。0 件の面が残れば fail)。

### FR-2837-3: engine 正本 + 7 conductor 面の同期

修正先は harness 表層でなく engine(`amadeus-directive.ts` + `amadeus-orchestrate.ts`)であり、`--batch <n>` 手動指定を要求する 7 conductor 面(claude / codex / kimi / kiro / kiro-ide / cursor / opencode — codekb component-inventory.md の census)を同一変更で同期する(C16)。受け入れは配送先ツリーの述語で書く(ソース断面 green で代替しない)。

### FR-2837-4: 回帰テスト(batch identity)

(a) directive(または context 取得面)が正しい 1-origin batch 番号を搬送することの直接検証、(b) 旧 batch が terminal の状態で同一 Unit を再実行しても batch/pool identity が衝突しないことの回帰テスト(Issue 完了条件)。既存空隙: t135 は kind/units/cap の3面のみ、--batch は全てハードコード(codekb code-quality-assessment.md のテスト空白節)。

### FR-2837-5: 死んだ SKILL.md 手順参照の解消(同根 A、Q1=B 裁定による同梱)

`amadeus-bolt.ts:435-441`(「SKILL.md Step 6.5's git-merge dispatch」)と `amadeus-state.ts:6117-6121`(「SKILL.md Step 0.6 recovery seam」)の stale コメント参照を、現存する conductor 面の実手順(または手順非依存の記述)へ更新する。挙動不変のコメント修正。受け入れ: `grep -rn "Step 6.5" packages/` および `Step 0.6` の SKILL.md 参照が 0 件(exit code 確認付き)。

### FR-3106-1: per-unit 経路 cancelled / failed unit の terminal outcome 記録

per-unit 経路で cancelled になった unit に terminal outcome の記録経路を追加し、`producer-outcome-pending` 構造停止を解消する。**failed unit も同じ設計裁定の対象に含める**(issue-evidence.md reviewer-2 SR1: per-unit 経路では failed unit にも行が付かず、設計意図 `producer-outcome-failed`(orchestrate.ts:4127-4128 の逐語)でなく `producer-outcome-pending` が出て診断が原因を指さない)。記録方式は選挙裁定(Issue 完了条件2。E-260815-3099 系裁定の `Outcome: succeeded` 限定との関係整理を含む)。受け入れ: (a) reviewer-1 再現手順(solo Skip → 下流 stage `next`)が exit 0、(b) failed producer の下流診断が `producer-outcome-failed` を返す(選挙が failed の記録を採る場合)— 採らない裁定なら根拠を design 成果物に記録。

### FR-3106-2: 落ちる実証(修正前 Red)

per-unit settle × cancelled の失敗テストを先に追加して Red を実測し、修正で Green にする(TDD 既定)。置き場: `tests/integration/t533-per-unit-consume-fanout.integration.test.ts` の pool 版 cancelled ケース(:786-801)と対になる位置。

### FR-3106-3: pool 経路との対称性

cancelled unit の下流 consume 挙動は pool 経路と同一にする: consumer を止めず、当該 unit の成果物 paths は emit しない(既存 t533 の pool 版が固定する挙動)。非対称の解消が本 Issue の完了定義であり、新しい第3の挙動を発明しない。

### FR-3106-4: docs の既知限界段落の更新

`docs/guide/15-troubleshooting.md:143` の「Cancelled Units are not settled.」段落を修正後の実挙動へ更新する。`.ja.md` は同一文字列 grep 0 hit(RE 申し送り)のため、対訳側の実文言を実読特定してから同一変更で同期する。受け入れ: 旧既知限界の記述(cancelled unit が pending を残す旨)が英日両面で 0 件(grep exit 1、exit code 確認付き)、かつ新挙動の記述が英日各 1 hit 以上(grep exit 0)。

## Non-Functional Requirements

- **台帳 resync**: `amadeus-orchestrate.ts` を変更する PR は model-map 実装ハッシュピンと coverage-patch-allowlist 意味的セレクタの resync を同一変更で行う(cid:build-and-test:bt-ledger-resync)。新規テストファイル追加時は coverage-registry regen も同梱(cid:build-and-test:c1)
- **検証順序**: remote-first / push-first(commit 次第 push + PR 作成、blocking 検証はリモート CI 正)
- **配送**: per-unit PR、record checkpoint 同梱、直列着地(intents.json 競合は再構成 + uuid 一意性検査)

## Constraints

- 両 unit が `amadeus-orchestrate.ts` を共有 — delivery-planning で直列化を計画する(並行実装しない、または patch 面を分離)
- scope self-fix(depth Minimal)+ recompose で AD / UG / DP を EXECUTE(2 unit 配送の成立要件)
- #2837 の修正が `invoke-swarm` の directive shape を変える場合、`amadeus-directive.ts` の閉語彙(`INVOKE_SWARM_FIELDS`)と validator、t135 / t181(conductor skill parity)/ t113 の期待更新が連動する

## Assumptions

- クロスレビュー確立事実(機序・再現・census)は再導出せず所与として消費する(#3181 の運用契約どおり)
- #3106 の記録方式選挙は construction 段(application-design または code-generation)で実施する — RA では方式を予断しない

## Out of Scope

- 他 directive kind の開示非対称の棚卸し(reviewer-1 対称面 B — 別途)
- 推測 batch 番号が gated 承認台帳を実際に誤らせるかの実測(reviewer-1 未解決5 — 修正後は前提が消滅)
- #2833(Abort 後の forwarding-loop 継続)— 関連だが別 Issue
- #2837 クロスレビューが flag した他の同根候補は**意図的にスコープ外**とし、別 Issue 起票候補として承認ゲートでユーザーへ提示する(選定はユーザー — cid:requirements-analysis:issue-selection-user-decides): (a) C7 stale Bolt Refs 復旧手順の順序不能 (b) C11/C12 finalize が Git 未統合のまま converged を返す偽 green(reviewer は S2-CRITICAL 候補と指摘) (c) Stop hook の batch 途中 stage report 拒否 (d) C13/C14 prepare の既定 base がブランチ名。Q1=B 裁定が同梱したのは stale SKILL.md コメント参照 2 箇所のみ

## Open Questions

- test_file(protected spec)の供給責任者の最終形 — FR-2837-2 の design 裁定で確定する
- E-260815-3099 系裁定(`Outcome: succeeded` 限定)との整合方式 — FR-3106-1 の選挙で確定する

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-18T07:54:51Z
- **Iteration:** 1
- **Scope decision:** none

Most Issue #2837/#3106 completion criteria and refinements map cleanly to FRs, but the confirmed #3106 same-root failed-unit finding (SR1) is entirely unaddressed and FR-2837-2 lacks a testable acceptance line.

### Findings

- BLOCKER | issue-evidence.md #3106 reviewer-2's CONFIRMED SR1 finding (failed units hit the same producer-outcome-pending hole and should be part of the fix's design consideration) has no FR, Constraint, Assumption, or Out-of-Scope entry in requirements.md, contradicting the document's own claim that cross-review established facts are consumed
- FOLLOW-UP | FR-2837-2 is the only FR without an explicit acceptance-check sentence (Minimal-depth Step 10 requires one); it only defers to a future design decision with no observable pass/fail line
- FOLLOW-UP | Out of Scope does not record disposition for #2837's other reviewer-flagged same-root findings (C7 stale Bolt Refs recovery order, C11/C12 finalize false-green with no Git integration flagged as a possible S2-CRITICAL, Stop-hook mid-batch report rejection, C13/C14 prepare's branch-name default base) beyond the narrowly Q1-scoped SKILL.md comment fix
- FOLLOW-UP | FR-3106-4 (docs update) states no verification predicate, unlike the exit-code-checked acceptance given for the analogous FR-2837-5

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-18T07:59:43Z
- **Iteration:** 2
- **Scope decision:** none

All four iteration-1 findings (BLOCKER SR1 omission, FR-2837-2 acceptance gap, Out-of-Scope disposition gap, FR-3106-4 predicate gap) are verifiably resolved against issue-evidence.md with no new contradictions introduced.

### Findings

- NIT | FR-3106-2's falling-proof placement mentions only the cancelled case; if the FR-3106-1(b) election adopts the failed-unit fix, an analogous failed-unit Red test isn't explicitly named (covered implicitly by the team's blanket TDD-for-error-paths default, so non-blocking).
