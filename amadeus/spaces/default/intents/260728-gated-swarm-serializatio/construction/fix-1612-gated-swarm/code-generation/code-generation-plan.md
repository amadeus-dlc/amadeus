# Code Generation Plan — fix-1612-gated-swarm

上流入力(consumes 全数): requirements.md — FR-1〜FR-9 / NFR-1〜2 を実装契約として本 plan の全 Step が参照する(functional-design / nfr-design / infrastructure-design の consumes は scope SKIP により expected-absent、requirements.md が直接の契約)。

対象: Issue #1612。`Construction Autonomy Mode: gated` / walking-skeleton 完了後 `unset` での DAG 並列 Unit 直列化を、仕様(stage-protocol.md:123-125)へ整合させる。ユーザー裁定: Q1=A(エンジン主導バッチ末尾ゲート)/ Q2=B(unset ladder 再提示の engine 強制)/ Q3=A(amadeus-bugfix)。

## 設計決定(requirements が plan へ委ねた事項の確定)

### D-1: readAutonomyMode の3値化(FR-7)

`readAutonomyMode(stateContent): "autonomous" | "gated" | null` へ変更する(amadeus-orchestrate.ts:1164-1168)。

- `"autonomous"` / `"gated"` は exact match で保持。
- フィールド不在・空 → `null`(unset)。
- **未知の値(typo 等)→ `null`(unset 意味論)**: unset は D-3 により skeleton 完了後は ladder 再提示 ask で人間へ戻るため、ゴミ値は「swarm もせず、人間に再選択させる」安全側+自己回復の分岐になる。skeleton 未完了時の unset は従来どおり非 swarm 直列(挙動不変)。この分岐(bogus 値 → 非 swarm)をテストで固定する。
- 消費箇所の全数棚卸し(実装時に再列挙 — enumeration-reverify-at-implementation): :2526(tryEmitSwarm トリガ)、:3825(approve ガード)、D-2/D-3 の新規判定。

### D-2: gated swarm とバッチ末尾ゲート(FR-1/FR-2)

**トリガ変更(tryEmitSwarm :2526)**: `readAutonomyMode(...) === null` のとき return false(unset は非 swarm)。`"autonomous" | "gated"` は swarm 経路へ進む。skeleton-gate ステージの構造ガード(:2525)は不変。

**バッチ末尾ゲート(engine 遷移の新設)**: gated のとき、バッチ選択ループ(:2529-2551)を次のように拡張する:

- covered なバッチ k(1-origin のバッチ番号)があり、その次の未カバーバッチが存在し、かつバッチ k が**未承認**(state の承認台帳に無い)なら、invoke-swarm を emit せず **`ask` directive**(既存 kind — 新 kind は作らない)を emit する。message は「バッチ k(units: …)が完了。承認して次バッチへ進むか」+ 承認コマンド `bun .claude/tools/amadeus-bolt.ts approve-batch --batch <k>` + 再開手順(re-run next)を名指しする。
- 全バッチが covered なら従来どおり return false → emitPerUnitRunStage の all-covered 再入でステージ本ゲート(FR-2d: 最終バッチのバッチ末尾ゲートは出さない — 本ゲートが最終バッチのゲートを兼ねる。二重ゲート禁止)。
- autonomous は承認台帳を参照せず従来どおり(FR-2c、挙動不変)。
- ゲートは engine 強制: 承認台帳に載るまで次バッチの invoke-swarm を emit しない(fail-closed)。

**承認の永続化**: `amadeus-bolt.ts` に `approve-batch --batch <n>` サブコマンドを追加する(autonomy フィールドと同じ bolt ドメイン)。state フィールド `Swarm Gated Batch Approvals`(カンマ区切りのバッチ番号列、数値 parse — verification-numeric-parse 準拠)へ追記し、監査は既存タクソノミの `GATE_APPROVED`(バッチ番号・unit 列をメタデータに含む)を emit する。新イベント名は発明しない(FR-2e)。冪等: 既承認バッチへの再実行は no-op + 明示メッセージ。engine 側は同フィールドを読み取り専用で参照する。

### D-3: unset ladder 再提示の engine 強制(FR-3)

per-unit Construction ステージ(for_each:unit-of-work)への `next` で、(a) 当該ステージが skeleton-gate ステージでない、または skeleton-gate ステージの完了が state checkbox で `completed` と判定でき、かつ (b) `readAutonomyMode === null` のとき、run-stage / invoke-swarm の代わりに **ladder 再提示の `ask` directive** を emit する。

- 「skeleton 完了」の判定述語: state のステージ checkbox(skeleton-gate ステージ slug の checkbox state === "completed")から導出する。ディレクトリ実在等の弱い述語は使わない。skeleton-gate ステージ slug は既存の `isSkeletonGateStage` / `firstInScopeStageOfPhase("construction", scope)` から導出(ハードコードしない)。
- ask message は stage-protocol.md:104-121 の ladder prompt を要約し、記録コマンド `bun .claude/tools/amadeus-bolt.ts set-autonomy --mode <autonomous|gated>`(既存、AUTONOMY_MODE_SET を emit)+ re-run next を名指しする。
- skeleton 未完了の unset(正当な初期状態)では ladder を出さない(従来挙動、対のテストで固定)。
- 配置: tryEmitSwarm 呼び出しの前段(:2450/:2476 の分岐付近)または emitPerUnitRunStage 冒頭 — 実装時に両呼び出し経路(in-flight / advance)を通ることを確認して1箇所に置く。

### D-4: approve ガードの対称更新(FR-6)

:3824-3826 の `isAutonomousSwarm` を「swarm 駆動」判定へ改める: `node.mode === SWARM_MODE && readAutonomyMode(stateContent) !== null`(autonomous または gated)。gated のバッチ進行も all-units カバレッジガードから除外され、バッチ k 承認→次バッチ提示がデッドロックしない。unset(非 swarm 直列経路)ではガード維持。コメント(:3810-3821)も新契約へ改訂する。トリガ(D-2)との対称を同一 diff 内で保つ。

## 変更ファイル目録(見込み — 実装時に実 diff で確定)

- `packages/framework/core/tools/amadeus-orchestrate.ts` — D-1/D-2/D-3/D-4
- `packages/framework/core/tools/amadeus-bolt.ts` — approve-batch サブコマンド(D-2)
- `packages/framework/harness/*/skills/amadeus/SKILL.md`(claude/codex/kimi/kiro/kiro-ide 等、invoke-swarm 表行を持つ全ハーネス)— :64 の autonomous-only 記述改訂+手順 (5) の gated 分岐(FR-8)
- `packages/framework/core/amadeus-common/protocols/stage-protocol.md` — :409「(off the swarm path)」等の直列前提記述の最小改訂(仕様本文 :123-125 は不変)
- docs 対訳ペア: docs/harness-engineering/08-construction-and-swarm.{md,ja.md} / docs/guide/glossary.{md,ja.md} / docs/reference/06-hooks-and-tools.{md,ja.md} / 12-state-machine.{md,ja.md} / 17-skill-system.{md,ja.md} のうち対象語彙 grep でヒットする箇所(FR-8 の両域 grep で導出)
- テスト: tests/integration/t135-invoke-swarm.test.ts(test 2 書換え+gated swarm/バッチゲート追加)、tests/unit/t186-foreach-per-unit-iteration.test.ts(test 12 改訂+unset ladder テスト)、tests/unit/t211-swarm-batch-progress.test.ts(gated バッチ進行)、tests/unit/t33.test.ts(approve-batch CLI 契約追加)。新規テスト番号は原則予約不要(既存ファイル拡張を優先)。
- 生成物: dist 7 ハーネス+self-install 5 ツリー(`bun scripts/package.ts` + `bun run promote:self`)

## Steps

1. **Red 先行(FR-9 落ちる実証)**: t135 に新契約テスト(gated → invoke-swarm)を追加して現行実装で赤を実測。既存 test 2 は新契約へ書換え(この時点で赤)。
2. D-1 readAutonomyMode 3値化+単体分岐テスト(bogus 値含む)。
3. D-2 トリガ変更+バッチ末尾ゲート emit+approve-batch サブコマンド(t33 に CLI 契約テスト: 正常/冪等/数値不正拒否)。
4. D-3 unset ladder ask(skeleton 完了/未完了の対テスト)。
5. D-4 approve ガード対称更新+デッドロック回帰テスト(gated 2バッチ: batch1 承認→batch2 提示)。
6. 回帰確認: t135 test 1/1b/7、t186 test 6/6b/13、t211 a/b/c、t251 guard 1/2/2b 無改変 green(FR-4/FR-5)。
7. FR-8 文書同期: 対象語彙(invoke-swarm / autonomous grant / gated / off the swarm path)の repo 全域 grep(docs/ + 正本知識)→ 該当箇所改訂(EN/JA 同一変更)。
8. dist/self-install 再生成+`bun run dist:check` / `bun run promote:self:check`。
9. 全検証: `bun run typecheck` / `bun run lint` / `bash tests/run-tests.sh --ci`、ローカル lcov で diff 追加行未カバー 0(配線行・catch 行の個別確認含む)、complexity ゲート。
10. code-summary.md 起草(変更目録は実 diff から転記)。

## 制約・ガードレール

- 逸脱(要件・本 plan からの乖離、既存様式準拠と判断する場合も含む)は実装前に停止して conductor へ報告(deviation-stop-before-implement / deviation-applicability-not-solo)。
- 監査イベントは既存タクソノミのみ(GATE_APPROVED / AUTONOMY_MODE_SET)。不足時は停止(FR-2e)。
- stdout=directive JSON / stderr=advisory 契約維持。invoke-swarm の shape 変更なし(ask 既存 kind を使うため directive 追加なし — stop hook の PENDING 判定も変更不要。ただし実装時に amadeus-stop.ts の ask 扱いを確認し、必要なら同一変更で整合)。
- amadeus-lib.ts の DAG 生成(:7436-7457)には触れない(Out of Scope、#1636 交差回避)。
- dist/・self-install を直接編集しない(正本編集→再生成のみ)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-28T09:02:09Z
- **Iteration:** 1
- **Scope decision:** none

READY iteration 1 (2026-07-28T09:01:25Z UTC): 実 diff・file:line 全一致、typecheck/dist:check/t135+t211+t33=58pass/t186 無改変 15pass を独立再実行、トリガ⇔approve ガードの verbatim 対称・FR-2d 二重ゲート禁止・FR-3 従来挙動維持・FR-7 fail-closed を実装+テストで閉包確認。申告3件は妥当、無申告逸脱・互換シム混入なし。findings 0。

### Findings

- None
