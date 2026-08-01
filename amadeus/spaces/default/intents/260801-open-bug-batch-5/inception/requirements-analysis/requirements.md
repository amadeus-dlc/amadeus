# Requirements — 260801-open-bug-batch-5(オープンバグ一括修正バッチ第5弾)

上流入力(consumes 全数): business-overview.md、architecture.md、code-structure.md

- `business-overview.md` の現在節(260801-open-bug-batch-5)が定める利用者影響の序列(P1 2件最優先)と delivery boundary(5 Bolt = 5 PR、除外2件)を本書の FR 順序と § スコープ境界に採用した。
- `architecture.md` の現在節が確定した5クラスタの機構断面(mirror 状態機械 / engine state / OTel / graph 合成 / metrics publication)を各 FR の患部引用の導出元とした。
- `code-structure.md` の現在節が確定した患部16ファイル・テスト採番予約(t391〜t398)・dist 同期面(9コピー)を FR の検証要件と AC に転記した。
- 患部 file:line の全数と Bolt 交差判定は `amadeus/spaces/default/codekb/amadeus/re-scans/260801-open-bug-batch-5.md`(observed `c49e385ac`)を正本とする。

## Intent 分析

本 intent は、クロスレビュー独立2名が成立した open バグ9件を単一の self-fix バッチとして修正する第5弾である(先行: open-bug-batch〜batch-4)。9件の共通項は「検証・状態機械・ゲート系の非対称/部分配線」— `business-overview.md` 現在節の序列どおり、workflow 完了を恒久ブロックする P1/S2 の mirror クラスタ(#1838/#1860)を Bolt 1 で最優先に着地させ、以降 P2 帯(engine/state、OTel、graph/drift)、P3 帯(metrics ほか)の順に降りる。ユーザー指示は「できる限りまとめて対応・優先度が高いやつから着地」(2026-08-01)。

## 承認系譜(cid:requirements-analysis:approval-lineage-citation)

1. バッチ編成・対象9件・除外2件(#1829、#1830 path B): ユーザー承認 2026-08-01(AskUserQuestion「バッチ編成」= 承認)
2. ラベル裁定: #1856 S3 維持 / #1860 P1 / #1861 P2 / #1863 再スコープ — ユーザー承認 2026-08-01
3. 方式裁定: #1849 = A(compose 時 state 再構築)、#1856 = emit 停止(fail-closed)— ユーザー承認 2026-08-01T01:45:00Z(questions ファイル参照)
4. 全9 Issue にクロスレビュー独立2名の verdict(検証 SHA `c49e385ac`)がコメント済み — issue-cross-review 前提充足

## 共通要件(全 FR に適用)

- **CR-1 TDD**: 各修正は合意済み公開 seam へ失敗テスト1件を先に追加して Red を実測し、通す最小実装で Green にする(team.md Testing Posture)。落ちる実証は「テストが実際に読む面」へ注入する。
- **CR-2 リグレッションテスト**: 各 Issue の起票時再現手順(クロスレビューコメントの決定的再現)を verbatim 再適用して閉包を実証する(fix-review-replays-origin-repro)。
- **CR-3 dist 同期**: `packages/framework/core/` を触る FR(1〜8)は `bun scripts/package.ts` + `bun run promote:self` で7ハーネス dist+self-install を同一 PR で再生成する。FR-9(scripts/)は対象外。
- **CR-4 検証コマンド**: `bun run typecheck` / `bun run lint` / `bun run dist:check` / `bun run promote:self:check` / 関連 `tests/run-tests.sh` プロファイル+coverage ゲート(push 前ローカル lcov で diff 追加行未カバー 0 実測)。
- **CR-5 既存テストグリーン維持の射程**(cid:reverse-engineering:c1-pinned-behavior-ruling 追補 E-OBB3-CGS13): 各 FR の「既存テスト維持」AC は、当該 FR が明示改訂を宣言する pin(FR-2 の t279 系 fixture、FR-3 の t33、FR-4 の state scaffold 系、FR-5 の latch 系 pin)を除いた集合に適用する。
- **CR-6 同根棚卸し**: 各修正は同じ欠陥形状の他所在を grep で全数棚卸しし、同一 PR で修正するか Issue 化する(same-root-inventory)。

## Bolt 1(最優先・P1/S2)

### FR-1: #1838 — mirror 境界の applicable-operations 非対称と create 無条件先行の是正

- 患部: `amadeus-mirror-policy.ts:66`(`"intent-capture-approved": ["create"]` に `sync` 欠落)、`amadeus-mirror-coordinator.ts:235` 近傍(operationForBoundary の create 無条件先行)、reducer 対称化面。
- 修正はクロスレビュー確定の4面(coordinator / policy / 事前ガード / reducer 対称化)を、レビューコメント記載の順序制約(ガード先行)どおりに適用する。
- AC-1a: Issue 既存(issueNumber 保持)状態で create が再発行されないことをテストで固定(重複 Issue 0 件)。
- AC-1b: intent-capture-approved 境界で部分失敗後の再試行が sync へ収束することをテストで固定。
- AC-1c: 修正後、全 mirror 境界種別 × applicable-operations の対称性を機械照合するテスト(状態数×操作数の個数照合 — state-machine-cardinality-check)を追加。

### FR-2: #1860 — close receipt `prepared` 滞留の解消(2欠陥同梱)

- 主患部: `amadeus-mirror-executor.ts:1259-1266` close 短絡へ `mark-attempted` 前進を挿入(正解実装 `adoptCreateCandidate:674-689` の prepared 分岐を写す)。
- 第2欠陥(同一 PR 必須): `executor:527` の `applyTransition` 戻り値破棄を是正し、`mark-pending` が `prepared` からも回復記録可能になるよう reducer 遷移(`:557-558`)と併せて対称化する。方式(reducer 拡張 vs executor 側の事前前進)は design で確定。
- AC-2a: 「操作開始時点で remote が既に CLOSED × local receipt が prepared」の fixture(t279 に不在の組み合わせ)で、修正前 Red(publication-not-converged 相当の恒久拒否)→ 修正後 Green(complete まで収束)を実証。
- AC-2b: state 書込失敗時に警告が `warnings[]` へ実際に残ること(現状 0 件の無音)をテストで固定。
- AC-2c: 修正後、260801-open-bug-batch-5 自身の intent-initialized 境界 pending receipt(HTTP 422 で滞留中)が retry で収束すること — 実環境での閉包確認を build-and-test で実測。
- 備考: 初回 run で remote が閉じた経路の一意特定は本 FR の完了条件にしない(レビュー留保どおり修正対象の欠陥は確定済み)。

## Bolt 2

### FR-3: #1846 — birth scaffold へ Construction Autonomy Mode フィールドを追加

- 患部: `amadeus-utility.ts:4461-` の birth scaffold。正準は `state-template.md:93` の `## Current Status` 配下 — scaffold を正準テンプレートと整合させる(生成側修正)。
- AC-3a: 新規 birth した state に対し `set-autonomy` 相当(`setFieldStrict` `amadeus-bolt.ts:816`)が Field not found にならないことをテストで固定。
- AC-3b: t33 の scaffold pin を新フィールド込みへ明示改訂(CR-5 宣言済み)。
- AC-3c: scaffold と state-template.md のフィールド集合差分を機械照合するテスト(drift 検出)を追加する。既存 intent への遡及挿入は行わない(終端 record 追補禁止)。

### FR-4: #1849 — compose 時の state 再構築(裁定 A)

- compose / recompose 実行時、既存 intent(`Status: Running` のもの)の Stage Progress を合成後 graph と整合させる: 欠落 checkbox 行の挿入、Total Stages / Stages to Execute の再計算、終端 record(`amadeus-utility.ts:5316-5330` の設計どおり)除外。再構築は scope-change の既存ロジック(`amadeus-utility.ts:5178-5218`)を再利用する。
- クロスホスト対応: plugin を持たないホストで birth した intent(実例: 260729-otel-upstream は Harness: kimi)が、plugin を持つホストで実行されるケースを要件に含める(ホスト別 graph 前提)。
- 双方向 fail-closed: 「state に行があるが現ホスト graph に stage が無い」逆向き(`amadeus-orchestrate.ts:4399-4403`)の挙動は現状維持とし、テストで両方向を固定。
- AC-4a: 合成前 birth の intent に対し compose 実行 → report が拒否されないこと(修正前 Red: `not present in the state file` verbatim)。
- AC-4b: 再構築後の Total / Completed / Stages to Execute が countCheckboxes 由来の実測値と整合すること(18/19 型 skew の非再現)。
- AC-4c: `recompose --add` の同型 skew(pending ガード素通り)も同修正で閉じることをテストで固定。
- **FR-4r(record 修復サブタスク)**: `260729-otel-upstream/amadeus-state.md` の skew(Total 18 / Completed 19 / 手挿入 formal-model-check 行 / Workflow Completion Stage)を、本修正の再構築ロジック(または同等の機械手順)で整合化する。履歴 rewrite はしない(前進修正のみ)。audit は無改変。

## Bolt 3

### FR-5: #1856 — fatal-latch の emit 経路配線(裁定: fail-closed)

- 患部: `otel/bootstrap.ts:72-73` / `fatal-latch.ts` / `logger-provider.ts:67-110`。latch 発火後は logger-provider の emit を drop する(fail-closed)。drop は無音にしない — 発火時に1度だけ loud な記録(stderr または既存の drop 記録機構)を残す(回数はラッチで1回に制限 — guard-announcement-callsite-count)。
- AC-5a: latch 発火 → 以降の emit がストアへ書かれないことをテストで固定(修正前 Red: 発火後も書き継がれる)。
- AC-5b: latch 未発火時の emit 挙動が不変であること(既存テストグリーン、CR-5 の宣言改訂分を除く)。
- AC-5c: 発火通知が1回だけ出ること(2回以上・0回で Red)。

### FR-6: #1857 — session-end の seam 迂回を ensureTracerBootstrap へ置換

- 患部: `hooks/amadeus-session-end.ts:80-81` の2行を `ensureTracerBootstrap(projectDir);` 1行へ置換(`bootstrap.ts:108-116`、ensureContextManager 内包)。latent 欠陥(現行経路で throw 不発火)— 修正価値は将来変更耐性。
- AC-6a: session-end の tracer 配線を pin する回帰テストを新設(現状 pin 0 件): 二重登録状況でも session-end 経路が throw しないこと。
- AC-6b: `:109-111` の無音 catch は本 FR のスコープ外とし、変更しない(スコープ膨張禁止)。ただし同根棚卸し(register*Provider 直呼びが本番 1 箇所のみ)の grep 結果を PR に記録する。

## Bolt 4

### FR-7: #1863 — lossy drop→compose の是正+CI へ repo 断面 compile --check

- 欠陥1: `amadeus-graph.ts:1405-1411` `mergeComposedScopes` — drop→compose サイクルで composed scope 行の plugin セルが無音消失しない(保存する、または loud 警告+復旧手順提示)。方式は design で確定。
- 欠陥2: CI に実リポジトリ断面への `compile --check` ステップを追加(既存 fixture 実行 t124/t66 は維持)。
- AC-7a: drop→compose→compile 後にセルが消えない(または loud に検出される)ことを fixture で固定(修正前 Red: A=EXECUTE / B=DROPPED / C=DROPPED の C が無音)。
- AC-7b: committed graph へ意図的 drift を注入して CI ステップが赤になる落ちる実証(comparative でないため注入面のみ確認)。
- AC-7c: grep 系 AC の射程は修正対象面(amadeus-graph.ts と CI workflow)に限定し、codekb 散文引用は除外(c1-ac-grep-surface-scope)。

### FR-8: #1864 — coverage-patch-allowlist :1838 転位エントリの削除

- `tests/.coverage-patch-allowlist.json` の `scripts/formal-verif/fs-tlc-toolchain.ts` / `lines: "1838"` エントリを**削除**(再ピン禁止 — `:1861` 双子が既存で重複化するため)。
- AC-8a: 削除後 patch gate がグリーン(stale 0 / 削除起因の新規 UNCOVERED 0)であることをローカル lcov で実測。
- AC-8b: 新規テスト不要(データ修正のみ — patch gate 自体が検証面)。t397/t398 予約のうち未使用分は返上。
- 同型21件の是正は #1622 のスコープであり本 FR で扱わない。

## Bolt 5

### FR-9: #1861 — metrics publication の TOCTOU 偽赤是正

- 患部: `scripts/metrics-publication-github.ts:119-134`(loadRemoteBranch)の「ref 不在」失敗を、構造的 problem ではなく transient 不在として分類し、当該候補を inventory から除外して再ポーリングへ回す。`metrics-publication-domain.ts:453-462` の `problems.length > 0` 無条件 terminal 化を、一過性 I/O 障害と所有権証拠異常(fail-closed 対象)を分離する形に改める。
- maintenance 経路の同一欠陥(`github.ts:500-507` / `domain.ts:587-591`)も同一 PR で修正(same-root)。
- AC-9a: 「ls-remote と fetch の間でブランチが消える」fixture(t222 に不在)で修正前 Red(publication-not-converged)→ 修正後 Green(converged)を実証。
- AC-9b: 所有権証拠異常(fail-closed クラス)は引き続き terminal であることをテストで固定(fail-open 化の禁止)。
- AC-9c: postcondition 失敗時に maintenance dispatch がスキップされる経路(`domain.ts:536-540`)は、収束時に dispatch へ到達することをテストで固定。
- 既存 pin 衝突なし(t222 の publication-not-converged pin は hasTerminalPullRequest 側のみ — レビュー実測)。

## 非機能要件

- **NFR-1 監査整合性**: FR-1/FR-2(mirror)と FR-4/FR-4r(state)は audit append-only を破らない — 修復は前進修正のみ、履歴 rewrite・force push 禁止(cid:deployment-pipeline:c3)。FR-4r は audit 無改変で state フィールドのみ整合化する。
- **NFR-2 fail-closed 境界の保存**: FR-5(latch)と FR-9(problems 分類)は fail-closed 対象(監査・所有権証拠異常)を fail-open 化しない。一過性 I/O との分離は分類の精密化であり緩和ではない(AC-9b で固定)。
- **NFR-3 性能**: 追加テストはすべて unit/integration 帯とし、実時間ベンチマークを持ち込まない(perf tier 分離直後の retrograde 禁止)。FR-7 の CI `compile --check` は秒オーダーの決定的検査で PR blocking に追加してよい。
- **NFR-4 配布整合**: CR-3 の9コピー同期は各 PR 単位で dist:check / promote:self:check green を維持する(コミット間不整合の禁止 — project.md Forbidden)。

## 制約

- トランクベース: Bolt ごとに短命ブランチ → PR → スカッシュマージ。複数 Bolt を単一 PR に束ねない。
- worktree 分離: 実装は git worktree で行い本線ツリーのブランチを占有しない(solo-bolt-worktree-required)。
- coverage 単独所有: 同一 branch の coverage 計測は単独所有者で直列化(c1-coverage-single-owner)。
- マージは PR ごとにユーザー承認(no-AI-merge)。PR 発行報告は割込み優先で処理(E-SRF-CGS13)。
- degrade スコープ(units-generation SKIP)のため、unit dir は実装開始前に遅延作成し engine 解決 directive を scratch へ捕捉する(c1-degrade-batch-directive-capture / c1-parallel-degrade-batch)。

## 前提

- 運用形態はソロモード(`AMADEUS_OPERATING_MODE=team` 未設定)。選挙は auto-solo-election 設定に基づく subagent 2体形。仕様裁定はユーザー専権。
- 9件全ての欠陥実在は RE(observed `c49e385ac`)+クロスレビュー独立2名の実測で確認済み — 本 requirements は実在を再論証しない。
- 患部16ファイルの引用は observed と一致する SHA で検証済みのため行番号再解決不要(E-OBB5-RES13 追補の免除条件充足)。
- GitHub 到達性: FR-2 AC-2c の実環境閉包確認は GitHub API の可用性に依存する(不可時は PENDING として閉包条件を明記 — deployment-execution:c3 の4値分離)。

## 未解決事項(後続ステージへ)

- **#1860 初回窓**: 初回 run で remote が閉じた経路の一意特定は未確定(レビュー両名の留保)。修正対象の欠陥は確定済みのため本バッチの完了条件にせず、必要なら後続 RE の独立タスクとする(FR-2 備考から繰り上げ)。
- **FR-2 第2欠陥の方式**: mark-pending の prepared 対応を reducer 拡張で行うか executor 側の事前前進で行うかは design(実装 plan)で確定する。
- **FR-7 欠陥1の方式**: plugin セルの保存 vs loud 警告+復旧手順の選択は design で確定する。
- **mirror create 422**: 本 intent 自身の intent-initialized 境界 receipt が HTTP 422 で pending 滞留中 — FR-2 AC-2c の実測材料を兼ねる。422 の原因(タイトル長など)は Bolt 1 実装時に一次調査する。

## Bolt 6(追加編入、2026-08-01 ユーザー裁定)

### FR-10: #1871 — mirror title を intent dir ベースへ変更(仕様変更込み)

- 承認系譜: intent birth 時の 422 実発現で #1871 を起票(2026-08-01)→ ユーザー裁定「title の仕様が悪い。intent dir に変える。本バッチで対応してよい」(2026-08-01)→ クロスレビュー2名成立(両名核心確認・S3 降格、コメント投稿済み)→ 既存ミラー title はユーザー裁定「共存許容」(2026-08-01 — 新規・再作成分のみ新 title、sync への title 送信追加はしない)。
- 患部: `packages/framework/core/tools/amadeus-mirror-presentation.ts:260/:285` — `titleSummary` を `oneLine(projectSummary)` から **intent dir**(例: `Intent Mirror: 260801-open-bug-batch-5`)ベースへ変更。防御的クランプを併設する。**クランプの閾値前提の訂正(レビュー反証)**: 「256文字上限」は既存成功ミラー(506文字/836B 等)で反証済み — 真の閾値はバイト系で 943B〜1440B の間(未確定)。AC はコードポイント数の断定を置かず、クランプは保守側(バイト基準で十分小さい値)で設計する。
- AC-10a: 長い projectSummary(1440B 級)でも create の title が実測失敗帯(943B 以上)へ到達しないことをテスト固定(修正前 Red: 現行 render で 1440B)。
- AC-10b(裁定反映): sync は title を送信しない現行契約(`editArgv` は body のみ PATCH)を**維持**し、既存ミラーの旧 title は共存許容 — 「sync が title を変更しない」ことをテストで pin(意図の固定)。
- AC-10c: title の形状を固定する既存テストは 0 件(r2 実測)— 新 title 形式のテスト固定を新設(pin 改訂は不要)。
- スコープ外(レビュー確定): 422 の effect 分類変更(r1: 認可境界へ不要な変更 — 不採用)、body の無クランプ・MARKER_MAX_PAYLOAD_BYTES と GitHub body 上限の不整合(r2 同根 — 実害低、別 Issue 判断)。

## スコープ外(Won't)

- #1829(plugin 配布)、#1830 path B — 別 intent。
- `findStaleAllowlistEntries` の意味照合(→ #1495)、allowlist 全数棚卸し(→ #1622)。
- #1857 の無音 catch への recordHookDrop 追加(FR-6 AC-6b)。
- #1860 の初回 run 経路の一意特定(RE 独立タスク候補 — Issue コメント留保のまま)。
- 後方互換レイヤー・移行シムの追加は全 FR で禁止(org.md Forbidden)。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-01T02:14:22Z
- **Iteration:** 1
- **Scope decision:** none

Major 1件: requirements.md がステージ Step 10 必須7節のうち5節(Intent 分析/非機能要件/制約/前提/未解決事項)を欠落。他は全確認(引用6件 HEAD 一致、裁定転記忠実、AC 全件テスト可能、センサー全 PASSED)。

### Findings

- Major: requirements.md が Step 10 必須7節のうち5節(Intent 分析/非機能要件/制約/前提/未解決事項)を欠落 — batch-4 先例は7節完備。FR-2 備考と Won't の RE 保留を 未解決事項 節へ繰り上げて是正すること。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-01T02:18:14Z
- **Iteration:** 2
- **Scope decision:** none

Iteration 1 の Major(Step 10 必須5節欠落)は閉包。7必須節すべて実質内容付きで実在(H2 14件、name match 確認)。新節と FR・裁定・ノルムの矛盾なし。指摘 0 件。

### Findings

- None
