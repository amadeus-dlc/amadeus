# Requirements — 260731-open-bug-batch-4

上流入力(consumes 全数): business-overview.md、architecture.md、code-structure.md — いずれも RE 差分リフレッシュ(base 3f73823b1 → observed 6e7a9d701)の成果物。本書の機序引用は architecture.md の「260731-open-bug-batch-4」focus 節、患部配置・テスト採番在庫は code-structure.md の同節、利用者影響・delivery boundary は business-overview.md の同節に依拠する。file:line は observed 6e7a9d701 断面。

## 承認系譜

- Intent 起動: ユーザー指示「1797,1800,1811,1816のバグをIntentで修正してほしい」(2026-07-31)。クロスレビュー2名成立を4件とも確認(#1811 は起動前提として本セッションで実施・投稿済み: ESTABLISHED_WITH_REFINEMENTS)。既存 open PR は4件とも 0 件を実測。
- 仕様裁定: requirements-analysis-questions.md の Q1=A(#1816 表示層のみ)/ Q2=A(Status 行のみ終端化)/ Q3=A(#1811 方式 C)/ Q4=A(#1800 診断+限定リトライ)— ユーザー直接裁定、承認 2026-07-31T05:47:52Z。

## Intent 分析

4件はテストインフラの信頼性(#1811/#1800/#1797)と共有面の正確性(#1816)の回復である。#1811 は残存プロセスによるホスト負荷そのものであり、#1800/#1797 の負荷起因偽赤の背景要因 — 依存構造として #1811 を含む検証は負荷条件の変化を考慮する。全件テスト側または表示層の surgical 修正で、**本番の判定ロジック・状態機械は非改変**(#1816 のみ presentation 1ファイルを触る)。1 Issue = 1 Bolt = 1 PR。

## 機能要件

### FR-1: #1811 — supervisor 孤児の恒久解消(裁定 Q3=A = 方式 C)

**現状機序**: `tests/integration/t-team-up-codex-resume.serial.test.ts` の fake stub(:218-219 `process.on("SIGTERM", …); setInterval(() => {}, 1_000);`)が run-record を読まず SIGTERM 以外で不死。afterEach(:39-41)は rmSync のみで kill 掃引なし。漏洩テスト3本(:590 / :973 / :1004)。本番 supervisor(`team-up-codex-safety-wait.ts:643` runRecordIsActive ループ)は fail-closed 実装済み。PID は `team-up.sh:508` が `safety-wait.pid` へ書く。

- **FR-1a(掃引)**: afterEach で temp dir を rmSync する**前**に、各 fixture root 配下の `safety-wait.pid` を再帰 glob → SIGTERM → 短いポーリングで消滅確認 → 期限超過なら SIGKILL、の期限付き kill/reap 掃引を追加する。
- **FR-1b(stub 是正)**: fake stub の `setInterval` 不死設計を「run-record ディレクトリの実在」ポーリング(実在しなくなったら exit)へ置換する。述語は本番の3ファイル読取まで写さず**ディレクトリ実在のみ**(過剰結合回避)。
- **FR-1c(既存テスト無影響)**: :717 / :774 / :823 の3テスト(record メタデータ改変系)がグリーン維持されることを実測確認する(stub 述語がディレクトリ実在のみであれば無影響 — 実装時実測が確定条件)。
- **FR-1d(本番非改変)**: `packages/framework/core/tools/` は触らない(dist 交差回避 — 並行 Bolt 条件)。

**受け入れ基準**:
1. リグレッションテスト(Red→Green、採番 **t374**): fixture 起動 → テストプロセス相当の終了 → 孤児が期限内に消滅することを assert(現行では stub が残るため Red)。repo 外 scratch で決定的に検証できる形にする(スイート実行後の `pgrep` 残 0 の実測を PR 検証記録に含める)。
2. 漏洩テスト3本(:590/:973/:1004)の経路で掃引が発火し、スイート完走後に当該 fixture 由来の残存プロセス 0 を実測。
3. :717/:774/:823 グリーン維持。既存スイート全体のグリーン維持。

### FR-2: #1800 — t224 失敗診断の対称化+限定リトライ(裁定 Q4=A)

**現状機序**: `tests/integration/t224-upstream-v2-migration-cli.test.ts:1411` の素の `expect(collided.status).toBe(1)`。`-1` はセンチネル(:170/:210 `result.status ?? -1` — signal 終了 or spawn 失敗、:311-313 で3分類固定済み)。負荷条件から spawn EAGAIN が第一容疑。

- **FR-2a(診断対称化・必須)**: :1411 の照合を `expectSuccessfulMigration`(宣言 :218)と同型の診断ヘルパー(期待 exit code 引数化)経由に置換し、赤のとき status/signal/error を全て出す。
- **FR-2b(限定リトライ)**: `runMigrationProcess` に spawn-error 限定リトライを追加 — `result.error` が EAGAIN/EMFILE/ENOMEM に一致するときのみ短いバックオフで再試行(上限2回)。signal・exit-status はリトライしない。リトライ発火は出力に記録する。
- **FR-2c(再現不能時の受理条件)**: 負荷起因のため決定的再現は要求しない。受理条件は (i) 診断ヘルパーが3分類を正しく描画することのユニット固定(既存 :311-313 の分類 fixture を再利用) (ii) リトライが spawn-error でのみ発火し signal/exit で発火しないことのテスト固定、とする(cid:build-and-test:no-silent-scope-narrowing への明示回答 — 先送りではなく検証形の置換)。

**受け入れ基準**:
1. Red→Green(採番 **t375** または t224 内追加): spawn-error 注入(error オブジェクト simulate)でリトライ後に成功する経路+signal ではリトライしない経路を assert(現行にはリトライが無いため Red)。
2. 診断ヘルパーの失敗描画(status/signal/error 併記)をテスト固定。
3. t224 全体グリーン維持。

### FR-3: #1797 — t259 計測設計の是正(方式・数値は実測導出)

**現状機序**: `tests/integration/t259-guard-corpus.test.ts:108-109` の比 2.5 assert。measure(1)/measure(2) が逐次 spawn の別時間窓で、負荷変動が比を系統的にずらす(実測 2.5065、マージン 0.26%)。median は t258 裁定で適用済み。baseline 相関自体は健全(noop 型ではない)。

- **FR-3a(構造対策の第一候補 = 交互計測)**: `tests/helpers/guard-corpus-benchmark-child.ts` を両条件交互(A,B,A,B,…)の単一プロセス計測へ変更し、時間窓を共有させる。
- **FR-3b(実測導出)**: 採用方式と閾値・マージンは**負荷スイープ実測**(並列 fan-out 負荷の有無で比のばらつきを実測)から導出する(cid:code-generation:c1-benchmark-baseline-correlation-verify)。要件では数値を固定しない。交互計測で分散が十分縮まれば閾値 2.5 は維持、縮まらなければ実測分布から新閾値を導出し根拠を PR に記載する。
- **FR-3c**: 退行検出力を落とす閾値単独引上げ・負荷検知による閾値可変化(検証劇場)は採らない。

**受け入れ基準**:
1. 負荷スイープの実測記録(無負荷/fan-out 負荷の比の分布)が PR に含まれ、採用方式・閾値がそこから導出されている。
2. Red 実測(採番 **t376** または既存内): 現行の窓分離設計が負荷下でずれること、または新設計の分散縮小の対照実測(落ちる実証は「テストが実際に読む面」へ)。
3. t259-guard-corpus グリーン維持+線形性契約(2倍入力で非線形爆発を検出する力)の保存。

### FR-4: #1816 — ミラー表示層の終端化(裁定 Q1=A / Q2=A)

**現状機序**: close は body を書かず(executor :1156-1159)、completion 境界の最終 body 書込は sync で Status は構造的に Running(lifecycle :311-312 が強制)。`renderMirrorIssueContent`(presentation :239-273)は snapshot.status を逐語描画(:259-260)し、`snapshot.completionInstance` は presentation で未消費。

- **FR-4a**: `amadeus-mirror-presentation.ts` の `## Status` 描画を「`snapshot.completionInstance` が存在するとき `Completed`、それ以外は従来どおり `snapshot.status`」の導出描画へ変更する。Phase/Stage 行は現状維持(裁定 Q2=A)。
- **FR-4b**: 導出キーは completionInstance の存在のみ(boundary 種別を presentation へ渡さない — `buildMirrorStatusRecordView` の drift 診断が close 後に恒久偽 drift を生むため)。
- **FR-4b'(裁定 E-OBB4-CG1 による精密化、2026-07-31 採用 2-0・GoA 2x2)**: `buildMirrorStatusRecordView` の `currentStatus`(`amadeus-mirror-lifecycle.ts:410`)も同一の completionInstance 導出に揃える — `compareMirrorStatus` の2面比較(body Status 節 vs view.currentStatus)の write⇔check 対称性を保ち、completion 窓の偽 diverged を防ぐ(builder 逸脱停止報告の実測起点)。留保転記: (subagent-1) FR-4a の表示層限定との衝突は本裁定の申告で解消 / (subagent-2) 追加スコープは view フィールド導出限定に留め close 順序・状態機械(FR-4c)へ波及させない。
- **FR-4c(スコープ限定の申告)**: close 順序(record 着地前 close)は #1689 設計+t361:262 契約固定のまま**不変**(裁定 Q1=A)。t361 は改訂しない。Mandated「landing」の実装定義とノルムの乖離は別 Issue として記録する(conductor が起票)。
- **FR-4d**: lifecycle :311-316 の assert は改訂不要(record 断面検査)。既存 t281 の2ケースは completionInstance を持たないため期待値不変。

**受け入れ基準**:
1. Red→Green(既存 **t281 へ追加**): completionInstance 有りの snapshot → `## Status` が `Completed`(現行では Running のため Red)/ 無し → 従来表示、の両ケースを assert。
2. t232:35・t281:52,55 の既存 body assert グリーン維持。t361 グリーン維持(無改変)。
3. coverage allowlist の presentation 行ピン(交差2件: 245-247 直撃・266-271 下方シフト、上方3件は挿入位置次第)を機械 remap+reason/現行行の直読照合(cid:code-generation:c1-allowlist-mechanical-remap)。
4. 7ハーネス dist 再生成+self-install 同期(このユニットのみ配布面を触る)。

## 非機能要件

- **NFR-1**: #1816 のみ `packages/framework/core/` を触る — `bun scripts/package.ts`(7ハーネス)+`bun run promote:self`、dist:check / promote:self:check グリーン。他3件はテスト・helper のみで配布面非接触。
- **NFR-2**: 検証ゲート: typecheck / lint / 対象スイート / coverage patch(push 前ローカル lcov で diff 追加行未カバー0)/ complexity / 全数 CI。
- **NFR-3**: TDD 既定(各 FR は Red 実測 → 最小実装 Green の vertical slice)。
- **NFR-4**: テスト採番予約: t374(#1811)/ t375(#1800)/ t376(#1797)。#1816 は t281 追加。t372 欠番は使わない。

## 制約

- 1 Issue = 1 Bolt = 1 PR。**4件並行可**(条件: #1811 本番非改変 = FR-1d、allowlist は #1816 のみ接触)。
- #1811 の着地は #1800/#1797 の負荷再現条件を変える — FR-3b の負荷スイープは**自 Bolt worktree 内で自己完結の負荷生成**(fan-out 相当の並列プロセスを scratch で立てる)により、#1811 着地の前後に依存しない形で実測する。
- 実装が要件・設計から逸脱する必要に気づいたら実装前に停止し裁定を仰ぐ(deviation-stop-before-implement。既存様式準拠と判断する場合も停止対象)。

## 前提

- ソロモード(auto-solo-election: true)。仕様変更はユーザー専権。
- 4件の欠陥現存・修正面は RE(Developer→Architect 2段)とクロスレビュー(計8 verdict)で確定済み。

## スコープ外

- #1816 の close 順序仕様の変更(裁定 Q1=A — ノルム乖離は別 Issue 起票で記録)。
- #1811 の本番 supervisor 改変(TTL/PPID 自殺 — 本番は fail-closed 実装済み)。
- #1800 のテストランナー並列度制御(別課題)。
- t267 の nohup(同族非該当を RE で確認済み)。

## 未解決事項(後続ステージへ)

- FR-1a の掃引ヘルパーの配置(テストファイル内 vs tests/helpers/)は実装時に既存様式へ整合。
- FR-3 の採用方式は負荷スイープ実測が決める(interleave が第一候補)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-07-31T05:50:43Z
- **Iteration:** 1
- **Scope decision:** none

4件の FR は裁定 Q1-Q4 と無矛盾に転記され、上流実参照・機構引用・受け入れ基準とも実測に接地、Minimal/self-fix スコープに収まる。

### Findings

- None
