# Requirements — 260719-cursor-complete-clear(Issue #1248)

上流入力(consumes 全数): business-overview, architecture, code-structure

## Intent 分析

[Issue #1248](https://github.com/amadeus-dlc/amadeus/issues/1248) の修正。intent が complete になっても機械ローカルの `amadeus/spaces/<space>/intents/active-intent` カーソルが解放されず、以後の全セッションでフック群(HUMAN_TURN・センサー発火・セッションライフサイクル)が完了済み intent の監査シャードへ毎ターン追記し続ける。目標は「完了した intent の record が完了後に汚染されない」状態の回復であり、単なるカーソル削除ユーティリティの追加ではない。

- 欠陥クラス: set⇔clear の対操作非対称(`architecture.md` の「active-intent カーソルの set⇔clear 非対称と監査ルーティング」節に RE で記録済み。symmetric-pair-review が指す片側実装クラスタ)。
- 起点実測(#1248 起票+クロスレビュー2名 CONFIRMED): 260718-hooks-config-conflict 完了後にシャードへ 6,000 行超の完了後イベントが蓄積、record-sync PR 2本(#1246/#1247)で回収してもカーソル残留により再汚染(モグラ叩き)、カーソル手動削除(7,825行)で停止。
- 原因の所在: bootstrap 初期実装由来(`origin:bootstrap`、カーソル機構初出 `5cfb16165`)のライフサイクル設計欠落 — 要件見落としクラス。

## 機序(RE 実測、observed HEAD `a326f47bc`)

`code-structure.md` が示すハーネス中立層 `packages/framework/core/tools/` 内で完結する機序:

1. カーソル書き手は2箇所のみ — `amadeus-lib.ts:1729`(`setActiveIntentCursor`、intent 切替)と `:2147`(birth)。クリア経路はコードベースに存在しない。
2. `handleCompleteWorkflow`(`amadeus-state.ts:1550-1680`)は registry status 前進(`updateIntentStatus(pd, dir, "complete")` :1668-1669)まで行うがカーソル非操作。
3. 読み手 `activeIntent`(`amadeus-lib.ts:1059-1084`)は `records.includes(raw)`(:1074)のみで判定し registry status 不参照。**カーソル不在でも空間内 record が1件なら lone-intent fallback(:1080)で解決が継続する**(scratch 実証: 単一 intent ではカーソル削除だけで追記は止まらない)。
4. 監査追記チェーン `appendAuditEntry`(`amadeus-audit.ts:281`)→ `ensureAuditFile`(:237)→ `auditFilePath`(`amadeus-lib.ts:2181`)→ `recordDir` → `activeIntent` の全段に status ゲートなし。追記到達フックは7つ(mint-presence, audit-logger, sensor-fire, session-start, session-end, validate-state, log-subagent — 主犯は mint-presence:73-74 の state 実在のみゲート)。

## 機能要件

### FR-1: 修正方式【裁定待ち — E 選挙 Q1(A: complete 時 clear のみ / B: status ゲートのみ / C: 両方 / D: その他 / E: 修正しない)。裁定成立後に確定文を記入する】

【裁定待ち】

### FR-2: 完了後追記の停止(受け入れ基準 — 方式に依らず不変)

- AC-2a: intent を complete-workflow で完了させた後、監査追記を発生させる代表フック経路(mint-presence の HUMAN_TURN、一般 append の SENSOR_FIRED)を発火させても、完了済み intent のシャード行数が増えない。
- AC-2b: 回帰テストは #1248 クロスレビューの scratch 再現手順を導出元とする(fix-review-replays-origin-repro — PR レビュー時に verbatim 再適用可能な形): (i) scratch workspace で complete-workflow 実行 → (ii) 修正前は SENSOR_FIRED(CLI)69→76行・HUMAN_TURN(実フック+`CLAUDE_PROJECT_DIR` override)76→82行の増加が成立していた経路で、修正後は行数不変 (iii) 単一 intent 空間(lone-intent fallback 経路)でも停止すること。
- AC-2c: 完了していない intent(in-flight)への監査追記は従来どおり成立する(フェイルセーフの過剰阻止がない)。

### FR-3: 完了前ワークフローの非退行

- AC-3a: birth → 各ステージ gate-start/approve → complete-workflow の正常系で、監査行(STAGE_COMPLETED / PHASE_COMPLETED / PHASE_VERIFIED / WORKFLOW_COMPLETED)は従来どおり自 intent のシャードへ記録される(complete-workflow 自身の監査4行は完了処理の一部として記録が完了してから解放/ゲートが効く順序であること)。
- AC-3b: park/unpark・resume・intent 切替(`intent <name>` verb)の既存挙動を変更しない(park は resume がカーソルを前提とするため、カーソル解放は complete に限る — E-OC1 選挙不要判定・leader 承認 2026-07-19T14:50:57Z)。
- AC-3c: 既存テストスイート(`bun run typecheck` / `bun run lint` / `tests/run-tests.sh --ci` / `dist:check` / `promote:self:check`)がグリーンを維持する。

### FR-4: 混入済みイベント行の遡及削除はスコープ外(E-OC1 選挙不要判定・leader 承認 2026-07-19T14:50:57Z)

シャードは append-only(org.md)。完了後に既に混入した行の回収は record-sync PR の従来運用(#1246/#1247 実施済み)であり、本 intent はコード修正+回帰テストのみを扱う。

## 非機能要件

- NFR-1(移植性): 修正は Bun ランタイム・macOS/Linux 両対応(bun-readfilesync-dir-platform-divergence 類の実装差に注意)。ハーネス中立層 `packages/framework/core/` を正本とし、6ハーネス dist+self-install へ `bun scripts/package.ts`+`bun run promote:self` で同期(dist:check / promote:self:check で機械検証)。
- NFR-2(カバレッジ): 新規行は codecov patch ゲート対象。フック経路は spawn 盲点(bun-coverage-spawn-blindspot)に入るため、判定ロジックは in-process seam(exported 関数)として設計し、実 FS を使うテストは tests/integration 層へ置く(fs-tests-integration-first)。push 前にローカル lcov で diff 追加行未カバー 0 を実測(local-lcov-pre-push)。
- NFR-3(フェイルセーフ方向): ゲート系判定の失敗(registry 読取不能・status 不明)は無音 fail-open にしない。判定不能時の挙動は設計段で明文化する(verification-numeric-parse の教訓 — 型不正・parse 失敗の無音 fail-open 禁止)。

## 制約

- トランクベース・Bolt 単位 PR・スカッシュマージ(org.md)。bugfix スコープ: 対象バグへのリグレッションテスト追加+既存スイートのグリーン維持(org.md Testing Posture)。
- カーソルは gitignored の per-user ポインタ(`business-overview.md` の配布/ワークスペース境界どおり、共有真実は registry = intents.json)。修正はこの役割分担を変えない。
- 検証劇場の禁止(Forbidden): status ゲートを実装する場合、判定は実行結果(registry 実読)から導出し、落ちる実証(修正を外すと赤)を伴う。

## 前提

- 修正対象は現 HEAD 系統(区間 591b6a2a2..HEAD はフォーカス面と非交差 — RE 実測)であり、cherry-pick 移植は不要。
- e1 の並行 intent(#1226 norm-metrics 系)とは修正面(amadeus-state.ts / amadeus-lib.ts / amadeus-audit.ts / hooks)の静的目録では非交差見込み。着手前に実 diff で再評価する(c6)。

## Out of Scope

- 混入済みイベント行の遡及削除(FR-4)。
- #750(parked intent カーソルの birth 握りつぶし)の修正 — 隣接欠陥だが別 Issue。ただし修正方式が resolver 共通層に入る場合の相互作用は設計段で確認する。
- 監査シャード形式・record-sync 運用の変更。

## Open Questions

- Q1 裁定(修正方式)— E 選挙結果待ち。
- status ゲート採用時の配置(resolver / appendAuditEntry / 各フック)と判定不能時挙動 — 方式裁定後の設計段(bugfix スコープの次ステージ)で確定。
