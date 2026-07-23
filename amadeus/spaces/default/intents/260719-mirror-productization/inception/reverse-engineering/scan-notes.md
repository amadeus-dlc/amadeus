# Reverse Engineering スキャン結果 — 260719-mirror-productization(Developer 面)

## 実行メタデータ

- 手法: differential refresh(`git diff a326f47bc..HEAD`)。フルスキャンは実施せず(project.md cid:reverse-engineering:c1 準拠)。
- base: `a326f47bc0146a3b4285552f42b92fd61fb343a7`(祖先性確認済み: `git merge-base --is-ancestor` → OK、distance 111)
- observed: HEAD `d96ffe3beddc94c3adc96e320121de12b532a5dd`
- 測定 ref: file:line 引用はすべて HEAD ワークツリー直読。件数はコマンド出力の転記のみ。
- 主要コマンド:
  - `git rev-list --count a326f47bc..HEAD` → `111`
  - `git diff --name-only a326f47bc..HEAD | wc -l` → `2645`(大半は record 成果物)
  - `git diff --name-only a326f47bc..HEAD | grep -vE '^amadeus/spaces/' | wc -l` → `575`(非 record コード面)

## 重点領域別の実測所見

### (1) `scripts/amadeus-mirror.ts` の現行実装(全数読解、373行)

- ファイル所在: `scripts/amadeus-mirror.ts`(repo ローカル開発ツール)。**区間 a326f47bc..HEAD では未変更**(`git log --oneline a326f47bc..HEAD -- scripts/amadeus-mirror.ts` は空)。直近の触変コミットは `cd9865194`(#1198)と `22693152c`(#1169、Bolt 1 の初出)。
- verb 構成: `create | sync | close`。`parseArgs`(:39-58)が `--intent <dirName>` オプションのみを解し、未知フラグ・値欠落は `usage`(exit 2)。`main`(:358-371)が3 verb へ分岐、`import.meta.main`(:373)で `process.exit`。
- gh 依存: `spawnGh`(:205-223)が `Bun.spawnSync({ cmd: ["gh", ...args], env: process.env })` の引数配列 spawn(shell 非経由、env 明示 = bun-spawn-env-snapshot 準拠)。`ensureGhReady`(:225-227)が `gh auth status` を先行実行。`GhRunner` 型(:201)で注入可能(テストシーム、ADR-4)。呼ぶ gh サブコマンド: `issue create`(:267-278、`--label intent-mirror --label enhancement`)、`issue edit`(sync :311-317 / close 最終同期 :346)、`issue close`(:348)。
- パス解決: `SCRIPTS_DIR = dirname(fileURLToPath(import.meta.url))`(:25)、`PROJECT_DIR = join(SCRIPTS_DIR, "..")`(:26)。record は `packages/framework/core/tools/amadeus-lib` の `activeIntent`/`intentsDir`/`readIntentRegistry`/`recordDirMatches`/`getField`/`setOrInsertField` に依存(:15-23)。
- 状態源: 決定的ソースのみ(intents.json + amadeus-state.md)。`buildSnapshot`(:111-156)。`intents.json` へは書かない(WORKSPACE-lock 契約不変)。書込は gh 呼出と `amadeus-state.md` の `Mirror Issue` フィールド(`writeMirrorIssueField` :236-250、`setOrInsertField` で `## Project Information` 節へ挿入)のみ。
- エラー処理: 全 fault は `fail`(:231-234)で `exit 1`。close は fail-closed の landing check(:339-345、`intents.json status==="complete"` **かつ** state `Status==="Completed"` の両成立要求)。create の R-3(:285-293)は issue 作成成功後のフィールド書込失敗を loud に報告し auto-close しない。
- ドメインモデリング: 判別ユニオン `ArgsOutcome`/`SnapshotOutcome`/`GhResult` を採用(project.md functional-domain-modeling-ts スタイル準拠)。
- テスト: `tests/unit/t232-amadeus-mirror.test.ts` / `tests/integration/t232-amadeus-mirror.integration.test.ts` が実在(`main`/`GhRunner`/`projectDir` シーム駆動)。

### (2) `packages/framework/core/tools/` の構成と投影機構

- **配布物化の核心**: `scripts/amadeus-mirror.ts` は **dist に投影されていない**。`find dist -name 'amadeus-mirror*'` → 0件。`ls packages/framework/core/tools/ | grep -i 'mirror\|leader-sync'` → NONE。mirror/leader-sync は `scripts/` にのみ存在。
- 投影機構: `packages/framework/harness/<name>/manifest.ts` の `coreDirs` が core を各 dist へ写す。claude manifest では `{ src: "tools", dst: "tools" }`(:43)が `packages/framework/core/tools/` → `dist/<harness>/.../tools/` を投影(全6ハーネス面)。`scripts/` は coreDirs に含まれず、構造的に非配布。
- `scripts/package.ts`(860行)は区間内で `0b1255e05`(#1338 upstream-sync v2.3.0)により変更。plugin 投影(`plugin-projection.ts`/`plugin-composition.ts`)が追加され、`projectPluginsIntoHarnessTree`(:306-)・`repoPlugins`(:297)が新設。coreDirs/harnessFiles の投影ループは :350(coreDirs)、:384(harnessFiles、`projectRoot` フラグ分岐)。
- 含意(留意事項へ): productization = mirror を `packages/framework/core/tools/amadeus-mirror.ts` へ移設し coreDirs 投影に載せる案が第一候補だが、(6)の gh 境界と衝突する(下記)。

### (3) `.claude/skills/` の薄い runner 様式(既習形)

- 既習の薄い runner は `{{HARNESS_DIR}}/tools/<tool>.ts` を叩く形。実例 `packages/framework/core/skills/amadeus-session-cost/SKILL.md`: frontmatter に `user-invocable: true` / `classification: read-only`、本文 Step で `bun {{HARNESS_DIR}}/tools/amadeus-runtime.ts summary --json` を実行。トークン `{{HARNESS_DIR}}` はハーネス別に置換。
- これらセッション skill は coreDirs で明示投影(claude manifest :51-54)。mirror runner を作るなら同型が既習パターン。ただし現行 runner はすべて `tools/`(配布物)配下のツールを指す — `scripts/` を指す runner の前例は無い。

### (4) 設定解決の既存機構(3層の類例)

- 現行は **space 単層**: `amadeus-settings.ts` が `amadeus/spaces/<space>/settings.json` を解決(:3-8 ヘッダ、`load` は :129 で `space ?? activeSpace(projectDir)`)。Global→Space→Intent の3層機構は**未実装**(タスクの「類例」= この space 単層モデル)。区間内で `amadeus-settings.ts` は未変更(0 commits)。
- カーソル慣行: `amadeus/active-space`、`amadeus/spaces/<space>/intents/active-intent`(amadeus-lib.ts:419-437、`ACTIVE_SPACE_POINTER`/`ACTIVE_INTENT_POINTER`)。解決優先順は explicit arg > pointer > default/lone(:423-424)。`amadeus/` 直下の実配置は `.amadeus-clone-id` と `spaces/` のみ(`ls -a amadeus/`)。
- fail-closed パース(未知キー・型不整合・全モード off を invalid 収集)は productization の設定面設計の参照実装になりうる。

### (5) phase 境界フック(phase-check / approval-handoff の ask 挿入点)

- phase 境界ガードは `amadeus-orchestrate.ts` には無い(grep 0件)。実体は `amadeus-state.ts` の `verifyPhaseCheckArtifact`(:179-196)。`PHASE_CHECK_REQUIRED_PHASES = {ideation, inception, construction}`(:165-169)。`verification/phase-check-<phase>.md` 不在で `PHASE_VERIFIED` を拒否(:189-194)。`AMADEUS_SKIP_ARTIFACT_GUARD` バイパス共有(:173-175)。`amadeus-jump.ts` が同ゲートを前進 crossing で再利用(:178 コメント)。
- 各 phase の check 産出ステージ: ideation=approval-handoff、inception=delivery-planning、construction=ci-pipeline(:161-162)。approval-handoff への ask 挿入点は skill/stage 側(core tools には現れない)。

### (6) gh 依存の現行境界(cid:practices-discovery:gh-scripts-boundary の実装実態)

- gh を使うのは `scripts/` の2ファイルのみ: `scripts/amadeus-leader-sync.ts` と `scripts/amadeus-mirror.ts`(`grep -rln '"gh"|cmd: \["gh"' scripts/`)。
- **`packages/framework/` 内に gh 参照は0件**(`grep -rln '"gh"|cmd: \["gh"' packages/framework/` → NONE)。Bun-only Forbidden × gh-scripts-boundary が実装上も保たれている。
- **設計上の緊張**: mirror を core/tools へ移し配布物化すると gh 依存が配布フレームワークへ侵入し、gh-scripts-boundary(scripts/ 限定許容)と Bun-only Forbidden に抵触する。productization の設計はこの境界の扱いを明示裁定する必要がある(RE 合成で architect へ要提起)。

## 区間交差変更の列挙(非 record、SHA 付き)

- `packages/framework/core/tools/amadeus-state.ts` — 3 commits: `87eac15ea`(#1374 get/set/checkbox/count へ `--intent/--space` セレクタ追加、refs #1199)、`0b1255e05`(#1338)、`c499c1efb`(#1258 intent 完了時 active-intent 解放)。**mirror.ts が使う `activeIntent(explicitIntentDir)` の他 intent 選択と直結** — セレクタ機構の前進が productization の設定/対象解決に効く。
- `packages/framework/core/tools/amadeus-orchestrate.ts` — 2 commits: `0b1255e05`(#1338)、`68774b477`(#1288 stage-diary auto-gen アンカ)。dist 6面(claude/codex/cursor/opencode/kiro/kiro-ide)も同期変更。
- `scripts/package.ts` — 1 commit: `0b1255e05`(#1338、plugin 投影機構追加)。投影表面が変わったため mirror の投影載せ替え設計はこの現行 package.ts を基準にすること。
- `.claude/skills/amadeus/SKILL.md`(+dist 同期)— 1 commit: `0b1255e05`(#1338)。
- その他 `0b1255e05`(#1338 upstream-sync v2.3.0)が広範に touch: `scripts/plugin-projection.ts`/`plugin-composition.ts`/`harness-transform.ts`(新設・plugin 機構)、`scripts/formal-verif/*`(別 intent 260720 由来)、`scripts/amadeus-election*`(election CLI)。mirror productization に直接交差するのは上記4系統(state/orchestrate/package/SKILL)。

## 留意事項

- `scripts/amadeus-mirror.ts` 自体は区間内で無変更 — 実装本体は #1169/#1198 時点で固定。差分リフレッシュの交差は「周辺機構」(state セレクタ、package plugin 投影、SKILL)に集中する。
- 配布物化の設計判断は2つの既決境界に触れる: (a) coreDirs 非投影の `scripts/` からの移設、(b) gh-scripts-boundary + Bun-only Forbidden。architect 合成で ADR 化を要提起。
- 設定3層(Global→Space→Intent)は現状 space 単層のみ実在。3層は新規設計であり「類例」を空実装として捏造しないこと(実在は amadeus-settings.ts の space 単層)。
- 件数はすべてコマンド出力転記(2645 全変更 / 575 非 record / distance 111)。file:line は HEAD 直読。
