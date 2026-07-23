# re-scan 記録 — 260719-mirror-productization

## 実行メタデータ

- Date: 2026-07-23T00:56:07Z(`date -u` 実測)
- Observed at: HEAD `d96ffe3beddc94c3adc96e320121de12b532a5dd`(`git rev-parse HEAD` 実測一致)
- Intent: `260719-mirror-productization`(amadeus-mirror ツールの配布物化 — `scripts/amadeus-mirror.ts` → core/tools 移設 + user-invocable SKILL + phase 境界 ask/auto-mirror + 3層設定解決 + gh optional ノルム改定。ideation 4ステージ承認済み)
- Scope: `amadeus`
- Project type: Brownfield
- Repository: `amadeus`
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(cid:reverse-engineering:c1、E-L63 の base 選定則)。base=`a326f47bc0146a3b4285552f42b92fd61fb343a7`(`git merge-base --is-ancestor a326f47bc d96ffe3be` exit 0 実測、`git rev-list --count a326f47bc..HEAD`=**111**)、observed=`d96ffe3beddc94c3adc96e320121de12b532a5dd`。
- 実施体制: Developer(スキャン)→ Architect(合成)の2サブエージェント直列(cid:reverse-engineering:c3)
- 測定 ref: 件数・行番号はすべて observed HEAD `d96ffe3be` の実ファイル直読(cid:measurement-ref-in-artifacts)。区間件数(distance 111 / 全変更2645 / 非 record 575)はコマンド出力の転記(numbers-from-command-output-only)。
- Per-intent 真実源: 本ファイルおよび `inception/reverse-engineering/scan-notes.md`
- Base の真実源: per-intent `re-scans/*.md` の到達可能な Observed commit。共有 `reverse-engineering-timestamp.md` は repo-level freshness pointer であり、次回差分 base の真実源にはしない。

## スキャン結論の要約

配布物化の対象 `scripts/amadeus-mirror.ts`(373行、verb = create/sync/close)は区間 `a326f47bc..HEAD`(111コミット)で **無変更**(`git log --oneline a326f47bc..HEAD -- scripts/amadeus-mirror.ts` = 空)。実装本体は #1169(初出)/#1198 時点で固定。差分リフレッシュの交差は「周辺機構」— state セレクタ #1374、package plugin 投影 #1338、SKILL — に集中する。

- **(1) mirror 実装の現行面**: `parseArgs`(:39-58)は `--intent <dirName>` のみ解し未知フラグ/値欠落は `usage`(exit 2)。`main`(:358-371)が3 verb へ分岐、`import.meta.main`(:373)で起動。gh は `spawnGh`(:205-223)が `Bun.spawnSync({ cmd: ["gh", ...args], env: process.env })` の引数配列 spawn(shell 非経由・env 明示 = bun-spawn-env-snapshot 準拠)、`ensureGhReady`(:225-227)が `gh auth status` を先行実行、`GhRunner` 型(:201)で注入可能(テストシーム、ADR-4)。状態源は決定的(intents.json + amadeus-state.md、`buildSnapshot` :111-156)、書込は gh 呼出と state の `Mirror Issue` フィールド(`writeMirrorIssueField` :236-250、`setOrInsertField` で `## Project Information` 節へ挿入)のみ。全 fault は `fail`(:231-234)で exit 1、close は fail-closed の landing check(:339-345、intents.json status==="complete" **かつ** state Status==="Completed" の両成立要求)。判別ユニオン `ArgsOutcome`/`SnapshotOutcome`/`GhResult`(functional-domain-modeling-ts 準拠)。テスト = `tests/unit/t232-amadeus-mirror.test.ts` / `tests/integration/t232-amadeus-mirror.integration.test.ts`。
- **(2) 投影機構**: `scripts/amadeus-mirror.ts` は **dist に非投影**(`find dist -name 'amadeus-mirror*'`=0件、`ls packages/framework/core/tools/ | grep -i 'mirror\|leader-sync'`=NONE)。投影機構は `packages/framework/harness/<name>/manifest.ts` の `coreDirs`。claude manifest の `{ src: "tools", dst: "tools" }`(:43)が `packages/framework/core/tools/` → `dist/<harness>/.../tools/` を全6ハーネス面へ投影。`scripts/` は coreDirs に含まれず構造的に非配布。`scripts/package.ts`(860行)は区間内 `0b1255e05`(#1338)で plugin 投影機構追加(`projectPluginsIntoHarnessTree`/`repoPlugins`)、coreDirs 投影ループは :350、harnessFiles は :384。**productization の投影載せ替え設計はこの現行 package.ts を基準にすること**。
- **(3) 薄い runner 様式(既習形)**: `{{HARNESS_DIR}}/tools/<tool>.ts` を叩く形。実例 `packages/framework/core/skills/amadeus-session-cost/SKILL.md`(frontmatter `user-invocable: true` / `classification: read-only`、本文 `bun {{HARNESS_DIR}}/tools/amadeus-runtime.ts summary --json`)。セッション skill は coreDirs で明示投影(claude manifest :51-54)。**現行 runner はすべて `tools/`(配布物)配下のツールを指し、`scripts/` を指す runner の前例は無い**。
- **(4) 設定解決の類例 = space 単層**: `amadeus-settings.ts` が `amadeus/spaces/<space>/settings.json` を解決(:3-8 ヘッダ、`load` は :129 で `space ?? activeSpace(projectDir)`)。**Global→Space→Intent の3層機構は未実装**(区間内 `amadeus-settings.ts` 変更0件)。カーソル慣行は `amadeus/active-space` / `amadeus/spaces/<space>/intents/active-intent`(`amadeus-lib.ts:419-437`、解決優先順 explicit arg > pointer > default/lone)。fail-closed パース(未知キー・型不整合・全モード off を invalid 収集)が3層設計の参照実装になりうる。
- **(5) phase 境界フック**: phase 境界ガードは `amadeus-orchestrate.ts` に無く(grep 0件)、実体は `amadeus-state.ts` の `verifyPhaseCheckArtifact`(:179-196)。`PHASE_CHECK_REQUIRED_PHASES = {ideation, inception, construction}`(:165-169)、`verification/phase-check-<phase>.md` 不在で `PHASE_VERIFIED` を拒否(:189-194)、`AMADEUS_SKIP_ARTIFACT_GUARD` バイパス共有(:173-175)、`amadeus-jump.ts` が同ゲートを前進 crossing で再利用(:178 コメント)。各 phase の check 産出ステージ = ideation:approval-handoff / inception:delivery-planning / construction:ci-pipeline(:161-162)。ask/auto-mirror の挿入点は skill/stage 側(core tools には現れない)。
- **(6) gh 依存の現行境界**: gh を使うのは `scripts/` の2ファイルのみ(`amadeus-leader-sync.ts` / `amadeus-mirror.ts`)。**`packages/framework/` 内 gh 参照は0件**。Bun-only Forbidden × `cid:practices-discovery:gh-scripts-boundary` が実装上も保たれている。

## 区間交差変更(非 record、SHA 付き)

mirror productization に直接交差するのは4系統:

- `packages/framework/core/tools/amadeus-state.ts` — 3 commits: `87eac15ea`(#1374 get/set/checkbox/count へ `--intent/--space` セレクタ追加、refs #1199)、`0b1255e05`(#1338)、`c499c1efb`(#1258 intent 完了時 active-intent 解放)。mirror が使う `activeIntent(explicitIntentDir)` の他 intent 選択と直結 — セレクタ機構の前進が productization の設定/対象解決に効く。
- `packages/framework/core/tools/amadeus-orchestrate.ts` — 2 commits: `0b1255e05`(#1338)、`68774b477`(#1288 stage-diary auto-gen アンカ)。dist 6面も同期変更。
- `scripts/package.ts` — 1 commit: `0b1255e05`(#1338、plugin 投影機構追加)。投影表面が変わったため mirror 投影載せ替え設計はこの現行 package.ts を基準にすること。
- `.claude/skills/amadeus/SKILL.md`(+dist 同期)— 1 commit: `0b1255e05`(#1338)。

## 設計上の緊張(architect が ADR 化を要提起)

配布物化は **2つの既決境界と直接衝突する**(scan-notes (2)(6) の合成):

- **境界 (a) coreDirs 非投影 vs 移設**: core/tools 移設は全6ハーネス dist へ mirror を投影する。現行 `scripts/` は coreDirs 非対象で構造的に非配布(dist コピー源は `CORE_ROOT`/`HARNESS_ROOT` 配下のみ)。
- **境界 (b) gh-scripts-boundary + Bun-only Forbidden**: core/tools 移設は gh 依存を配布フレームワークへ侵入させ、既決 `cid:practices-discovery:gh-scripts-boundary`(gh は scripts/ 限定許容)と Bun-only Forbidden に抵触する。intent 主題の「gh optional ノルム改定」はこの境界の裁定を含む。
- W-04 チーム内ツールの配置は既に `architecture.md`「contrib overlay 配布チャンネル」節(260718-election-ts-foundation)が「決定的 TS 本体は scripts/ が自然な家」と記録済みで、mirror 移設はこの前例と正面から対立する。投影の家(core/tools vs contrib overlay vs scripts 据え置き + SKILL 参照)と gh 境界の扱いは application-design/ADR での明示裁定が必要。

## codekb 本文への反映判断

本文8成果物のうち **`architecture.md` のみ差分更新**(「amadeus-mirror 配布物化の設計上の緊張」節を先頭現在節として新設 + 旧「260720-upstream-sync-230、現在」バナーを履歴ラベルへ降格 cid:reverse-engineering:c3-relabel)。architect 合成の新知見は「productization の設計上の緊張(coreDirs 投影 vs gh-scripts-boundary + Bun-only の衝突)+ 現行 phase 境界/設定解決の依拠面」の1クラスタで、architecture の管轄。

他7成果物(business-overview / code-structure / api-documentation / component-inventory / technology-stack / dependencies / code-quality-assessment)は温存(churn 回避、cid:reverse-engineering:c1): mirror.ts 本体は区間無変更、gh 依存は既存かつ不変で既に文書化済み(dependencies.md の scripts/package.ts 投影経路、code-structure.md フォーカス面6 `:447` の scripts/tests 非 dist、`:76` の phase-check ガード、`:293-297` の manifest 契約)。mirror.ts 内部構造は本 re-scan(per-intent record)に集約し、安定構造を記す code-structure.md への重複追記はしない。設定3層は新規設計で現行実装0件のため技術スタック/依存に新規追加なし。本 RE は enhancement 設計分析であり新規欠陥スキャンではないため code-quality-assessment への追記なし。
