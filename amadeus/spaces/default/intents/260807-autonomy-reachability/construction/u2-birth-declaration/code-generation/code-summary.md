# Code Summary — u2-birth-declaration

上流入力(consumes 全数): code-generation-plan.md(本 unit の受け入れ基準・裁定・実装方針)、functional-design/business-rules.md(BR-U2-1〜7 の充足判定)、nfr-design/reliability-design.md(失敗様式の網羅)。

## 着地内容

builder コミット `bf373a8bf`(worktree 隔離、base `4ea9bdad0`)→ conductor ツリーへ cherry-pick `dfa6481d8`。**fidelity diff = 0 行**(builder 変更7ファイルを対象に機械確認)。

| ファイル | 主要所在 |
|---|---|
| `amadeus-lib.ts` | `PresenceEvent` に `block`/`shardPath` 追加 :3672-3678 / `scanPresenceLedger` の `(projectDir, intent?, space?)` 引き回し :3692-3697 / `readPaths` の整合修正 :3701-3711 / `outstandingHumanTurns` :3812-3846 |
| `amadeus-intent-autonomy-production.ts` | `AutonomyProvenanceScope` :343-352 / `earliestAuditTimestamp` :359-374 / `launchChainHumanTurnId` :388-412 / `resolveDeclarationProvenance` :421-442 / 配線 :660-670 / 入力欄 :619 |
| `amadeus-orchestrate.ts` | `LaunchAutonomyOutcome` + `carry` / `LaunchAutonomyReach` :1230-1241 / `emit` backstop :760-772 / `noDeclarationTargetRefusal` :1298-1317 / ladder 並べ替え+`reach` :1325-1381 / `launchAutonomyReach` :1420-1436 / carry ラッチ+`autonomyCarryDivertError` :1442-1466 / `birthPrintDirective` 消費 :1523-1530 / ラッチ reset :2762-2765 / Branch 4ab :3071-3096 / divert :3244・:3320 |
| `amadeus-utility.ts` | `parseBirthAutonomyFlag` / `applyBirthAutonomyDeclaration` :4193-4245 / lock 前検証 :4262 / `migratedInPlace` :4300・:4322 / lock 後適用 :4442-4448 |
| `tests/unit/t450-autonomy-flag-apply.test.ts` | FR-1c 改訂(H0 → H0a/H0b/H0b2/H0b3/H0c) |
| `tests/integration/t450-autonomy-flag-branch.test.ts` | FR-1c 改訂(:83 の分割)+ carry / divert / ask ケース |
| `tests/integration/t490-birth-declaration.integration.test.ts` | **新規** — 10 tests(FR-1d の e2e を含む) |

## 裁定条件の充足(E-U2BLK)

- **条件1(opt-in・fail-closed 既定)**: `provenanceScope` は既定 `"intent"`(:619、解決 :667)で既存呼び出し元は不変 — t490 の先頭テストが birth 直後の `PROVENANCE_REQUIRED` を維持してピン。`resolveDeclarationProvenance` :427-435 は `full` × `launch-chain` を **turn 探索の前**に `PROVENANCE_SCOPE_FORBIDDEN` で拒否し、`prepareFullGrantCommand` を到達不能にする。engine 側でも `full` は birth 適用されない(`amadeus-utility.ts:4223-4231` が儀式を印字して return)
- **条件2(実在・同一連鎖のみ)**: presence ブロックは session id を持たない(`amadeus-presence-reservation.ts:590` が空 fields)ため、codebase 自身の ordinal idiom(`targetedApprovalEvidence` の `humanAt >= latestGateAt` :642 / `humanActedSinceGate` の未消費判定)に倣う4条件 — (1) 実在の HUMAN_TURN ブロック(`outstandingHumanTurns` が `scanPresenceLedger` の同一 parse を再利用、mint も合成もしない) (2) 自 record の ledger で未消費(`resolutionConsumesHuman` を無改変で再利用、`amadeus-lib.ts:3841`) (3) 誕生 record の最古監査タイムスタンプ以前(`<=` — 監査書込は秒を共有しうる) (4) 横断で最新・同点は厳格経路と同じ turn id 解決(:407-410)。兄弟列挙は既存 `listIntentDirs`。委任済み presence は除外(:3839)
- **条件3(loud・ラッチ非消費)**: 引用可能な turn が無い場合 `die(...)`(`amadeus-utility.ts:4239-4243`)で非0終了し回復コマンドを案内。`applyHumanCommand` 前に拒否するため mode は未設定・`modeProvenance.kind` は `human-command` にならず、t490 の最終テストが再宣言の成功で BR-U2-4 を実証
- **条件5**: `amadeus-orchestrate.ts:3068-3070` の設計コメントは**逐語不変**(配置理由の一文のみ改訂)

## 対角実測(FR-1c / BR-U2-5)

fix コミット後に `git checkout <ref> -- <path>` の面切替のみで実施(stash 不使用)、fix SHA から復元し `git diff bf373a8bf` 空を確認。

| 点 | 結果 |
|---|---|
| (a) 改訂前テスト × 修正後実装 | 15 pass / **8 fail** — 全て unit 側で `ports`→`reach` の引数移動由来。integration 側は 7/7 green で、元の :83 拒否を含め birth 非到達形の挙動は保存 |
| (b) 改訂後 × 修正後 | **32 pass / 0 fail**(t450 pair)、10/0(t490) |
| (c) **改訂後 × 修正前実装** | 16 pass / **26 fail** — carry(H0b/H0b2/H0b3)・ask 案内(H0c)・branch 5件・launch-chain/birth 6件・FR-1d e2e のすべてが赤 |

## 検証実測(exit code は各コマンド単独捕捉)

- builder 側: typecheck 0 / lint 0 / 宣言16ファイル `Ran 236 tests across 16 files` = 236 pass 0 fail / `run-tests.sh --ci` exit 0(904 files・12105 assertions・0 fail)/ build 0・`git status` empty
- conductor 側取込後: fidelity diff 0 / build 0 / typecheck 0 / `gen-coverage-registry --check` 0
- 複雑度ゲート: builder が baseline 追加でなく**リファクタで解消**(`--check` は `0 new violations, 0 regressions`)

## 既存事象の切り分け(自変更由来の回帰ゼロ)

conductor ツリーの full CI は 3 ファイル赤(904 files 中)。base 断面(`HEAD~1` の分離 worktree、node_modules は symlink 共有・`bun run build` 独立実行)との失敗集合 diff で全件を既存事象と立証:

- `t17.test.ts` / `t66.test.ts` — base にも **active-intent カーソルを再現**すると同型再現(カーソル無し 184 pass 0 fail → カーソル有り 182 pass **2 fail**)。ambient 入力起因
- `t-runtime-dispatch-seam.test.ts` — テスト本文コメントが「`runtime-graph.json` が無いとき exit 1」と依存を明記。自ツリーには生成済み(gitignored)、base には不在。生成物は byte-copy 対象外のため個別に実証

## 独立レビューと是正(§12a 相当 — swarm 経路のため reviewer-runtime でなく独立 subagent)

- Verdict: **READY**(BLOCKER / MAJOR ゼロ)。裁定条件1〜5・BR-U2-1〜7・FR-1a〜1d の全項目充足を file:line 単位で確認。偽装 presence の新規 mint・認可境界の緩和・無申告の逸脱はいずれも検出されず。t481 の単一書込点 grep ガードが `packages/framework/core` 全域走査で production.ts のみを writer と確認していることも独立検証
- **MINOR 1件(是正済み)**: `amadeus-utility.ts:4446` の `if (autonomy !== null && !migratedInPlace)` が、既存フラットレイアウトからの移行時に `--autonomy` を無音で落としていた。BR-U2-1 の「案内つき loud 拒否」の文言スコープ外(同則は `next` の到達性ラダー対象)だが、本 unit が塞ぐ「宣言の無音消失」と同形のため是正

## CI patch coverage 是正(builder 差し戻し1回)

初回 CI で patch gate が赤(`measured added lines: 160, covered: 132, uncovered: 28`)。spawn 盲点クラス(t490 が CLI を spawn 駆動)で、実装欠陥ではない。既決の二段判定に従い **(i) in-process seam** で解消し、**allowlist(waiver)は1件も追加していない**。

- 分岐判断の根拠(`measure-before-blindspot-branch`): coverage を実行せず、gate 実装 `tests/coverage-patch-gate.ts:418`(`if (!hits) continue; // file absent from lcov`)と `:420`(`if (h === undefined) continue; // line not coverable`)から、CI が当該行を *uncovered* と名指した事実自体が「そのモジュールは既に lcov に載っている」証拠であると導出。`seam-placement-measured-module` の罠(absent→missed 反転)は、既に present であるため該当しない
- 主な seam: `parseBirthAutonomyFlag` → 純関数 `classifyBirthAutonomyFlag`(export)、`applyBirthAutonomyDeclaration` → `BirthAutonomyPorts` 上の純関数 `resolveBirthAutonomyDeclaration`、`emit` backstop のメッセージ → 純関数 `strandedCarryRefusal`。終端 arm と `die` 呼び出しは**1行化**して毎回評価される形にした((i) のリファクタ面)
- `:4324`(migration 分岐)と `:4447`(宣言呼び出し)は、migration + `--autonomy` の in-process テストで被覆。conductor が CI 実測の未被覆28行と `:4310-4326` の重なりを判定して builder へ供給した
- `production.ts:367`(`catch { continue }`)は dangling symlink 注入で被覆(`bun-readfilesync-dir-platform-divergence` のポータブル注入)
- 複雑度ゲートは `handleIntentBirth` が CCN 17 に達したが、`birthAutonomyOrDie` / `reportBirthAutonomyDeclaration` の抽出で**リファクタ解消**(baseline 追加なし)

MINOR 是正の様式は既存近傍から一意に導出(builder 報告): migration 分岐は stdout 報告+成功(`:4321-4323`)、既存の追加的 birth advisory は notice + `remedy:` 行で成功継続、`die` arm の回復文言は end state が同一(live intent・mode 未設定・first declaration 未消費)のため実質再利用。よって **stdout advisory・exit 0・mode 未適用・ラッチ未消費**を採用。テストは文言の逐語 assert に加え `projection.mode === "none"` と `modeProvenance.kind !== "human-command"` を assert しており、被覆だけでは満たせない。

是正後の実測: typecheck 0 / lint 0 / complexity `--check` OK(0 new violations)/ registry `--check` 0 / u2 対象6ファイル 84 pass 0 fail / ratchet 群 74 pass 0 fail / `run-tests.sh --ci` exit 0(905 files・12128 assertions・0 fail)/ build 0・`git status` empty。既存42テストは無改変で pass。PR ブランチ(main 起点)取込後も fidelity diff 0・対象5ファイル 74 pass 0 fail。

**留保(builder 申告)**: patch gate の verdict は CI が与えるものであり、coverage 実行制限下でローカル再計測はしていない。28行は構成上(in-process driver + 計測可能な1行ガード)で解消しており、ローカル再計測による確認ではない。

## 認可 provenance の是正(CodeRabbit Major — 裁定条件2・3の違反を実測で確認)

CI 全 green・独立レビュー READY の後、CodeRabbit が `launchChainHumanTurnId` に Major(Security & Privacy)を指摘。conductor が実コードで検証し**妥当**と判定して差し戻した。

**欠陥**: 時間の束縛が `if (turn.timestamp > bornAt) continue;` の**上限のみ**で、下限も launch との同一性束縛も無かった。`listIntentDirs` が space 内の全 intent を候補にするため、park 途中の古い intent に未消費 `HUMAN_TURN` が残っていれば何日前のものでも候補になった。

**裁定違反の所在**: 条件2「任意の古い presence を無制限に受理しない」が上限のみで名目化し、条件3「実在 turn が無ければ loud 失敗」は**代替 turn が採用されるため到達不能**になっていた。builder が修正前に再現確認 — 無関係な未消費 turn が存在し当該 launch の turn が無い状態で、birth + `--autonomy semi` が **exit 0 で成功**した。

**是正(識別子の搬送と同一性解決)**:
- **識別子**: `launchTurnFingerprint(space, sourceIntentDir, shard, blockDigest)`(:363-378)— 既存 `latestHumanTurnId`(:326-333)が turn を名指すのに使う座標から、launch 時点に存在しない target intent の座標だけを除いた射影。新規の命名規則は導入せず、呼び出し元へ返す target 束縛 id は不変(`commandOccurrenceId` / `humanTurn.turnId` の意味論も不変)
- **観測**: `observeLaunchTurnToken`(:387-399)を Branch 4ab(`amadeus-orchestrate.ts:3100-3105`)から呼び、**active record のみ**を厳格経路と同じ `outstandingHumanTurns` で走査(launching intent が active な最後の時点)
- **搬送**: `PendingAutonomyCarry` が `{mode, turnToken}` を持ち、`birthPrintDirective` が `--autonomy-turn <token>` を付与
- **照合**: `launchChainHumanTurnId(projectDir, resolved, launchTurnId)`(:431-473)は候補探索をやめ**同一性解決**へ。fingerprint 一致・未消費・`<= bornAt` の3条件で、時刻は補助的な上限へ降格
- **縮退の表現不能化**: `AutonomyProvenanceScope` を判別ユニオン(`{kind:"intent"} | {kind:"launch-chain"; launchTurnId: string}`、:359-361)にしたため、**turn を名指さない launch-chain は型として存在できない**。運ぶものが無い launch は何も運ばず、書込経路の手前で拒否される

**落ちる実証**: t490 の負のケース「無関係な古い turn が存在 × この launch は turn を mint していない」で **Red = exit 0(静かな成功)→ Green = 非0**、mode `none`、`modeProvenance.kind !== "human-command"`、再宣言で回復可能。FR-1d の e2e は directive から `--autonomy-turn` を parse して engine が名指したとおり実行し `observeLaunchTurnToken` と一致することを assert するため、carry 連鎖が端点だけでなく全体でピンされる。

是正後の実測: typecheck 0 / lint 0 / complexity `--check` 0 new violations(baseline 拡幅なし)/ registry `--check` 0 / 対象5ファイル 79 pass 0 fail / `run-tests.sh --ci` exit 0(905 files・12133 assertions・0 fail)/ build 0。既存 assertion は一切弱めていない。PR ブランチ取込後も fidelity diff 0。

**builder のインシデント申告(実害なし・記録のみ)**: 作業途中で `git checkout tests/ packages/` を ref 無しで実行し、未コミットの token 実装を全消失させた。ゼロから再実装し、上記の検証はすべて再構築後の状態で再実測している。既決 `cid:code-generation:falling-proof-no-stash` が規定する「対象ファイルのみ `git checkout <fix-sha> -- <path>` で切替」を使うべきだった、というのが builder 自身の総括。

## 申し送り

- 改番前の重複テスト(`t486-question-route-observability` / `t487-question-route-derivation`)が本ブランチに残留していたため削除し registry を再生成した — main の正本は t488/t489(u3 の改番後)であり、本 unit とは無関係の後始末
- builder は**環境障害で1度停止**した(割当 worktree が消失し Bash と Write のガードが別ツリーを名指した)。conductor ツリーへの書込は行われず実害ゼロ。再ディスパッチ時は Write プローブによる健全性確認を最初の手順に追加した
