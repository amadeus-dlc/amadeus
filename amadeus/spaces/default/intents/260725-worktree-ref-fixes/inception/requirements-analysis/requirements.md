# Requirements — 260725-worktree-ref-fixes(#1482 / #1481 / #1455 / #1492)

上流入力(consumes 全数): `amadeus/spaces/default/codekb/amadeus/business-overview.md`、`amadeus/spaces/default/codekb/amadeus/architecture.md`、`amadeus/spaces/default/codekb/amadeus/code-structure.md`

- `architecture.md`(「worktree でのパス/ref 解決の現況」節、observed `11f1ad61f` — codekb 自身が宣言する測定 ref)— `resolveProjectDirFromHook` の 4-rung ladder、`currentGitSha` 三重複製、`resolveMainCheckout` 既習様式の実測を本要件の患部確定に用いた。
- `code-structure.md` — 患部シンボル所在表(実呼び出し 12箇所、配布 11 コピー、`.claude/settings.json:154`)を FR-2/FR-3 の変更面棚卸しに用いた。
- `business-overview.md` — 監査台帳・ゲート接地(P4: 不可逆操作への人間関与)が本フレームワークの中核価値である文脈を、#1492 の優先度(P1/S2)判断に用いた。

測定 ref 注記: 本文の実コード file:line は HEAD `9113a5106`(origin/main `272f4bd58` ベースへ rebase 済み)で再解決した値である(#1483 の +15 行シフトを反映。§12a iteration 1 C-1 是正)。

## 承認系譜

- Intent 起動: ユーザー指示「#1482/#1481/#1455 を 1 intent で対応、--scope amadeus-bugfix、worktree 切替」(セッション開始時の実タイプ)。
- #1492 の組み込み: 本セッション実測(全 hook 無音不発)を受けた新規起票+ユーザー裁定「本 intent に組み込む」(AskUserQuestion、2026-07-25)。対象は 4 Issue に拡大。
- 方式裁定: Q1=A / Q2=B / Q3=A(`requirements-analysis-questions.md`、実裁定 2026-07-25T23:37:30Z)。

## Intent 分析

worktree セッション(git worktree 上での amadeus 実行)で発生する 2 系統の欠陥ファミリを解消する:

1. **hook のパス解決系**(#1482、#1492): hook が本線の state を読む(誤解決)、または hook がそもそも起動しない(env 依存の起動行)。いずれも「worktree セッションのゲート・監査が壊れる」という同じ利用者可視症状に合流する。本セッション自身が #1492 の実被害(presence mint 不能 → ゲート接地不可、手動 mint+solo grant で回避)を実測した。
2. **テストの ref 解決系**(#1481、#1455 同根): `currentGitSha` helper の FS 直読が worktree の common-dir loose ref を見ず、t257/t258/t259 が worktree で常に false red。worktree で作業する全 intent の検証を汚染する。

ゴール: worktree セッションでも (a) hook が当該 worktree の state/台帳を読み書きし、(b) hook が env 不在でも起動し、(c) フル CI がローカル worktree で green になること。

## 機能要件

### FR-1(#1481/#1455): currentGitSha の plumbing 委譲+共有 helper 統合【裁定 Q2=B】

- FR-1a: `tests/harness/` 配下に共有 helper(1 定義)を新設し、SHA 解決を `git rev-parse HEAD` サブプロセス(既習様式: `packages/framework/core/tools/amadeus-lib.ts:4232-4239` `resolveMainCheckout()` の plumbing 委譲、verbatim: `["rev-parse","--git-common-dir"]` 系)へ委譲する。git 内部レイアウト(loose ref / packed-refs / commondir)の FS 直読を行わない。
- FR-1b: 三重複製の各実体 — `tests/integration/t257-status-registry-migration.test.ts:193-216`(throw :214)、`tests/integration/t258-lifecycle-transaction.test.ts:434-457`(throw :455)、`tests/integration/t259-guard-integration.test.ts:77-98`(throw :96)— を削除し、共有 helper の import へ置き換える。
- FR-1c: 受け入れ基準 — **git worktree 上で** `bun test` を 3 ファイル各々に対して実行し exit 0(現状は 3 件とも exit 1、失敗実文 `cannot resolve Git ref refs/heads/worktree-bugfix-1482-1481-1455` 系を RE で実測済み)。通常クローン上でも同 3 ファイル exit 0。**基準が名指しする経路(worktree 上の実実行)そのもので確認する**(`cid:build-and-test:bt-acceptance-criterion-literal-path`)。
- FR-1d: 解決失敗時(git リポジトリ外等)は現行同様 loud に throw する(fail-open 化しない)。

### FR-2(#1482): hook projectDir 解決へ payload-cwd rung を追加【裁定 Q1=A】

- FR-2a: `packages/framework/core/tools/amadeus-lib.ts` の `resolveProjectDirFromHook`(:262)に、**hook stdin payload の `cwd` を最優先 rung** として追加する。採用条件はワークスペースマーカー検証(`hasWorkspaceMarker` :242 と同基準: `amadeus/` と `<harness>/tools/` の両在)を満たす場合のみ。payload 不在・`cwd` フィールド不在・マーカー不成立の場合は現行 ladder(env :264 → cwd marker :273-274 → script path :279 → cwd :290)へ変更なしでフォールバックする。
- FR-2b: 全 core hooks(`code-structure.md` 所在表の実呼び出し 11箇所: amadeus-stop / amadeus-mint-presence / amadeus-audit-logger / amadeus-sensor-fire / amadeus-sync-statusline / amadeus-runtime-compile / amadeus-session-end / amadeus-statusline / amadeus-session-start / amadeus-log-subagent / amadeus-validate-state)が、自身が読む stdin payload の `cwd` を解決関数へ渡す。stdin を現在読まない hook は payload 読み取りを追加する(fail-open: 読めない場合は従来経路)。kiro-ide adapter(`packages/framework/harness/kiro-ide/hooks/amadeus-kiro-adapter.ts:64`)は kiro の payload 語彙を実測のうえ、`cwd` 相当が得られる場合のみ同型を適用する(得られない場合は現状維持し、その旨をコード注記する — 外部 seam 語彙は未実測確約しない)。
- FR-2c: テスト契約の改訂 — `tests/unit/t202-hook-project-dir-worktree-marker.test.ts:105-117` test 2(verbatim: `"2: CLAUDE_PROJECT_DIR env still outranks the marker rung"`、期待 `/from/env`)を「**payload cwd 不在時は** env が marker rung に勝つ」へ改訂し、新規ケースを追加する: (i) payload cwd(マーカーあり)が env より勝つ (ii) payload cwd(マーカーなし)は棄却され env へフォールバック。この契約変更はユーザー裁定 Q1=A に基づく(無申告逸脱ではない)。
- FR-2d: 受け入れ基準 — worktree を模した fixture(payload cwd = マーカー持ちの worktree、env = 本線)で解決結果が worktree になること、および従来ケース(payload 無し)の全既存テストが green のこと。
- FR-2e: 診断改善 — Stop hook のブロックメッセージに解決した projectDir と読んだ state パスを含める(#1482 提案の採用。誤解決の一目診断を可能にする)。

### FR-3(#1492): hook 起動行の env 依存除去【裁定 Q3=A】

- FR-3a: hook 起動行を `bun $CLAUDE_PROJECT_DIR/.claude/hooks/amadeus-*.ts` から `bun "${CLAUDE_PROJECT_DIR:-.}/.claude/hooks/amadeus-*.ts"` 形(シェル既定値展開)へ変更する。env 不在時は hook 実行 cwd 相対で解決され、スクリプト内の解決 ladder(FR-2 改訂後)が pd を確定する。
- FR-3b: 変更面の全数棚卸し — 起動行を持つ正本(settings.json / settings.json.example とその生成元)を grep(`\$CLAUDE_PROJECT_DIR` の変数名キーと `/.claude/hooks/` のリテラルキーの 2 キー、`cid:application-design:dual-key-consumer-inventory`)で全数列挙し、全ハーネス配布面(dist 6 面+self-install)を同一変更で同期する(`bun scripts/package.ts` + `bun run promote:self`、`dist:check` / `promote:self:check` green)。
- FR-3c: 受け入れ基準 — `CLAUDE_PROJECT_DIR` を **unset** した環境で、プロジェクトルートを cwd として mint-presence hook を起動行と同型のコマンドで実行し、exit 0 かつ HUMAN_TURN が当該 intent シャードへ追記されること(本セッションの実被害経路そのものでの確認)。env 設定済み環境での従来挙動は不変。
- FR-3d: 落ちる実証 — 修正前の起動行形で env unset 実行が失敗すること(bun の module not found)を記録してから修正する(自然な赤が本セッションで既に実測済み — その記録を流用してよい)。

### FR-4: リグレッションテスト(bugfix スコープの Testing Posture)

- FR-4a: FR-1〜FR-3 の各々に、元 Issue の再現手順を verbatim 再適用して閉包を実証するリグレッションテストを付す(`cid:requirements-analysis:fix-review-replays-origin-repro`)。
- FR-4b: 新規・変更行はローカル lcov で未カバー 0 を push 前に実測(`cid:code-generation:local-lcov-pre-push`)。spawn 経由でしか通らない行は in-process seam を設計時点で用意する(`git rev-parse` サブプロセスを含む FR-1 helper は spawn 盲点に注意 — 実 FS/process を使うテストは integration 層へ、`cid:code-generation:fs-tests-integration-first`)。

## 非機能要件

- NFR-1: 既存テストスイート green 維持(`bun run typecheck` / `bun run lint` / `bun run dist:check` / `bun run promote:self:check` / `bash tests/run-tests.sh --ci` 全て exit 0)。t202 test 2 の改訂以外、既存テストの期待値を変更しない。
- NFR-2: 正本は `packages/framework/core/`、生成物(`dist/<harness>/` 6 面+self-install ツリー)は同一変更で再生成・同期する。`dist/` の手編集禁止。
- NFR-3: 後方互換レイヤー・フォールバック分岐の追加禁止(org.md Forbidden)。FR-2a のフォールバックは「新 rung 不成立時に現行 ladder へ委ねる」既存挙動の維持であり、二重実装ではない。旧挙動(env 無条件最優先)は置き換える。
- NFR-4: hook は引き続き fail-open(hook 内部の失敗が人間のターンをブロックしない)。ただし #1492 の「起動すらしない」クラスは fail-open の対象外として FR-3 で構造的に解消する。

## 制約

- スコープは 4 Issue の修正に限る(surgical)。`resolveProjectDir`(engine CLI 側、`amadeus-lib.ts:185-209`)の解決順再設計は #1287(ADR 前提の enhancement)であり触れない。
- ハーネス(Claude Code)側の `CLAUDE_PROJECT_DIR` 提供有無・EnterWorktree の env 切替はエンジン側から制御不能 — 本 intent はエンジン側で吸収可能な面のみを修正する。
- コミットメッセージ英語、PR タイトル・本文日本語、コードコメント英語。

## 前提

- Claude Code の hook stdin JSON に `cwd` フィールドが載る(ハーネス仕様)。実装時に実 payload で実測確認し、フィールド名・形が異なる場合は実装を止めて報告する(`cid:code-generation:deviation-stop-before-implement`)。
- 本セッション自体が #1492 の被害環境であるため、修正後も本セッション内の hook は復活しない(hook 設定はセッション起動時スナップショット)。ゲート接地は手動 mint+solo grant `f9ef0312` の運用を継続する。

## スコープ外

- #1287(resolveProjectDir の解決順再設計 — ADR 前提)
- ハーネス側の env 提供・EnterWorktree の挙動変更
- hook 不発の loud 検知機構(#1492 提案の後段 — 検知面は別 Issue 判断)
- t257/t258/t259 のテスト番号重複整理(番号重複は既知の生態、引用フルパス運用で対応)

## 未解決事項

- kiro-ide adapter の payload 語彙(FR-2b)— 実装時実測が確定条件。`cwd` 相当が無ければ当該 adapter は現状維持(⚠ 未実測面、確約しない)。

## 検証マトリクス(要求→検証の対応)

| 要件 | 検証手段 | 経路 |
|---|---|---|
| FR-1c | `bun test tests/integration/t257-*.test.ts` 等 3 件 | 本 worktree 上の実実行(named path) |
| FR-2d | t202 改訂+新設ユニットテスト | in-process(unit) |
| FR-3c | env unset での hook 実起動+シャード追記の grep | 実被害経路の再適用 |
| FR-4a | 各 Issue の再現手順 verbatim 再適用 | worktree 実環境 |
| NFR-1/2 | 検証コマンド 5 種の exit 0 | CI 同等ローカル実行 |

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-07-25T23:49:30Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 の C-1(file:line 陳腐化)/M-1(重複トークン)是正を独立実測で全数確認(stale 引用 0 hit、FR-2b 列挙=grep 実測 11 ファイルと 1:1 一致)。GoA 1。

### Findings

- iteration1 C-1: amadeus-lib.ts 系引用が #1483 の行シフトで陳腐化(resolveMainCheckout :4131→:4232 等)— HEAD 9113a5106 で再解決済みを iteration2 で全数照合
- iteration1 M-1: FR-2b の amadeus-mint-presence 重複トークン — 除去済み、11 トークン=grep 実測 11 ファイルと一致
