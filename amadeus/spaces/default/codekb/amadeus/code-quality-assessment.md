# コード品質評価

> 本ページ先頭の「本 intent(delegate-answer-consume)の観測面」節が最新 intent `260710-delegate-answer-consume`(#736)の記録。続く kiro-stale-hooks 節(#719 / P3 source hygiene)・dynamic-test-size 節(#699 / #684 Phase D)・t92-worktree-hermeticity 節(#709)・packaging-repair-batch 節(#701/#702 = PR #711/#712 解決済み)は前 intent の記録で、参照用に温存する。以降の「アーキテクチャ横断パターン」以下は `260709-bug-zero-batch`(#674〜#678/#668)の記録。

## 本 intent(delegate-answer-consume)の観測面 — #736 委任発行 grounding の QUESTION_ANSWERED 先食い

現行 HEAD(`5e9040cda`)の実コードを直接読解して確定した、委任機構の presence 境界の観測(欠陥候補と検証ギャップ)。差分ベース `24197d755`→`5e9040cda` の実体は **#685(verb-scoped provenance + `DELEGATED_REJECTION`)** の実装で、フォーカス3ファイル(`amadeus-lib.ts`/`amadeus-state.ts`/`amadeus-audit.ts`)はいずれも base→HEAD 間で改変済み。`amadeus-log.ts`(QUESTION_ANSWERED emit 側)は無変更。

### #736-O1 — 委任発行 grounding が verb 無しで QUESTION_ANSWERED に先食いされる(最重要・仮説/根本原因候補)

- **境界イベント集合に QUESTION_ANSWERED が含まれる**: `GATE_RESOLUTION_EVENTS = new Set(["GATE_APPROVED", "GATE_REJECTED", "QUESTION_ANSWERED"])`(`amadeus-lib.ts:1506`)。QUESTION_ANSWERED は非-human の **resolution 境界**として扱われる。
- **`humanActedSinceGate` のセマンティクス**: `humanActedSinceGate(projectDir, verb?)`(`amadeus-lib.ts:1507-1546`)は「直前の resolution より後に human 行為があるか」を返す(`return lastHuman > lastResolution && lastHuman !== -1`、`:1544`)。ledger 空は fail-open で `true`(`:1512`)。委任イベントは verb でスコープされ、`DELEGATED_APPROVAL` は `verb !== "reject"`、`DELEGATED_REJECTION` は `verb !== "approve"` のときだけ `verifyDelegatedProvenance` で検証される(`:1519-1524`)。
- **[仮説/根本原因候補]** 委任**発行**側の grounding gate は **verb 無し** `humanActedSinceGate(pd)` を呼ぶ: `handleDelegateApproval`(`amadeus-state.ts:1625`)と `handleDelegateRejection`(`amadeus-state.ts:1719`)の両方。リーダー ledger 上で `HUMAN_TURN → (interview 応答) QUESTION_ANSWERED` の順になると、`lastResolution(QUESTION_ANSWERED) > lastHuman` となり `false` を返し、**委任発行を誤って拒否**する。すなわち interview 応答の QUESTION_ANSWERED が delegate 発行の human presence を「先食い」する。これが #736 の機構(発行側での消費)と整合する。
- **verb スコープでは解けない直交性**: QUESTION_ANSWERED は委任 type ではなく `GATE_RESOLUTION_EVENTS` の resolution 要素であるため、`humanActedSinceGate` の `verb` 引数の分岐(`:1519-1524`)の影響を受けない。#685 の verb-scoped 足場は既に完成しているが(下記 O3)、**#736 は verb スコープと直交**する。→ 修正は境界イベント集合の定義、または answer/delegate 経路の境界セマンティクスに触れる可能性が高い。確定方式は functional-design 以降に委ねる。

### #736-O2 — 回帰テスト未整備・t188 の 1-answer/turn 契約との両立が要件

- **交差ケース不在(実測)**: `tests/unit/t112-delegated-approval.test.ts` に対する `grep QUESTION_ANSWERED` はヒット 0。委任発行側で「HUMAN_TURN 後に QUESTION_ANSWERED があると発行が誤拒否される」#736 の回帰テストは**現存しない**。t112 が pin するのは verifyDelegatedProvenance の grounding 証明・`humanActedSinceGate` の委任 approve gate・#685 の verb 壁(DELEGATED_APPROVAL は reject gate を開けない/逆も)・delegate-rejection writer 発行ゲート・CLI minting guard で、QUESTION_ANSWERED×委任 の交差は含まれない。→ 修正では新規テスト追加が必要。
- **両立要件(1-answer/turn 契約)**: `tests/unit/t188-human-presence-gate.test.ts:325-348` の handleAnswer twin が「HUMAN_TURN 有りで 1 answer commit → 同 turn 2 回目は QUESTION_ANSWERED が新境界となり refuse」を pin している。これは #736 が問題視する「QUESTION_ANSWERED が境界を進める」挙動を answer 経路で**意図的に固定**した契約。→ #736 の修正は、answer 経路の consume-once 契約(1 human turn = 1 answer、`amadeus-log.ts:122-125` コメント)を壊さずに、delegate 発行経路が同じ QUESTION_ANSWERED に先食いされない設計を要する。両経路のトレードオフが functional-design の要点。

### #736-O3 — #685 verb-scoped provenance 足場は既実装・dist 同期義務

- **verb 足場は完成済み**: `amadeus-lib.ts:1519-1524`(verb 分岐)、`amadeus-state.ts:1443-1456`(`assertHumanPresentForGateResolution` が approve/reject へ verb forward、`:1456` `humanActedSinceGate(pd, verb)`)、`amadeus-audit.ts` の `DELEGATED_REJECTION` 定義、`audit-format.md` / `docs/reference/12-state-machine.md` のレジストリ行。修正方式 B(verb-scoped）に乗せる基盤は整備済み。
- **dist 同期義務**: フォーカス3ファイル(lib/state/audit)は生成コピーを `.claude/tools/`・`.codex/tools/` の両方に持つ(全6コピー)。core 改変時は `bun scripts/package.ts` + `bun run dist:check`、`bun run promote:self` + `bun run promote:self:check`、`bun run typecheck` / `bun run lint`(Biome)、audit event を触るなら `t28-audit-event-sync`(2ファイル間 taxonomy sync)を green 維持し、**core+dist+self-install を同一コミットで揃える**(team.md Mandated)。

## 本 intent(kiro-stale-hooks)の確認済み欠陥 — #719(P3 / source hygiene)

現行 HEAD(`e1a07fada`、base `24197d755` からの diff-refresh)の実コードを直読して file:line を確定した、drift-guard の2層マスキング欠陥1件。Developer(スキャン)→ Architect(合成)の2サブエージェント直列で実施(cid:reverse-engineering:c3)。base→HEAD 差分13ファイルは本フォーカス面(kiro ハーネスの hook 出荷経路・orphan 検査機構)に非関与(監査エスケープ #204/#205・テストサイズ動的計測系)のため、下記はすべて現行コード直読による。base/observed の真実源は `re-scans/260710-kiro-stale-hooks.md`。

### #719 — Kiro CLI の unshipped な stale `.kiro.hook` を drift-guard が検出できない(2層マスキング)

- **欠陥の本体(dead な source)**: `packages/framework/harness/kiro/hooks/` に 7 件の `.kiro.hook`(audit-logger / log-subagent / runtime-compile / session-end / session-start / stop / sync-statusline)が source に残存するが、kiro CLI はこれらを**出荷も登録もしない**。出荷は `manifest.ts` が hooks 由来を adapter 1 件(`{ src: "hooks/amadeus-kiro-adapter.ts", ... }`、`:55`)のみ列挙し `.kiro.hook` を harnessFiles に1件も含めない。登録は `agents/amadeus.json` の `hooks` オブジェクト経由で全 seam が `amadeus-kiro-adapter.ts` を叩く(`.kiro.hook` は登録経路にも不在)。→ 7 件は出荷・登録とも完全に冗長。うち `amadeus-session-end.kiro.hook` のみ command が `bun .kiro/hooks/amadeus-session-end.ts`(adapter 非経由)で内容ドリフトしており(CLI/IDE 分離前の残骸)、他 6 件は kiro-ide 版と同内容。
- **1層目(主因)= source 側 orphan 検査機構の不在**: `scripts/package.ts` の `checkHarness(name)`(`:554-633`)は committed dist ツリー(`dist/<name>/`)と tmp build 出力のみを walk し、**source(`harness/<name>/`)を走査する経路が存在しない**。built→committed(MISSING/DIFFERS `:565-573`)、harness-dir subtree orphan(committed→built、authoredExempt 消費 `:579` / ORPHAN 判定 `:580`)、whole-tree orphan(`:605-628`、ORPHAN 判定 `:626`)のいずれも dist 側しか見ない。kiro CLI は `.kiro.hook` を dist に投影しない(`dist/kiro/.kiro/hooks/` の `.kiro.hook` は 0 件)ため、source の 7 件はどの walk にも載らず `bun run dist:check` は exit 0 で通過し、stale を一切検出できない。
- **2層目(補助的マスク)= 空振り authoredExempt regex**: `packages/framework/harness/kiro/manifest.ts:81` の `authoredExempt` 第3 regex `/^hooks\/[^/]+\.kiro\.hook$/` は「全 `.kiro.hook` を orphan 免除」するが、kiro CLI は `.kiro.hook` を 0 件出荷するため守る実体が無い純粋なマスク。万一 stale な `.kiro.hook` が dist に混入しても orphan 検査を素通りさせる第二の網として働く(コメント `:76-80` は regex1/2 の正当化のみで regex3 の根拠を記述しない)。対照的に `harness/kiro-ide/manifest.ts` は `.kiro.hook` を 9 件正当出荷(`:51-59`)し、同一 3 regex の authoredExempt(`:96`)は出荷対象という文脈で防御的に妥当。
- **同型性(#701 との関係)**: 本欠陥は下記 #701(orphan スキャンの dist ルート盲点)と同種の drift-guard 穴。#701 が「dist ツリー内の検査対象集合の穴」だったのに対し、#719 は「そもそも source 側を検査する機構が無い」という一段上流の穴で、2層目の空振り exemption がそれを補助的に隠す二段構え。#701 の whole-tree 化(`:605-628`)は dist 側の穴を塞いだが、source 側の未参照ファイルは依然どの検査にも当たらない。
- **テスト影響(削除の安全性)**: `tests/smoke/t148-kiro-file-structure.test.ts` は SHIPPED `dist/kiro` ツリーのみ(`hooks` の `.ts` ≥10 件を数える)、`tests/unit/t147-kiro-hook-adapter.test.ts` は `dist/kiro/.kiro/hooks/amadeus-kiro-adapter.ts` を subprocess 起動する。どちらも source の `.kiro.hook` を参照しない。リポ全体 grep でも source `harness/kiro/hooks/*.kiro.hook` を直接参照するテスト/スクリプトは皆無。→ 7 件の stale source `.kiro.hook` 削除は t147/t148 を含む既存テストを破壊しない(`bun test t148 t147` が exit 0 / 23 pass を実測)。
- **修正境界の候補**: (a) source の 7 `.kiro.hook` を削除して dead を排す、(b) kiro CLI manifest の authoredExempt regex3(空振りマスク)を除去して 2 層目を閉じる、(c) source 側 manifest 未参照ファイルを検出する検査機構を `checkHarness` に追加して 1 層目を塞ぐ。設計判断は requirements-analysis で確定。「落ちる実証」は source に stale `.kiro.hook` を残したまま検査が赤くなること(1 層目を塞ぐ場合)で担保する。


## 本 intent(dynamic-test-size)の観測面 — #684 Phase D 実装への含意

現行 HEAD(`24197d755`)の実コードを直接読解して確定した、テストランナーの per-file 計測・永続化ライフサイクルの観測(欠陥ではなく、#699「継続的動的計測」実装が土台にすべき既存機構と欠落点)。差分5ファイル(`bun.lock`/`package.json`/`tests/helpers/arbitraries/semver.ts`[A]/`tests/integration/t92.test.ts`/`tests/unit/setup-semver.pbt.test.ts`[A]、#721/#722 由来)はフォーカス面に非関与のため、下記はすべて base 時点から不変の現行コードの読解。

### #699-O1 — wall-clock は既に測れているが、永続化経路が存在しない(最重要)

- **計測は既存**: 各テストファイルは `runBunTestFile()`(`tests/run-tests.ts:685-797`)で1ファイル=1子プロセス実行され、`const start = Date.now()`(`:724`)を張り、`meta.duration === "0"` のときのみ `(Date.now()-start)/1000`(`:762`、秒 float 文字列)で補填する。基本値は JUnit XML root の `<testsuites time>`(`tests/lib/bun-junit-to-meta.ts:182` `attrStr(root,"time")`、`:151-154` `sanitizeDuration`)= **bun 1.2.22 で唯一実 wall-clock を持つ属性**(内側 `<testsuite time>` は全て "0"、同ファイル L28-29/L40-41 が検証記録)。`.meta` は6行 `NAME/STATUS/TESTS/FAILED/DURATION/RC`(`writeMeta` `:369-391`、`renderMeta` `bun-junit-to-meta.ts:287-296`)で **DURATION フィールドを既に持つ**。
- **永続化は不在**: `aggregateTierResults()`(`:417-431`)が全 `.meta` を `parseMeta` で読んだ直後、`:430` `for (const meta of metas) rmSync(meta, ...)` で**全削除**する。非 verbose 実行では `logDir` 自体が `mkdtempSync(TMPDIR)` の一時ディレクトリで実行後に丸ごと削除される(`cleanupLogDir`、`:275-277`・`:1113`)。→ duration が生き残る先は (a) メモリ上の `resultRows[].duration`、(b) `--verbose` 時のみの `summary.txt`(`writeVerboseSummary` `:950-985`、`${row.duration}s` `:973`)の**2箇所のみ**。**JSON/レジストリ形式の duration 永続化は現状ゼロ**(全走査で確認)。→ **#699 は削除される `.meta`/揮発 `resultRows` とは別の新規永続化経路(JSON アーティファクト等)を新設する必要がある。**

### #699-O2 — 動的計測を重ねる際の合流点と隔離契約

- **`printSizeMatrix` は静的分類のみで duration 非消費**: `:895-948` は `SCRIPT_DIR` を `walk()` 再帰走査し各 `.test.ts` を `readFileSync` → `classifyTestSize(src).size`(`:921`)で分類するだけで、実行時 wall-clock/`.meta` に一切触れない。→ **既存 size マトリクスは動的 duration の自然な合流点にならない**。#699 の動的値は別経路で積む設計になる。
- **`SizeClassification` 出力形状は後方安定契約**: `tests/lib/test-size.ts:42-45`(`{ size; signals }`)+ L10-14 のコメントが「Phase D (#699) layers true dynamic observation on top; the classifier's output shape stays stable so the drift guard and runner report keep working」と明言。→ **#699 は分類器の出力形状を壊さず"重ねる"のが前提**。size 軸は `small|medium|large`(`:23`)、順序は `SIZE_ORDER`(`:28`)が唯一の定義。
- **exit-code 隔離パターンは既存**: size 報告は `printSummary()` 内 `try { printSizeMatrix(); } catch {}`(`:882-886`、コメント `:880-881`「Observability only — MUST NOT affect the process exit code」)で完全隔離済み。t112(`tests/integration/t112.serial.test.ts`)が「exit == failed-FILE 数」不変条件を固定するため、**#699 が SUMMARY に動的計測を足すなら同じ try/catch 隔離が必須**。

### #699-O3 — t112 copy リスト伝播とレジストリ直交(実装制約)

- **t112 copy リスト制約(明確な破壊条件)**: `t112.serial.test.ts` は scratch tree に実ランナーをコピーして実駆動する(`copyFileSync` `:91-94`)。コピー対象は `run-tests.sh`/`run-tests.ts`/`lib/bun-junit-to-meta.ts`/`lib/test-size.ts`(`REAL_SIZE` `:52`、コメント `:49-52`「run-tests.ts also imports lib/test-size.ts ... the copied runner fails to load without it」)。→ **#699 で run-tests.ts が新たに static import するモジュール(動的計測モジュール等)を追加したら、この copy リスト(`:91-94`)にも同時追加しないと scratch runner がロード不能で t112 が壊れる**。`REAL_SIZE` と同じパターン必須。
- **coverage registry は size/duration と直交**: `tests/gen-coverage-registry.ts` は `// covers:` ヘッダ join を軸とし、`size|duration|meta|classifyTestSize` への参照を一切持たない(全走査で確認、ヒットは `Set.size` 等のみ)。→ **#699 が size/duration を registry 化するなら既存 `covers:` 機構への相乗りは自明でなく、別 JSON アーティファクト新設が現実的**。

### #699-O4 — CI 配線と動的バックエンドの環境制約

- **CI は Linux 確定・size 専用アーティファクト未設置**: `.github/workflows/ci.yml` の `check` ジョブは `runs-on: ubuntu-latest`(`:22`)、`coverage` ジョブは `actions/upload-artifact@v4` で `coverage/lcov.info`+`coverage/html` を upload 済み(`:75-84`、retention 14日)。→ **size/duration 専用のアーティファクト upload は現状無い**(ci.yml 全読で確認)。#699 が動的計測レポートを CI に残すなら、この既存 upload-artifact パターンが合流先。
- **動的バックエンドの OS 制約**: macOS の DTrace は SIP-blocked、Bun test preload も非発火(`test-size.ts:11-12` が既存判断として記録)= Phase A が静的である根拠。#699 の動的バックエンド選定はこの制約を継承し、GitHub hosted runner(ubuntu-latest、非特権/sudo 制限)での strace/eBPF 実行可否は要検証。

## 本 intent(t92-worktree-hermeticity)の確認済み欠陥

現行 HEAD(`be205cfca`)の実コードを直接読解して file:line を確定した、tsc 解決の非ヘルメチシティ欠陥1件。

### #709 — t92 test 44 が install 済 node_modules へのシンボリックリンクを前提し、worktree の install 状態で exit code がドリフトする

- **原因1(exit-code そのまま伝播の設計)**: ステータスゲート `packages/framework/core/tools/amadeus-sensor-type-check.ts:368` の `if (status !== null && status !== 0 && allErrors.length === 0) process.exit(status)` は、`allErrors` 空(TS18003「No inputs were found」等、`PRIMARY_RE` 不一致で line:col を持たない)かつ tsc 非 0 のとき tsc の生 exit code をそのまま伝播する。この code は TS のバージョン/`--incremental` 有無で 2 か 1 に揺れる。
- **原因2(環境依存 launcher)**: `resolveTscLauncher(tsconfigDir)`(`:182-201`)は起点 dir から上方向に `node_modules/.bin/tsc` を探索し、`existsSync`(`:192`)がシンボリックリンク追従で判定するため、リンク先欠落(未 `bun install`)だと false。ツリー上端まで無ければ `bunx tsc`(`:200`)へフォールバックし、グローバルキャッシュの別バージョン TS(観測 7.x)が走る。原因1と原因2の組合せが #709 の非対称の根本 — pinned tsc(typescript ^6 + `--incremental`)は exit 2、bunx フォールバックは exit 1。
- **バグの核心(test 44 の非ヘルメチシティ)**: `tests/integration/t92.test.ts` test 44(`:1160-1189`)は唯一 exit code(=2)を厳密ピンし、`:1180` の `symlinkSync(REPO_ROOT/node_modules, proj/sub/node_modules)` が**リポジトリの node_modules が install 済である前提**に立つ。未 install の worktree ではリンクが壊れ → bunx → exit 1 → `Note` が `script-error: exit-2` を満たさず**失敗**する。これが #709 の非ヘルメチシティ本体で、テストの緑がテスト対象ではなく worktree の install 状態に依存する。
- **堅牢な対照テスト(要修正外)**: test 45(`:1206-1234`)は node_modules シンボリックリンクなし・`allErrors` 非空(other.ts の実型エラー)でゲート不発火のため exit code ドリフトに非依存。test 12/16(`:557-567`, `:666-668`)は pass/fail 件数のみ検証で exit code 非依存。`tests/unit/t202-sensor-type-check-tsc-launcher.test.ts` は `resolveTscLauncher` の純関数テストで自前 temp ツリーを組み(`:37-101`)リポジトリ node_modules に非依存。tsc 解決を持つのは t92・t202 のみで、脆弱なのは t92 test 44 単独。
- **修正境界の候補**: test 44 の install 済 node_modules 前提を、worktree の install 状態に依存しない形(install 有無を前提しない skip ガード、または launcher を明示注入して exit code 依存を除去)へ。requirements で確定。「落ちる実証」は未 install 相当環境での再現で担保する。

## 本 intent(packaging-repair-batch)の確認済み欠陥 — PR #711/#712 で解決済み

> **解決状態(260709-t92-worktree-hermeticity スキャンで確認)**: 下記 #701/#702 はいずれも `22e3eb5aa..be205cfca` 区間で PR #711(#701)/ #712(#702)としてマージされ**解決済み**。以下の記述は当時の欠陥分析として参照用に温存する。

現行 HEAD(`22e3eb5aa`)の実コードを直接読解して file:line を確定した、2件の(当時)確認済み欠陥。両者ともリリース/配布パイプラインの整合性を静かに破る型であり、既存の正のテスト(下記「既存の品質ゲート」参照)では検出されなかった。

### #701 — `scripts/package.ts --check` の orphan スキャンが dist ルート平坦面を見ない盲点

- **原因1(orphan ルート集合のハードコード)**: harness 外 orphan スキャンが walk するサブツリーは `for (const sub of [".agents", "amadeus"])`(`scripts/package.ts:611`)の2件のみ。dist ルート直下(`dist/<name>/` の非 `<harnessDir>/`・非 `.agents/`・非 `amadeus/` ファイル)はどの walk 対象にも入らない。
- **原因2(projectRoot diff の片方向性)**: projectRoot な harness ファイルの明示 diff(`:586-592`)は `MISSING`/`DIFFERS`(built→committed 方向)のみを検査し、committed→built の orphan 方向を検査しない。
- **バグの核心**: (a) `<harnessDir>/` 配下でない、(b) `.agents/`/`amadeus/` 配下でない、(c) 現行 manifest が宣言する projectRoot 出力でない — の3条件を満たす stale ファイル(典型: manifest から削除/改名された旧 `AGENTS.md`/`CLAUDE.md`/onboarding の旧コピー)が `dist/<name>/` に居座っても、`--check` はどのスキャンにも当たらず exit 0 で通過する。drift ガードとしての保証に穴がある。
- **テスト状況**: `tests/integration/t145-packaging-parity.test.ts:46-69` は `--check` の exit 0 と `[claude] --check: OK` を主張する**正の drift ガードのみ**。dist ルート直下に stale orphan を注入して `--check` が赤くなることを実証する負のテストは存在しない(team.md「落ちる実証」規範の対象)。

### #702 — `scripts/release-version-sync.ts` の prerelease バッジが前進不能・half-applied

- **原因(正規表現の非対称)**: version 受理正規表現(`:22` `/^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$/`)は prerelease サフィックスを受理するが、README バッジ正規表現(`:53-54` `/badge\/version-[0-9]+\.[0-9]+\.[0-9]+-blue/`)は `X.Y.Z` の直後に即 `-blue` を要求し prerelease を許さない。受理側と patch 側が非対称。
- **バグの核心1(前進不能)**: prerelease 版へ bump するとバッジは `version-1.2.3-rc.1-blue` になり、次回実行時 `:54` の正規表現が一致せず `patchFile` が `:37-40` で `console.error` → `process.exit(1)`。以後どの版へも進めなくなる。
- **バグの核心2(half-applied / 冪等性破綻)**: `patchFile` は version.ts を先(`:47-51`)にディスクへ書き込んだ後に、バッジ patchFile が `:39` で exit 1 する。→ version.ts は前進済み・バッジは据え置きの半適用。再実行では version.ts は既に目標値(`changedVersionTs=false`)だがバッジは依然一致せず、再び exit 1 に張り付く。
- **リリース配線上の影響**: `release-version-sync.ts` は `packages/setup/.release-it.json` の `hooks.after:bump` 経由でのみ起動する(`release.yml` の workflow_dispatch 一本運用)。この盲点は1ボタンリリースを prerelease 到達時点で停止させる。
- **テスト状況**: `tests/unit/t68-version-changelog-sync.test.ts` は release-version-sync.ts を**実行しない静的検査**で、バッジ正規表現も非 prerelease 前提(`:81`)。#702 は未カバーで、修正時は t68 の正規表現も同時更新が必要。

## 品質改善(この差分区間 `a1c79dc12..22e3eb5aa` で観測)

- **PR #703 テスト hermeticity 修正(class-B 14ファイル)**: `tests/` 配下のユニット/インテグレーションテストで、共有状態・実行順序依存を排する hermeticity 修正が入った。テストスイートの決定性が向上している。
- **test-size ドリフトガードの新設**: `tests/lib/test-size.ts`(共有ヘルパー)+ `tests/unit/t-test-size-drift.test.ts`(ガードテスト)が追加され、テストファイルの規模ドリフトを検知する新しい品質ゲートが導入された。これは前述 #701/#702 のような「正のテストのみで負の実証を欠く」ギャップとは別軸の、テスト資産自体の健全性を守る仕組み。

## 既存の品質ゲート(変更なし)

- `dist:check`、`promote:self:check`、`.github/workflows/ci.yml`(typecheck → lint → dist:check → promote:self:check → tests)は変更なし。
- 6件のバグは、どれも既存テストが「合成 evidence」または「正常系」のみをカバーしており、実際に問題になる境界条件(merge 失敗、ガード欠落、audit の bare fallback、不正 JSON、chunk 分割、worktree 実行)を突く既存テストは確認できなかった(#674〜#678、#668 いずれも)。

## 強み

- `amadeus-swarm.ts`/`amadeus-state.ts`/`amadeus-bolt.ts` は audit-first の設計思想(状態変更前に audit emit、または audit emit 後に state write)が徹底されており、#674/#675/#676 の修理はこの既存パターンに沿って局所化できる構造になっている。
- `packages/setup/src/ports/http.ts`・`internal/tar-archive-extractor.ts` は Result 型でエラーを表現する規律が徹底されており、#677 の修理(`try/catch` 追加)はこの既存パターンへの単純な合流で完結する。
- `amadeus-lib.ts` の record-dir/repo-name 解決系は1箇所に集約されているため、#676/#668 の修理は同じファイルの2つの関数に閉じた変更で済む見込み。

## アーキテクチャ横断パターン(6バグの構造的共通性)

個別の欠陥コード位置は code-structure.md に記録済みだが、6件を並べると5つの構造パターンに整理できる。修理時はパターン単位で「同型の欠陥が他にもないか」を確認する価値がある。

1. **監査と実行結果の分離(#674)**: `handleFinalize`(`amadeus-swarm.ts:484-631`)は「exit code / envelope の `merge_failures`」と「`results[]` → audit trail(`emitUnitConverged`/`emitUnitFailed`)」という2つの真実源を持ち、`results[]` を再検証フェーズ(L551-553)で確定してから merge-back フェーズ(L588-599)を走らせるため、後者の失敗が前者に反映されない。原因は「2つの経路が別変数に書かれる設計」自体ではなく、「片方の経路が確定した後にもう片方が更新される順序」にある。
2. **ガードの非対称(#675)**: `handleApprove`(L1286-1379)と `handleReject`(L1430-1487)は `withAuditLock`/`validateSlugInState` という共通骨格を持つ姉妹ハンドラだが、`isAutonomousMode`/`humanPresenceGuardDisabled`/`humanActedSinceGate` という3関数の呼び出しが片方(approve)にのみ配線されている。ガード機構自体は健全で、もう一方の呼び出し口への配線が単に存在しない、という「配線漏れ」型の欠陥。
3. **識別子・パス導出の安定性欠如(#676・#668)**: `auditFilePath`(`amadeus-lib.ts:1267-1270`)と `codekbRepoName`(`amadeus-lib.ts:501-504`)はどちらも「唯一解が求まらないときに、より低精度な識別子へ黙って差し替える」フォールバックを持つ(`recordDir` が null → space-root 直下、`intentRepos` が0/2+件 → `basename(projectDir)`)。フォールバック自体の存在は妥当な設計判断だが、発火がログや戻り値に一切現れないため、呼び出し元は精度の低い識別子で処理を続けていることに気づけない。`stateFilePath`(L1255-1259)も同型のフォールバックを共有しており、#676 の修理範囲を検討する際にはこの姉妹関数への影響有無も確認対象になる(code-quality-assessment 修理時の安全要件 #3 に既述)。
4. **ポート境界での例外漏れ(#677)**: `Http` 型(`http.ts:9-12`)は `Promise<Result<unknown, FetchError>>` を全経路の契約として宣言しているが、`fetchChecked()` の try/catch は Response の取得までしか覆っておらず、その後に `getJson()` 自身が行う `.json()` の await(L27)は契約の外に置かれている。Result 型で境界を守る規律(強みの節に既述)は「境界に入る最初の非同期呼び出し」にだけ適用され、「境界内で追加される2番目の非同期呼び出し」には再適用されていない。
5. **ストリーム状態機械の chunk 境界未検証(#678)**: `extractTarGz` の `carry`/`pendingLongName`/`current`(L36-38)は `for await` ループの外側で宣言されたクロージャ変数であり、chunk をまたいで状態が保持される設計自体は静的スキャン上は妥当に見える。他の4パターンとは異なり、これは「欠陥が実測で確認された」パターンではなく「欠陥の有無が実測でしか確認できない」パターン — 修理着手前に、まず合成 fixture による実証(安全と確認できるなら codekb にその旨を明記、破綻するなら修理)が必要という点で扱いが分岐する。

パターン1・2・3は「機構は存在するが、2つの経路/2つの呼び出し口/2つの姉妹関数のうち片方にしか正しく適用されていない」という同じ形をしており、修理は既存機構への「もう片方への配線」で完結する見込みが高い(bugfix スコープの小規模修正という前提と整合する)。パターン4は既存規律の再適用漏れ、パターン5は検証負債であり、この2件は「直す」前に「本当に直すべきか/どう直すべきか」を requirements-analysis で先に確定する必要がある(既存の「移行しない選択肢の評価」節と整合)。

## リスクと技術的負債

| リスク | 影響 | 注記 |
| --- | --- | --- |
| **#674**: merge-back 失敗が audit/`results[]` に反映されない | 高(監査ログの正確性、conductor の後続判断を誤らせる) | `merge_failures`/exit code だけを見る呼び出し元は正しく検知できるが、`units[].status` や audit trail だけを見る消費者は誤認する。二重の真実源(exit code 経路と audit 経路)が食い違う構造そのものが負債 |
| **#675**: `reject` に human-presence guard が無い | 高(ゲートの公正性、approve/reject の非対称性) | 誰が呼んでも無条件に `revising` へ遷移できる。悪意の有無に関わらず、自動化スクリプトの誤操作でも人間の意思決定を経ずにゲートが後退しうる |
| **#676**: `auditFilePath`/`stateFilePath` の bare fallback が静かに発火する | 中〜高(audit trail の欠落、デバッグ困難性) | 呼び出し元にエラー・警告が一切出ないため、intent 解決失敗という異常状態が正常系のように見える。`error-classification` の観点では「回復不能なはずのエラーを黙って握りつぶす」パターンに該当しうる |
| **#677**: `getJson()` の `.json()` が未保護 | 中(信頼性、原因不明のクラッシュ) | GitHub API のレスポンスボディが期待通りでない場合、`Result` 契約を破って未処理の Promise rejection になる。呼び出し元のエラーハンドリングが `Result` のみを想定していれば、そこで例外が素通りする |
| **#678**: PAX/GNU longname の chunk 跨ぎが実測未検証 | 中(配布物の展開失敗、サイレントな破損の可能性) | 静的スキャンでは明確な破綻は確認できなかったが、実際の chunk 境界での動作は未実証。「検証しないまま安全と断定する」ことも「検証しないまま欠陥と断定する」こともproject.md の evidence-discipline 是正事項に反する |
| **#668**: `codekbRepoName` の fallback が worktree 名を使う | 中(codekb 出力先の非決定性) | 「決定的な per-repo ディレクトリ」という契約(`codekb-path` のコメント)に反する。本スキャン自体がこの fallback の実例(`codekb/claude-engineer-1/`) |

## 修理時の安全要件

1. **#674**: merge-back フェーズの結果を `results[]` に反映してから audit emission フェーズを走らせる順序に変更する。exit code 契約(L630)は変更しない。修理後、意図的に `complete --merge` を失敗させる(例: 競合するブランチ状態を用意する)テストで、`emitUnitFailed`/`emitBoltFailed` が発火し `emitUnitConverged` が発火しないことを実証する(team.md Mandated の「落ちる実証」原則)。
2. **#675**: `handleReject` にガードを追加するかどうかは意図的な設計判断を要する(reject は「人間が却下した」ことを示す操作であり、approve と同じ厳格さを求めるべきかは要件次第)。requirements-analysis で明示的に決定し、ADR 相当の根拠を残す。
3. **#676**: `recordDir` が `null` を返すケースを bare fallback で握り潰さず、`--worktree` の `start` からは明示的に失敗させる(またはログに警告を出す)分岐を追加する。既存の `stateFilePath` の同型 fallback(L1255-1259)への影響有無も確認する。
4. **#677**: `getJson()` の `.json()` 呼び出しを try/catch で包み、`FetchError.classify` 相当のエラー分類を追加する。不正 JSON を返す fixture でユニットテストを追加し、`Result.err` が返ることを実証する。
5. **#678**: PAX/GNU longname ヘッダが2つの `chunk` に分割される、または longname ヘッダとその本体ヘッダが別 chunk に分かれる合成 fixture を用意し、`extractTarGz` が正しく展開できるかを実測する。破綻するなら修理し、破綻しないなら「検証済みで安全」と codekb/テストに明記する。
6. **#668**: `codekbRepoName` の fallback を worktree 対応にする(例: `git rev-parse --show-toplevel` で実体リポジトリのルートを取得し、その `basename` を使う、または `.git` ファイルの `commondir`/`worktrees/<name>` パスから親リポジトリ名を逆算する)。複数 worktree(`claude-engineer-1`、`claude-engineer-2` 等)から同一リポジトリ名が解決されることをテストで実証する。

## 移行しない選択肢の評価

6件とも既存機能の欠陥修理であり、「修理しない」選択肢は intent の目的そのものを満たさない。ただし #675(reject のガード追加)と #678(実測検証)は、修理範囲が「バグである」という前提そのものの検証を要する点で他の4件と性質が異なり、requirements-analysis で先に「これは本当に欠陥か」を確定すべきである。

---

## 既知の欠陥 — 今回 intent(`260709-integrity-batch`)の修理対象4件

> 上記の6バグ(#674/#675/#676/#677/#678/#668)は前回 intent `260709-bug-zero-batch` のスキャン記述であり、本 intent のスコープ外。本節が今回の diff-refresh(`a1c79dc12..162553b99`)で焦点化した4件。いずれも当該区間の焦点コードに未着手で残存する欠陥であり、#707・#708 は今回区間で入った前提機構(#693 origin 由来 repo 名 / #671 delegate provenance)の隣接領域として顕在化した。file:line は self-install ツリー(`.claude/`)を実測面として引用する — 修正は source of truth の `packages/framework/core/` を編集し dist/self-install へ伝播させる(team.md Mandated)。

### #708 human-presence 偽陽性(P1、検証機構の正しさ)

- **mint 側(無条件 mint・stdin 未読)**: `.claude/hooks/amadeus-mint-presence.ts:23-31` — `resolveProjectDirFromHook(import.meta.url)` → `existsSync(stateFilePath(...))` なら **無条件に** `appendAuditEntry("HUMAN_TURN", {}, projectDir)`。冒頭コメント L12-13 が「Presence-only: the prompt text is irrelevant, so stdin is not read.」と明言し、UserPromptSubmit を発火させた入力が人間の生タイプか機械注入(Stop-hook フィードバック / task-notification)かを区別する情報を取得しない。これが偽陽性の直接原因。
- **gate 側(mint を消費する判定)**: `.claude/tools/amadeus-lib.ts:1442-1479` `humanActedSinceGate` は `HUMAN_TURN`(および検証済み `DELEGATED_APPROVAL`)とゲート解決イベントを時系列比較し `lastHuman > lastResolution` で true を返す(空台帳は fail-open で true、L1444)。委任承認 provenance `verifyDelegatedApproval`(L1480以降、#671)は健全だが、偽の `HUMAN_TURN` が mint 側で湧くと `isHumanTurn` 経路(L1451)で無条件カウントされ、provenance を経ずゲートが開く。消費点は `amadeus-state.ts:1311`(approve/reject 共通ヘルパー)と `amadeus-state.ts:1479`(delegate-approval)。
- **修正の型(既存様式)**: `amadeus-audit-logger.ts:29-44` / `amadeus-session-start.ts:86-96` が `isTTY` ガード → `Bun.stdin.text()` → `JSON.parse` → `isClaudeCodeHookInput`(`amadeus-lib.ts:2049-2051`)→ fail-open(`process.exit(0)`)の定型を確立済み。hook 入力型 `ClaudeCodeHookInput`(`amadeus-lib.ts:2029-2047`)は既に `source?` / `prompt?` を宣言済み(フィールド追加不要)。ただし**型に在る≠ランタイムで来る**。`source` は SessionStart 固有(session-start.ts が読む)で、UserPromptSubmit に判別材料が来る保証はない — 実 UserPromptSubmit stdin JSON の実機キャプチャが必須(code-generation 段)。判別材料が無ければ #708 提案(b)「gate は delegate provenance を正道とし、ローカル単独 HUMAN_TURN を信頼しない」が現実的な緩和方向。fail-open 契約(mint 失敗が人間のターンをブロックしない)は維持必須。

### #705 sdk-drive calibration のランナー管理外・doctor ドリフト(P2、検証機構の正しさ)

- **doctor 期待値ドリフト**: `tests/harness/sdk-drive.calibration.test.ts:55-72` が既知回答 doctor 文字列をピン留めするが、`DOCTOR_DOCS_LABEL = "amadeus-docs/ directory exists"`(L72)は現行 doctor 出力に存在しない(CONFIRMED)。現行 `amadeus-utility.ts:628` は `label: \`workspace shell ready (${harnessDir()}/ + amadeus/spaces/default/memory/)\`` を出力し、旧文字列は現れない。よって calibration 2 は依存導入後も失敗する。コメント L61-66 が指す `utility.ts:396` の旧行自体もドリフト。
- **ランナー管理外**: `tests/run-tests.ts:31` の `type Level = "smoke" | "unit" | "integration" | "e2e"`、`levelFiles(level)`(L577-587)は `join(SCRIPT_DIR, level)` 直下のみ列挙。`tests/harness/` はどの Level にも属さず、substrate skip(`shouldSkipForClaude`、L485-489)も掛からない(CONFIRMED)。ad hoc 実行時のみ走り、通常 CI では tier 外。`tests/gen-coverage-registry.ts`(L675以降)のカバレッジウォークは `tests/harness/` を静的集計するが、これは**実行**ではなく substrate ゲートとは別系統。
- 修正はテスト側の期待値更新 + ランナー登録方針の決定(#705 提案 A/B)。team.md/project.md の「検証劇場 Forbidden」(偽の trust anchor)の趣旨に直結し、「落ちる実証」が要求される。

### #707 codekb 並行リフレッシュ衝突(P2、共有ストアの一貫性)

- **前提機構(#693)**: `.claude/tools/amadeus-lib.ts:556-565` `codekbRepoName` は recorded repos が1件ならその名、0件なら `originRepoSlug(projectDir)`(L560)、解決不能時 `basename(projectDir)`。#693 で origin remote 由来に統一され、全 worktree/clone が同一 `codekb/amadeus/` を指す = #707 の前提。関連: `codekbDir`(L530-533)、`originRepoSlug`(L571-580)。
- **単一 timestamp 構造(構造的原因)**: ステージ定義 `.claude/amadeus-common/stages/inception/reverse-engineering.md` の L5 `condition:`(「Always rerun for freshness」= 常時リフレッシュ前提)、L36 `outputs:`(`codekb/<repo>/` の**9固定ファイル・単一ディレクトリ**)、L110(`reverse-engineering-timestamp.md` は freshness marker、**単一ファイル**)。timestamp は per-intent の base/observed を分離して持てず、並行リフレッシュで base/observed が互いに上書きされる。現行 `codekb/amadeus/reverse-engineering-timestamp.md` の実形式も単一 intent の単一スキャン点を前提とし、複数 intent の並行 base/observed 欄が無い。
- 修正方向 C(timestamp を per-intent 記録化、本文 last-writer-wins 明文化)を採るなら、このファイル構造とステージ定義 L110/L36 の両方に規約追記が要る。**本 timestamp 更新自体がこの緊張(自己言及)の当事者** — last-writer-wins 前提で書く必要がある。

### #706 delivery knowledge の tree 外参照(P3、共有参照の一貫性)

- **破損参照**: `packages/framework/core/knowledge/amadeus-delivery-agent/workflow-planning-guide.md:3` — 「Use this alongside `product-guide.md` when leading execution plan creation.」だが、delivery-agent の宣言済みロードパス(`amadeus-delivery-agent.md:71-77`)は自分の `knowledge/amadeus-delivery-agent/` と `amadeus-shared/` のみで product-agent ディレクトリを読まない。
- **実配置**: `knowledge/amadeus-delivery-agent/` は `mob-programming-guide.md` / `team-topologies.md` / `workflow-planning-guide.md` の3ファイルのみで **`product-guide.md` は不在**。`product-guide.md` は `knowledge/amadeus-product-agent/product-guide.md` に存在(core / `.claude` / `.codex` / `dist/{claude,codex,kiro,kiro-ide}` の7箇所に伝播済み)。
- **伝播構造**: 破損参照は既に `.claude/knowledge/.../workflow-planning-guide.md:3` と `dist/claude/` 複製にも伝播済み。L3 は今回 diff 区間で未変更(L55 のみ #672 で編集)= 恒久的な既存欠陥。修正は core を直し `bun scripts/package.ts` + `bun run promote:self` で全ツリー再同期(`dist:check`/`promote:self:check` を同一コミット)。修正方向は (a) 参照文言の削除/修正、(b) `product-guide.md` を delivery ディレクトリにコピー(重複負債・NEVER 二重実装ノルムと緊張)、(c) delivery-agent のロードパスに product-agent knowledge を追加 — 設計判断は requirements-analysis へ。

### 構造的共通性(4バグの分類)

- **検証機構の正しさ系(#705・#708)**: どちらも「偽の信頼を生む機構」= team.md/project.md の「検証劇場 Forbidden」の趣旨に直結。修正時は「落ちる実証」(失敗ケース注入で赤くなること)が team.md Mandated で要求される。
- **共有ストア/参照の一貫性系(#706・#707)**: #693(origin 由来 repo 名)後の単一 codekb ストアという新しい共有面で、並行書き込み(#707)と tree 外参照(#706)が顕在化。
