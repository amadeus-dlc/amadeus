# Requirements — 260728-gated-swarm-serializatio

上流入力(consumes 全数): architecture.md、code-structure.md、business-overview.md

- architecture.md: 「swarm dispatch と autonomy ゲーティング」節(observed ec6f16ad81074f7ca4f252afa0d5d91ecbd48538)の実測 — 本書の全 FR の file:line 引用・機序・連動点(FR-1/2/3/6/7 の根拠)はこの節から転記した。
- code-structure.md: 260728 デルタ節 — 患部3ファイル(amadeus-orchestrate.ts / amadeus-directive.ts / stage-protocol.md)の配置と、配布面(dist 7 ハーネス+self-install 5 ツリー)の同期対象一覧(FR-8 / NFR-1 の根拠)。
- business-overview.md: Amadeus のワークフロー製品像(承認ゲートが人間コントロールの中核であること)— FR-2/FR-3 が「ゲートを増やす方向の変更は仕様準拠、減らす方向は不可」という安全側判断の根拠。

## 背景と対象欠陥

GitHub Issue #1612: `Construction Autonomy Mode: gated`(および walking skeleton 完了後の `unset`)のとき、`tryEmitSwarm()`(amadeus-orchestrate.ts:2526 `if (readAutonomyMode(stateContent) !== "autonomous") return false;`)が swarm 自体を拒否し、フォールバックの `orderedUnits`(:2639 `return batches.flat();`)+`nextUncoveredUnit`(:2703 `uncovered[0]`)が DAG 並列可能な Unit を直列実行する。

規範(stage-protocol.md:123-125 verbatim):
> For Bolts after the walking skeleton, the Bolt-level gate is presented only if `Construction Autonomy Mode: gated`. In `autonomous` mode the gate is skipped. For parallel batches the gate covers every Bolt in the batch (single gate, not one per Bolt).

gated は承認頻度の指定であり、並列バッチの実行を前提とする。実装が仕様から逸脱しており、本 intent は**文書化済み仕様への回復**(bugfix)である。

## 承認系譜

- Issue #1612: サブエージェント2体クロスレビュー+conductor 独立検証(3検証)成立済み。
- ユーザー裁定 2026-07-28T07:26:47Z(requirements-analysis-questions.md「裁定の記録」): Q1=A(エンジン主導のバッチ末尾ゲート)、Q2=B(unset ladder 再提示の engine 強制化)、Q3=A(amadeus-bugfix のまま)。

## 機能要件

### FR-1: gated モードでの並列 dispatch

`Construction Autonomy Mode: gated` かつ eligible batch(construction / for_each:unit-of-work / mode:subagent / 非 skeleton-gate ステージ / 未カバー unit を含む DAG バッチ実在)のとき、engine は `invoke-swarm` directive を emit する。

- 受け入れ基準: t135 の fixture(batches `[["a","b"]]`、`seedCodegenProject("gated")`)で `next` が `{"kind":"invoke-swarm","units":["a","b"]}` を返す。現行 test 2(tests/integration/t135-invoke-swarm.test.ts:300-307、gated→run-stage を契約化)は新契約へ書き換える。
- 落ちる実証: 修正前実装で新テストが赤いこと(元症状 = run-stage が返る)を実測してから green 化する(regression-first)。

### FR-2: バッチ末尾ゲート(engine 遷移の新設)

gated の swarm 経路で、あるバッチの全 unit が covered になった後の `next` 再入時、engine は次バッチの `invoke-swarm` を emit する**前に**バッチ末尾ゲートの directive を emit する。ゲート承認の report が commit されるまで次バッチへ進まない(fail-closed)。

- ゲートの directive 形(ask 形か gate 付き再入形か)、承認の report 語彙、state への記録形式は plan(code-generation 設計)で確定する。ただし次を要件として固定する:
  - (a) ゲートは engine 強制であること — conductor prose・Stop hook 依存の運用ゲートは不可(P2)。
  - (b) バッチ全体を1ゲートでカバーする(unit ごとではない — 仕様 :125)。
  - (c) `autonomous` では従来どおりゲートなしで次バッチへ(挙動不変)。
  - (d) 最終バッチ後は既存の全 covered 再入ゲート(emitPerUnitRunStage:2757)と重複させない — 「最終バッチのバッチ末尾ゲート」と「ステージ本ゲート」の関係を plan で一意化し、ゲートが2連続で出ないこと。
  - (e) 監査イベントは既存タクソノミ(knowledge/amadeus-shared/audit-format.md)から選ぶ。新イベント名の発明が必要な場合は実装前に停止してユーザー裁定(implementation-deviation-election のソロ適用 = ユーザーエスカレーション)。
- 受け入れ基準: 2バッチ DAG(例 `[["a","b"],["c"]]`)の gated fixture で、batch 1 covered 後の `next` がゲート directive を返し、承認 report 前は `invoke-swarm(["c"])` を emit しない/承認後は emit する、をテストで固定する。

### FR-3: walking skeleton 完了後 unset の ladder 再提示(engine 強制)

walking skeleton が完了済み(skeleton-gate ステージの完了が state から判定可能)かつ `Construction Autonomy Mode` が unset のとき、per-unit Construction 段への `next` は ladder 再提示の `ask` directive を emit する。回答が state に記録される(`AUTONOMY_MODE_SET`、amadeus-bolt.ts set-autonomy 経由)まで run-stage / invoke-swarm を emit しない。

- 根拠: stage-protocol.md:121「Session resume: if `Construction Autonomy Mode: unset` but the walking skeleton is already `[x]` complete, re-fire the ladder prompt before executing the next Bolt.」の engine 強制化(ユーザー裁定 Q2=B)。
- 受け入れ基準: skeleton 完了+unset の fixture で `next` が ask(ladder)を返す/`--mode gated` 記録後の `next` が FR-1 の invoke-swarm を返す、をテストで固定する。skeleton 未完了の unset(正当な初期状態)では従来挙動(ladder を出さない)であることも対で固定する。
- 「skeleton 完了」の判定述語は弱い述語(ディレクトリ実在等)を使わず、state の checkbox/フィールドから導出する(cid:nfr-design:observed-entity-from-failure-mode の適用)。判定元 field は plan で file:line 固定する。

### FR-4: autonomous 挙動の回帰不変

autonomous の swarm 経路は一切挙動を変えない。

- 受け入れ基準: t135 test 1/1b(:288-298)、t211 a/b/c、t251 guard 1/2/2b、t186 test 13(:532)が無改変で green。

### FR-5: skeleton 構造ガードの不変

`isSkeletonGateStage`(:1271-1275)による swarm 拒否は autonomy 値に関わらず維持する(gated 化しても skeleton-gate ステージは swarm しない)。

- 受け入れ基準: t135 test 7(:309-319、bugfix スコープで autonomous でも run-stage)が無改変で green。gated でも同様に swarm しないケースを追加で固定する。

### FR-6: approve 側カバレッジガードの対称更新

:3824-3826 の `isAutonomousSwarm` は tryEmitSwarm トリガの verbatim 写しであり(:3810-3821 のコメントがデッドロックを明示警告)、FR-1 のトリガ変更と**同一変更で対称に**更新する。gated swarm でも「バッチ単位の前進」が approve ガードに拒否されないこと。

- 受け入れ基準: gated 2バッチ fixture で batch 1 のバッチ末尾ゲート承認(FR-2 の report)がカバレッジガードに拒否されず、`next` が batch 2 を提示するテスト(デッドロック回帰)。t186 test 6/6b(早期 approve 拒否)は無改変で green。

### FR-7: readAutonomyMode の3値化

`readAutonomyMode`(:1164-1168)の「3値(autonomous/gated/unset)→2値潰し」を、判別可能な3値を返す形へ変更する(parse, don't validate)。未知の値(typo 等)は unset 扱いではなく安全側(swarm しない・既存コメント :1155-1157 の趣旨維持)に落とし、その分岐をテストで固定する。

- 消費箇所は全数棚卸しする(現行実測: :2526 / :3825 の2箇所+FR-3 の新規判定。実装時に第3の消費が生まれた場合は棚卸しへ追記 — enumeration-reverify-at-implementation)。

### FR-8: 契約文書・consumer 面の同期

同一変更で次を同期する:

- `packages/framework/harness/*/skills/amadeus/SKILL.md` の invoke-swarm 表行: :64 の「emitted only for an eligible Construction batch under an `autonomous` grant」を新契約(autonomous または gated grant、gated はバッチ末尾ゲート付き)へ改訂。手順 (5) finalize 後の gated 分岐(engine のゲート directive に従う旨)を追記。
- `stage-protocol.md`: 仕様本文は正のまま維持。:409 の「(off the swarm path)」等、直列前提の記述が新契約と矛盾しないか棚卸しし、必要な最小改訂のみ行う。
- docs 対訳ペア: docs/harness-engineering/08-construction-and-swarm.{md,ja.md}(:47/:61/:96/:103/:274 の autonomy 記述)、docs/guide/glossary.{md,ja.md}、docs/reference/06-hooks-and-tools.{md,ja.md} / 12-state-machine.{md,ja.md} / 17-skill-system.{md,ja.md} のうち gated/swarm 挙動を記述する箇所。対象語彙の repo 全域 grep(docs/ + 正本知識ファイル両域)で対象面を導出する(enumeration-completeness-review 追補)。
- 配布面: 正本編集後に `bun scripts/package.ts`(dist 7 ハーネス: claude/codex/cursor/opencode/kimi/kiro/kiro-ide)+`bun run promote:self`(self-install 5 ツリー)。

### FR-9: リグレッションテストと落ちる実証

- 元 Issue の再現手順(t135 fixture、gated)を verbatim 再適用して閉包を実証する(fix-review-replays-origin-repro)。
- 新設ゲート遷移(FR-2)・ladder 強制(FR-3)は、失敗ケース注入で実際に赤くなることを実証してから完成扱いにする(org.md Mandated「落ちる実証」)。注入はテストが実際に読む面(正本 vs dist)を実測確認してから行う(injection-surface-verify)。

## 非機能要件

### NFR-1: 検証境界

`bun run typecheck` / `bun run lint` / `bun run dist:check` / `bun run promote:self:check` / `bash tests/run-tests.sh --ci` 全 green。push 前にローカル lcov で diff 追加行の未カバー 0 を実測(local-lcov-pre-push)。complexity ゲート・coverage ratchet・patch gate を通過する。

### NFR-2: 契約互換

- stdout = directive JSON / stderr = advisory の engine 契約を維持(stdout-directive-stderr-advisory)。
- `InvokeSwarmDirective` へのフィールド追加は後方互換(既存 consumer が units/repo のみ読んでも壊れない)とする。directive の VALID_KINDS へ新 kind を足す場合は stop hook の PENDING 判定(amadeus-stop.ts:1076)との整合を同一変更で取る。
- Bun-only(新規ランタイム依存の追加禁止)。

## スコープ外(Out of Scope)

- 固定トポロジカルバリアの動的 ready-set 化(Issue #1612 が「関連する独立論点」と明示する事項)。DAG 生成(amadeus-lib.ts:7436-7457)には触れない — #1628 系 PR(#1636 が amadeus-lib.ts を変更中)との交差回避を兼ねる。
- Delivery Planning `bolt-plan.md` と実行系の接続。
- Bolt 1 完了の自動導出による ladder 自動発火のさらなる機構化(FR-3 の ask 強制で本 Issue の範囲は閉じる)。

## トレーサビリティ

- Issue #1612(クロスレビュー2+1成立)→ 本 requirements。
- stage-protocol.md:104-125(ladder / Subsequent Bolt gate)→ FR-1/2/3。
- ユーザー裁定 Q1=A/Q2=B/Q3=A(2026-07-28T07:26:47Z)→ FR-2(engine 強制)/FR-3(ask 強制)/スコープ維持。
- codekb architecture.md「swarm dispatch と autonomy ゲーティング」節 → 全 file:line 引用の出典。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-07-28T07:33:35Z
- **Iteration:** 1
- **Scope decision:** none

READY iteration 1 (2026-07-28T07:31:34Z UTC): 全 file:line 引用・裁定転記・answer-evidence を独立照合し一致、Minor 1件(stage-protocol.md 行番号 :119-120→:121)は conductor が record 全域 grep で是正済み(0 hits)。

### Findings

- Minor: stage-protocol.md の行番号引用ずれ(:119-120 → 正 :121)— requirements.md:48 / questions.md:19,22。是正済み(record 全域 grep 0 hits)。
