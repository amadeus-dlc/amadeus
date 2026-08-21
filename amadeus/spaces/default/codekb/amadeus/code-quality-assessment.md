# コード品質評価

## Issue #3029 の品質観測（2026-08-18）

- **回帰の存在**: dispatcher の exit 127 分類は `tests/integration/t92.test.ts` Group D で `SENSOR_PASSED / tool-unavailable` として固定され、blocking gate の approve 挙動は `tests/integration/t511-blocking-sensor-gate.integration.test.ts:369-374` で成功として固定されている。
- **unit evaluator の期待**: `tests/unit/t511-blocking-sensor-severity.test.ts:512-527` は `tool-unavailable` を `null`（pass）と期待する。一方 `script-error: exit-2`、malformed output、non-string Note は拒否されるため、問題は exit 127 の意味付けに限定される。
- **診断の分離**: spawn failure は `script-error: spawn-failed` として別の検査経路にあり、Issue #3029 の実害例へ混同してはならない。
- **変更時の品質条件**: fail-closed を採る場合は unit evaluator、filesystem-backed approve、dispatcher truth table の三層を反転し、pass 維持の場合は `audit-format.md:267-272`、sensor schema、blocking guard の散文を同一契約に更新する。いずれも requirements の裁定後に実装する。

RE 時点ではテスト全体を再実行していない。`bun install && bun run build` は成功し、対象ファイルは base `23d4ae767956cd56fc28fa78abe28096712eff8` から現行 HEAD まで変更されていないため、今回の観測は現行コードの読み取りと既存 regression corpus の対応付けである。

## ガードの適用境界が原理を持たない — 契約が doc 止まりで違反を検出できない（260814-copytree-guard-boundary、履歴、observed `f60b3f4c8`。**現在時制マーカーのみ降格**（`cid:reverse-engineering:c1`、260814-priority-bug-batch の差分リフレッシュ時。本節の file:line は本節が宣言する observed 断面の値として保存する））

対象: [Issue #3014](https://github.com/amadeus-dlc/amadeus/issues/3014)（`copyTreeWithRetry` のガード適用境界が非対称）。測定 ref = observed `f60b3f4c868f3b7608a06f08393b8e2f10287fad`（`git rev-parse HEAD`。`origin/main` 系譜上のコミットであり `git merge-base HEAD origin/main` = 同一 SHA。ローカル `origin/main` は本 scan 時点で 2 commits 先行 = `cd64486a6`、いずれも患部非交差）、差分 base = `5b12d96e99cbf46711acd3dc2b8c103be1b0f801`。正本は `re-scans/260814-copytree-guard-boundary.md`。以下の file:line は Architect が observed 断面で `sed` / `git grep` により verbatim 再照合した。

### Q-1. ガードの適用原理がコード上に存在しない（本 intent の中核）

`copyTreeWithRetry` は #3003 の修正（#3015）で dest-fresh 契約を得たが、**どのサイトにガードを貼るかの原理**はコードにもコメントにも記録されていない。結果として、**同一関数内**にガード呼出と素 `cpSync` が同居する面が 2 ファイルに残る:

- `tests/harness/fixtures.ts` — `:852` が `copyTreeWithRetry(AMADEUS_SRC, join(proj, ".claude"));`、その 14 行後の `:866-867` が `if (existsSync(AMADEUS_MEMORY_SRC)) {` / `cpSync(AMADEUS_MEMORY_SRC, join(proj, "amadeus"), { recursive: true });`
- `tests/harness/tui-fixtures.ts` — `:181` の claude 分岐だけがガードされ、`:170-179` の kiro / kiro-ide 分岐は**丸ごと素 `cpSync`**（同一関数 `setupTuiProject` 内の兄弟分岐）

品質所見としては、ガードは「危険な操作を集約するチョークポイント」ではなく「特定サイトに貼られたパッチ」として存在しており、**分岐を 1 本増やすたびに未ガード面が静かに増える**構造になっている。

### Q-2. dest-fresh 契約が doc 止まりであり、違反サイトを機械検出できない

契約は `CopyTreeOps` 直上のコメント（`:638-645`）にのみ存在する。verbatim:

```
// dest-fresh contract (#3003, t99): `dest` must not exist when
// copyTreeWithRetry is called — the helper owns it outright.
```

型にも assert にも現れないため、契約違反は**レビューの目視でしか検出できない**。そしてその目視は実際に失敗している — 本 intent の Developer scan は「ガード適用候補 6 サイト全てが dest-fresh を満たす」と報告したが、Architect の再検証で **`fixtures.ts:867` は満たさない**ことが判明した:

- `setupIntegrationProject` は `:851` で `createTestProject()` を呼び、`createTestProject`（`:129-141`）は内部で `seedWorkspaceShell(proj)`（`:139`）を呼ぶ。`seedWorkspaceShell`（`:219-244`）は `mkdirSync(join(proj, "amadeus", "spaces", space, "memory"), …)`（`:221`）ほかで `<proj>/amadeus/` を**作成し内容を書き込む**
- 実測（scratch、repo 外実行）: `createTestProject()` 直後に `<proj>/amadeus` は `exists=true`、直下エントリは `.amadeus-clone-id,active-space,spaces`
- 一方 `dist/claude/amadeus` の直下は `active-space` / `spaces` のみ（`ls dist/claude/amadeus`）で、`.amadeus-clone-id` と `spaces/default/intents/` を**含まない**

したがって `:867` の素 `cpSync` は **merge 意味論に依存した意図的な選択**であり、ガードへ素朴に置換すると seed 済みの clone-id・cursor・intents registry・record dir が消える。**「契約が doc にしかない」ことのコストが、本 intent の scan 自体で実証された**形になる。

### Q-3. 単一ファイル面はガード適用が構造的に不可能（ENOTDIR 罠）

`countFilesRecursive`（`:792-805`）は `readdirSync` を **`try` の外**で呼ぶ（`:795`。`try` は `:796` 以降で `statSync` のみを覆う）。src が単一ファイルだと `existsSync` は true、`readdirSync(file)` が **`ENOTDIR`** で throw する。`ENOTDIR` は `RETRYABLE_COPY_CODES`（`:620` = ENOENT/EAGAIN/EMFILE/ENOMEM）に含まれないため、`isRetryableCopyError` が false → attempt 1 で `break` → throw。つまり単一ファイルへガードを貼ると「**リトライせずに必ず落ちる**」。

これは post-condition を件数照合に選んだ設計の副作用であり、ガードの適用可能域が「ディレクトリのみ」に暗黙で限定されていることを意味する。この限定もまた doc・型・assert のいずれにも記録されていない（Q-2 と同根）。該当面は `tui-fixtures.ts:171` / `:178`（いずれも `AGENTS.md` の単一ファイルコピー）の 2 面。

### Q-4. 適用境界の実数 — pred-a2 で 8 サイト、実質適用可能は 5 サイト

述語 pred-a2（「`copyTreeWithRetry` 呼出と**同一関数本体**にあり、src が `*_SRC` / `*_DIST` 定数に根ざす素 `cpSync`」）で列挙すると 8 サイト / 2 ファイル。内訳と可否:

| 区分 | 件数 | サイト |
|---|---|---|
| 適用可能（ディレクトリ + dest-fresh） | **5** | `tui-fixtures.ts:170` / `:172` / `:177` / `:179` / `:188` |
| dest-fresh 不成立（設計裁定要） | 1 | `fixtures.ts:867`（Q-2） |
| 単一ファイル（構造的に適用不可） | 2 | `tui-fixtures.ts:171` / `:178`（Q-3） |

なお `fixtures.ts:1030/1031/1032/1034/1037/1038/1039/1041/1048` の 9 件（`setupWorkspaceJourney`、`:1022-1070`）は同一関数内にガード呼出が無いため pred-a2 の外。Developer scan が報告した「広い述語で 35 コードサイト」との差は**述語の広さの差**であり、どちらの述語でも未ガード面がガード面を上回る非対称は変わらない。

### Q-5. `CopyTreeOps.exists` は宣言のみで本体が消費していない

`CopyTreeOps`（`:646-654`）は `copy` / `exists` / `sleep` / `count` / `remove` の 5 面を宣言するが、`exists`（`:648`）は `copyTreeWithRetry` 本体（`:665-696`）から**呼ばれていない**。`git grep -n 'ops\.exists' -- tests/harness/fixtures.ts` は **1 hit のみ**（`:600`、`removeTreeWithRetry` の post-condition `if (!ops.exists(path)) return;`、型は `RemoveTreeOps`）。

`team.md` の「どのコードも消費しない検証用フィールド」に該当する。除去コスト（実測）は**削除 6 行**（`fixtures.ts:648` / `:657` の 2 行 + `t-fixtures-copy-tree-retry.integration.test.ts:29-32` の `opsRecorder.exists` 4 行）、**assert 変更 0** — 同テスト `:52-59` の `ops.calls` 期待値は `remove:` / `copy:` / `count:` のみを列挙しており、`exists:` を含まない（＝呼ばれていないことが既に pin されている）。

### Q-6. 診断が注入シームを迂回して素の `fs` を直呼びする

`reportCopyTreeFailure` 以下の診断経路は `ops` を経由しない直接 fs 呼出を 7 面持つ: `existsSync` 3 面（`:719` / `:723` / `:793`）、`readdirSync` 3 面（`:778` / `:786` / `:795`）、`statSync` 1 面（`:797`）。

これは偶発ではなく**既存テストが明文で前提化している**。`tests/integration/t-fixtures-copy-tree-retry.integration.test.ts:324-326` verbatim:

```
    // reportCopyTreeFailure's existsSync(src)/safeReaddir(src) calls are
    // real fs calls, unaffected by an injected `ops` — `ops` only stands in
    // for the copy operation itself.
```

このため診断経路の一部は in-process では駆動できず、`tests/.coverage-patch-allowlist.json` の `safeReaddir` エントリ（`class: "catch-arm"`）で免除されている。その `expiry` は verbatim `remove when reportCopyTreeFailure takes an injectable readdir port` であり、**readdir ポート新設（本 intent のスコープ c2）はこの expiry 条件そのものを満たす** — つまり c2 を採る場合は免除エントリの削除と catch 面の driver 追加が同一変更に含まれる（`cid:code-generation:c-measure-not-prose` に従い lcov DA で被覆を実測）。

### Q-7. c1 / c2 のトレードオフ

| | **c1: `exists` 除去** | **c2: 診断の readdir シーム化** |
|---|---|---|
| 契約 | 縮小（5 面 → 4 面） | 拡張（ポート新設） |
| 変更規模（実測） | 削除 6 行 / assert 変更 0 | ポート面 + 診断書き換え + テスト前提反転 |
| 既存テストへの作用 | なし | `:323-368` の明文前提（Q-6 の verbatim）を反転させる |
| 免除台帳連動 | なし | あり（`safeReaddir` エントリの expiry 到達） |
| 振る舞い | 不変 | 診断経路の意味論が変わる |
| リスク | 低 | 中 |

c1 は surgical な負債返済、c2 は検証面の投資。**独立に実施可能**であり、同一 Unit に束ねるか分けるかは requirements-analysis の裁定事項。

### Q-8. 強み（本 scan で確認できた点）

- `opsRecorder`（テスト `:21-45`）はオブジェクトリテラルで `CopyTreeOps` を実装しているため、**必須メンバの追加は型エラーで全ケースの更新を強制する**（契約拡張が無音で通らない）
- #3015 が導入した `describeTreeDifference` により、dest 側の余剰エントリが診断へ出るようになった（前 intent の Q-D は解消）
- `ops.calls` の `toEqual`（テスト `:52-59`）が呼出列を完全一致で pin しているため、Q-5 の「未消費」は既にテストで固定されており、除去しても検出漏れは起きない

## sensor 真理値表の fail-open と、severity-blind な dispatcher という制約（260814-failopen-error-paths、履歴、observed `cd64486a6`）

対象: [Issue #2988](https://github.com/amadeus-dlc/amadeus/issues/2988)（sensor 真理値表がスクリプト異常を `PASSED` へ倒す fail-open）。**[Issue #3004](https://github.com/amadeus-dlc/amadeus/issues/3004) は本 intent のスコープ外**（PR #3011 で別途処理中）。測定 ref = observed `cd64486a68c6a1144db50fbe3fde8273f5e18455`（`git rev-parse HEAD` = `git rev-parse origin/main`）、差分 base = `d7ffaa5442266508d8e67babc3e0b947fb4c1637`。一次証拠は Developer scan（`<record>/inception/reverse-engineering/developer-scan.md`、run `xrev-260814-2988`、target-sha `52f1f1b25`、クロスレビュー 2 名とも `CONFIRMED_WITH_REFINEMENTS`）で、正本は `re-scans/260814-failopen-error-paths.md`。以下の file:line は Developer scan の実測からの転記であり、Architect が `git grep -n` / `sed` で再照合したものは個別に注記した。

### Q-1: 異常経路 9 本が `passed` へ合流する（fail-open の全数マップ）

`decideOutcome`（`packages/framework/core/tools/amadeus-sensor.ts:612-735`）の分岐と return site の対応（Developer scan §1 の表からの転記）:

| Branch | コメント行 | コード行 | 述語 | 結果 |
|---|---|---|---|---|
| a (timeout) | `:20` | `:620-631` | SIGTERM ∧ elapsed ≥ timeout−GRACE | `budget-override`（`:627`） |
| 0 (spawn-failed) | `:21` | `:633-641` | error ∧ status null ∧ signal null | **`passed`** + note `script-error: spawn-failed: …` |
| b (127) | `:22` | `:643-650` | status === 127 | **`passed`** + note `tool-unavailable` |
| f (parse throw) | `:26` | `:659-666` | `JSON.parse` catch | **`passed`** + note `script-error: bad-output` |
| f (pass 欠落/非 bool) | `:26` | `:668-674` | `!isPlainObject ∨ typeof pass ≠ boolean` | **`passed`** + note `script-error: bad-output` |
| c (FAILED) | `:23` | `:676-694` | `pass === false` | `failed`（`:689`） |
| d (正常 PASS) | `:24` | `:695-696` | status 0 ∧ pass true | `passed`、**note なし** |
| e (external SIGTERM) | `:25` 相当 | `:699-709` | SIGTERM ∧ elapsed < timeout−GRACE | **`passed`** + note `script-error: external-sigterm` |
| e (非 0 exit) | `:25` | `:711-717` | `status !== null` | **`passed`** + note `script-error: exit-${status}` |
| e′ (非 SIGTERM signal) | 表に無し | `:721-727` | `signal !== null` | **`passed`** + note `script-error: signal-${signal}` |
| default | `:27` | `:730-734` | 無条件 | **`passed`** + note `script-error: unknown` |
| (throw fold) | 表外 | `:745-751` `scriptErrorOutcome` | spawn 同期 throw | **`passed`** + note `script-error: spawn-threw: …` |
| (detail 書込失敗) | 表外 | `:588-593` | detail write throw | **`failed` → `passed` へ降格** + note `script-error: detail-write-failed: …` |

`FireOutcome` は `amadeus-sensor.ts:87-95` の閉集合 `"passed" | "failed" | "budget-override"`。11 return site のうち **9 本が `passed`** であり、うち 1 本（detail 書込失敗、`:588-593`）は**いったん確定した `failed` を `passed` へ降格させる**。品質上の問題は「異常が記録されないこと」ではなく、**異常が記録されたうえでゲートに対しては成功と等価に見えること**にある。

### Q-2: 機械的根本は「Note がどの判定にも読まれない」こと

ゲートに届く「PASSED」は監査イベント名 `SENSOR_PASSED` そのものである（emitter `amadeus-sensor.ts:870`。script-error note 付きでも同一イベント）。消費側 `evaluateBlockingSensors`（`packages/framework/core/tools/amadeus-state.ts:1932-1995`）は監査 trail を歩き、`sensorRowsForStage`（`:1890-1913`）が `Stage slug` / `Sensor ID` / `Output path` / `Output digest` / `Fire id` の **5 フィールドのみ**を抽出する（`:1898-1903`）。pass 判定はイベント名の裸等価（`:1972` / `:1979`）。

`Note` フィールドは `amadeus-sensor.ts:866-869` で付与されるが、**判定のために読む消費者はゼロ**である（repo-wide grep の hit は emitter `amadeus-sensor.ts:868` / `otel/event-registry.ts:893` / `otel/redaction.ts:98` の 3 件のみ。述語と件数は Developer scan §2 からの転記）。`SENSOR_PASSED` の読者は gate（`amadeus-state.ts:1972` / `:1979`）のほか `amadeus-runtime.ts:732→:741`、`amadeus-stage-stats.ts:409`、`amadeus-stage-attribution-candidates.ts:122`、`amadeus-stage-attribution-report.ts:152` があるが、いずれも Note を読まない。

**つまり診断は記録されているのに、ゲートからは構造的に見えない。** これが #2988 の機械的根本であり、ゲート側が既に fail-closed 化している面（fire による先行 terminal 無効化 `:1954`、receipt/digest 束縛 `:1966-1971`、同時刻 tie-break の failure 優先 `:849-852`）が効かない理由でもある。

### Q-3: dispatcher は severity-blind — 真理値表側の是正は blocking 限定にできない

severity の鎖は「宣言 → compile 搬送 → ゲート消費」で閉じており、**実行側には存在しない**。

| 段 | 位置 | severity の扱い |
|---|---|---|
| 閉集合宣言 | `amadeus-sensor-schema.ts:41`（`SENSOR_SEVERITIES = ["advisory", "blocking"]`） | 2 値 |
| manifest 宣言 | frontmatter `default_severity:`（必須 `:48` / `:61`、閉語彙検証 `:146-157`） | 宣言面 |
| compile 搬送 | `amadeus-graph.ts:813-815`（型 `:144` `severity?: SensorSeverity`、advisory は省略デフォルト） | 搬送 |
| ゲート消費 | `amadeus-state.ts:2004-2013` `blockingSensorIdsForStage` | `sensors_applicable[].severity === "blocking"` を収集 |
| **実行(dispatch)** | `amadeus-sensor-fire.ts:208` | **severity を見ず全件発火** |

したがって真理値表を触る是正は、**必然的に advisory sensor の挙動も同時に変える**（新配管を足さない限り分離できない）。これは Issue #2988 本文に無い最重要制約である。`amadeus-sensor-schema.ts:35-40` の doc も「Runtime carriage is via the compiled stage graph (SensorResolution.severity), not the audit row.」と、搬送が graph 側にしか無いことを明言している。

shipped の blocking sensor は 2 件のみ（`plugins/pr-convergence/sensors/amadeus-pr-convergence-report-format.md:5` = **本ワークスペースで活性な実配布**、`tests/fixtures/blocking-sensor/amadeus-blocking-probe.md:5` = fixture）。core 14 sensor は全て advisory。すなわち #2988 は仮説ではなく実害経路を持つ。

消費側には in-source の逸脱記録がある — `amadeus-state.ts:2018-2022`（Architect 再照合。verbatim 末尾: `fail-closed rule governs aggregation, not what a sensor decides.`）が真理値表の fail-open を「個別ガードの政策内容」として意図的に温存している。**是正するならこのコメントも同一変更で更新/削除が要る。**

### Q-4: 回帰ピン t2771 はコメントテキストのみで、挙動を守っていない

`tests/integration/t2771-lifecycle-guard-regression.integration.test.ts:151-163` の `test("the sensor truth table's fail-open arms are untouched")` は `readFileSync` + `toContain` で**コメント行 `:25`-`:26` の逐語テキストだけ**をピンする。挙動は一切ピンしない。テスト自身のコメント（`:152-154`）が「既知逸脱・別途是正・将来の編集を decision にするためのピン」と宣言しており、#2988 是正を先取りした drift-detector として機能している。

品質上の含意は 2 つ。(a) このピンは**消費側だけを強化する修正では緑のまま**であり、回帰防御にならない。(b) 同 describe の隣接ピン（`:132-144` の `AMADEUS_SKIP_*` 4 名、`:146-150` の cutoff）は壊してはならない。なお `:147` の cutoff ピンは非 export 再宣言でも通る substring match である（NIT）。

### Q-5: コメント/実装 drift — 7 arm 対 11 return site（#2988 と独立の既存債務）

`amadeus-sensor.ts:19-31` の真理値表コメントは **7 arm**を列挙するが、実装の return site は **11 本**ある。コメント表に無いのは `external-sigterm`（`:706`）/ `signal-<n>`（`:723`）/ `detail-write-failed`（`:592`）の 3 経路。**コメントは実装の部分被覆であり、`:19-31` を読んだだけでは fail-open の全域が見えない。** `:19-31` を触る是正なら、この drift はほぼ無償で閉じられる。

### Q-6: 修正形状ランドスケープ（**未裁定** — 裁定は requirements-analysis / application-design の所掌）

| Shape | 変更点 | 影響半径 | t2771 ピン |
|---|---|---|---|
| A. 真理値表を変える（e/f 等を新イベント or FAILED へ） | `FireOutcome` + `emitTerminal` + 監査閉集合 + otel + `SENSOR_TERMINAL_EVENTS` | advisory の監査形状も変わる（severity-blind のため）。runtime 集計・stage-stats・attribution・`audit-format.md:249-261` へ波及 | `:156-161` 要変更 |
| B. 消費側を強化（gate が Note `script-error:` 前置の `SENSOR_PASSED` を不通過扱い） | `sensorRowsForStage` に Note 抽出 + pass 述語 + `BlockingSensorFinding` に新 kind | **ゲート内に封じ込め**。advisory・監査形状・doc/otel 不変 | `:156-161` **不変のまま真**（= 回帰防御にならない） |
| C. A+B 両方 | 両者の和 | 最大 | 要変更 |
| D. dispatcher へ severity を配管 | 新 flag / graph 読取 | 「dispatcher は thin routing surface」設計（`amadeus-sensor.ts:10-18`）と `amadeus-state.ts:2018-2022` の政策分界コメントに反する新結合 | 要変更 |

新 terminal イベントを導入する場合の必須配線（A/C 系）: `SENSOR_TERMINAL_EVENTS`（`amadeus-state.ts:852`）/ 監査閉集合 + 表示 map（`amadeus-audit.ts:188-191` / `:297-298`）/ otel `event-registry.ts:880-893`（event-registry-drift sensor が欠落を検出）/ pair-closure 不変量（`amadeus-sensor.ts:16-17`）/ prose 契約 `packages/framework/core/knowledge/amadeus-shared/audit-format.md:249-261`（`:259` の Note 脚注が現行 fail-open 契約の散文記述）。

既存テストへの影響: `tests/integration/t92.test.ts` Group E（`:790-827`、`:1271-1300` test 44、`:1310-1342` test 45）と `tests/unit/t-sensor-fire-seam.test.ts:83-131` / `:259` は **A/C/D では要書換、B では全て不変**。正常経路（`amadeus-sensor.ts:695-696`）は是正後も note-free / event-stable を維持しないと t92 test 45 が赤になる。

### Q-7: 落ちる実証の部品は全て既存 — 新規 fixture は不要

| 層 | 面 | 位置づけ |
|---|---|---|
| unit（生成側） | `tests/unit/t-sensor-fire-seam.test.ts` | 唯一の導出 seam 直叩き。`scriptErrorOutcome`（`amadeus-sensor.ts:745`）/ `decideOutcomeOrScriptError`（`:758`）を export 経由で叩く（`decideOutcome` 自体は非 export）。injected-spawn thunk（`:758-771`）が新規 unit ピンの自然な seam |
| unit（消費側） | `tests/unit/t511-blocking-sensor-severity.test.ts`（26 tests、決定表 `:138-`） | shape B の回帰テストの自然な置き場 |
| integration | `tests/integration/t511-blocking-sensor-gate.integration.test.ts` | approve/complete/advance/finalize 経路。「blocking sensor script exit 2 → approve 拒否」の end-to-end ピンの置き場 |
| fixture | `tests/fixtures/v05-mr9-sensor-fire/scripts/`（`-exit2.ts` = branch e、`-bad.ts` = branch f 他）、`tests/fixtures/blocking-sensor/amadeus-blocking-probe.md` | 既存 |
| seam | `AMADEUS_SENSORS_DIR` + `AMADEUS_SENSOR_SCRIPT_DIR`（`tests/integration/t92.test.ts:100-135`）、fork-manifest builder `makeForkSensors`（`:242`） | 既存 |

前例として `tests/e2e/t-formal-verif-model-completeness-sensor.test.ts:323` が「sensor スクリプト自身が FAILED を選ぶ」sanctioned パターンを持つ。

### 配送面（是正時の必須手順）

追跡ファイルは `packages/framework/core/tools/amadeus-sensor.ts` の **1 本のみ**（`git ls-files | grep -E 'amadeus-sensor\.ts$'`）。ディスク上のコピー 14 面（self-install 5 + dist 8 + 正本）は正本以外すべて untracked で、HEAD 時点で self-install 5 面は正本と byte 一致（`diff -q` ×5）。core 変更後は全 harness（8 dir）に対する `bun run build` と追跡ファイル不変の確認が要る（`cid:build-and-test:bt-dist-regen-seven-harnesses`）。

## リトライ構造が構造的に無効化される経路と、ガード面の非対称（260814-t99-copytree-race、履歴、observed `5b12d96e9`）

対象: [Issue #3003](https://github.com/amadeus-dlc/amadeus/issues/3003)（`copyTreeWithRetry` のリトライが dest 汚染下で必ず 3/3 失敗する）。測定 ref = observed `5b12d96e99cbf46711acd3dc2b8c103be1b0f801`(`git rev-parse HEAD` = `git rev-parse origin/main`)、差分 base = `5f6b5bf97068f59dee53dcd4a2f6564967c3d164`。正本は `re-scans/260814-t99-copytree-race.md`。以下の file:line は Architect が observed 断面で `sed` / `git grep` により verbatim 再照合した。

### Q-A. リトライループが「同じ失敗を 3 回繰り返す」構造になっている

`tests/harness/fixtures.ts:633-661` の `copyTreeWithRetry` は、attempt ループ内に **dest を消去する経路を持たない**。post-condition は `ops.count(src) === ops.count(dest)` の等値（`:644`）であるため、dest が src の真の上位集合になった瞬間に `destCount > srcCount` が固定され、attempt 2/3 も同じ不一致を再生産して必ず throw に到達する。

リトライは「試行間で状態が変わりうる」ことを前提にした構造だが、この実装は試行間で dest 側の状態を一切変えない。したがって**リトライ回数を増やしても成功確率は上がらない** — 遅延（`:659` の `sleep(50 * attempt)`）が src 側の変異収束を待つ効果しか持たない。品質上の問題は「稀に失敗する」ことではなく、**失敗様式に対してリトライ機構が構造的に無力である**ことにある。

### Q-B. ops 契約に remove 面が無く、`exists` は本体が消費していない

`CopyTreeOps`（`:617-623`）が宣言するのは `copy` / `exists` / `sleep` / `count` の 4 面で、**dest を消す面が無い**。Q-A の修正（attempt 毎の dest クリア）は、この契約自体の拡張を要求する。

さらに `CopyTreeOps.exists` は `copyTreeWithRetry` 本体から**呼ばれていない**。`git grep -n "ops\.exists" -- tests/harness/fixtures.ts` は **1 hit のみ**で、それは `:580`（`removeTreeWithRetry` 内、型は `RemoveTreeOps`（`:564-568`））であり、`copyTreeWithRetry` の本体レンジ `:633-661` には出現しない。注入シームに宣言だけがあり本体が消費しない面であり、`team.md` の「どのコードも消費しない検証用フィールド」に該当する疑いがある(FOLLOW-UP: 本 intent の患部ではないため是正は別途)。

**対比**: 姉妹関数 `removeTreeWithRetry`（`:574-590`）の post-condition は `!ops.exists(path)`（`:580`）であり、`rm` は**再試行が収束する冪等操作**なのでリトライ構造が機能する。`copyTreeWithRetry` は同じ形をコピーしながら、`copy` が dest に対して累積的（非冪等）であるという差を吸収していない。これが Q-A の根である。

### Q-C. count mismatch 経路が retryable 判定を経由しない

`isRetryableCopyError`（`:663-666`）は `RETRYABLE_COPY_CODES`（`:600` = ENOENT/EAGAIN/EMFILE/ENOMEM）への所属で判定するが、count mismatch は `catch` ではなく `try` 内で合成される `Error`（`:645-651`）であり、**`isRetryableCopyError` を通らない**。結果として count mismatch は常に「リトライ対象」として扱われる。`tests/integration/t-fixtures-copy-tree-retry.integration.test.ts:121-124` のコメントが述べる意図（不一致自体が transient race でありうる）とは整合するが、**恒久的な不一致（Q-A）と transient な不一致を区別する述語が存在しない**ことが、Q-A の症状を「3 回失敗して終わる」形に固定している。

### Q-D. 診断が src 側しか出さないため、dest 汚染が観測面に現れない

`reportCopyTreeFailure`（`:677-701`）が出力するのは `src exists` / `src top-level entries` / `src recursive file count` / `dest parent exists` / `TMPDIR` で、**dest 自体の内容・件数は 1 行も出ない**。Q-A の機序（dest が src の上位集合）は、この診断ブロックからは原理的に読み取れない。診断は #2397 の「bun が path を落とす ENOENT」に照準して設計されており、count mismatch 経路には照準していない。

`countFilesRecursive`（`:709-720`）の `:716-718` コメントは「entry が消えたら数えない — undercount は post-condition を正しく赤にする」と設計意図を明言しており、**post-condition を等値から緩める修正は、このコメントが宣言する意図を書き換える裁定を要する**。

### Q-E. ガード面 6 件 vs 未ガード面 19 件（同一 dist ソースの並行読み）

`copyTreeWithRetry` の呼び出しは本番 6 件（`git grep -n "copyTreeWithRetry(" -- tests/` = 16 hit から、定義行 `fixtures.ts:633` 1 件と専用テスト `t-fixtures-copy-tree-retry.integration.test.ts` 内の 9 呼び出しを除いた残り）:

| # | 呼出面 |
|---|---|
| 1 | `tests/harness/fixtures.ts:769`（`setupIntegrationProject`） |
| 2 | `tests/harness/tui-fixtures.ts:181` |
| 3 | `tests/integration/t99-learnings-gate-flow.test.ts:128` |
| 4 | `tests/unit/t27.test.ts:257` |
| 5 | `tests/unit/t80.test.ts:163` |
| 6 | `tests/e2e/t-tui-statusline.serial.test.ts:67` |

一方、同じ dist 系ツリーを**ガードなしの素 `cpSync` で読む**サイトが `tests/` 配下に **19 件 / 15 ファイル**存在する（述語は re-scan 記録 P-A。Developer scan は別の広い述語で ≈53 件と報告しており、**件数は述語の広さに依存する** — 述語を狭く取っても広く取っても未ガード面がガード面を大きく上回る非対称は変わらない）。特に `tests/harness/fixtures.ts:784`（`AMADEUS_MEMORY_SRC`）は、**`:769` のガード呼出と同一関数内の直後にある姉妹面**でありながら素 `cpSync` である。

品質所見としては、`copyTreeWithRetry` は「危険な操作を一箇所に集約するガード」ではなく「特定の 6 サイトだけに貼られたパッチ」として存在している。ガードの適用境界がどの原理で引かれたのかがコード上に記録されていない(6 サイトはいずれも dest が事前非存在の新規パスだが、その **fresh 契約は関数の doc・型・assert のいずれにも明文化されていない**)。

### Q-F. 落ちる実証の立て所は既に存在する

`tests/integration/t-fixtures-copy-tree-retry.integration.test.ts` の `opsRecorder`（`:21-42`）はオブジェクトリテラルで `CopyTreeOps` を実装しているため、**必須メンバを追加すれば型エラーで全ケースが強制更新される**（Q-B の契約拡張が無音で通らない）。count mismatch の既存ケース（`:107-127` の 3/3 失敗、`:129-139` の途中回復）はいずれも `count: (path) => (path === "/fake/src" ? 10 : 4)` すなわち **dest < src 方向のみ**で、**dest > src 方向のケースは 0 本**である。Q-A の落ちる実証はこの方向に 1 本立てれば成立する。

`tests/harness/fixtures.ts` は patch coverage の計測対象であるため、新設分岐には driver が必須になるが、注入シームがあるためコストは低い。

## 検証面の縮小と、患部を覆う coverage 免除の指紋制約（260814-fmc-macos-provider、履歴、observed `5f6b5bf97`）

**観測 ref**: observed = `5f6b5bf97068f59dee53dcd4a2f6564967c3d164`、差分 base = `89532174c30ef9cc7ff29496cd6916586fdda00a`（9 commits）。正本は `re-scans/260814-fmc-macos-provider.md`。

### 免除台帳と e2e の縮小（base..observed、`git diff --numstat 89532174c..HEAD`）

| 面 | 増減 | 由来 |
|---|---|---|
| `tests/.coverage-patch-allowlist.json` | **−22 行**（追加 0）。observed のエントリ数 **430**（`bun -e` で JSON を読み `length` を出力） | team-up 撤去に伴う免除の消滅 |
| `tests/.test-time-factor-allowlist.json` | **−12 行**（追加 0） | 同上 |
| `tests/e2e/` | **−869 行** = `t-team-up-codex-safety-wait-live.serial.test.ts` −222 / `t-team-up-member-readiness.serial.test.ts` −204 / `t267-clean-env-team-mode.serial.cli.test.ts` −443 | 同上 |

いずれも**免除・検証の一方的な緩和ではなく、対象コードの消滅に伴う縮小**である。追加行がゼロであることが、免除が増えていないことの機械的な裏づけになる。反対方向として `t2771-*` 4 ファイル（unit 240 / checkpoints 728 / census 155 / regression 164 行）が新設され、Runtime のバイパス不能性はソース直読の census で固定された。

### 本 intent の焦点発見 — 患部行が coverage 免除の指紋に覆われている

`tests/.coverage-patch-allowlist.json:1469-1477` に `plugins/formal-model-check/tools/tlc-spawn-planner.ts` の意味的セレクタが 1 件ある。

```json
"selector": {
  "function": "<module>",
  "fingerprint": "sha256:05d28d0a8b61d6c33dd0cd1386fdf459b759a9c7917d31e8615c7023a2b75c70",
  "anchorLines": 58,
  "targetLines": "1-58"
}
```

この指紋を observed の実ファイルへ照合したところ、**anchor は 128 行目、免除範囲は 128-185 行**だった（照合コマンド: `bun -e` で当該ファイルを読み `s = 1..N` の 58 行窓 `sha256(lines.join("\n"))` を上記値と比較。一致は **1 件のみ** = `[128]`。Developer scan の実測を Architect が独立再実行して確認済み）。

128-185 は `NodePlannerEnvironmentPort` の constructor から `inspectDarwin` の戻り値構築までで、**JDK 検証の正規表現（`:152`）とエラーメッセージ（`:161-165`）を丸ごと含む**。すなわち #2361 の患部そのものである。

品質面の含意は 2 つある。

1. **患部を 1 行でも編集すると指紋が不一致になり、`coverage-patch-gate` が `source fingerprint for … resolved 0 times (expected exactly one)` で throw する**（指紋計算は `tests/coverage-patch-gate.ts:323-325`、一意解決要求は `resolveSemanticSelector` `:430-455`）。したがって**免除エントリの指紋再計算を同一変更に含める必要がある**。`tests/.coverage-patch-allowlist.json` は codekb の 8 body artifact ではなくテスト面の同期対象である。
2. 免除の `reason` は「実 Darwin 上の live probe であり、CI 外の real-toolchain probe でしか実行されない」と述べる。これは observed でも妥当だが、**フォールバックを入れると当該範囲に「Docker へ倒す判断」という CI で実行可能な分岐が入りうる**。その場合は免除を縮めるのが正しい対応であり、指紋を張り直して同じ範囲を温存すると、新設した分岐が無検査のまま免除下に入る（`cid:code-generation:c-measure-not-prose` の適用対象）。

### 患部を守るテストは主張より弱い

`tests/unit/t-formal-verif-tlc-spawn-planner.test.ts:186-187` は auto × darwin / auto × linux について **`.ok === true` しか検査していない**。どの planner クラスが返るかを assert していないため、**auto/darwin が Docker planner を返すよう変えてもこのテストは緑のまま通る**。テスト名（`selects auto provider by platform`、`:178`）が実体より強い主張をしている状態であり、退行検出を担っていない。同ファイル `:153` の not-run receipt テストも `docker` / `sandbox-exec` しか渡さず、`auto` を渡す case が無いため `:68` の変更を検出しない。

一方 `:188` の `PROVIDER_PLATFORM`（明示 `sandbox-exec` × 非 darwin の拒否）は真に固定されており、これは維持すべき契約である。

**落ちる実証の所在**が本 intent の主要な検証リスクである。JDK ピン緩和を実環境で実証できる唯一の面は `tests/integration/t-formal-verif-run-model-check-real.integration.test.ts` だが、`REAL_TLC_AVAILABLE = AMADEUS_RUN_REAL_TLC === "1" && process.platform === "darwin" && JAVA_HOME !== undefined`（`:30-32`）により **CI 既定では skip** される。どこで赤を実測するかは build-and-test の設計事項である。

## ライフサイクルガードの品質所見 — fail 方向の衝突と迂回路（260813-lifecycle-guard-runtime、履歴、observed `89532174c`。**#2986 着地前の断面**。Q-2 が挙げる「判定語彙 5 系統」は Runtime 導入で 4 checkpoint 分が `LifecycleGuardVerdict` へ統一された。**Q-1 の fail 方向衝突は未解消** — verdict 消費側が `stage-completion.blocking-sensors` adapter（`amadeus-state.ts:341-346`）へ移っただけで、生成側 `amadeus-sensor.ts:19-31` の分岐 e/f は observed `5f6b5bf97` でも fail-open のまま(逐語再確認済み)）
## テスト実行文脈への依存 — 失敗集合が入れ替わる二重機序（260814-t528-ambient-isolation、履歴、observed `5f6b5bf97`）

対象: [Issue #2981](https://github.com/amadeus-dlc/amadeus/issues/2981)（`tests/integration/t528-report-ack-kind.integration.test.ts` の失敗集合が実行文脈で入れ替わる）。測定 ref = observed `5f6b5bf97068f59dee53dcd4a2f6564967c3d164`（`git rev-parse HEAD` = `git rev-parse origin/main`）。一次証拠は Developer scan（run `xrev-260814-2981`、target-sha `52f1f1b2575ea35bd23b761697b2d17a5e9a7ac3`）で、下記の file:line は Architect が observed 断面で `sed` により verbatim 再照合した。

### 中核所見 — 「入れ替わり」は単一欠陥ではなく独立2機序の重ね合わせ

| 機序 | 患部 | 落ちるテスト | 発火条件 |
|---|---|---|---|
| A（xrev 確定 + 本 RE で再現） | `t528:124` が `handleReport(…, undefined)` を渡し、`resolveProjectDir(undefined)` が実環境へ ambient 解決する | test #3「a failed result remains a typed error directive」のみ | ambient 解決先の active intent の autonomy projection が `semi` / `full` |
| B（Developer scan で新規特定） | `STOCK_GRAPH` が gitignore 対象の `dist/` を指す | test #4「a gated approve acks…」と #5「the idempotent stale re-report acks…」の**ちょうど2件** | `dist/claude/.claude/tools/data/stage-graph.json` が不在（＝新規 worktree で `bun run build` 未実行） |

両者は独立に発火する。「本線ツリーでは #3 が落ち、隔離 worktree では #4/#5 が落ちる」という集合の入れ替わりはこの重ね合わせの帰結であり、片方だけを直しても現象は残る。

### 品質所見 Q-1: production コードが ambient 解決へ落ちる面をテストが露出させている

`handleReport` の failed-result 分岐（`packages/framework/core/tools/amadeus-orchestrate.ts:6020-6023`、verbatim `const failureAdmissionDir = resolveProjectDir(projectDir);` / `if (flags.result === "failed" && runsQualityRepair(failureAdmissionDir)) {`）は、`FORWARD_RESULTS` 検査（同 `:6039-6045`、`Unknown --result "failed"` の発行元）**より上**にある。`runsQualityRepair`（`:5780-5783`）は `readProductionAutonomyProjection(projectDir)?.mode` が `semi` / `full` のとき true を返すため、**ambient 解決先の実 record の autonomy 設定が、テストの期待メッセージの到達可否を決める**。本 worktree での読取専用プローブ実測では `resolveProjectDir(undefined)` = 本 worktree、`mode = "full"`、`runsQualityRepair = true` であり、#3 は必ず落ちる。

`resolveProjectDir`（`packages/framework/core/tools/amadeus-lib.ts:232-269`）の段順は `:234` explicit → `:241` `CLAUDE_PROJECT_DIR` → `:250-251` cwd 祖先の workspace marker → `:256-258` script path → `:262-266` known harness dir → `:269` cwd。**rung 3 が cwd 祖先の marker を拾うため、`CLAUDE_PROJECT_DIR` を消しても同じ実 record に着地する**（プローブは env を delete した状態で実測した）。`resetAidlcEnv`（`tests/harness/fixtures.ts:103-105`）が `AMADEUS_DEFAULT_SCOPE` しか削除していない点は事実だが、env 削除だけではこの機序は閉じない。

### 品質所見 Q-2: ambient 解決が実 record の監査シャードを汚染する（#2981 本文の未記載側面）

`#3` が出す error directive は `emit()` の集約点（`amadeus-orchestrate.ts:802-804`、verbatim `if (directive.kind === "error" && recordError) {` / `recordEngineError(directive.message, _handlerProjectDir);`）を通る。`_handlerProjectDir` には `handleReport` 冒頭（`:5851`）で `undefined` が入る。`recordEngineError`（`:941-968`）は `projectDir === undefined` のとき `process.argv` の `--project-dir` を探し、無ければ `resolveProjectDir(undefined)` = ambient へ落ちる。唯一のガードは `:958` の `if (!existsSync(stateFilePath(pd))) return;` だが、in-process テストでは ambient 解決先が実 intent record であり **このパスは実在する**（プローブ実測: `…/intents/260814-t528-ambient-isolation/amadeus-state.md` exists = true）。したがって `emitErrorAuditRow`（`:962`）が実 record の監査シャードへ `ERROR_LOGGED` 行を書く。

汚染範囲は監査シャード1行に限定される — `admitProductionStageFailure`（`:5840`）へは `--failure` 未指定ガードで到達しないため state 本体への書込は起きない（この限定は実行ではなく制御フローの実読による）。

**回帰テストのギャップ**: 既存の `tests/integration/t258-engine-error-ambient-shard-pollution.test.ts`（Issue #1389）は `handleReport(["--result", "__not_a_verdict__"], target)`（`:91`、ヘルパ `driveReportError` は `:87` 宣言）と **explicit target を渡す形しか固定していない**。`projectDir === undefined` の形は未被覆であり、Q-2 の経路は現行スイートのどのテストでも守られていない。

### 品質所見 Q-3: テスト基盤の `dist/` 依存は t528 固有ではなく横断クラス

`t528:46-54` の `STOCK_GRAPH` は `<REPO_ROOT>/dist/claude/.claude/tools/data/stage-graph.json` を指し、`beforeEach`（`:65`）で `AMADEUS_STAGE_GRAPH` に設定される。`dist/` は gitignore 対象（実測 `git check-ignore -v dist` → `/Users/j5ik2o/.config/git/ignore:31:dist/`、exit 0）。不在時は `loadStageGraph()`（`amadeus-lib.ts:6954-6967`）が `Stage graph not readable at ${p}: …` を throw する。

同じ前提を共有する面は他に `AMADEUS_SRC = <REPO_ROOT>/dist/claude/.claude`（`fixtures.ts:59`）と `AMADEUS_MEMORY_SRC = <REPO_ROOT>/dist/claude/amadeus`（`:93`）があり、`setupIntegrationProject`（`:765-861`）を使う全テストが同クラスに属する。

**クラス規模の実測**（測定 ref = observed、検索述語を再実行可能な形で記録）:

| 述語 | 結果 |
|---|---|
| `git grep -ln '"stage-graph.json"' -- 'tests/**/*.test.ts' \| xargs git grep -ln '"dist"'` | 45 files |
| `git grep -ln "AMADEUS_SRC\|AMADEUS_MEMORY_SRC" -- 'tests/**/*.test.ts'` | 182 files |
| `git grep -ln "setupIntegrationProject" -- 'tests/**/*.test.ts'` | 84 files |
| 上記3述語の和集合（`sort -u \| wc -l`） | **278 files** |
| 母数 `git ls-files 'tests/**/*.test.ts' \| wc -l` | 1102 files |

すなわち **テストファイルの約 25%（278/1102）が「新規 worktree で `bun run build` 未実行なら赤」という同一クラスを共有する**。t528 だけを直しても同種の不安定は残る。project.md の既存則 `cid:code-generation:solo-bolt-worktree-required`（「source-only 境界下の新規 worktree は依存インストールと `bun run build` を移設の定型手順に含める」）が運用面ではこれを覆っているが、前提が破れたときの失敗メッセージは `Stage graph not readable at …` であり、原因(`bun run build` 未実行)を名指さない。

### なぜ #6 だけ緑のままか（構造的説明）

`handleNext` の Branch 0（`amadeus-orchestrate.ts:3118-3120`、verbatim `// Branch 0 — turn-scoped no-op-next guard, before any state inspection` / `if (emitReadonlyLatchDone(projectDir, flags, migration)) return;`）は状態検査より前に read-only latch を処理する。`emitReadonlyLatchDone`（`:3089-3102`）→ `freshReadonlyLatchLabel`（`:3037-3062`）はファイル2枚を読むだけでグラフに触れない。#4/#5 は `nodeForSlug(slug)`（`:2846-2848` → `loadGraph()`）に到達し、#3 は `FORWARD_RESULTS` 検査で `nodeForSlug` 手前に返る。**graph 不在で落ちるのは #4/#5 のみ**という観測は、この制御フローから構造的に説明される。

### 落ちる実証（機序 B）

repo 外 scratch のプローブで #4/#5/#6 の本体を再現し `AMADEUS_STAGE_GRAPH` だけを振った（`CLAUDE_PROJECT_DIR` は scratch へ固定し実 record への書込を構造的に遮断）。baseline（実在 graph）は 3 件とも PASS、treatment（不在パス）は #4/#5 が `Stage graph not readable at …: ENOENT` で FAIL、#6 は PASS。**報告された失敗集合とちょうど一致する。**

### 未検証として明示

- **H1**: xrev の C5/C2 が観測された隔離 worktree で `bun run build` が未実行だったこと。§機序 B の再現と整合するが、当該 worktree は現存せず `dist/` の実在状態は未観測。**未検証**。
- **H2**: `pluginHostRoot()`（`amadeus-orchestrate.ts:1801-1809`、`AMADEUS_PLUGINS_HOST_ROOT ?? dirname(TOOLS_DIR)`）が projectDir を取らず常に実 repo の `packages/framework/core` を指すため、`advisoryReportHoldReason` 経由で #4/#5 を保留させうる。本 worktree の baseline は緑で**現時点では発火していない**。**未検証**。
- テスト並行実行（既定 `DEFAULT_PARALLEL = Math.min(availableParallelism(), 4)`、`tests/run-tests.ts:54`）の #2981 への寄与。t528 は自前 mkdtemp を使うため干渉面が見当たらないが、負荷起因の `cpSync` / `rmSync` 不安定（`fixtures.ts:602-617` の `copyTreeWithRetry` 宣言コメントが #2397 / t99 / #1565 を名指す）は別系統として存在する。**未検証**。

### 適用範囲外（明示）

修正方式の選定 — テスト側を explicit projectDir へ直すか production 側の `_handlerProjectDir` / `recordEngineError` の ambient 段を fail-closed にするか、`dist/` 前提を loud fail 化するか — はいずれも requirements-analysis / application-design の所掌である。

## ライフサイクルガードの品質所見 — fail 方向の衝突と迂回路（260813-lifecycle-guard-runtime、履歴、observed `89532174c`）

**観測 ref**: すべて observed = `89532174c30ef9cc7ff29496cd6916586fdda00a`（= 本 worktree HEAD）。差分 base = `854692fd7a11b124236b0427fe3d59e2fe6bf785`（35 commits / 233 files）。全数列挙は `re-scans/260813-lifecycle-guard-runtime.md` を正本とする。

### Q-1: fail-closed と fail-open が同一経路で衝突する（最重要）

blocking sensor 経路は 2 段で構成され、**段ごとに fail 方向が逆**である。

| 段 | 位置 | 異常時の挙動 |
| --- | --- | --- |
| sensor 実行 → verdict 生成 | `amadeus-sensor.ts:19-31` の真理値表 | **fail-open**。verbatim: `//   e) status non-0/non-127 (non-timeout)  → PASSED script-error: exit-<n>` / `//   f) bad JSON / missing pass  → PASSED script-error: bad-output` |
| verdict 消費 → 完了可否 | `amadeus-state.ts:1835` `verifyBlockingSensors` | **fail-closed**。verbatim（`:1855-1857`）: `A blocking sensor that never ran is not a pass.` |

> **引用の訂正（2026-08-14、intent `260814-failopen-error-paths`、observed `cd64486a6`）**: 上表の `verifyBlockingSensors` / `amadeus-state.ts:1835` は observed `89532174c` 断面の記録であり、**現行断面には当該シンボルの定義も呼出も存在しない**（#2986 の Lifecycle Guard Runtime 移行で置換。`git grep -n "verifyBlockingSensors" -- packages/` は exit 0 / **1 hit** だが、それは `amadeus-sensor-schema.ts:21` の散文コメント内の stale な言及であり定義・呼出ではない）。現行の対応面は Guard adapter `evaluateBlockingSensorGuard`（`amadeus-state.ts:2023`、`git grep -n` 実測。本文は `:2068` まで）と decision core `evaluateBlockingSensors`（`:1932-1995`）で、fail-closed 宣言文字列 `A blocking sensor that never ran is not a pass.` は **`:2052`**。**上段（生成側 `amadeus-sensor.ts:19-31` の fail-open）と下段の衝突という Q-1 の主張自体は observed `cd64486a6` でも成立する**（本ファイル冒頭の 260814-failopen-error-paths 節を参照）。履歴節の本文は当時の記録として保存する。

上段が異常を PASSED へ倒すため、**下段の fail-closed は「実行されなかった」ケースしか捕まえられず、「実行して壊れた」ケースは素通りする**。`amadeus-sensor.ts` は `base..observed` で `46 ++--` の変更を受けているが、**分岐 e/f は fail-open のまま**である（verbatim 再確認済み）。Issue #2771 が掲げる「移行前後で判定結果が変わらない」AC と「fail-closed」AC は、ここで**構造的に両立しない** — どちらを採るかは requirements の裁定事項であり、暗黙に片方へ倒してはならない。

### Q-2: 判定語彙が 5 系統に分裂している

| 系統 | 代表 | 位置 |
| --- | --- | --- |
| (a) `error()` process-exit | 大多数 | `amadeus-state.ts` で **157 箇所**（述語 `grep -cE '^[^/]*\berror\(' <file>`。orchestrate 8 / bolt 75 / lib 3） |
| (b) 判別ユニオン + `recovery` | `IntentOperationGuardResult` | `amadeus-lib.ts:3042`（`:3085` returns）— `{kind:"allowed"}` / `{kind:"rejected", error:{..., recovery}}` |
| (c) boolean | `emitMirrorBoundaryIfNeeded` / `checkConverged` | `amadeus-orchestrate.ts:591` / `amadeus-swarm.ts:236` |
| (d) typed error class | `WorkflowCompletionNotSettledError` | `amadeus-workflow-completion.ts:161` の呼出側 catch |
| (e) `{ok, reason}` Result | provenance / declare-units-done | `amadeus-intent-autonomy-production.ts:744` / `amadeus-lib.ts`（declare-units-done ×2） |

`export type ...(Guard|Verdict|Outcome)... =` は core tools で **38 件**（述語は re-scan §2 P6）。同一の「ガード判定」概念に対し 5 通りの表現があるため、**呼出側の扱いを機械的に検査できない**。

**(c) は情報損失を伴う**: `emitMirrorBoundaryIfNeeded` は `MirrorBoundaryOutcome`（`amadeus-mirror-coordinator.ts:71`）を内部で boolean へ潰すため、**復旧情報が呼出側に届かない**。逆に (b) の `IntentOperationGuardResult` は Issue が求める「復旧案付き」語彙を**すでに実装している** — 新規 Runtime を起こす前の reuse inventory の第一候補である。

### Q-3: 迂回路が 3 系統あり、いずれも一元管理されていない

1. **off-switch 4 種**（述語 `git grep -hoI 'AMADEUS_SKIP[A-Z_]*' | sort -u`）: `AMADEUS_SKIP_ARTIFACT_GUARD`（`artifactGuardDisabled()` `amadeus-state.ts:1653`、G6 と G11 が共有）/ `AMADEUS_SKIP_BLOCKING_SENSOR_GUARD`（`:1817`）/ `AMADEUS_SKIP_GATE_REVISION_RECOVERY` / `AMADEUS_SKIP_HUMAN_PRESENCE_GUARD`（`amadeus-lib.ts:5342`、G25 / G26 / G27 / G29 が消費）。
2. **日付 cutoff 1 種**: `BLOCKING_SENSOR_CUTOFF_YYMMDD = 260809`（`amadeus-state.ts:667` / `:1841`）。intent の日付という**ガード外の属性**で適用可否が決まる。
3. **hook 層の別配線**: `amadeus-state.ts:1390-1398` が明言する二重実装（verbatim: `This is defence-in-depth beside the Stop hook's identical guard`）と、CLI 層の外にある `packages/framework/core/hooks/amadeus-subagent-model-guard.ts:89`（`permissionDecision: "deny"`）。

**単一 Runtime へ寄せる際、off-switch の意味論を保存できるかが移行の主要リスク**である。`verifyStageCompletionGuards`（`amadeus-state.ts:2539`）の宣言コメントは、2 つの off-switch を独立に保つ理由を明示している — verbatim: `a fixture that wants artifacts unchecked does not thereby want sensor verdicts unchecked, so neither disables the other.`

### Q-4: 免除がガード本体に埋め込まれている

human presence ガード（`amadeus-state.ts:3452`）の拒否文言は `Refusing to ${verb} "${slug}": a real human has not acted at this gate since it opened. ... (autonomous Construction is exempt)` であり、**autonomy による免除がガード内に埋め込まれている**。ガード本体と適用条件が分離されていないため、Runtime へ移す際に「判定」と「適用可否」を切り分ける作業が要る。

### Q-5: 型宣言の重複

`InteractionKind` 相当の文字列ユニオンが 2 箇所に独立して存在する — `amadeus-intent-autonomy.ts:14`（`export type InteractionKind = "stage-gate" | "phase-gate" | "walking-skeleton" | "question";`）と `amadeus-autonomy-review.ts:1070`（`readonly allowedInteractionKinds: readonly ("stage-gate" | "phase-gate" | "walking-skeleton" | "question")[];`）。片側だけの追加が型検査で捕まらない。

### 現在確認できる強み

- **完了 chokepoint の宣言が意図まで残している**: `amadeus-state.ts:2520-2526` は 4 ハンドラが集約点を要する理由と「五つ目のガードもここへ置く」ことを明記する。設計意図がコード内に残る良い例。
- **`verifyPhaseCheckArtifact`（`:392`）は拒否時に state file を無傷で残す**。コメント `:389-390` verbatim: `Callers invoke it BEFORE writeStateFile; error() exits, so a refusal` / `leaves the state file untouched (the in-memory content flips are discarded).`
- **G15 の 3 値語彙**: `authorizeWorkflowCompletion`（`amadeus-workflow-completion.ts:161`）は settled=通過 / not-settled=待機 / それ以外=拒否を型で分けており、現行で最も語彙が豊富。「拒否」と「まだ決まっていない」を潰していない。
- **宣言駆動の適用解決**: `blockingSensorIdsForStage`（`amadeus-state.ts:1824`）が `sensors_applicable` から適用集合を導くため、ガードの適用対象が手書きリストではない。Runtime 化の reuse 候補。

## coverage 免除台帳の意味論が無検査 — 解決 fail-closed / 意味 fail-open の非対称（260811-allowlist-semantic-audit、履歴、observed `854692fd7`）

**観測 ref**: すべて observed = `854692fd7a11b124236b0427fe3d59e2fe6bf785`（= 本 worktree HEAD）。差分 base = `ce3c3ccfdb3f93e619a081386a70c8185b84f1db`（34 commits）。正本は `re-scans/260811-allowlist-semantic-audit.md`。

### 台帳の規模と成長（PROVEN、コマンド出力からの転記）

| 指標 | 値 | 述語 |
|---|---|---|
| エントリ総数（observed） | **623** | `jq 'length' tests/.coverage-patch-allowlist.json` |
| エントリ総数（base `ce3c3ccfd`） | **614** | `git show ce3c3ccfd:tests/.coverage-patch-allowlist.json \| jq 'length'` |
| 対象ファイル数 | **106** | `jq -r '[.[].file] \| unique \| length' <台帳>` |
| distinct な `reason` 文字列 | **310** | `jq -r '[.[].reason] \| unique \| length' <台帳>` |
| 旧形式の絶対行ピン | **0** | `jq '[.[] \| select(.selector == null)] \| length' <台帳>` |
| 単一行アンカー（`anchorLines == 1`） | **233**（37%） | `jq '[.[]\|select(.selector.anchorLines==1)]\|length' <台帳>` |

Issue #1622 起票時の「約272件」、クロスレビュー時点（2026-07-28）の「300件」に対し observed は **623**。棚卸し対象は起票時の約 2.3 倍に膨張している。

### 品質所見（PROVEN）

1. **解決は fail-closed、意味は fail-open という非対称**。`resolveSemanticSelector`（`tests/coverage-patch-gate.ts:288-313`）はスコープ名の非一意（`:294-298`）と指紋の非一意（`:306-310`）を throw し、`runCheck` が exit 1 へ落とす（`:552`）。一方 `findStaleAllowlistEntries`（`:407-419`）は引数が `entries` と `lcov` のみで `reason` を受け取らず、判定は `hits.has(line)`（DA レコードの**存在**）だけ。免除の適用も `allowlisted`（`:421-426`）の**行番号包含**のみ。**免除の正当性を見る段はパイプラインのどこにも無い**。
2. **PR #2127 の意味的セレクタ移行は転位を解消せず固定した**。指紋は「誤った行」を行シフトを跨いで正確に追従する。実測: `amadeus-election.ts` のエントリは Issue 報告時に `:317` へ解決していたが observed では `:417`（+100 行）で、指紋 `sha256:2d1d83f1...` は Issue 記載と同一。すなわち移行が消したのは「行シフト起因の stale」であって「意味の不一致」ではない。
3. **確定転位 18 件**（`re-scans/260811-allowlist-semantic-audit.md` §4 の正本）。分布は `amadeus-state.ts` 6・`amadeus-orchestrate.ts` 3・`amadeus-graph.ts` 2・`amadeus-mirror-executor.ts` 2・`amadeus-election.ts` / `amadeus-runtime.ts` / `amadeus-learnings.ts` / `amadeus-utility.ts` / `tla-arm.ts` 各 1。うち 4 件は「type-only / runtime-erased」を主張しながら**実行文**へ解決しており（`amadeus-graph.ts:1711-1716` / `:1715-1720`、`amadeus-utility.ts:820-822`）、2 件は解決範囲に**コメント行**を含む（`amadeus-state.ts:5736-5739`、`amadeus-orchestrate.ts:944-951`）。
4. **腐敗はエントリ単位で混在する**。同一ファイル・同一 `reason` 文字列の群の中でも一致と転位が並存する（`amadeus-state.ts` の telemetry reason は `:991` 一致 / `:916` 転位。`amadeus-graph.ts` の型 reason は `:1130` / `:1134` 一致 / `:1711-1720` 転位）。ファイル単位・reason 単位の一括処理では正しく捌けない。
5. **反証不能な `reason` が 45 件存在する**。逐語「defensive, type-only, or spawned-boundary path」が **20 件**、「Residual defensive, invalid-input, replay, or process-boundary」が **25 件**。いずれも複数の可能性を `or` で並べており特定の構文クラスを主張しない。**どの機械述語でも真偽を決められない**構造であり、`reason` 非空という現行契約は満たすが監査可能性はゼロ。

### ガード不在（反証確認済み、3 述語）

- `git grep -nIE "semanticAudit|reasonMatches|auditAllowlistReasons"`（対象 `packages/` `scripts/` `tests/` `.github/` `plugins/` `docs/`）= **exit 1（0 hit）**
- `tests/coverage-patch-gate.ts` の export 16 シンボルのうち `reason` を引数に取る関数 = **0 件**
- t229 の 2 テストファイルで `reason` に触れる全行はフィクスチャ値生成か「非空」検査。**`reason` の内容を検査するテストは 0 件**

→ **`reason` と実コードの意味整合を検査する機構は、リポジトリ内に存在しない。**

### 検証面（failing-first テストの置き場、候補）

- **AST 述語の決定的判定**: 構文クラスを主張する `reason`（type-only 76 / catch 32 / dispatch-usage 10、重複あり）に対し「解決先の全トークンが型位置にあるか」「解決先が `CatchClause` 内か」「解決先が `CaseClause` か」を `ts` で判定する（ゲートは既に `ts` を import 済み）。実測の転位 4 件（`amadeus-graph.ts` 2 / `amadeus-utility.ts` 1 / `amadeus-state.ts:961-964`）はこの述語で落ちる
- **反証不能 reason の禁止**: 選言型 boilerplate 45 件を `parseAllowlist` の段で拒否する契約を置けば、以後の混入は構造的に止まる（既存 45 件の扱いは別裁定）

### 品質上の限界（本 scan で測っていないこと）

全数照合は未実施であり、確定 18 件は**下限**である。`findStaleAllowlistEntries` の実行結果（現行 stale 件数）は LCOV を要するため未測定。転位の双方向の実害（偽赤 / 偽緑の件数）も未定量。詳細は `re-scans/260811-allowlist-semantic-audit.md` § UNMEASURED。

## TLA+ receipt 経路の品質所見（260812-tla-proof-receipt、履歴、observed `854692fd7`）

**観測 ref**: 本節の file:line はすべて observed = `854692fd7a11b124236b0427fe3d59e2fe6bf785`（= 本 worktree HEAD）時点。差分 base = `ce3c3ccfdb3f93e619a081386a70c8185b84f1db`（距離 34）。正本は `re-scans/260812-tla-proof-receipt.md`。

### Q1: 依存 seam の非対称（S1）

loader の消費者 4 件のうち 3 件は DI seam を持ち、検証器だけが持たない（`tla-model-receipt.ts:154` / `:156` のモジュール束縛直接呼び出し）。seam の設計パターンは兄弟ファイルに既に 3 例存在する（`run-model-check-ci.ts:19-20` / `:28-29`、`run-model-check-diagnostic.ts:326-327` / `:333-334`、`run-model-check-source.ts:40` / `:128`）。全数表は `component-inventory.md` の同 intent 節。

この非対称は #2913 の D1 そのものであり、同時にテスト容易性の欠落でもある — 検証器だけが単体で model-map を差し替えられない。

### Q2: エンコーディング契約が型で守られていない（D2）

`canonicalIdentity` へ渡す形式が producer ごとに分裂している（referee = object `{bytes: base64}` `tla-referee-toolchain.ts:47`、loader = 文字列 `tla-model-loader-internal.ts:279`、バイト照合 = 文字列 `fs-tlc-toolchain.ts:731`）。`createVerifiedTlaModelReceipt` が identity を再計算せずコピーする（`tla-model-receipt.ts:104-112`）ため、分裂は型でも実行時でも検出されず、**最終的な identity ハッシュ比較の不一致という遠く離れた症状**としてのみ現れる。`parse-don't-validate` の適用漏れ（識別子文字列をブランド型で運んでいない）に該当する。

### Q3: テストが成功経路を一切通していない（t447）

`tests/integration/t447-tla-referees.integration.test.ts:568` の describe ブロック `"the production referee toolchain adapter (CI-safe surface)"` のうち、`createRefereeToolchain` を実際に駆動するテストは 2 件のみ:

- `:624` `"run() folds a broken mutant into a loud referee-toolchain error before any TLC work"` — **TLC 到達前**に落ちる経路
- `:635` `"the adapter's version line names the pinned jar and the pinned JDK"` — バージョン行のみ

残りはすべて `RefereeToolchainInternals.describeMutant` / `declaredInvariantsOf` / `traceStateVariablesOf` を純関数として検査する。**整形式のモデルを `preparePlanned` へ通すテストは存在しない**。よって #2913 の欠陥はテストの盲点にちょうど収まっており、既存スイートが green のまま本番経路が全滅していた。

### Q4: `tests/formal-verif/**` の構造的 CI 除外

`tests/run-tests.ts` / `tests/run-tests.sh` に `formal-verif` の参照は **0 件**。除外は 2 重に構造的である:

1. スコープ集合が固定 — `tests/run-tests.ts:852` および `:909` の `const scopes = ["smoke", "unit", "integration", "e2e"] as const;`。`levelFiles`（`:750-759`）は `readdirSync(join(SCRIPT_DIR, level))` で当該 4 ディレクトリの直下しか見ず、再帰もしない。
2. 仮に見えても `.filter((f) => f.endsWith(".test.ts"))`（`:754`）で弾かれる — `tla-referee-real-toolchain-probe.ts` は `.ts`。

**除外リストは存在しない**（`levelFiles` の `excludes` 引数は当該 4 階層内の個別ファイル除外用）ので、「除外リストから外す」形の是正は取れない。probe をスイートへ載せるにはティアへの移設（`.test.ts` 化）か新スコープの追加が要る。ただし probe のヘッダは除外が**意図的**であることを明言しており（`:5-7` `Same shape as tla-real-toolchain-probe.ts: a standalone probe, not a CI test.` / `It needs JAVA_HOME on the pinned OpenJDK and network access for the first` / `jar fetch, so the default suite never runs it.`）、単純な移設は JDK 依存・ネットワーク依存のテストを既定スイートへ持ち込む。トレードオフの裁定は後続ステージの所掌。

この除外は本 Issue 1 件より広い系統的な盲点である — `tests/formal-verif/**` 全体が既定 CI の射程外にある。

## PR 収束ゲートの品質評価と未解決 BLOCKER（260811-pr-convergence-gate、履歴、observed `854692fd7`）

### Assessment Summary

| 領域 | 評価 | 根拠 |
|---|---|---|
| Type safety | 良好 | TypeScript、discriminated union、typed boundary errors |
| External command safety | 良好 | shell を介さない argv spawn、stderr digest |
| Component separation | 良好 | adapter/predicate/ledger/provenance の分離 |
| Scope/harness wiring | 良好 | 4 self-* binding と generated grid を検証 |
| Report authenticity | 不十分 | shape-only、receipt/digest/signature なし |
| Completion enforcement | 不十分 | advisory sensor、manual fire、direct guard any-one semantics |
| Delivery preconditions | 不十分 | create が commit/clean/push/head SHA を未検査 |
| Regression coverage | 部分的 | component tests はあるが要求 matrix が未閉包 |

### Existing Verification

Developer scan では関連5 test files の計81 tests が pass した。既存 suite は real plugin bundle の compose/drop、4 self-* binding、code-generation produces overlay、report 不在時の engine coverage、3種の canonical report format、GraphQL snapshot、Intent/Bolt/Unit PR provenance をカバーする。

### Unresolved BLOCKER Findings

- **BLOCKER**: `renderReport` は公開された deterministic Markdown であり、CLI 以外の writer が同じ bytes を作れる。writer provenance を検証する receipt/audit identity がない。
- **BLOCKER**: format sensor は `default_severity: advisory`、finding でも exit 0、stage `sensors: []`、manual fire である。未実行・失敗が completion を止めない。
- **BLOCKER**: direct completion artifact guard は required produces のうち最低1件があれば存在条件を満たし得る。通常 orchestrator path の all-artifact coverage と一致しない。
- **BLOCKER**: `create` は `--head` を渡すが、clean worktree、local commit、push、remote head SHA 一致を検査しない。

### Follow-up Risks

- **FOLLOW-UP**: stage `produces: []` / `requires_stage: []` と code-generation overlay の責任分離が resume/completion behavior を分かりにくくする。
- **FOLLOW-UP**: 4 self-* scope × 8 harness × compose/drop × resume × direct/engine completion の回帰 matrix がない。
- **FOLLOW-UP**: secret signature を導入すると key management が過剰になり得る。audit event identity + canonical content digest + PR/head binding で threat model を満たすか先に判断する。

### Quality Gates and Recommended Tests

repository の標準 gate は typecheck、Biome lint、Bun test、deterministic isolated builds、source-only check、distribution/graph invariants、project/patch coverage、plugin conformance である。

実装時は、手書き/copy/tamper/replay report、sensor never-fired/failed/passed、uncommitted/dirty/unpublished/SHA mismatch/valid head、4 scope と非 self control、全 harness、compose/drop、park/resume を固定する必要がある。

本 Reverse Engineering は read-only synthesis であり、追加 test 実行や code 変更は行っていない。pass 数は Developer scan の結果を継承する。

## タイムアウト安定性評価（260810-test-time-factor、履歴、observed `ce3c3ccfd`）

| 観点 | 観測 | リスク |
|---|---|---|
| 係数の正本 | `TEST_TIME_FACTOR`/`testTimeFactor` 実装0件 | CI 能力差をテスト値へ伝播できない |
| runner 上限 | 既定30秒、上限300秒 | 低速 CI で正常テストが先に失効する |
| 個別 timeout | 約555箇所/94ファイル | runner だけの修正では残存する |
| 負荷依存 sleep | lock concurrency、IDE checkpoint、TUI/IDE driver に存在 | 起動・settle 完了前の観測で flake になる |
| CI 配線 | ci/coverage/PBT/release で係数未注入 | 入口間で改善が不揃いになる |

品質上の最小闉包は、helper の parse/scale 契約テスト、runner の既定値と明示値の係数適用テスト、workflow 注入の契約テスト、高優先 wait の乗算実証である。perf suite、時計境界テスト、timeout 発火用 fixture は対象外とする彼我分類が必要である。

## advisory 宣言の無音 degradation とガード空白（260810-plugin-manifest-resoluti、履歴、observed `7b9391be2`）

**観測 ref**: すべて observed = `7b9391be2db4fad791d637293ea442d5a1462bac`（= repo HEAD）。差分 base = `df1c874cfb397fafe877a72f00a82664a59689ae`（13 commits / 302 files、PR #2811 を含む）。正本は `re-scans/260810-plugin-manifest-resoluti.md`。

### ガード現況（直下の履歴節からの更新、PROVEN）

直下の履歴節が記した「plugin コーパスが全ガードの死角」は **#2811 で部分的に解消**されている — `t531-plugin-harness-literal-guard` が新設され、plugin **散文**のハーネスリテラル走査は存在する。ただし本 Issue（#2823）のクラスに対する空白は残る:

- **`plugins/**/plugin.json` の evaluator argv を走査するガードは存在しない**。Issue 完了条件 3 の述語は新規であり、現行配置では恒久赤になりうる注意（permanent-red caveat）が Issue 自身に付されている
- consumer レイアウト（staging のみ、project supply なし）で advisory 経路を通すテストは **0 件**。t445 `:155-160` は逆に無音 fail-open を**契約として pin** しており、loud 化はこのテストの意図的書き換えを要する

### 品質所見（PROVEN）

1. **無音 degradation の全面性**: manifest 不在（`amadeus-advisory-declaration.ts:312-313`）・parse 不能・宣言なし（`:393` / `:397-399`）・route なし（`amadeus-advisory-choice.ts:960` / `:968`）のすべてが audit event・stderr・ログを出さない。fail-open（発火側）と fail-closed（spawn 失敗 → unreadable verdict → hold、`:340-343`）が混在し、向きの使い分けは設計コメントにのみ存在する
2. **doc comment と配送契約の矛盾**: `:289-294` は「宣言は project ルート隣の plugin source tree から読む」と前提を明言するが、配送契約（前 intent `requirements.md:86` / `:90`）はそのレイアウトを consumer に供給しない。コメントが前提とするレイアウトを primary な導入経路（folder-drop、`plugin-projection.ts:634`）が作らない
3. **installDoc の 2 腕が欠陥露出を変える**: folder-drop では advisory が無音で全滅し（(a)）、install verb の persistent 腕（`amadeus-plugin.ts:1117-1118` / `:1160`）では FULL bundle が project ルートへ永続化されて動く（(c)）。**同じ plugin の振る舞いが導入手順の選択だけで変わるのに、その差は未開示**（`:636` は verb に言及するが project supply 永続化には触れない）
4. **dogfood masking**: advisory テスト 3 本（t445 `:224-226` / t526 `:59-61` / t528 `:103-105`）はすべて dogfood レイアウトで宣言を供給し、self-install では常に (c) が成立するため、本 repo 内のどの検証でも欠陥は見えない構造

### 検証面（failing-first テストの置き場）

- **t445 consumer-layout variant**: staging-only レイアウトで宣言読み手を呼び、現行の無音 `[]` を可視化
- **t353-adjacent dot-dir-host install テスト**: install verb（persistent 腕）→ 宣言読取 → evaluator spawn の join を pin（現行は 4 面永続化までしか pin されていない、t353 `:254-274`）

## 二重化した rename 規則にガードが無い — サンプルが乖離キーを外している（260810-plugin-prose-seed-guard、履歴、observed `c51afbd0a`）

**観測 ref**: すべて observed = `c51afbd0a99b2eb3f0b9c1ee4e2cef2772378131`。差分 base = `df1c874cfb397fafe877a72f00a82664a59689ae`。正本は `re-scans/260810-plugin-prose-seed-guard.md`。

### 中核の品質債務（#2812）— ガードに見えてガードではない

`transform()`（`scripts/harness-transform.ts:33-45`）と `seedBytesForHarness()`（`packages/framework/core/tools/amadeus-plugin.ts:669-675`）は同一の規則形を持つが、rename のデータ源が異なる（manifest `rulesRename` vs `KNOWN_RULES_SUBDIR`）。**両者の等価性を検査するテストは存在しない。**

述語と実測:

| 述語 | 結果 |
|---|---|
| `git grep -ln 'harness-transform' "${S}" -- tests/` | **6 ファイル**。うち `transform` を実 import するのは `tests/smoke/t-pi-dist-structure.test.ts:11` の **1 件のみ**、残り 5 件はコメント内の言及 |
| `git grep -ln 'seedBytesForHarness' "${S}" -- tests/ scripts/` | **1 ファイル**（`tests/integration/t2790-plugin-staging-seed-harness-dir.integration.test.ts`） |
| 両者を参照するファイル | **0**（上記 2 集合の交わりは空） |

差分比較は現状**構造的に不可能**である。

**サンプル選択による遮蔽（PROVEN）**: `t2790:87-102` の `seedBytesForHarness transforms prose only, and applies the rules rename` が叩くキーは `.claude`（`:89`）/ `.codex`（`:92`）/ `.kiro`（`:95`）と、非 prose `.codex`（`:99` / `:100`）/ `null`（`:101`）のみ。**乖離している `.cursor` / `.opencode` は不在** — サンプルされたキー集合は `KNOWN_RULES_SUBDIR` と manifest が**一致する部分集合と完全に一致**する。テストは緑だが、生きた乖離を 1 件も観測していない。

これは「keyed map を叩くテストは、叩いているキーを map の全キー空間と突き合わせて初めてガードになる」という一般則の実例である（`cid:code-generation:vocabulary-collision-vacuity-guard` の姉妹形 — 述語ではなく**サンプル空間**が空文化の経路）。

**コーパス側の遮蔽**: `git grep -nE '/rules/' "${S}" -- plugins/` → **exit 1 / 0 行**。plugin `.md` コーパスは 4 ファイルのみで、`{{HARNESS_DIR}}` の出現は `pr-convergence.md:180` の 1 件（`tools/` パス）。したがって rename 規則は plugin コーパスでは一度も発火せず、**#2810 の 11 行を修正しても #2812 の乖離は自然には露出しない**。ガードは明示的に作らないと生まれない。

### #2811 が閉じたガードの穴（直前節 N-5 / N-6 の帰結）

直前 intent が指摘した穴のうち 2 つは着地済みである。

| 直前節の指摘 | 現況（observed 実測） |
|---|---|
| `HARNESS_PATH_RE` が 7 ディレクトリ中 3 個しか見ない（N-5） | **解消**。`tests/unit/t146-core-hygiene.test.ts:80-82` が `allHarnessDirs()`（manifest 導出）から正規表現を構築（`const HARNESS_PATH_RE = new RegExp(` `:80`） |
| t146 の corpus に `plugins/` が無い（N-6） | **解消**。`:42-43` `const PLUGINS = join(REPO_ROOT, "plugins"); const STRAY_ROOTS: readonly string[] = [CORE, PLUGINS];`。トークンフロアテストは core-only スコープを維持（`:40-41` のコメントが逐語で理由を宣言） |
| plugin 散文へハーネスリテラル述語が無い | **解消**。`tests/lib/boundary-guard.ts:205-210` `scanPluginProseForHarnessLiterals`（predicate 3）+ `tests/integration/t531-plugin-harness-literal-guard.integration.test.ts` |

### 残る非対称 — ガード 2 本のコーパスが揃っていない

#2810 のガードをどこへ置くかは、この非対称が決める（要件段の裁定事項）。

| 候補 | コーパスの実体 | `plugin.json:61` と `.ts` の扱い |
|---|---|---|
| `tests/unit/t146-core-hygiene.test.ts` | `STRAY_ROOTS = [CORE, PLUGINS]`（`:42-43`）だが `walkMd`（`:66-72`）の `full.endsWith(".md")`（`:70`）により **`.md` のみ** | **構造的にコーパス外** → カーブアウト不要 |
| `tests/integration/t531-…` | `PLUGIN_SCAN_ROOTS = ["plugins"]`（`:47`）+ `git grep -lE …`（`:71`）で **全 tracked file** | `.json` / `.ts` が入る → **恒久赤かカーブアウトの二択** |

すなわち **t146 に置けば #2823（`plugin.json:61`）の裁定を待つ順序制約自体が発生せず、t531 に置く場合のみ待ちが生じる。** `t531` の `RAW_PLUGIN_ALLOWLIST` は `:53` で空（fail-closed、`:49-52` のコメントが逐語で理由を宣言）。

既存述語の射程: `boundary-guard.ts:122` `HARNESS_LITERAL_TOKEN_RE = /\.(?:claude|codex|cursor|kimi-code|kiro-ide|kiro|opencode|pi)\/[A-Za-z0-9._/-]*/g` は harness dotdir 専用で、`plugins/<name>/tools/…` 形（#2810 の患部）を**捕捉しない**。新述語が要る。

### 新述語のコーパス危険度（PROVEN）

t146 に `plugins/` 相対述語を足す場合、CORE 半分の偽陽性は 1 件のみ。述語 `git grep -nE '(^|[^/A-Za-z0-9._-])plugins/[a-z0-9-]+/' "${S}" -- 'packages/framework/core/**/*.md'` → **1 hit**:

```
packages/framework/core/sensors/amadeus-pr-convergence-report-format.md:54
  importing `plugins/pr-convergence/tools/pr-convergence-cli.ts`. Core ships to
```

`:51-58` を実読すると「The checker re-reads the report with its own minimal line reader **instead of** importing …」— **意図的な非 import を説明する散文**であり患部ではない。CORE 根も走査する設計ならこの 1 件が唯一のカーブアウト対象（`isCarvedOut` `:46-64` の既存 2 件と同様式）、PLUGINS 根に限定すれば発生しない。

composed 面は危険要因にならない: `git ls-files dist .claude | wc -l` → **3**（`.claude/CLAUDE.md` / `.claude/hooks/amadeus-dispatch.ts` / `.claude/settings.json`）で `.gitignore` が `/dist/**`（`:19`）と `/.claude/**`（`:24`）を除外。合成 `.claude/plugins/` 配下は untracked のため、t531 の `git grep` 走査にも t146 の `walkMd(REPO_ROOT/plugins)` にも入らない。

### 既存ピンとの衝突（PROVEN な不在）

両 Issue の修正で**明示改訂が必要なテストは 1 件も検出されなかった**（`cid:reverse-engineering:c1-pinned-behavior-ruling` の適用対象外）。

| テスト | 固定内容 | 修正後 |
|---|---|---|
| `t2790:87-102` | `.claude`/`.codex`/`.kiro`/非prose/`null` の出力文字列 | 緑維持（乖離キーを触らない） |
| `t2790:104-120` compose E2E | `${harnessDir}/tools/amadeus-sensor.ts` がちょうど 1 回（`:96`）/ 生トークン残存なし（`:97`）/ foreign dir リテラルなし（`:98-100`） | 緑維持（置換後は自 dir） |
| `t2790:122-131` 再 compose no-op | 2 回目の compose がバイト同一 | 緑維持 |
| `t-plugin-projection-packaging.test.ts:180-196` | 上記同形を 8 面で | 緑維持 |
| `t531:88-94` / `:96-110` / `:162-171` | dotdir リテラル 0 件 / 落ちる実証 / vacuity guard | 緑維持（トークン形は dotdir でない） |
| `t146:104-118` ほか | CORE+PLUGINS の `.md` に dotdir 0 件 | 緑維持 |
| `t144-harness-seam.cli.test.ts:207-220, 228-243, 245-255` | `rulesSubdir()` の descriptor / `AMADEUS_HARNESS_DIR`（`.kiro`/`.codex`）/ `AMADEUS_RULES_SUBDIR` 解決 | 緑維持。述語 `git grep -nE '(cursor\|opencode)' "${S}" -- tests/integration/t144-harness-seam.cli.test.ts` → **0 hits** = 現行 `.cursor`/`.opencode` fallback を pin するテストは**存在しない** |
| `tests/smoke/t149-…:81` / `:87` | 両面の `harness.json` の `rulesSubdir` が `"amadeus-rules"` | **緑維持かつ整合強化** — descriptor は既に `amadeus-rules` を出荷しており、map 追加はこれと一致する方向 |

### 拡張点

`tests/helpers/harness-dir-fixture.ts` は既に `HarnessManifest` 型を import（`:11`）し `harnessDirOf` が manifest を `require`（`:22`）しているが、**`rulesRename` を返すヘルパーは持たない**。等価性テストが必要とする「`(harnessDir, rulesRename)` ペアの供給」はここへの最小追加で足りる。新規テスト追加時の付随作業（`tests/integration/t-coverage-mechanism-ratchet.test.ts` への台帳追記）は #2811 が t2790 追加時に 1 行行った先例がある。

## 制御バイト混入クラスの防御在庫と CI ゲート先例（260810-control-byte-gate、履歴、2026-08-10、observed `f1270d710`）

**観測 ref**: すべて observed = `f1270d710193d102b6fe8a728873a1c3e27dc094`（origin/main 系譜上。`origin/main` は 1 コミット先行 `40056d0ec`）。差分 base = `df1c874cfb397fafe877a72f00a82664a59689ae`（10 commits）。正本は `re-scans/260810-control-byte-gate.md`。

Issue #2814 が対象とする欠陥クラスは `cid:requirements-analysis:control-byte-guard`（PM1-8 2026-07-10、#786 実測）が記録するとおり、**tracked ソースへの制御バイト混入は git diff にも grep にもレビューにも構造的に見えない**。品質面から見た現況は「認識はあるが面の防御がない」である。

### 現在の防御在庫（PROVEN、4 面すべてが射程外）

| 面 | 所在 | 性質 | 射程外である理由 |
|---|---|---|---|
| `isUtf8` 述語 | `packages/framework/core/tools/amadeus-migrate.ts:477`（関数定義 `:476`）。呼び出し 5 箇所 = `:1461` / `:1994` / `:2038` / `:2385` / `:2388` | NUL 含有を非 UTF-8 と判定して拒否 | **入力面限定** — migrate が読む個別ファイルの検証であり、コーパス走査ではない |
| `CONTROL_CHARS` strip | `packages/framework/core/tools/amadeus-lib.ts:4298` 定義 / `:4304` 適用（`subagentPurposeLine`） | 派生表示文字列から C0 を除去 | **表示層かつ除去** — 検出・拒否ではなく、ファイル内容をゲートしない |
| #786 リグレッション guard | `tests/integration/t-learnings-persist-seam.test.ts:246-262` | `amadeus-learnings.ts` 1 ファイルの NUL 不在を assert | **単一ファイル・ハードコードパス** |
| t55 の NUL-skip | `tests/unit/t55-test-suite-drift.test.ts:664-678`（`grepFile`） | NUL 含有ファイルを列挙から除外 | **同じ fail-open 側** — `grep -r` の binary スキップの意図的模倣であり、欠陥機序の側にある |

**債務の性質**: 制御バイトが害であるという認識は `amadeus-lib.ts:4295-4297` のコメント（逐語「a stray control byte is invisible in review while corrupting the record frame」）としてコードベースに明文で存在する。にもかかわらず防御は点に留まり、#786 が実際に通った経路（tracked ソースへの直接混入）に対する面がない。**認識と機構の非対称**であり、`cid:requirements-analysis:symmetric-pair-review` の観点（write⇔check）で見れば check 側の欠落にあたる。

### コーパス清浄度の実測（測定 ref = observed `f1270d710`）

Python 直走査（`git ls-files -z` 起点、binary モード）:

| 対象 | tracked files | 制御バイト hit |
|---|---|---|
| repo 全域 | **16124**（read errors 0） | **1** — `assets/AI-DLC-Workflows-2.0-Specification.pdf`（first NUL offset 248） |
| Issue 宣言スコープ（core / harness / scripts / tests / docs） | **2576** | **0** |
| `.github/` | **15** | **0** |
| `dist/` | **0**（`.gitignore:19` `/dist/**`） | — |

**品質上の含意**: 新設ゲートは宣言スコープにおいて **allowlist / carve-out ゼロで初日から green** になる。`cid:code-generation:corpus-sweep-for-new-guards` が要求する両側実測のうち「正当な既存データで赤くならないこと」は成立済み。残る側（落ちる実証）は本 RE では**未実施**であり、注入は一切行っていない。

⚠ 手法メモ（`cid:requirements-analysis:review-method-memo`）: この清浄度測定を再実行する際、**grep 系ラッパを使うと偽陰性になる**。NUL 含有ファイルは binary 扱いで無音脱落する — それが検出したい当の欠陥機序である。走査は binary モード直走査で行い、read error 数も併せて報告する。

### CI ゲート先例パターン（PROVEN）

- **走査ルートの先例は非対称**: `tests/no-silent-drop/engine.ts:46-50` = core + harness + scripts / `tests/unchecked-cast-guard.ts:74` = core + scripts。後者の `:51-53` コメントは `tests/` を走査外と逐語で宣言。**どちらも `docs/` を走査しない**。Issue 宣言スコープは両者の上位集合であり、`tests/` と `docs/` の追加は先例からの意図的拡張として根拠の明文化を要する。
- **配線の先例は単一ステップ**: `.github/workflows/ci.yml` の `lint` job（`:96-98`、`if: needs.changes.outputs.full == 'true'`）内に、各ゲートが `bun tests/<name>.ts --check` の兄弟ステップとして並ぶ（`:157` no-silent-drop / `:164` callsite / `:172` unchecked-cast / `:199` complexity）。これら 3 ゲートは `tests/run-tests.ts` の tier オーケストレーション**外**の standalone スクリプトであり、`package.json` エイリアスを持つのは no-silent-drop のみ（`:24`）。
- **sensor 形態は CI をブロックしない**: `grep -n "amadeus-sensor\|sensors/" .github/workflows/ci.yml` は **0 hit（exit 1）**。sensors は hook 起動のランタイム機構で CI に一切配線されていない。「決定的に CI をブロックする」要件を sensor 単独で満たすことはできない。
- **docs スコープの死角**: `scripts/detect-ci-changes.sh` は docs について `docs/reference/15-stage-definition.md|docs/reference/15-stage-definition.ja.md` の 2 ファイル名指しでのみ `full=true` を立て、`docs/*` ワイルドカードを持たない。docs-only PR は `full=false` で `lint` job 自体が skip されるため、`docs/` をスコープに含めたゲートを同 job のステップとして置くと **docs-only PR では走らない**。これは `cid:build-and-test:ci-paths-ignore-doc-guard-blindspot` が記録する既知の構造的死角と同型である。

## ハーネス中立性ガードの穴 — plugin コーパスが全ガードの死角（260810-plugin-harness-dir-token、履歴、2026-08-10、observed `df1c874cf`）

**観測 ref**: すべて observed = `df1c874cfb397fafe877a72f00a82664a59689ae`。差分 base = `91f37ec8589cdf468599b4787e27e5125d4d16e8`（20 commits / 117 files、患部 7 パスは非交差）。正本は `re-scans/260810-plugin-harness-dir-token.md`。

Issue #2790 が漏れた機序は「誰も見ていなかった」である。ハーネス中立性を守るガードは 2 本あるが、**いずれも `plugins/` の散文リテラルを検査しない**。

### t146-core-hygiene の corpus 境界（PROVEN）

`tests/unit/t146-core-hygiene.test.ts`:

- `const CORE = join(REPO_ROOT,"packages","framework","core")` — **`plugins/` を含まない**
- `const HARNESS_PATH_RE = /\.(claude|kiro|codex)\//;`
- `isCarvedOut` の carve-out は**ちょうど 2 件**（`workspace-detection.md` の `.kiro/` と `.codex/` を同時に運ぶ行、`stage-protocol.md` の `$CLAUDE_PROJECT_DIR/.claude/tools/` を運ぶ行）
- 第2のテストが「core の `.md` 50 件超がトークンを運ぶ」ことを assert する

**N-5（品質債務）**: `HARNESS_PATH_RE` は**相異なる 7 個のハーネスディレクトリのうち 3 個しかカバーしない**。`.opencode` / `.cursor` / `.kimi-code` / `.pi` は今日の core 散文でもガードを素通りする。これは #2790 とは独立に現存する穴である。

**N-6（拡張コスト、PROVEN）**: 述語 `grep -rnE "\.(claude|kiro|codex)/" plugins/ --include="*.md"` → **1 hit**（patient のみ）。7 ディレクトリ全部へ広げても **同じ 1 hit**。すなわち **t146 の corpus に `plugins/` を足しても偽陽性は 0 で、新しい carve-out も不要**。

⚠ ただし制約が 1 つある: 「トークン 50 件超」の下限テストは core を前提にしているため、**corpus 拡張は 2 つのテストの walk scope を分離する形でなければならない**（`plugins/` は `.md` 4 ファイルしか持たないため下限を満たさない）。

### t377-plugin-boundary-guard の述語／corpus ミスマッチ（PROVEN）

`tests/integration/t377-plugin-boundary-guard.integration.test.ts:33-35` は既に `PLUGIN_SCAN_ROOTS = ["plugins"]` を走査している。**corpus は正しいが述語が違う** — `tests/lib/boundary-guard.ts:152` `scanDistributionTreeForScriptsRefs` は `scripts/` トークンしか照合しない。したがってハーネスディレクトリのリテラルは検出対象外である。corpus は git-tracked ファイルに限定（`:56-62`）、`RAW_PLUGIN_ALLOWLIST = []` で fail-closed。

**構造的評価**: #2790 は「corpus を持つガード（t377）と述語を持つガード（t146）が 1 対 1 で噛み合っていない」ことで漏れた。片方は正しい場所を見て違うものを探し、もう片方は正しいものを探して違う場所を見ている。

### boundary-guard の SCAN_ROOTS 欠落（PROVEN な欠落、影響は UNMEASURED）

`tests/lib/boundary-guard.ts:54-66` の `SCAN_ROOTS`（t258 用）には `plugins/` が無く、さらに `dist/kimi` / `dist/pi` / `.kimi-code` / `.pi` も無い。この 4 面が走査外であることの blast radius は本 intent では**未測定**。

### 散文中のパス表記の一貫性債務（12 行、DEDUCED 強）

述語 `grep -rn "amadeus-sensor.ts\|bun plugins/\|bun \.claude" plugins/ --include="*.md"` → **12 行**。patient 1 行がハーネスを**固定**し、残り 11 行がハーネス接頭辞を**落とす**。両者は同一機構（`{{HARNESS_DIR}}` 置換）の不在という 1 つの根に帰着する。詳細と根拠は `architecture.md` の同 intent 節を参照。

**確立した先例との落差（N-8、PROVEN）**: core では `{{HARNESS_DIR}}/tools/` 形が **92 箇所**（`grep -rn "{{HARNESS_DIR}}/tools/" packages/framework/core/ --include="*.md" | wc -l`）で確立している。plugin 側だけがこの規約から外れている。一方、**散文中の手動センサー fire は core に先例が 0**（`grep -rn "amadeus-sensor.ts fire" packages/framework/core/` は `.md` に 0 hit）であり、patient は既存規約に単純に合わせるだけでは済まない形をしている。

### 検証面（failing-first テストの置き場、PROVEN な棚卸し）

- 経路A のピン: `tests/unit/t-plugin-projection.test.ts:201-244`（`{{HARNESS_DIR}}` を使う唯一の plugin 側 fixture）、`tests/integration/t-plugin-projection-packaging.test.ts:101-112`、t303、t308、t309/t312、t310、t311、`t254-reference-plugin-lifecycle.test.ts:191-337`
- 経路B のピン: `tests/integration/t416-self-install-plugin-projection.integration.test.ts`（冪等性／決定性 `:51-52`、`:111-113` — **`plugins/` → temp workspace → compose を実際に走らせる唯一の層**）、`tests/e2e/t416-self-projection-fresh-git.serial.test.ts`、`t-plugin-projection.test.ts:317-319`、t146、t377

## CG attribution の品質評価（260809-cg-attribution-stats、履歴、observed `82e2f30c0`）

### 現行品質ベースライン

- focused suites `tests/unit/t486-stage-stats.test.ts` と `tests/integration/t487-stage-stats.integration.test.ts`: Developer scan 実測 **80 pass / 0 fail / 221 expect**。
- 現 corpus: 229 shards / 136,011 rows、constructed 1,603、measured 1,154、CG `n=109`。既存値は raw median 5,902s、net mean 10,814.93s、net median 4,721s、p95 49,247s。
- 既存除外: unmatched 36、orphan 5、unclosed-idle 34、zero-second 415。Issue規則probeは zero-net attribution 4、ambiguous identity 3、eligible 102。
- sensor-only observable union 4,501s / eligible net 1,009,424s = coverage 0.446%。eligible 102/102 が unattributable rate 50%超。
- 出力実測は Markdown 53,121 bytes、CSV 48,619 bytes、JSON 107,248 bytes。現 `t487:337-389` が64 KiB超を証明するのはJSONのみ。

これらは2026-08-09のDeveloper probeであり、監査は本workflow自身でも増える移動値である。後続要件・テストの数値はコマンド出力から再測定し、固定された永続真理として転記しない。

### 良質な既存構造

1. 集計の主要関数はexportされ、unit testがin-processでpure logicを直接被覆する（`t486:1-28`）。filesystem/CLIはintegrationへ分離されている。
2. `composeReport` は同じcorpusから決定的reportを作り（`amadeus-stage-stats.ts:545-577`）、3 rendererは一つのreportを消費する。
3. idleはwindowへclip後unionされ、重複を二重減算しない（`:264-285`）。interval algebraの先例として再利用できる。
4. external stringsのsanitize、CSV quote、JSON fixed orderingが既にある（`:582-603`, `:670-723`）。
5. real workspace 60秒以内とbyte-identical output、JSON pipe integrityのintegration proofがある（`t487:305-389`）。

### 技術的負債とリスク

| 債務 | 根拠 | 品質リスク |
| --- | --- | --- |
| `journalRecordKey` 相当の重複 | stage-stats独自scanとjournal merge/dedupの分離 | cross-shard duplicateをlifecycle duplicateと誤認しうる |
| window collision metadata欠落 | `buildWindows` はpending queueをshiftするだけ（`:135-176`） | FIFOで測定値は出ても意味的identityが曖昧な窓を帰属へ混入 |
| zero-net attribution未分離 | `subtractIdle` はraw=0だけ除外し、idle差引後net=0を残す（`:287-315`） | coverage除算でNaN/Infinity、既存populationを変える誘惑 |
| interval algebra不在 | idle用private clip/mergeのみ（`:267-285`） | category/global unionの実装重複、overlap二重計上 |
| decoder failure semantics不統一 | executionはinvalid silent skip（`:336-359`）、unit poolはthrow+dedup（`:113-159`） | 不採用イベントが無音で消え、missing instrumentation評価を歪める |
| runtime inferenceとの意味非互換 | runtimeはcontainment/latest-wins（`amadeus-runtime.ts:498-760`） | snapshot用推定を遡及会計へ誤再利用する危険 |
| 単一CLI肥大化 | `amadeus-stage-stats.ts` 968行、lint CCN `buildWindows=17`, `indexIdle=16` | candidate family追加で巨大条件分岐化しやすい |
| 3 renderer独立記述 | MD/CSV/JSONに個別section追加が必要 | semantic parity drift |
| oversized proofの形式偏り | `t487:337-389` はJSONだけ | Markdown/CSVが64 KiB未満のfixtureで偽証明になる |

### fail-closed 品質条件

- stage identity は event/envelope の canonical `Stage` / `Stage slug` / `origin.stage` 完全一致のみ。window containment・timestampから推定しない。
- identity無し、start/terminal欠落、duplicate start/terminal、terminal<=start、malformed/digest/duplicate event set、FIFO collision、net<=0は区間を作らない。
- 不採用は candidate×reason として Markdown/CSV/JSON 全てに現れ、silent skipを許さない。
- measured population/既存duration/sensor/model/reviewBucketsは変えず、attribution eligibilityを別会計にする。
- `GATE_*` はidle subtraction済みなのでcategoryへ再投入しない。
- category名はlifecycle意味を保存し、人間向けフェーズ名へ推定変換しない。

### 完了条件への検証マップ（スコープ縮小なし）

| Issue #2695 条件 | 必須proof |
| --- | --- |
| 1 合成分節 | Fire id、nested/parallel、idle交差、別stage同秒、開始/終端欠落を独立oracleで固定 |
| 2 恒等式 | zero-net/ambiguous除外後の全窓で秒・率の2恒等式、finite値を全件assert |
| 3 union | category内とglobalの重複秒を故意に作り、二重計上時に赤くなるfixture |
| 4 理由出力 | 全candidate familyとidentity/ambiguity/missing/malformed/duplicate理由を3形式で照合 |
| 5 real corpus / argv | `--stage code-generation --outliers 10`再実行、0/100/-1/101/小数/非数値境界 |
| 6 50%超 | observed factと不足境界を出し、`candidateBoundary`仮説を別fieldで確認 |
| 7 falling proof | union/identity/恒等式のいずれかを壊す注入でテストが実際に赤くなる |
| 8 3形式 parity | 同一semantic modelから母集団/rule/exclusion/valueをcross-render比較 |
| 9 非退行 | focused 80 cases +既存report snapshot/shape、全stage durationを維持 |
| 10 pipe完全性 | 各形式が機械的に>65,536 bytesであるfixture前提をassertし、MD/CSV consumer完走、JSON `jq empty` |

### テスト設計上の注意

既存 `t486` はv1/v2 recordsと`MeasuredWindow`を手で作り、scanner/constructor自身をoracleにしない（`:30-64`）。新しいinterval proofも、被検union関数の出力同士を比較する自己参照を避け、手計算可能な短い半開区間fixtureを使う。real corpus値はfixtureの正しさのoracleにせず、再実行可能性・性能・出力完全性の統合証拠に限定する。

oversized testは「出力が64 KiBを超えた」という前提assertを形式ごとに置く。現実測ではMD/CSVが閾値未満なので、JSON用1200 distinct stages fixtureの流用だけでは条件10を証明しない。attribution rows/categories/outliersを十分生成する合成corpusで3形式それぞれのbytesを測り、full captureとpipe consumerの一致を比較する。

### 保守性判断

単一用途の汎用framework化は不要だが、candidate parsing・lifecycle pairing・interval accounting・aggregation・renderingをpure function境界で分ける必要がある。特にfamilyごとの条件を1つの巨大`if`へ増殖させず、閉じたrule tableと共通rejection resultに揃える。これにより、新規計装を将来追加する際も「採用できない候補を消さない」という観測契約を保てる。

## 監査リーダーのスキーマ決め打ち債務（260807-intent-2328-tests-e2e-au、履歴、2026-08-07、observed `a5621236c`）

### 債務の性質

本件は**書き手の欠陥ではなくリーダーの契約違反**である。`amadeus-journal.ts` は v1/v2 の共存を明示契約として持ち（`:28-30` のコメント、`JOURNAL_SCHEMA_VERSION_MAX`）、共有ハーネスのヘッダコメントは「a test that hand-parses the JSONL should do the same rather than pin one schema」と逐語で規範を宣言している。患部31ファイル（e2e 17 + 非 e2e 14）はこの規範に反して1スキーマを pin している。

### 債務の重大度別内訳

| クラス | 件数 | 症状 | 重大度 |
|---|---|---|---|
| e2e 自前パーサ | 17 | 単独実行で fail（scan が全数実測） | 高 — ただし CI 不可視 |
| 非 e2e 自前パーサ | 14 | 同種の潜在債務 | 中 — 要棚卸し |
| vacuity assertion | 3 | 壊れたリーダーでも通る**偽 green** | 高 — 検証劇場クラス |

### 検証劇場クラスの 3 件

`t09:211` / `t07:371` / `t07:530` はいずれも「イベント行が 0 件であること」を主張する negative invariant である。リーダーが v2 行を読めなければ、行が実在しても計数は 0 を返すため、**assertion は欠陥の存在下でも通過する**。これは org.md Forbidden の「検証劇場」— 結果を実行から導かない検査 — に該当する。修正時は Mandated に従い、失敗ケースを注入して実際に赤くなることを実証してから完成扱いとする。

### CI 死角という二次債務

`ci.yml:224-227` のコメントは、e2e が `--ci` に含まれない事実と、それが過去に #1569 をリリースまで到達させた機序を自認している。今回 #2328 が同じ死角を通った。これは patch 対象そのものではないが、**同じ機序の3度目を防ぐ手当てを本 intent に含めるか別 Issue とするかは裁定事項**である。

### 修正方式のトレードオフ（requirements へ送る裁定候補）

| 方式 | 利点 | 債務 |
|---|---|---|
| A: 共有ハーネス寄せ | canonical 1定義、59ファイルと同一様式、ヘッダコメントの規範に合致 | `dist/` import 前提が e2e へ波及 |
| B: in-file 正規化 | dist 依存なし、`t-formal-verif-model-completeness-sensor:227-233` に実在先例 | 正規化ロジックが17箇所へ分散、canonical 1定義原則に反する |

construction.md の「複数箇所で消費されるリスト・定数を手書きで複製しない — canonical な1定義から導出する」は A を支持するが、dist 依存の副作用は独立の判断材料である。

### 良い側の実測

共有ハーネスは責務分離が明確（record 単位 / shard 単位 / 計数の3関数）で、`heading` 復元の設計意図をコメントで説明し、未知イベントの fallback も定義済み。59ファイルの採用実績があり、修正の受け皿として成熟している。

## 監査コーパスのデータ品質債務（260807-stage-perf-report、履歴、observed `4a3da7d62`）

本節の測定 ref はすべて observed `4a3da7d62c3cc3dadda2dfb6225d30cfa985a8d0`。差分 base は `b8e3e664f08185e0bd3e3b6d9b7f2dfb60c0ad7d`（祖先性 exit 0、距離 12 commits / 108 files）。全数列挙は `re-scans/260807-stage-perf-report.md` を正本とする。

監査シャード（222 シャード）と record を集計対象として読むと、**構造的に除外せざるを得ないデータが実在する**。これは新規レポータの欠陥ではなく既存コーパスの性質であり、読み手はこれらを**無音で捨てず計数して報告する**必要がある（#2405 の無音スキップ禁止条件）。将来の読み手のために既知のデータ品質債務として記録する。

| バケット | 件数 | 機序 |
| --- | --- | --- |
| 未対応 `STAGE_STARTED` | 35 | `STAGE_STARTED`=1,567 に対し `STAGE_COMPLETED`=1,537、ペア成立は 1,532 |
| 孤児 `STAGE_COMPLETED` | 5 | 同上 |
| 未クローズ `STAGE_AWAITING_APPROVAL` | 7 | `STAGE_AWAITING_APPROVAL`（1,195）に対し `GATE_APPROVED`+`GATE_REJECTED`（合計 1,214、intent ごとに偏る）。7 件のオープナーが自 intent 内でクローズしない |
| 秒粒度で 0 に潰れた窓 | 394 | `amadeus-lib.ts:7740-7742` の `isoTimestamp` がミリ秒を書き込み時点で捨てるため、秒未満のステージは**どの集計方式でも解像不能** |
| サフィックス付きレビュー見出し | 3 | `## Review — Iteration 2（rebase後・裁定A反映）`。1,010 ブロック中の様式ドリフト全数 |
| `{unit-name}` リテラルパス | 2 ファイル / 2 intent | 未解決テンプレートがディスク上のディレクトリ名として実在 |

### `{unit-name}` リテラルディレクトリ — 是正されない痕跡

`#1711` / `#2358` の degrade 欠陥が残した未解決テンプレートが、ディスク上に実在するディレクトリ名として残っている:

```
amadeus/spaces/default/intents/260725-mirror-review-fixes/construction/{unit-name}
amadeus/spaces/default/intents/260802-registry-drift-guard/construction/{unit-name}
```

区間の `d98dd9039`（#2393）と、区間内で `project.md` へ persist された `cid:code-generation:c1-2358-declare-units-done` が degrade の per-unit ゲートを宣言検証つき fail-closed へ変えたが、**これはエンジンの挙動であってディスク上のディレクトリ名を遡って直すものではない**。パス由来の unit 帰属を行う読み手は `{unit-name}` バケットを吐く — 明示的に扱わない限り恒久的に残る。

### 未クローズ `STAGE_AWAITING_APPROVAL` の扱いは設計判断

7 件のオープナーは「窓の終端まで idle」とみなすことも「parse 不能として報告」とすることもできる。**どちらを選ぶかは指標の意味を変える**ため、既定値を黙って当てず要件段で確定する必要がある。

### `intentId` degradation は帰属を壊さない

`intentId==="intents"` の v1 行が **86,744 / 96,269（90.1%）** と過半を占めるが、それらは **95 の実 intent ディレクトリ**へ散っている。**パス基準の帰属は必須だが機能する** — これは債務ではなく制約として記録する。

### 移動値であるカウンタ

`SUBAGENT_COMPLETED` の総数は**測定のたびに変わる移動値**である（Developer scan 時点 7,273 / Architect 再計測時点 7,274 — 本 RE セッション自身が監査へ追記するため）。監査コーパスの件数を成果物へ書くときは測定時刻とともに記録し、転記でなく再計測すること（`cid:requirements-analysis:numbers-from-command-output-only` / `cid:reverse-engineering:measurement-ref-in-artifacts`）。

## subagent-start 配線・語彙の品質債務（260807-subagent-start-pair、履歴、2026-08-08、observed `5f2ad9195`）

測定 ref は observed `5f2ad9195d9ce3ea55d6bf3d34509f2c5ca2c12b`、差分 base `4a3da7d62`（2 commits）。全数列挙は `re-scans/260807-subagent-start-pair.md`。

### 債務1 — live 設定を検査する面の構造的不在

settings を読む既存ガードは6面あるが、**そのすべてが example 側を読み、このリポジトリ自身が実際に読む `.claude/settings.json` を一切検査していない**（`AMADEUS_SRC = <REPO_ROOT>/dist/claude/.claude`、`tests/harness/fixtures.ts:57`）。`t416`/`t418` 系だけが live に触れるが、パス membership としてのみで hook 集合は見ない。

**この不在が生む観測特性**: live から hook 配線が2件落ちても、CI は全面グリーンのまま通過する。#2297 は**症状（`SUBAGENT_STARTED` が 0 件）から逆算して初めて発見された**類型であり、ガードが先に鳴った事例ではない。

**ガード設計に効く構造制約（事実）**:

1. ground truth は正本（tracked）側でなければならない — 投影面 `.claude/settings.json.example` は untracked（`git ls-files --error-unmatch` exit=1）で、fresh clone の `bun run build` 前には不在。投影面基準のガードは build 依存の偽赤/未検出を作る。
2. テキスト等価比較は成立しない — 正本は直接パス形、live は dispatcher 形で、11/13 件すべてが差分に見える。正規化キー候補は `(event, matcher, hook script 名)` の三つ組（dispatcher 形は `HOOK_PATHS[slug]` の basename、直接形は command 中の `amadeus-*.ts`）。
3. 新設ガードは `cid:code-generation:corpus-sweep-for-new-guards` の両側実測を要する — 「欠落を注入して赤になる」ことと「正当な現状（修正後）で赤くならない」ことの両方。

### 債務2 — 欠落は #2297 本文より1件広い

live 欠落は `PreToolUse{^Task$}` だけでなく `SessionStart` の `plugin-compose` を含む**2件**で、両者は「dispatcher スロット不在」という**同一の構造原因**から出ている。

品質上の帰結: 再発防止ガードを包含述語1本で入れると、**着地した瞬間に plugin-compose 側でも赤くなる**。⇒ ガードを本 intent で入れるなら plugin-compose の同梱が構造的に要求される。一方で #2297 本文・完了条件は PreToolUse のみを名指しており、同梱はスコープ拡大にあたる（`cid:requirements-analysis:implementation-deviation-election` の裁定事項）。**この緊張は要件段で明示的に裁定されるべきで、実装段で暗黙に解決してはならない。**

影響（**仮説、未実測**）: live に plugin-compose が無いことで、このリポジトリ自身の plugin 自動 compose が発火していない可能性がある。`t327` の XOR closure は正本 example を見るため（債務1）この欠落を検出していない。

### 債務3 — 修正候補ごとの品質リスク（材料のみ・裁定なし）

| 候補 | テスト15箇所への影響 | 偽 green リスク | 追加の品質リスク |
|---|---|---|---|
| **C1: 定数を単一の新語彙へ置換** | 15箇所すべて改訂必須。`TaskUpdate`/`Write` の null 期待（`t-subagent-purpose.test.ts:77-78`）は不一致のまま**有効** | 低（既存ピンが全件赤くなるため修正漏れが顕在化） | matcher `^Task$` が別語彙 payload に発火する非直観を doc で説明する必要（`:4145-4147` のコメントは要書き換え）。旧版ハーネスが旧語彙を送る場合の後方非互換は**未実測** |
| **C2: 両語彙受理** | 既存15箇所は**すべて緑のまま** | **高** — 新語彙を受理する新テストが無ければ、欠陥が閉包していなくても全面グリーンで通過する。両側実測が必須 | 単数定数では表現不能 → 集合型への型変更と `tests/.coverage-registry.json:4250` の `unitId` 同期が要る。`t189:81` の既存前例とは整合 |
| **C3: 拒否リスト化** | `:77-78` の `TaskUpdate` null 期待は維持できるが `Write` の null 期待（`:78`）が**破れる** → 改訂必須 | 中 | PreToolUse が全ツールで発火するため通過側が全ツールへ広がる。`subagent_type` 不在時 `normalizeAgentType`（`:4108-4110`）が `"unknown"` を返し、**大量の phantom `SUBAGENT_STARTED`** を生む。誤 emit リスクが最大 |

**C2 の偽 green リスクは本 intent 最大の品質論点**: 既存ピンが赤くならない設計は、`cid:code-generation:corpus-sweep-for-new-guards`（新設ガードの両側実測）と `cid:code-generation:inject-runtime-consumed-lines`（実行時に消費される行への注入）を満たす形でしか閉包を実証できない。

### 債務4 — 例外5件の機序が未解明（引き継ぎ必須）

両 Issue の reviewer が**独立に**検出し、いずれも「確定できず」とした事象: intent `260805-subagent-type-guard` の監査に、2026-08-06T02:31:14Z〜03:40:38Z の範囲で `SUBAGENT_STARTED` が **5件だけ**存在する（`Agent Type` は Claude Code ペルソナ名 — `amadeus-developer-agent` ×4 / `amadeus-architecture-reviewer-agent` ×1）。

本スキャンでも新たな説明材料は得られていない（当該 worktree 不在、`git log --all` に該当する修正コミットなし、observed でも `:4128` は旧語彙のまま、live に `PreToolUse` なし）。

**品質上の含意**: 「配線も語彙も壊れているのに 5 件だけ通った」という事実は、**現在のガード理解が不完全である可能性**を示す。reviewer-1（#2303）の提言「修正時にこの5件がなぜ通ったのかを確認する」は**未消化のまま要件段へ引き継ぐ**べき事項であり、修正形の妥当性判断に直接効く（例えば当時 payload が別形状だったなら、C2 の両語彙受理が正解に近づく）。

### 債務5 — doc cite の stale（新規発見）

`docs/reference/23-telemetry-schema.md:194` と `.ja.md:189` が引く `tools/amadeus-lib.ts:4430` / `:4456-4457` は、observed では無関係なコードを指す:

```
4430: // The recorded repo set for an intent (its intents.json row's `repos`), or [] when
4456: }
4457: （空行）
```

正しくは `:4128`（定数）/ `:4160-4161`（ガード）。両 reviewer 未検出。`cid:requirements-analysis:mechanism-cite-verify-at-draft` の違反実例であり、#2303 の doc 同期の射程に入れるべき。

また旧語彙の doc 面は**レビューの4面より広く**、`docs/reference/06-hooks-and-tools.md`（:26/:205/:219）と `.ja.md`（:25/:203/:217）、`audit-format.md:181`（正本・投影の両方）が追加で存在する。ただし同 doc の `:46/:215`（ja `:44/:213`）は **matcher 記述であり修正対象外** — 語彙の切り分けを誤ると正しい記述を壊す。

### 良質な既存構造（保全すべき面）

| 面 | 評価 |
|---|---|
| emit 経路の単一性 | 判定1箇所・emit 1箇所・消費者1箇所。迂回路がなく、修正の影響範囲が機械的に確定できる |
| 2 payload 収斂の設計コメント | `:4149-4153` が `undefined` 短絡の意図を逐語で残しており、修正時に意図を壊さずに済む |
| dispatcher の fail-closed | 未知 slug throw / 部分欠 throw / パス脱出ガード。**部分欠 throw** はスロット追加の副作用面を1点に集約する良い性質でもある |
| 両語彙受理の既存前例 | `t189:78-81` が SDK ビルド差を両語彙で吸収する前例を残す（両 reviewer 未言及） |

### 隣接リスク — tNNN 採番衝突

observed に `tests/unit/t481-resolve-project-dir-worktree-marker.test.ts`（#2413 で着地）が実在し、open PR #2414 が `tests/integration/t481-pr-convergence-lifecycle.test.ts` を追加する。**同一番号 t481 が本線と open PR で重複**（`cid:code-generation:c1-tnnn-collision-on-regrounding` 該当）。本 intent の患部ではないが、**新規テストを起こす際は t481 / t482 を避け、再接地時に固定 base SHA の `tests/` で採番を再確認**すること。

## project-dir 解決の品質債務（260807-projectdir-worktree-fix、履歴、2026-08-07、observed `4a3da7d62`）

本節の測定 ref はすべて observed `4a3da7d62c3cc3dadda2dfb6225d30cfa985a8d0`。差分 base は `b8e3e664f08185e0bd3e3b6d9b7f2dfb60c0ad7d`（12 commits）。全数列挙は `re-scans/260807-projectdir-worktree-fix.md` を正本とする。

### 債務1 — 同一責務の2実装が非対称に進化している（構造債務）

`resolveProjectDir`（`amadeus-lib.ts:226-250`）と `resolveProjectDirFromHook`（同 `:310-347`）は同じ問い（このプロセスが書くべき workspace はどこか）に答えるが、段構成が異なる。marker 段2つ（`:317` / `:329-330`）は hook 側にのみ導入された（`392a2d781` = #641、`e12259ba7` = #1482）。

`cid:requirements-analysis:symmetric-pair-review`（対操作の対称性を明示観点にする）が扱う「片側だけ実装された非対称」クラスタの典型である。**bootstrap 由来バグ14件の過半が同クラスタだった**という既存の実測と同型。

### 債務2 — 無音の fail-open（検証劇場の隣接形）

`resolveProjectDir` に警告・例外は**1つも無い**（`sed -n '226,250p' | grep "console\|warn\|throw"` → exit=1、出力ゼロ）。返り値は常に `string` で、「確信度の低い fallback に落ちた」ことを表現しない。ケース B は**正常な返り値として本線パスを返す**。

`org.md` Forbidden の検証劇場禁止は「偽の緑」を禁じるが、本件はその隣接形 — **偽の隔離**。ガードが無いのではなく、誤りが誤りとして観測されない。

### 債務3 — テストの非対称（テスト債務）

| テスト | 対象梯子 | ケース B |
|---|---|---|
| `tests/integration/t144-harness-seam.cli.test.ts`（`covers:` は `:4`） | CLI 側 | **被覆なし** |
| `tests/unit/t202-hook-project-dir-worktree-marker.test.ts`（`:5`） | hook 側 | 被覆（hook のみ） |
| `tests/integration/t296-hook-launch-and-worktree-resolution.test.ts`（`:1`） | hook 側 | 被覆（hook のみ） |
| `tests/integration/t230-hook-project-dir-opencode-cursor-marker.test.ts` | hook 側（#1048） | 被覆（hook のみ） |

**ケース B を固定するテストは repo 全域で不在。** 実装の非対称がテストの非対称としてそのまま写っている — 欠陥が「テストが緑のまま」生存できる構造。

**t144 test 5 の紛らわしさ**: タイトルは `"resolveProjectDir CWD-marker rung accepts a .codex marker"` だが、body（`:134-146`）は `mkdirSync(join(project, ".codex"))` のみで `amadeus/` を作らない。これは**段4（既知 harness dir 存在）であって workspace marker ではない**。`resolveProjectDir` に workspace marker 段は存在しないため、タイトルの "marker" 語が実体と対応していない — 読み手を誤らせる命名債務。

### 債務4 — stale comment

`amadeus-lib.ts:6673` の `// matches AMADEUS_PROJECT_DIR in resolveProjectDir() above.` は実装と食い違う。`resolveProjectDir` が読むのは `CLAUDE_PROJECT_DIR`（`:231`）であり `AMADEUS_PROJECT_DIR` ではない。

（Developer scan の注記: reviewer-1 が `:6530` と報告した射程外指摘は、observed では `+143` 行の下流にあたるため `:6673` に着地する。）

### 債務5 — 文書と実装の逆向き指示

`stage-protocol.md:511` は絶対形（`$CLAUDE_PROJECT_DIR/.claude/tools/`）を推奨するが、その形がケース B を生む。ただし同じ文中にサブシェル代替が既に明記されており、**正しい代替は正本にすでに書かれている**。文書全体の書き換えではなく、推奨の順序の是正で足りる可能性が高い。

### 債務6 — allowlist と実起動形の不一致

allowlist（`settings.json.example:10` / `.claude/settings.json:39`）は絶対形のみを許可するが、正本スキルの起動行は**全 31 件が相対形**であり、正本における絶対形の唯一の出現は allowlist エントリ自身である。**allowlist が許可している形を、誰も発行していない。**

同一ファイル内の非対称（#1492 の既指摘）も現存: hook 起動行 14本はすべて `${CLAUDE_PROJECT_DIR:-.}` のフォールバック付きクォート形だが、`:10` の allowlist だけが素の `$CLAUDE_PROJECT_DIR`。

### 債務7 — 点修正の反復（プロセス債務）

| Issue | state | 修正の形 |
|---|---|---|
| #796 | CLOSED | `7e6a7c33e` — `fire` に `--project-dir` を配線（段1 での点回避、梯子は無変更） |
| #1450 | CLOSED | `04efcd42c` — election の既定 pd を `resolveProjectDir` 経由へ（呼び出し側の点修正） |
| #1287 | OPEN | enhancement、解決順の再設計（ADR 前提） |
| #2352 | OPEN | 本 intent |

**2件の先例はいずれも呼び出し側の点修正で、梯子そのものには触れていない。** 同じ根から4件目が出ていることは、点修正が根本に届いていないことの実測である。`cid:code-generation:same-root-inventory`（同根パターンの全数棚卸し）の観点で見れば、本件は「4回目に初めて棚卸しが要る」状態。

### 是正の制約（品質面から）

- marker 段の追加だけでは**ケース C+env が閉じない**（env 段2 が上位に残る）。
- marker 述語には構造的盲点がある（`git ls-files .claude/tools` → **0件**、build 前 worktree で偽）。marker ベースの drift ガードは build 前 worktree を検出できない。
- 段順の再設計は #1287 と射程が重なるため、スコープ境界の裁定が要る。

### 未測定として残る点（仮説・断定不可）

- #641 の時点で CLI 側が「検討されなかった」のか「検討して見送られた」のか — コミット記録は前者を示唆するが、これは**証拠の不在**であって不在の証拠ではない。
- 実運用でケース B が発生した監査証跡は未探索（頻度未測定）。
- clone 内 worktree の marker 成立/不成立の全数再census は、本セッションの worktree 隔離ガードにより実行不能（構造的根拠のみ上記で確定）。


## fail-closed ガードの回復経路（260807-failclosed-recovery-path、履歴、2026-08-07、observed `b8e3e664f`）

本節の file:line はすべて observed `b8e3e664f08185e0bd3e3b6d9b7f2dfb60c0ad7d` 時点。差分 base は `7060956c5617125dd2f4e284957aa180cb306484`（祖先性 exit 0、距離 76 commits / 1223 files）。全数列挙は `re-scans/260807-failclosed-recovery-path.md` を正本とする。

### 技術的負債シグナル

| # | シグナル | 実測根拠 | クラス |
| --- | --- | --- | --- |
| ① | **detect⇔recover の非対称（3件共通）**: 異常検知は結線済みで、検知後の回復が結線されていない | #2313 `adapter:226-240` の throw に対し回復分岐は `evidence.ts:162-171` の false 側のみ / #2330 `readStore:681-691` の回復は「不在時のみ」/ #2358 `orchestrate:3727-3731` の案内は実行不能な行為を指す | 可用性・回復可能性。`cid:requirements-analysis:symmetric-pair-review` の detect⇔recover 面 |
| ② | **同一意味論の2実装（#2313）**: freshness 述語が広域 set と narrow set の2箇所に別実装で存在する | `adapter:226-240` は `packages/framework/core/tools` を含む／`t413:181-195` は含まない。同区間の実測で前者 drift あり・後者 drift なし | 「canonical 1定義から導出」原則（construction phase）の違反 |
| ③ | **依存の向きの誤り（#2313）**: 「ゲートが走査するコーパス」を「ゲート実装の鮮度」として読んでいる | `t413:181-195` の選定理由コメント逐語「packages/framework/core/tools is the corpus the gate scans, not the gate: … it needs an evidence-regeneration path, not a pin here」 | 設計判断の誤り。**正しい判断は既にテスト側に文書化されている** |
| ④ | **回復 verb の欠如（#2313 / #2330）**: 検知した状態を解消する CLI 面が存在しない | `scripts/no-silent-drop-evidence.ts` の verb は `rebind` / `reconcile` の2つのみ（usage `:32-33`）／`amadeus-advisory-choice.ts` の verb は `record` / `correct-misattributed` の2つのみ（USAGE `:1516-1520`、dispatch `:1522-1532`） | 契約の穴 |
| ⑤ | **回復手段がゲートの内側にある（#2330）**: 「訊き直す」設計が、訊き直しの起動条件に依存して不発になる | `amadeus-orchestrate.ts:797-799` `if (pending.length === 0) return directive;`。evaluator がもう advisory を raise しない intent では guard 経路自体が走らない | ①の特殊形。回復入口の配置制約として要件段へ持ち込む |
| ⑥ | **schema 遷移の片側実装（#2330）**: store は schema 2 のみ受理、pending は schema 1 のみ受理という非対称が同居し、遷移層がない | `parseStore:659-661` / `parsePending:640-651` / 設計コメント `:653-657` | 意図的な設計判断だが、**遷移の完了手段を欠く点で不完全**。pending が schema 1 のまま残るのは salvage の余地 |
| ⑦ | **述語の共有による修正干渉（#2358 / #2359）**: `unitCovered` が produces の実在のみで判定し §12a Review の記録有無を見ない | `orchestrate:3746-3760`。#2359 は **OPEN・未修正**（`gh issue list --state open --label bug` → open bug 16 件） | 修正範囲の制約。宣言受理点は述語の外側に置く必要がある |
| ⑧ | **evidence binding の陳腐化**: reconcile が恒久赤の間、registry の `currentRevision` が前進しない | `adoption-evidence.json` の `currentRevision = fe8c701ba15c0677a4ec18cc3715ff1086318dde`（= #2338 の着地点）。直近5 run のうち 3 run が failure | 遅効性の劣化。**PR ゲート自体は緑**（下記の影響範囲訂正を参照） |

### 影響範囲についての訂正（#2385 との食い違い）

#2385 は #2313 を「全 PR の trusted base ゲートが偽赤になり、あらゆる修正 PR が着地できない」とするが、observed 断面では成立しない:

- main の最新 CI run **31135183415 は success**（ratchet ステップを含む `Lint and complexity` job も success）
- ローカル実測 `bun tests/no-silent-drop-gate.ts check --base-revision <HEAD^ の完全 SHA>` → exit 0 / `{"schemaVersion":1,"status":"pass","code":"NO_SILENT_DROP_OK","findings":[]}`

**恒久赤は main 限定の `No Silent Drop Evidence Reconcile` ワークフローのみ**。修正の必要性は変わらないが、**S1-FATAL / P1 の根拠文は requirements 段で再判定が要る**。

### 検証面の弱さと強さ

- **強い面**: #2358 は両側が pin されている（`t367-degrade-unitname-resolution.test.ts:411-420` = multi-unit 全被覆 → refuse、`:428-437` = 単一 unit は covered でもゲートを運ぶ）。`:422-426` のコメントが E-OBB2-CG1 を「INTENTIONAL と裁定した非対称」と明記するため、**`cid:reverse-engineering:c1-pinned-behavior-ruling` が適用され、実装段で着手せず要件段で仕様裁定とテスト契約の明示改訂をセットで確定する必要がある**。
- **強い面（#2313）**: `t413:181-195` が正しい narrow set を pin しており、是正の目標形がテスト側に既に存在する。
- **弱い面（#2330）**: schema 1 store の回復に関する pin は存在しない。回復 verb を新設する場合、`org.md` Mandated の「落ちる実証」（失敗ケースを注入して実際に赤くなることを実証）を新規に組む必要がある。
- **弱い面（#2313）**: 恒久赤は CI ワークフローの実行時にのみ現れ、リポジトリ内のテストで再現されていない。回復経路の受け入れ基準は、`REBIND_NON_IDENTITY_DRIFT` に至る条件を fixture 化できるかに依存する。

### 台帳への波及（是正時に該当するノルム）

`tests/.coverage-patch-allowlist.json` は区間で **+234**、`tests/.coverage-registry.json` は **+76**、`tests/.coverage-ratchet.json` は **+4/−4**。`amadeus-advisory-choice.ts` / `amadeus-orchestrate.ts` へ行を挿入する修正では次が該当する:

- `cid:code-generation:c1-allowlist-mechanical-remap`（全エントリの機械 remap ＋ reason と現行行内容の直読照合）
- `cid:code-generation:cg-allowlist-straddle-swell`（既存 waiver レンジの span 膨張検査）
- `cid:code-generation:c5-ratchet-census-at-final-base`（shrink-only ガードの census は最終 base で採る）
- `cid:code-generation:c1-260803-state-integrity`（no-silent-drop 台帳は events 追記のみ。削除・snapshot は maintenance CI 専用）

### coverage / 静的ゲートの現況（observed）

| ゲート | 現在値 |
| --- | --- |
| `tests/.coverage-ratchet.json` | function 176 / audit 44 / scope 15 / stage 8 / hook 14 / subcommand 84 / render-surface 7 |
| `tests/.coverage-project-policy.json`（区間で無変更） | `minimumProjectLineCoverageBasisPoints: 9000`、`maximumRelativeDropBasisPoints: 2` |
| `tests/.coverage-project-baseline.json`（区間で無変更） | `hits 7225 / lines 17648` |
| `tests/.complexity-baseline.json` | `threshold: 15`、最大値は `amadeus-statusline.ts main` CCN 26 |
| mechanism ratchet | `tests/gen-coverage-registry.ts:126-138`。テストファイル名のドットセグメントが mechanism を宣言し、ユニットの `minMechanism` 未満なら UNDER-MECHANISM = 未カバー扱い |

静的ゲート（CI job "Lint and complexity"）の順序: `bun run lint`（biome）→ no-silent-drop（`ci.yml:121`）→ `tests/callsite-guard.ts --check`（`:164`）→ `tests/unchecked-cast-guard.ts --check`（`:172`）→ build → `tests/deletion-gate.ts --check`（`:184`）→ `tests/complexity-gate.ts --check`（`:199`）。

### テスト採番（tNNN）

- 使用済み **最大 = t465**（`tests/integration/t465-kimi-role-lock-ownership.integration.test.ts`）、ユニークな採番値は **436 個**
- 未使用の空き番号（1..465）: 1 2 3 4 5 6 7 8 9 24 50 58 73 74 101 139 159 217 263 316 317 318 323 324 329 330 331 332 333 334 343 348 358 392 421 422 423 424
- **新規テストは t466 以降**を使う（`cid:code-generation:swarm-test-number-reservation`）
- 区間で追加された新規テスト: integration **23 本**（t433, t445, t447〜t465）、unit **16 本**（t444, t446, t448〜t463）。ほかに `tests/formal-verif/support/tla-authoring-e2e-{driver,fixture}.ts`

なお同一 tNNN が複数ファイルで共存する事象は**このリポジトリの既存の生態**であり（`cid:requirements-analysis:mechanism-cite-verify-at-draft` の追補が「同一テスト番号の複数ファイル共存は実在する生態」と既に明文化）、区間固有の債務ではない。**債務としては記録しない。**

### 区間内の品質変化

患部3面のコードはいずれも本区間で新規に壊れたものではないが、**#2313 の drift は区間内で発生した**: freshness 広域 set が読む `packages/framework/core/tools` に区間内で3ファイルの変更があり（`amadeus-lib.ts` / `amadeus-subagent-observability.ts` / `amadeus-subagent-stats.ts`）、これが `REBIND_NON_IDENTITY_DRIFT` の直接の入力である。すなわち**述語の設計は区間外、発火は区間内**である。


## cross-harness resume の品質所見（260805-cross-harness-resume、履歴、observed `7060956c5`）

本節の file:line はすべて observed `7060956c5617125dd2f4e284957aa180cb306484` 時点。差分 base は `b938898f364160d4b5857e153579b40b5ab18372`（距離 34 commits / 493 files、`+43826 / −217`）。全数列挙は `re-scans/260805-cross-harness-resume.md` を正本とする。

### 技術的負債シグナル

| # | シグナル | 実測根拠 | クラス |
| --- | --- | --- | --- |
| ① | **復旧不能の閉路**: 認可拒否からの in-band 復旧経路が構造的に不在。park の復旧文言が案内する `unpark` 自体が同じゲートに掛かる | `amadeus-state.ts:902` `enforceCallerAuthorization` が `:908-912` の `get` / `count` / `lookup` 以外の全27語彙をゲートし、`case "park"` `:1024` / `case "unpark"` `:1027` を含む | 可用性・回復可能性。**「案内する手段が案内先で塞がれている」= 対操作の非対称**（`cid:requirements-analysis:symmetric-pair-review` の類型） |
| ② | **原因の畳み込み**: 4つの独立した失敗原因が同一のエラー値・同一文言に潰れる | `amadeus-caller-authorization.ts:85` / `:94` / `:105` / `:108` がすべて `{ kind: "denied", role: "unknown" }`。決定的再現 C1 / C2 / C3 / C6 が同一出力（実測） | 診断可能性。`:117-122` `callerAuthorizationError` に復旧手順もない |
| ③ | **carrier 書き手の非対称**: 8ハーネス中3面が `.current-session` を書かない | 書き手は `amadeus-session-start.ts:97` の唯一箇所。`kiro-ide` は session_id 転送なし、`opencode` / `pi` は core hook 不使用（いずれも grep 0 hit） | 契約の穴。ユーザー要件（8ハーネス任意組合せ）に対して**構造的に不足** |
| ④ | **未文書の認可バイパス**: env 1本で認可境界が丸ごと素通りする | `amadeus-harness.ts:113-123` が `:114-116` で `AMADEUS_HARNESS_TYPE` を最優先 → `amadeus-caller-authorization.ts:75` の早期 return。対照実験で C1-C6 全ケース `authorized` を実測 | セキュリティ・文書整合。docs に認可への影響の記載なし |
| ⑤ | **projectDir 解決の二重実装**: 同じ workspace を指す2経路が別規則 | core hook `amadeus-lib.ts:298` は marker 検証付き5段ラダー、Kimi adapter `amadeus-kimi-lib.ts:704` は `env.cwd ?? projectDir` の raw cwd | 「canonical 1定義から導出」原則の違反。carrier 分裂を生む（C6 で実測） |
| ⑥ | **文書と実挙動の不整合**: `docs/guide/11-session-management.md:7` の "Session resume works on every harness" は状態層についてのみ正しく、carrier 層・認可層は保証しない | 同行の実読 | 文書契約。所見B と正面から衝突する |

### 検証面の弱さ

- **caller-authorization 専用の unit テストが存在しない。** 122行の認可判定に対し、pin しているのは integration の `tests/integration/t365-kimi-reviewer-boundary.integration.test.ts` のみで、しかも **substring assert（`"is not the main conductor"`、`:504` / `:536` / `:573` / `:646` / `:669` / `:689`）**。4つの拒否枝を区別するテストはない — シグナル②が構造的に検出されなかった理由でもある。
- 一方でこの弱さは**是正時には有利に働く**: 文言に原因判別と復旧ガイドを追加しても既存 assert は破れないため、明示改訂は不要（追加テストは要る）。
- `tests/integration/t-kimi-adapter.test.ts:413` は raw-cwd 挙動を pin しており、シグナル⑤の是正は**この pin の明示改訂を伴う**。`cid:reverse-engineering:c1-pinned-behavior-ruling` に従い、実装段で着手せず要件段で仕様裁定とテスト契約の改訂をセットで確定すること。

### 台帳への波及（是正時に該当するノルム）

`tests/.coverage-patch-allowlist.json` に `authorizeMainConductor` エントリ3件、no-silent-drop 台帳にも同ファイルのエントリがある。`amadeus-caller-authorization.ts` へ行を挿入する修正では次が該当する:

- `cid:code-generation:c1-allowlist-mechanical-remap`（全エントリの機械 remap ＋ reason と現行行内容の直読照合）
- `cid:code-generation:cg-allowlist-straddle-swell`（既存 waiver レンジの span 膨張検査）
- `cid:code-generation:c1-260803-state-integrity`（no-silent-drop の census 再バインド。母集団が変わる場合）
- `cid:code-generation:c5-ratchet-census-at-final-base`（shrink-only ガードの census は最終 base で採る）

### 区間内の品質変化

session lifecycle / caller-authorization / harness detection のコード面は区間内で無変更（該当コミットは `fc862e879` の docs 1件）。**上記6シグナルはいずれも区間の外側で導入済みの既存構造であり、区間内の退行ではない。**

## 成果物ガードの fail-open 経路と非対称（260805-pr-convergence-plugin、履歴、observed `8409c2039`）

本節の file:line はすべて observed `8409c2039c5281e533db88a637649276d8bc4a73` 時点。差分 base は `b938898f364160d4b5857e153579b40b5ab18372`（27 commits / 474 files）。全数列挙・実測手順は `re-scans/260805-pr-convergence-plugin.md` を正本とする。

### 品質所見1: 前進ガードと承認ガードが非対称である

同じ「宣言 produces が存在するか」という問いに対し、engine は2つの異なる述語を持ち、厳しさが逆である。

| 面 | 述語 | 判定 | 承認状態の参照 | バイパス |
| --- | --- | --- | --- | --- |
| per-unit ループ前進 | `amadeus-orchestrate.ts` `unitCovered` `:3452-3472` | **全件必須**（1件でも不在なら false） | なし（シグネチャに state 引数がない） | なし |
| ステージ承認 | `amadeus-state.ts` `producesArtifactsExist` `:1683-1696` | **ANY**（`:1691-1694` が1件でも存在すれば true） | — | `AMADEUS_SKIP_ARTIFACT_GUARD=1`（`:1529`） |

`unitCovered:3466-3470` verbatim:

```ts
  for (const name of names) {
    const rel = resolveArtifactPath(name, node, unit, recordPrefix, codekbCtx);
    const abs = join(projectDir, ...rel.split("/"));
    if (!existsSync(abs)) return false;
  }
```

`producesArtifactsExist:1691-1694` verbatim:

```ts
  for (const dir of producesDirsForStage(pd, stage)) {
    for (const name of produces) {
      if (existsSync(join(dir, `${name}.md`))) return true;
    }
  }
```

**帰結**: ステージへ必須成果物を追加して実効的な fail-closed を得たい場合、その執行面は per-unit ループ前進（`unitCovered`）以外に存在しない。承認面は宣言 produces の1件でも書けば通過するため、必須性の担保にならない。

### 品質所見2: fail-open 経路が3つある（うち1つはコメントと矛盾）

| # | 所在 | 条件 | 結果 |
| --- | --- | --- | --- |
| ① | `amadeus-orchestrate.ts:3465` | `produces_kinds` により当該 unit kind への必須成果物が 0 件 | `return true`（covered 扱い） |
| ② | `amadeus-state.ts:1689` | 宣言 produces が空 | `return true` |
| ③ | `amadeus-state.ts:1677` | どの unit にも適用成果物がない | `return !hasApplicableArtifact` = `true` |

③の `kindAwareArtifactsExist`（`:1653-1678`）は `producesArtifactsExist:1689-1690` が最初に呼ぶ kind-aware 分岐であり、①の approve 側の双子にあたる。さらに `:1675` は**最初に成果物が揃った1 unit で `true` を返す**ため、所見1の ANY 判定は kind-aware 経路にも及ぶ。

**コメントと実装の食い違い（技術的負債シグナル）**: `unitCovered` 直上のコメント `:3448-3451` verbatim は

```
// stages declare required outputs, so the empty case is unreachable in
// practice; an empty required set remains NOT covered so the engine never
// silently skips a unit it cannot prove it ran.
```

と不変条件を宣言するが、この保証が成立するのは `declared.length === 0` の枝（`:3461` で `return false`）だけである。`produces_kinds` で絞られた `names.length === 0` の枝（`:3465`）は逆に `true` を返し、コメントが否定している「証明できない unit を無音で skip する」挙動そのものになる。`requiredArtifactsForUnit`（`amadeus-graph.ts:842-849`）が絞り込みの実体。

**現時点の顕在化**: `code-generation.md` は `produces_kinds` を宣言していない（宣言は `functional-design` / `nfr-requirements` / `nfr-design` / `infrastructure-design` の4ステージのみ）ため今日は全 unit kind へ全 produces が適用され、この経路は踏まれない。ただし**新規 produces を追加する側が `produces_kinds` に触れると無音で fail-open へ落ちる**ため、ステージへ成果物を足す変更では受け入れ基準で封鎖する必要がある。`firstUncoveredBatch`（`:3079-3082`）は同一述語を `unitKinds.get(u)` 付きで呼ぶため同じ経路を継承する。

### 品質所見3: plugin seam 機構が「半分だけ実装された非対称」である

seam の語彙（`SEAM_NAMES` `amadeus-plugin-compose.ts:74`）、merge（`:424-435`）、適用（`:699-719`）、drop 復元（`:567-580`）は実装済みだが、**host stage の認識面（`parseHostStageSeams` `amadeus-plugin.ts:258-270`）と serializer（`serializeStageSeams` `:555`）が合成バイト形にしか対応していない**。実ステージ Markdown の 1 行目は `---` で、`/^stage: (.+)$/` に一致しないため、リポジトリ内のどの実ステージも HostStage にならない。

これは `cid:requirements-analysis:symmetric-pair-review` が扱う「片側だけ実装された非対称」クラスタに属する。ただし**コードは自認しており、挙動は fail-closed** である点で無自覚な欠陥とは区別される:

- `amadeus-plugin-compose.ts:552-554` のコメントが `the real frontmatter serializer is U11+` と未着地を明記
- `tests/unit/t301-plugin-cli-seams.test.ts:7-10` が「t299 の buildHostSnapshot が供給する full-markdown stage files は `stage:` first-line match に失敗する」と記述
- 実ステージへ seam を宣言した manifest は `inspectPlugin` が `unknown-seam` で **loud reject**（`collectSeamErrors` `:498-511`、probe 実測）

**負債としての評価**: 無音の誤動作ではないため安全側だが、「seam 語彙に `produces` があるので既存ステージへ produces を足せる」という読み手の期待と実際の到達可能性が乖離している。plugin authoring の seam 契約は未文書化でもある（`docs/reference/*.md` に plugin seam の記述なし）。

### 品質所見4: 型だけ存在して接続されていない面

`amadeus-quality-repair.ts` の `QualityRequiredOutputDescriptor { outputId, stageSelector, verifierId, verificationConditionId }`（`:125-130`）は「ステージへ必須成果物を宣言する」形を型として持つが、`compileQualityContribution:242` verbatim `if (contribution.requiredOutputs.length !== 0) return null;` により非空を拒否し activation を失敗させる。first-party contribution 自身も `:211` で `requiredOutputs: []` を宣言し、消費者は repo 全域で 0 件（`grep -rn requiredOutputs packages scripts tests` のヒットは型定義・空宣言・ガード・`t428:95` の空 assert のみ）。

fail-closed で塞がれているため誤動作はしないが、**未接続の型が接続済みに見える**リスクがあり、新規実装がここへ乗ろうとすると engine 改修が必要であることが型シグネチャからは読み取れない。

### 品質所見5: 収束述語が二重定義になりうる

`mergeStateStatus` の正規化は `scripts/metrics-publication-domain.ts:256-262` に既存し、`UNKNOWN` を pending へ落とす（= 成立させない）fail-closed 契約と、未知値の throw を持つ。PR 収束判定が同じ述語を新規に書くと、canonical 1定義の原則（construction phase guardrails）に反する二重定義になる。現状は metrics 公開ドメイン内の private 関数であり、共有するには移設が要る。

### 良好な設計として維持されている面

- **センサーの advisory 契約**: 出荷 8 センサーすべて `default_severity: advisory`、`amadeus-sensor.ts:573-574` は無条件 `process.exit(0)`、`severity` の分岐利用は `:271` の表示1箇所のみ。執行と観測が分離されている。
- **3層 trust**: compose の `TrustGrant`（`amadeus-plugin-compose.ts:161-165`）、compile の `plugin_source` stamp（`amadeus-graph.ts:140-146`）、run の O_NOFOLLOW + 同一 inode 再読み（`:1889-1901` / `:1971`）と digest 形式検査（`:2061-2074`）。プラットフォーム非対応時も `throw` で fail-closed。
- **drop の復元判定が台帳でなく FS 実測**: `pluginArtifactsAbsent`（`amadeus-plugin.ts:1190-1198`）に加え `hasEmptyAncestorDir`（`:1202-1211`）で空の親ディレクトリ残骸まで検査する。`cid:code-generation:observe-dont-ledger-under-parallelism` と同じ設計思想。
- **import-closure guard の新設**（区間内 #2240、`scripts/plugin-projection.ts:880-946`）: 宣言と実依存の乖離を projection 時点で write-0 拒否する。
## advisory 人間選択の品質所見（260803-advisory-human-choice、履歴、observed `498c3034a`）

### 実測された強み

- `bun test --timeout 120000 tests/integration/t378-advisories-directive-field.integration.test.ts tests/integration/t381-advisory-checkpoints-latch.integration.test.ts` は exit 0、28 pass、0 fail、107 expect。3 checkpoint、main / `--single`、directive shape、同一run latchの現行契約を回帰固定している。
- advisoryはtyped directiveとstderrの両方に到達し、fieldは存在時だけ載る。単なる通知配線の欠落ではないことをテストとコードの両方で切り分けられる。
- generic human presence、standing grant、gate approval、canonical audit registryは既にfail-closedな権限機構を持つ。新しい判断境界はこれらの概念を再利用できる可能性があるが、意味相関なしの流用はしない。

### 確認された欠陥と証拠限界

| 所見 | 判定 | 根拠／限界 |
| --- | --- | --- |
| advisory固有の選択入力・保持・検証がない | CONFIRMED | directive/report/state/auditの対応field・遷移が不在 |
| 最初のper-unit directive前にholdしない | CONFIRMED | `gate:false` で消費・latchし、最終 `gate:true` では再掲なし |
| 汎用human eventをreceiptにできる | 否定 | plugin/code/choiceとの意味相関がない |
| AIが実際にadvisoryを黙殺した | INCONCLUSIVE | 凍結証拠から実発話を復元できない |
| 実損量 | INCONCLUSIVE | 発生有無・件数を確定できる一次証拠なし |

### 欠落する回帰seam

- receiptなしでstage開始を拒否するfalling proof。
- 「今すぐ実行」「リスクを認識して延期」をそれぞれ1回だけ人間権限で記録し、AI／一般audit CLIによる自己mintを拒否するtest。
- 最初の `functional-design` `gate:false` より前のhold、main / `--single` / per-unitの対称性。
- not-ready / changed / never-run / current / not-composed、初回 / 再入 / 新session / spec変更 / 新run / replayでのfresh・stale判定。
- directive発行前error、現行 `run-stage` と将来 `dispatch-subagent` の共通境界。

具体的なreceipt形式を先にtestへ固定すると未承認設計を既成事実化する。次段ではまず意味・鮮度・権限・hold時点を受け入れ基準にし、その後に最小wireを選ぶ。

## subagent 型規律と model 可観測性の品質所見（260805-subagent-type-guard、履歴、observed `7060956c5`）

本節の file:line はすべて observed `7060956c5617125dd2f4e284957aa180cb306484` 時点。差分 base は `b938898f364160d4b5857e153579b40b5ab18372`（34 commits / 493 files）。全数列挙とスポット再実測の結果は `re-scans/260805-subagent-type-guard.md` を正本とする。

### D-1: 既存テストが誤前提を固定している（新規、S2 相当）

`packages/framework/core/tools/amadeus-lib.ts:4102` の `SUBAGENT_DISPATCH_TOOL = "Task"` が Claude Code `2.1.222` の実 payload（`tool_name = "Agent"`、live 実測）と不一致であり、`:4129` の照合で `subagentStartFields` が常に `null` を返す。結果として **Claude Code では `SUBAGENT_STARTED` が永久に emit されない**。

品質面での要点は欠陥そのものより**固定の構造**にある:

| 固定面 | 座標 | 内容 |
| --- | --- | --- |
| テスト | `tests/unit/t-subagent-purpose.test.ts:89` | `expect(subagentStartFields({ tool_name: "Task", tool_input: { prompt: "x" } })).toEqual({` |
| テスト | 同 `:96` / `:97` / `:101` | いずれも `tool_name: "Task"` 前提の assert |
| ドキュメント | `core/knowledge/amadeus-shared/audit-format.md:154` | Emitter 欄に `(PreToolUse{Task} / SubagentStart)` |

**3面が同じ誤前提を宣言しているため、テストは緑のまま欠陥が生存する。** `cid:reverse-engineering:c1-pinned-behavior-ruling` の適用対象そのものであり、「バグでない証明」ではなく「変更に裁定が要る証明」として扱う必要がある。同ファイル `:82` の tool_name 不在ケース（kimi 経路）は D-1 の影響を受けないため、テストの一部だけが誤前提を持つ混在状態になっている。

なお matcher は本欠陥と無関係である（settings の matcher を `^Agent$` に変えても発火し `tool_name` は `"Agent"`。負対照 run 実測）。**matcher の実験だけでは payload の `tool_name` を推定できない**という手法上の含意があり、`cid:application-design:external-seam-vocab-measurement`（seam の語彙は実測で確定する）の実例である。

### 観測ギャップ（S2 相当）

audit 実測（Architect 再計測 2026-08-06、測定 ref = worktree `c66a2c987` の working tree、tracked 216 シャード / 132 intent）:

| 指標 | 値 |
| --- | --- |
| `SUBAGENT_STARTED` | **60** |
| `SUBAGENT_COMPLETED` | **974**（移動値 — 本セッション中も追記される。Developer scan 時点 973） |

`SUBAGENT_STARTED` を含むシャードは**1 intent のみ**（`260801-tla-multi-model`）で、型は `coder` 33 / `explore` 27 の2種だけである。`log-subagent-start` の配線を持つのは kimi（`harness/kimi/hooks/amadeus-kimi-lib.ts:625-626`）と Claude Code の `settings.json.example` のみで、codex アダプタには配線がない（grep 0 件）。→ **Claude Code 由来の `SUBAGENT_STARTED` は全 132 intent で 0 件。**

品質含意: START × COMPLETE のペアリングを行う `composeSubagentLifetimes`（`core/otel/subagent-lifetime.ts:112`）は、**入力の半分が構造的に欠けたまま**である。休眠（本番消費者 0）であるため実損は出ていないが、配線した瞬間に Claude Code 上で空集合を返す。

### 型規律の不在（本 Issue の主題、S3 相当）

`SUBAGENT_COMPLETED` 974 件の `Agent Type` の分布:

| 分類 | distinct | イベント数 | 例 |
| --- | --- | --- | --- |
| `amadeus-*-agent` persona | 8 | 416 | 定義済み persona |
| ハーネス組込型 | 8 | 297 | `default` 136 / `unknown` 69 / `coder` 37 / `explore` 29 / `worker` 14 / `general-purpose` 9 / `Explore` 2 / `Plan` 1 |
| **許可集合外の `name:` 値** | **184** | **261** | `xrev-2279-reviewer-1` / `re-dev-scan` / `subagent-1` / `cpg-fd-u1` / `builder-oms-b4` … |

内訳の和は `416 + 297 + 261 = 974` で総数と一致（機械照合済み）。

**型（`subagent_type`）を記録すべきフィールドに、実運用では名前（`name:`）が入っている。** `normalizeAgentType`（`:4082-4084`）は `raw?.trim() ? raw : "unknown"` の空白判定のみで所属検査を持たず、非空値を verbatim 通す。compile 時には agent ロスタ照合が存在する（`core/tools/amadeus-graph.ts:2191` + `:2218`）が、これは stage frontmatter の `lead_agent` / `support_agents` を検査する別機構であり **dispatch の `subagent_type` は一切見ない**。すなわち検査が在る層と無い層の非対称が欠陥の所在である。

ただし `name:` 値がどの seam から `Agent Type` へ入るかは**未確定（HYPOTHESIS）**である。`subagent_type: "Explore"`（`name:` 指定なし）の live probe では `PreToolUse` の `tool_input.subagent_type` と `SubagentStop` の `agent_type` が両方 `"Explore"` で一致していた。名前付き spawn の live probe が未実施のため、CAP-1 の照合対象を確定するには追試が要る。

### 休眠面の三重（S3 相当）

| 面 | 宣言 / 書き手 | 本番消費 / 読み手 |
| --- | --- | --- |
| `gen_ai.request.model` | `core/otel/resource-suppliers.ts:24`（`SUPPLIED_RESOURCE_KEYS`） | **0**（`supplyResourceAttribute(` の本番呼出は `amadeus-session-start.ts:148` の `"session.id"` 1 箇所のみ） |
| `composeSubagentLifetimes` | `core/otel/subagent-lifetime.ts:112` | **0**（`tests/unit/t-subagent-lifetime.test.ts` のみ） |
| `runtime-attrs.json` | `core/hooks/amadeus-statusline.ts:249-252` | **0**（`grep -rn 'runtime-attrs' packages/` は 2 hit で両方が書き手側。ディスク実体も 0 件、`observability` は `null`） |

3件すべてが「宣言と本番結線の非対称」クラスであり、`cid:requirements-analysis:symmetric-pair-review` の観点に該当する。品質面では**負債と実装先の両義**を持つ — CAP-2 / CAP-3 はこの休眠面を結線する形で組めるため、新規機構ゼロで要件を満たしうる。

### ケーシング衝突（S4 相当）

`Explore`（Claude Code 組込、2 件）と `explore`（Codex / kimi native、29 件）が**別値として audit に共存している**。許可集合の照合設計で正規化方針（大小無視 / ハーネス別に別型として扱う）を決めないと、同一概念が二重計上される。組込型を列挙した repo 内の正本は存在せず（`docs/` 配下に見つからない）、正本はハーネス側にあり repo からは observable でないため、許可集合の組込部分は手書き台帳になる。`cid:code-generation:count-comment-sync-on-catalog-change` / count-free 系の設計配慮が要る。

### 本区間で確認できる強み

- **`Purpose` 導出の防御設計**: `subagentPurposeLine`（`:4109-4114`）は escape 正規化 → 初行 → control 除去 → trim → 200 字切詰の固定順で、`:4104-4118` のコメントが各段の必要性（未デコード JSON 文字列で改行が2文字のまま届く場合に 200 字窓が初行外を巻き込む）を明示している。機密が prompt 本文に混入するリスクへの意図的な lossy 設計であり、CON-1（CXR-33）と整合する。
- **`TaskUpdate` 誤検知の防波堤が文書化されている**: `:4133-4137` が「settings matcher は unanchored regex なので `"Task"` は `TaskUpdate` / `TaskCreate` にもマッチする」ことを明示しており、D-1 の修正形が失ってはならない性質が読み取れる。
- **t385 対応の literal 再構成**: `core/hooks/amadeus-log-subagent-start.ts:70-72` がフィールドを opaque な戻り値から転送せず literal で組み直しており、コメント `:64-69` が「emitter/registry admission guard が call site のキー集合を静的に読めるようにする / default-deny redaction では未 admit キーが無音で消える」と理由を述べている。default-deny の危険を構造で塞いだ実装であり、model 属性の追加時も同じ様式を踏む必要がある。
- **患部の安定性**: 患部9パスは 34 commits の区間で無変更であり、上流のクロスレビュー引用が observed でそのまま有効である（免除条件は verdict の target-sha 一致で成立）。
## semi 再定義と autonomy 起動宣言の品質所見（260805-semi-redefine-autonomy-f、履歴、observed `2f255bc69`）

本節の件数・行番号はすべて observed `2f255bc6993316f1a271bcd932fabf773096494e` 時点の実測。差分 base は `b938898f364160d4b5857e153579b40b5ab18372`（区間 19 commits / 464 files）。Test Strategy は Comprehensive。

### テスト面の断面

| 指標 | 実測値 | 測定コマンド（observed で実行） |
| --- | --- | --- |
| `tests/**/*.test.ts` 総数 | **941**（base 断面の記載 927 から +14） | `find tests -name '*.test.ts' \| wc -l` |
| 最大テスト番号 | **t439** | `ls tests/{unit,integration,e2e} \| grep -oE "^t([0-9]+)" \| sed 's/t//' \| sort -n \| tail -3` → 437 / 438 / 439 |
| `semi` を含むテスト系ファイル | 14（うち `t97` は `semicolon` の偽陽性 → 実質 **13**） | `grep -rln "semi" tests/ --include="*.ts"` |
| core tools `.ts` 本数 | **119**（base 断面の記載 116 から +3） | `ls packages/framework/core/tools/*.ts \| wc -l` |

**後続 Bolt は t440 以降を採ること**（`cid:code-generation:swarm-test-number-reservation` / `cid:code-generation:c1-tnnn-collision-on-regrounding`）。区間内で新規テスト21ファイルが追加され、番号付きは t433 / t434 / t436 / t437 / t438 / t439、残る8本は `t-` prefix の番号なし形式である。

### 旧仕様を固定している既存テスト（反転が必要な面）

再定義は **既存テストが明示的にピンしている振る舞いを変える**。無申告で変更すると `cid:reverse-engineering:c1-pinned-behavior-ruling` に抵触するため、要件段で仕様裁定とテスト契約の明示改訂をセットで確定する必要がある。

**1. `tests/unit/t431-intent-autonomy.test.ts:307-314`** — `test("semi authorizes only phase-internal stage gates", ...)`

```
    expect(authorizeInteraction(plan.after, occurrence("stage-gate", ["approve"])).kind).toBe("semi-mode-gate");
    expect(authorizeInteraction(plan.after, occurrence("walking-skeleton", ["approve"])).kind).toBe("human-required");
    expect(authorizeInteraction(plan.after, occurrence("question")).kind).toBe("human-required");
```

`:313`（question → `human-required`）が **semi の質問封鎖を直接ピンする行**であり、再定義の射程に入る。`:312`（walking-skeleton → `human-required`）は walking skeleton のピンであり、`stage-protocol.md:105` / `:808` と対応する。**#2253 の射程では保存対象**だが、`semi` を `full` 相当へ寄せる度合いによっては裁定対象になりうる（要件段で明示すること）。

他の semi ピン: `:184-196`（`none` → `semi` は grant なしの人間限定遷移）、`:257-265`（`semi-gate-requires-semi-mode` の throw）、`:339`（semi と grant gate の決定は queue 非適用）。

**2. `tests/integration/t121-stop-hook-enforce.test.ts:1138-1150`** — `test("(f) semi + blank question ALLOWS because questions remain human-owned", ...)`

`expect(r.out).toBe("")` により、`semi` + 未回答質問で stop hook が **block しない**ことがピンされている。テスト名自体が `because questions remain human-owned` と再定義前の前提を明記しており、再定義後は **block 期待への反転**が必要になる。

他: `:827-833`（`isConversationalStop` の semi 挙動）、`:33` / `:1287`（コメント）。

**3. `tests/.coverage-patch-allowlist.json:5268`** — `"function": "isFullyAutonomousIntent"`。述語を改名・分割する場合は同一変更で同期する（`cid:code-generation:allowlist-line-pin-stale` / `cid:code-generation:c1-allowlist-mechanical-remap`）。

### 構造的な品質リスク

- **未レビュー裁定の増加**: 梯子後段2段（solo-election / agent-recommendation）は `reviewState: "unreviewed"` を記録する（`amadeus-intent-autonomy.ts:605-607`）。`semi` を梯子へ載せると未レビュー件数が増える。受け皿は区間内新規の `amadeus-autonomy-review.ts`（1273行）と `amadeus-autonomy-review-production.ts`（484行）であり、これらは base 時点で存在しなかったため既存の品質評価に未収載である。
- **fail-open ではなく fail-closed**: 梯子の最終段は `unavailableReason` 未設定なら `invalid-recommendation-result` を返す（`:736-744`）。縮退が黙って通ることはない。この fail-closed 性は再定義後も保存すべき性質である。
- **公開 flag の無音破棄**: `set-autonomy --mode semi --policies-file <json>` が exit 0 のまま policies を捨てる（`amadeus-bolt.ts:1067` が読む → `amadeus-intent-autonomy-production.ts:417` の分岐で `prepareNonFullCommand` `:382-395` が受け取らない）。observed 時点では `semi` が policy を使わないため実害はないが、**再定義と同時に実欠陥へ転化する**。検証劇場ではないが、受理して無視する契約は org.md Forbidden の趣旨に近い。
- **未認識フラグの値漏れ**: `--autonomy semi` を parser（`amadeus-orchestrate.ts:1044-1074`）へ登録しないまま利用者が打つと、`semi` が intent 自由文へ混入する（`:1072-1073`、コメント `:1068-1069`）。新フラグ実装時は「値を consume する」ことと「consume しない場合の漏れ」の両方をテストで固定すべきである。
- **表示面の非対称**: `--status` は autonomy を8行出す（`amadeus-utility.ts:336-350`）が statusline は 0 行（`amadeus-statusline.ts` に autonomy hit なし）。利用者が常時見るのは statusline である。

### 検証の実施状況

本 Architect synthesis ではテストを再実行していない。Developer scan の実測（`grep` / `wc` / `git diff` / ファイル直読）を一次入力とし、本 synthesis では焦点機構の file:line・件数・verbatim を独立に再実測して照合した。その結果、Developer scan が申告した `resolveAutoDecision` 梯子の行範囲（`:705-706` 等）と `handleSetAutonomy` `:1050` / `handleListAutoDecisions` `:960` は**いずれも1行低い**ことを検出し、本 codekb には再実測値（`:706-707` / `:1051` / `:961`）を採用した。

## phase boundary approval の品質所見（260804-phase-boundary-approval、履歴、observed `b938898f3`）

本節の file:line はすべて observed `b938898f364160d4b5857e153579b40b5ab18372` 時点。差分 base は `9458bbda85eb7257310a80882b4858dc6ce3d1fc`（距離 134 commits / 1041 files、`+84296 / −11280`）。全数列挙は `re-scans/260804-phase-boundary-approval.md` を正本とする。

### テスト資産

- `tests/` 配下 `.test.ts`: **883 → 927**。`.ts` 全体: **991 → 1066**。（Developer scan の「767 → 803」は計数基準が異なるため実測で置換した）
- 新規スイート（抜粋）: unit に `t426-loop-monitor` / `t427-loop-monitor-runtime` / `t428-quality-repair` / `t429-quality-repair-replay-validation` / `t431-intent-autonomy` / `t431-structured-config` / `t-live-e2e-kernel` / `t-pi-driver-contract` / `t-pi-harness-manifest`、integration に `t426` / `t427` / `t429` / `t430` / `t432` / `t433` / `t435` と `t-pi-*` 8本・`t-live-e2e-*` 8本、e2e に `t-pi-candidate-conformance.serial.test.ts`、perf に `t-pi-adapter-overhead`、smoke に `t-pi-dist-structure`。
- 削除スイート: `t-solo-standing-grant-domain`（unit / integration 両方）/ `t-solo-standing-grant-harness` / `t-solo-standing-grant-opencode-mint`（`amadeus-grant-authorization.ts` 削除に伴う）、`t257-amadeus-config` / `t343-amadeus-mirror-project-config`（config 破壊的再編に伴う）。
- 新設サブツリー `tests/harness/live-e2e/`（31ファイル、`testing/` 配下7本を含む）と `tests/conformance/pi-formal-evidence.schema.json` / `tests/fixtures/pi-driver/fake-pi.ts`。

### 患部 seam テストの実測

`tests/unit/t-phase-check-gate-seam.test.ts` を本 RE で実行した。

```
16 pass
0 fail
36 expect() calls
Ran 16 tests across 1 file. [214.00ms]
```

区間内の変化として、`complete-workflow` の describe が `state-fix-final-construction` フィクスチャ + `seedGoalReceiptForFinalStage("build-and-test")` へ再シードされている。これは **#2171 で goal receipt が workflow completion の前提条件になった帰結**であり、phase-check ゲート自体の意味論変更ではない。ただしこの seam テストは `phase_boundary` と autonomy の交差（下記 D-2）を一切カバーしていない。

### CI

- **新規 workflow 3本**: `.github/workflows/pbt.yml` / `metrics-backfill.yml` / `no-silent-drop-evidence-reconcile.yml`。
- **`ci.yml` の実測差分は `4 insertions(+), 131 deletions(-)`**（Developer scan の「135行改修」を実読で訂正 — 改修ではなく**大半が移設**である）。削除の実体は `pbt-deep` ジョブ（manual-only、`ci-success` の `needs` に意図的に不在）が丸ごと新 workflow `pbt.yml` へ切り出されたことによる。
- **カバレッジゲートの強化（1件）**: ステップ名が `Relative coverage gate (head vs merge-base)` から **`Project coverage gate (absolute and merge-base-relative)`** へ変わった。相対比較のみだったゲートに**絶対閾値が加わった**ことを示す。
- 権限面の変更: あるジョブで `persist-credentials: false` → `true`、`permission-issues: read` の付与。credential 保持の緩和であり、レビュー対象として記録する。
- **新規 scripts 6本**: `harness-manifest.ts` / `no-silent-drop-evidence.ts` / `no-silent-drop-evidence-adapter.ts` / `pi-conformance-evidence.ts` / `pi-live-rpc.ts` / `pi-package.ts`。（`manifest-types.ts` は base 時点で既存のため「7本追加」を6本へ訂正）
- docs: `docs/guide/harnesses/pi.{md,ja}` 新設、`docs/harness-engineering/09-porting` 拡張、`docs/reference/19-layered-config` 大幅改稿（config 再編に対応）、`12-state-machine` / `04-stages/construction` 更新。

### 技術的負債シグナル

#### D-1: annex 対 guard の契約ギャップ（#2143 の残余、S2 相当）

規約 `stage-protocol-governance.md:14-18` は `f7273b9ab`（#2166）で是正され、ガード `amadeus-state.ts:379-396` は fail-closed のまま無変更である。**両者は整合しているが、conductor が実際に読む annex がその順序を伝えていない。**

8ハーネス全数実読の結果、`phase_boundary` → artifact → approval を記述するのは **`pi` 1本のみ**（`harness/pi/skills/amadeus/SKILL.md:98-103`）。`claude:98-99` / `codex:96-97` / `kimi:96-97` / `kiro:92-93` / `kiro-ide:92-93` はいずれも approval 条項を持ちながら artifact 前提に触れず、`report --result approved` を直呼びさせる。5本が `:117` / `:119` に持つ governance protocol へのポインタは「load at phase boundaries」としか言わず、`report` に対する**相対順序を指定しない**。

品質機構の観点での問題は、**この drift を検出する機械検査が存在しない**ことである。annex は8本が独立に手書きされ、承認儀式の順序条項について横断的な整合検査がない。同型 drift は今後も新ハーネス追加のたびに再発しうる。

（本文書の過去記述および Developer scan にあった「claude / kiro / kiro-ide / pi には approval 条項なし」は誤りであり、実読で訂正した。この訂正は是正の形を変える — 「annex に phase-check を新設する」ではなく「pi の既存記述を残り5本へ横展開する」。）

#### D-2: autonomy full × phase boundary の未検証交差（S2 相当）

`amadeus-orchestrate.ts:2160-2166` が `directive.phase_boundary` を立て、`:2181-2196` が同一 directive へ `autonomy_auto_approve` を立てる。`stage-protocol.md:33` は auto-approve directive で人間質問なしに approval を report させ、`:129` は `full` が phase boundary も auto-approve すると定める。一方ガード `:3472` は autonomy を一切参照しない。

**artifact を書く主体が人間ターンだと暗黙に仮定されているのに、その人間ターンが存在しない経路が新設された。** ガードは fail-closed なので偽緑は生まないが、`full` × phase boundary は誰も artifact を書かないため進行不能になる。

品質機構の欠落: `t-phase-check-gate-seam.test.ts`（16ケース）にも autonomy 系の新規スイート（`t431-intent-autonomy` / `t432` / `t433` / `t435`）にも、**この交差を張るテストがない**。`full` grant 下の実 run を再現していないため実損は **UNCONFIRMED** だが、テスト空白であること自体は CONFIRMED である。

#### D-3: config 破壊的再編の検査カバレッジ後退（S3 相当）

canonical key のドットパス化（`amadeus-config.ts:59-64` 型宣言、`:472` 以降の `AMADEUS_CONFIG_REGISTRY`）に伴い、既存テスト2スイート（`t257-amadeus-config` / `t343-amadeus-mirror-project-config`）が**削除**され、代替として `t431-structured-config` が追加された。削除分と追加分が同等のケースを張っているかは未検証である。各エントリの `legacy: { key, valueConversion }` — 特に `solo-election.trigger.mode` の `false -> manual; true -> auto` という非自明な値変換 — の移行経路が回帰保護されているかを確認する必要がある。あわせて conductor 側の記述が旧フラットキー前提のまま残っていないかも要確認。

#### D-4: runtime / replay 三つ組の構造的重複（S3 相当）

`intent-autonomy`（961 + 800 + 175、加えて `-production` 900）/ `loop-monitor`（795 + 816 + 553）/ `quality-repair`（838 + 951 + 190）/ `goal`（582、加えて `-reconciliation` 883）の4系統・**約7500行**が、`X.ts` / `X-runtime.ts` / `X-replay.ts` という同一の3層命名規約をとりながら、層をまたぐ共有抽象を持たない。replay 層だけでも 175 / 553 / 190 行と規模が3倍以上ばらついており、同型の責務が独立に実装されている疑いがある。変更時は3〜4箇所を同時に追う必要があり、片側だけの修正が生まれやすい。

### 現在確認できる強み（本区間）

- ガード `verifyPhaseCheckArtifact` は `error()` が exit する設計により、**拒否時に state file が無傷で残る**（`:379` 直上のコメントが明示）。approve 経路で `:3472` が checkbox 書込 `:3484` より前に置かれている順序も実読で確認済み。（**行ピンは本節が宣言する observed `b938898f3` 時点。** observed `89532174c` では定義 `:392`、approve 経路 `:4009` → checkbox `:4021`。順序と fail-closed 性は不変 — 2026-08-14 追記、260813-lifecycle-guard-runtime）
- `parseApprovalProcessResult`（`amadeus-approval-authorization.ts:55-80`）は承認サブプロセスの出力を**単一 JSON 行 `{"kind":"approved"}` のみ**に絞り、exit code・stderr・行数・キー構成の4段で fail-closed に落とす。曖昧な成功解釈の余地がない。
- `classifyApprovalAuthority`（`:20-48`）は target / reservation の**片方だけ**を `partial authorization carrier` として明示的に拒否する。部分的な権限キャリアが黙って通る経路がない。
- `directive.phase_boundary` は宣言コメント（`amadeus-directive.ts:144-149`）で「scope override 適用後に算出されるため早期 phase 退出も覆う」ことを明記しており、ハーネス側が graph から phase 遷移を再導出する必要をなくしている。設計意図がコード内に残されている良い例である。

## no-silent-drop evidence 再バインドの品質所見（260804-evidence-revision-rebind、履歴、observed `9458bbda8`）

本節の file:line はすべて observed `9458bbda85eb7257310a80882b4858dc6ce3d1fc` 時点。実測手順・全数列挙・引用 spot-check は `re-scans/260804-evidence-revision-rebind.md` を正本とする。

### 構造的な検出不能性（最重要）

**この欠陥は PR 上では原理的に観測できない。** PR ブランチでは記録 SHA が到達可能なので t413 は緑になり、スカッシュ着地の瞬間に到達不能へ反転する。PR CI でもレビューでも捕捉できず、同一設計から反復再発した。両クロスレビューが独立に4世代を追跡し一致した結果:

| 着地コミット | 記録 SHA | main の祖先 | main CI |
| --- | --- | --- | --- |
| `7c29e33f7`（#1979 / PR #2088、導入） | `fc49f8de2` | NO | **failure** |
| `a2f08658e`（PR #2127） | `7c29e33f7` | **YES** | success |
| `9e699ea79`（PR #2151） | `173cfbe6d` | NO | **failure** |
| `9458bbda8`（PR #2152、現 main） | `3734885cb` | NO | **failure** |

- **欠陥は出生時から存在した** — 導入コミット `7c29e33f7` 自身の CI が既に赤い。
- **緑だった期間は偶然による** — `a2f08658e` がたまたま直前の mainline SHA を記録しただけで設計上の保証ではない。
- 4回中3回が PR ブランチ SHA を記録している。再発率 3/4 は記入ミスではなく構造的欠落を示す。
- 赤の起点は #2152 ではなく `9e699ea79`、さらに遡ると導入コミット自身。長期間不可視だったのは `paths-ignore` による `Tests` skip（実例 `498c3034a`）が一因。

### 自己参照的 assertion

`t413…test.ts:164` `validateEvidenceRegistry(registry, registry.currentRevision)` は期待値として registry 自身のフィールドを渡すため、**registry が内部整合でありさえすれば revision の正しさによらず緑になる**。この行は台帳の外部妥当性を何も検査しない。到達性を担保しているのは `:157` / `:159` の git 解決だけである（`cid:requirements-analysis:verification-numeric-parse` の自己参照比較クラスに近い）。不完全な再バインドを行うとこの行が初めて赤になる（段階 A/B）。

### 検査対象と検査実装を混ぜた path spec

`t413…test.ts:165-173` の鮮度 diff は path spec に `packages/framework/core/tools`（= 被検査対象）と `':(glob)tests/no-silent-drop/**/*.ts'`（= 検証器の実装）を同居させている。#2153 の主張どおり、これは「検証器の実装面」と「検証器が検査する対象面」を混同しており、対象面が動くたびに台帳更新を強制する。observed で live であることを実測（`core/tools` leg が非空、ゲート実装 leg は 0）。

### 書込経路の不在は「修復不能」を意味しない

Issue 本文と両クロスレビューは「evidence bundle の再 adoption 経路が無いため修復不能」を前提にしていたが、**反証された**（[Issue #2156 訂正コメント](https://github.com/amadeus-dlc/amadeus/issues/2156) 2026-08-04T01:37:53Z）。不動点は機械的に計算可能で `ok: true` / `10 pass 0 fail` / `NO_SILENT_DROP_OK` へ閉じる。**不在なのは再生成ロジックではなく書込経路である**（8ファイル 0 write / 4 subcommand が stdout のみ）。この評価を今後の成果物で退行させないこと。

### クロスレビュー verdict との相違（精密化）

- verdict は「23 receipt 全件が `primary revision mismatch`」と記述するが、実測の内訳は **run 単位 25 件**で、うち4件は名前が `primary` ではない（`full-test:normal` / `full-test:isolated-known-timeouts` / `coverage:normal` / `coverage:isolated-known-timeouts`）。
- このメッセージの発生元は `canonicalBinding` ではなく `repository-adoption-evidence.ts:268`（`summaryMatchesRun`）。`canonicalBinding` が効くのは同時に出ている 23 件の digest 問題の方である。
- Issue 本文の `ci.yml:894-906` は observed では `:893-906`。
- 必須チェックは `CI Success` 1件のみ（本文の列挙は不正確だが、集約ジョブのため「マージ不可」の結論は成立）。
- ローカルのフルクローンでは `:157` ではなく `:159` で落ちる（オブジェクトが PR ブランチ経由で在るため）。CI 形の再現には `file://` clone が要る。

### 同一設計クラスの3件目 — bootstrap fallback の恒久破損

`bootstrap-provenance.json` は `candidate.digest` 乖離（`a2f08658e` 以降）・`bootstrap.ts:331` の等値破れ・`postRevision` のオブジェクト不在という3重の破損を抱え、bootstrap fallback は**恒久 fail-closed**。CI の実運用ベースは常にゲート導入後の SHA なので `bootstrap.ts:493-495` の条件で git 経路が選ばれ顕在化しない。**fail-closed 側なので偽緑は生まないが、fallback は事実上死んでいる**（`cid:requirements-analysis:symmetric-pair-review` の片側実装クラス）。

### 良い面

- 検証器は3層の束縛を**すべて明示の problem 文字列で loud に報告する**（`revision mismatch` / `digest does not match` / `artifact digest mismatch`）。無音の fail-open はない。
- 検証器側 `.ts` に書込 API が 0 件であることは、検証器が状態を持たない純検査であることの担保でもある。
- ゲート導入時に t413 という到達性検査を置いたこと自体は正しく、実際に欠陥を検出し続けている。問題は検出時点が着地後である点に閉じる。

### テスト空白

- **台帳更新（再バインド）を検査するテストは存在しない** — 書込経路が無いため当然だが、新設時には「不動点が閉じること」を pin するテストが要る（段階 A/B が赤・段階 C が緑になる対照）。
- `bootstrap-provenance.json` の整合（candidate digest / postRevision）を pin するテストも不在。fallback 経路が呼ばれないため、破損したまま全 CI が緑を維持している。

## state integrity の品質所見（履歴: 260803-state-integrity、2026-08-03、observed `6c15af23a`）

本節の file:line はすべて observed `6c15af23a` 時点。実測手順・全数列挙・引用 spot-check は `re-scans/260803-state-integrity.md` を正本とする。

> **測定 ref の訂正（Step 1 preflight の後追い実施）。** 本 intent の RE は、ステージ Step 1 の preflight（差分リフレッシュ前に trunk を統合する）を**当初スキップしたまま**走った。preflight は事後に是正パスとして実施され、observed はその統合後の HEAD `6c15af23a` である。統合した 6 コミットは患部ソース 6 ファイルを **1 行も変更していない**（`git diff --stat 498c3034a..origin/main -- packages/framework/core/tools/{amadeus-lib,amadeus-state,amadeus-audit,amadeus-jump,amadeus-utility,amadeus-bolt}.ts` が空出力・exit 0。Architect が独立に再実測）。したがって本節の行番号・引用はいずれも preflight 前後で不変である。経緯の全文は `re-scans/260803-state-integrity.md` §実行メタデータ。

### 実測された強み

- **既定ノブでの audit lock は fail-CLOSED である。** 予算を使い切る競合下の decisive run は 41 成功 + 19 の loud な非ゼロ終了 = 60 で、無音損失ゼロ。相互排他は完全に保たれ、失われた作業はすべて `exit 1` として表面化した。`withAuditLock` は予算枯渇で `AuditLockAcquireError` を throw する（`amadeus-lib.ts:6520-6521`）。baseline run（既定・20 並行）も `FINAL=20 NONZERO_EXITS=0`。
- **CAS steal は reap mutex と nonce rename で正しく直列化されている。** steal の勝者は 1 プロセスに限定される。欠陥は「誰が勝つか」ではなく「そもそも steal 入口を通すべきでない対象を通す」点にある。
- **`withAuditLock` の per-identity depth counter が nested-append の自己 EEXIST を防いでいる。** これは `amadeus-audit.ts:429-433` で明示的に設計意図として記録された緩和であり、当該ケースでは有効に機能している。
- **欠陥はコードベース自身が文書化している。** `amadeus-audit.ts:429-433` は分岐 B の帰結を "leaving the outer critical section running with no lock at all, silently" と verbatim で記す。未知の欠陥ではなく、既知だが一般ケースが未閉包の欠陥である。
- **ロック機構は差分区間 49 コミットで論理不変。** `7c29e33f7` は checkbox/text-mutation 領域のみを変え、ロックコードは +237 行シフトしただけで byte 単位で不変（`git show … | grep '^@@'` が hunk header 1 件）。したがってレビュー verdict の file:line は observed SHA でそのまま有効である。
- **`Completed` には既に共有書き手が存在する。** `rebuildDerivedPlanFields`（`amadeus-lib.ts:5781-5784`）は定義 E を単一箇所で導出し `handleRecompose` から消費されている。統一の受け皿はゼロから作る必要がない。
- **no-silent-drop ゲートが `7c29e33f7` で新設された。** `setCheckbox` / `setStageSuffix` の戻り値が判別ユニオン化され、`requireChanged`（`:5660-5667`）の呼び出し点が 19 箇所に整備済み。今回の是正はこの新しい規律の上に載る。

### 現存する欠陥・空白

| 所見 | 実測 | リスク |
| --- | --- | --- |
| 分岐 B の CAS 後検証が構造的に不活性 | `stampMatches(dead, owner)`（`:6153-6154`）は同一 `pid + startedAtMs` を要求するが live holder は stamp を更新しない（`writeOwnerStamp` は `:6344` の 1 回のみ） | 守るべきケースを一切拒否できない。6/6 の run で 20 増分中 14–16 が無音消失、全プロセス exit 0。**S1-FATAL 相当** |
| acquire の fail-open | `finalizeAuditLockAcquire:6345` — `writeOwnerStamp` 失敗でも `dead-or-over-age` なら `true` | stamp を永久に持たない live lock が生まれ、grace 経過後にタイミングの幸運なしで steal される。**唯一の決定的な分岐 A 経路** |
| 分岐 A の CAS 後検証が入口述語の再評価 | `stampMatches(dead, null)`（`:6144-6152`）が `:6294` と同じ述語を見る | 独立検査として機能しない。ただし grace ノブ単独では 0/6 で実測到達せず、限界的 |
| heartbeat 不在 | `owner.startedAtMs` は acquire 時刻のまま更新経路がない | 健全な長時間 holder と wedge した holder が観測上区別不能。over-age 判定の前提が成立しない |
| ロック bucket の不整合 | `handleSet`/`handleCheckbox` は per-intent、`handlePark`/`handleUnpark` 他 8 サイトは同一 state file を workspace sentinel bucket で変更 | 1 ファイルに 2 つの mutex。env ノブ不要で成立する相互排他欠陥。**code-derived、未実測** |
| ロックされていない state RMW 6 箇所 | `amadeus-jump.ts:370→627`、`amadeus-bolt.ts:872→889`/`927→954`、`amadeus-utility.ts:5162→5244`/`5561→5578`、`amadeus-lib.ts:5843→5888` | うち 3 箇所が `Completed` を書く。`amadeus-jump.ts` と `amadeus-bolt.ts` はロックプリミティブを import すらしていない |
| `Completed` の三定義並存 | R（生カウント）／E（EXECUTE 実効）／G（graph 由来）が 9 書き手に分散 | 3 定義すべてが append-only の audit 行と CLI JSON へ到達する。監査記録が定義依存で不整合になる |
| `Completed > Total Stages` が構造的に成立しうる | `rebuildDerivedPlanFields` は `Total Stages = executeStages.length`（`:5780`）、定義 R は SKIP 行の `[x]` も数える | `t394` が守ろうとする不変条件を定義 R の書き手が破りうる |
| approve 検証器の自己参照 | `amadeus-state.ts:3377` が `getField(…,"Completed") !== String(countCheckboxes(…))` を評価 | **書き手と同じ定義で再計算するため乖離検出が構造的に不可能。repo `Forbidden` の検証劇場に該当**（自己参照比較で fail-closed を演じている） |
| 定義の矛盾 pin | R は `tests/e2e/t52-*:118` と `t-tui-kiro-fix-scope.serial.test.ts:143`、E は `tests/integration/t394-*:126-144` | どの定義を選んでも既存テストが最低 1 本壊れる。実装判断ではなく仕様判断 |
| 予算と grace の結合 | acquire 予算 5000 ms（`:6360-6361`）＝ `unstampedGraceMs()` 既定 5000 ms（`:6113`） | unstamped dir が合法的に steal 可能になる時刻が waiter の最終リトライと一致する脆い結合（機序ではなくタイミング一致） |

### 最大の CI リスク — NSD001

audit lock の実装はほぼ全体が `try { … } catch { /* comment */ }` の silent-continue で構成されている: `writeOwnerStamp:6013`、`readOwnerStamp:6060`、`removeLockDirIfOwned:6048`、`lockDirMtimeMs:6122`、`reapStaleLock` finally `:6210`、`acquireReapMutex:6241/:6250/:6258/:6263/:6269`、`reapStaleLockUnderMutex:6306/:6316/:6319/:6327`、`finalizeAuditLockAcquire:6350`、`acquireAuditLock:6372/:6380`。これらは現在 `tests/no-silent-drop/baseline.json`（217 エントリ、うち `amadeus-lib.ts` 35 / `amadeus-state.ts` 10）で grandfather されている。

**#1906 のパッチがこれらの catch を編集すると再 fingerprint され、NSD001 が新規コードとして発火する**（`ci.yml:154`、`tests/no-silent-drop/ast-scan.ts:845-846`）。各 catch に承認済み failure terminal を残すか、同一 PR で根拠付きの baseline 更新を入れる方針を**実装前に**決める必要がある。別ゲート `bun tests/unchecked-cast-guard.ts --check`（`ci.yml:169`）も走る。加えて `resyncOneIntent` は `NSD003_FUNCTIONS`（`ast-scan.ts:16`）の追跡対象であり、その UNLOCKED RMW に手を入れる場合は戻り値の扱いも同時に満たす必要がある。

### 推奨検証設計

1. **分岐 B の落ちる実証を先に用意する。** `AMADEUS_LOCK_STALE_MS` を短縮し critical section を閾値超過させる並行ハーネスで、修正前に無音損失が実測されること（赤）と、修正後に損失ゼロまたは loud 失敗のみになること（緑）を対で固定する。既定ノブでの fail-closed 挙動（41+19=60）は退行検出のベースラインとして併せて pin する。
2. **`:6345` の fail-open には、stamp 書込失敗を注入する決定的テストを置く。** 「mkdir 成功・stamp なし・holder 続行」という事後条件を再現し、waiter が critical section へ侵入しないことを assert する。注入面は `cid:code-generation:injection-surface-verify` に従いテストが実際に読む面へ行う。
3. **`Completed` は定義裁定の確定後に単一関数へ集約する。** 裁定前の実装着手は禁止（`cid:reverse-engineering:c1-pinned-behavior-ruling`）。集約後は `Completed <= Total Stages` を全書き手経路で成立する不変条件として assert し、矛盾 pin されたテストは裁定に沿って明示改訂する。
4. **approve 検証器を正準定義へ接続し、乖離を注入して赤を実証する。** 自己参照のまま残すと `Forbidden` の検証劇場が温存される。書き手と読み手が別定義であることをテストで固定する。
5. **bucket 統一を採る場合は、同一 state file への 2 経路（`handleSet --intent X` と `handlePark`）が同一 mutex を取ることを直接 assert する。** 現行 `t164` は現在の bucket 意味論を pin しているため、改訂の意図をテスト名とコメントで明示する。
6. **UNLOCKED RMW をロックする場合は、`amadeus-jump.ts` / `amadeus-bolt.ts` へのロックプリミティブ導入が新規依存であることを設計に記録する。** 両ファイルは現在ロックを一切 import していない。
7. 正本修正後は typecheck、lint、対象テスト、`test:ci`、`dist:check`、`promote:self:check` を実行する。生成物を直接編集しない。`packages/framework/core/` のコメントへ `scripts/<file>` トークンを持ち込まない（`t258-boundary-guard`）。

品質上の最大リスクは、(i) ロックの fail-open を別の fail-open へ置き換えること、(ii) `Completed` の第 4 定義を作ってしまうこと、(iii) 検証器を自己参照のまま「修正済み」と扱うことである。いずれも受け入れ基準に落ちる実証を含めて閉じる。

## registry drift guard の品質所見（260802-registry-drift-guard、履歴、observed `64b44a9f8`）

### 実測された強み

- 既存対象suite `t209` / `t248` / `t62` / `t250` / `t258` は164 pass、316 assertions、0 fail。欠落verbとactive fieldの挙動自体は既存テストに支えられている。
- `t209:89-106` は実sourceのswitch caseを列挙し、件数下限と既知要素で抽出のvacuous greenを防ぐ先例を持つ。
- `event-registry-drift` は双方向多集合比較、cardinality、negative tamper、pure comparatorを既に実践している。新規frameworkではなく既存品質パターンの横展開で足りる。
- schema accepted集合25件とemitter `FIELD_ORDER` 25件は現時点で一致し、core正本と全生成コピーもSHA一致している。修正前の投影基盤は健全である。

### 現存する欠陥・空白

| 所見 | 実測 | リスク |
| --- | --- | --- |
| CLI help registry drift | dispatch 33 / `Valid:` 30、missing 3、phantom 0 | 正規verbが未知に見え、運用・診断を誤る |
| schema↔authoritative spec drift | accepted 25に対し仕様表は9件欠落 | 「逐語コピー」という規範が偽になり、次の実装者が古い仕様を正とする |
| active/reserved 矛盾 | schema/parser/testは`when`をactive受理、spec/docsはreserved | 実装・文書・testのoracleが三分する |
| docs完全性の検査空白 | EN/JA H3は同形だがmachine registryなし | `produces_kinds`、`required_sections`、`bundle`等の欠落をCIが観測できない |
| docs-only CI迂回 | `detect-ci-changes.sh` はdocs変更だけでfull=false | guardをunit testに置いても対象docs PRで走らない |
| positive-only coverage | t250/t258は挙動、t248はparse/emitを検証 | 一覧集合の片側追加や抽出失敗を止めない |

### 推奨検証設計

1. schemaの既存required/optional配列をreadonly exportし、accepted集合の唯一の実装由来seamにする。
2. CLI source、authoritative table、EN/JA machine registryを読む純粋extractorと、missing/extra/duplicate/emptyを返す純粋comparatorを作る。
3. live file一致に加え、dispatch-only追加、phantom `Valid:`、docs omission、空抽出、重複のnegative tamperを個別に落とす。
4. 対象英日docs pathを `detect-ci-changes.sh` のtest-running changeへ配線し、docs-only PRでもguardを走らせる。
5. 正本の修正後にtypecheck、lint、対象test、`test:ci`、`dist:check`、`promote:self:check`を実行する。生成物を直接直さない。

品質上の最大リスクは、同じ情報を別の手書き定数へ複製して新しいdrift源を作ることと、抽出器が0件を返して比較がgreenになることである。accepted集合のsource-derived化と空抽出拒否を受け入れ基準に含める。

## scope-grid 面間同期の品質所見（260802-scope-grid-face-sync、履歴、observed `47574fbab`）

本節の file:line はすべて observed `47574fbab` 時点。実測手順とコマンド出力は `re-scans/260802-scope-grid-face-sync.md` を正本とする。

- **テスト空白（決定的）— 面間のセル値を pin するテストが存在しない**: `.claude` の `self-feature` 4 セルを `SKIP` から `EXECUTE` へ書き戻しても、逆に他 4 面を `SKIP` へ揃えても、赤になるテストは無い。既存の 3 種はいずれも別のことを見ている — (1) `tests/unit/t370-promote-self-scopegrid-order.test.ts`（9 test、`:50` describe）は `mergeScopeGrid` / `scopeGridInSync` のキー順対称性・冪等性・prototype 名 scope の保存を pin するが、**セル値の面間一致は pin していない**（`:78` "composed values survive canonicalisation" は 1 面内での値保存であって面間一致ではない）。(2) `tests/integration/t-self-scope-consistency-sensor.test.ts`（217 行 / 6 test）はセンサーの名前集合検査を pin する。(3) drift guard 群は前述のとおり `self-*` 行を構造的に見ない。この 3 者の隙間が乖離の 4 か月生存を許した。

- **センサー fixture が値比較を構造的に排除している**: `t-self-scope-consistency-sensor.test.ts` の `seedHarness`（`:22-34`）は grid を `Object.fromEntries(gridScopes.map((scope) => [scope, { stages: {} }]))`（`:33`）— **すべての scope を空 `stages` で seed** する。したがって現行 6 test はセル値がそもそも存在しない世界でしか動いておらず、値比較を足す際は **全 fixture の更新が必須**（空 stages のままでは新検査が vacuous に通り、`cid:code-generation:vocabulary-collision-vacuity-guard` の空文化と同型になる）。同時に「面間で値が食い違う fixture で実際に赤くなる」落ちる実証（org.md Mandated）と、「現行 5 面の実データを流して意図的非対称だけが除外され残りが 0 件になる」corpus sweep（`cid:code-generation:corpus-sweep-for-new-guards`）の両側実測が要る。

- **検査述語の除外条件を誤ると即座に偽赤になる**: 面間比較は現状のまま導入すると最低 2 クラスの差分を報告する — (a) 是正対象である `self-feature` 4 セル + prose 3 ファイル、(b) 意図的非対称である `self-feature.formal-model-check`（`.claude` のみ EXECUTE、根拠は `amadeus-graph.ts:1375` / `:1387` の設計コメント）。さらに `installer-distribution` scope（`.claude` / `.kimi-code` のみ存在）は `self-` 接頭辞でないため現行 `SELF_HARNESSES` 走査の対象外だが、走査範囲を広げる設計にすると 32 セル全体が scope-absent 差分として噴出する。除外条件は「opt-in plugin が mint するセル」という機序で書き、面名・スラッグのハードコード列挙にしない方が陳腐化しにくい。

- **センサー id を pin する 2 テストとの連動**: `tests/integration/t93.test.ts:100-108` の `EXPECTED_IDS`（8 件、`self-scope-consistency` は `:106`）と `tests/integration/t89.test.ts:366`（code-generation の `sensors_applicable` 5 件、コメント `:139`）が id を固定している。センサーの**振る舞い**を拡張する分にはこの 2 テストは無変更でよいが、id 追加・分割（例: 面間比較を別センサーへ切り出す）を選ぶ場合は 2 テスト + stage frontmatter（`packages/framework/core/amadeus-common/stages/construction/code-generation.md:39-44`、`self-scope-consistency` は `:44`）+ 5 面 + dist の同期が連動する。既存センサーの拡張のほうが同期面が少ない。

- **テスト番号**: unit / integration とも最大は `t412`、`t413` は空き（`ls tests/*/t413*` → 該当なし、実測）。なお別ブランチ `fix/2033-self-scope-grid-face-sync` に止血用の `t413` face-parity テストの WIP が既に存在するため、**`t413` は本 intent で予約済み**として扱い、追加テストが必要な場合は `t414` 以降を採る。センサー本体のテストは既存の無番号ファイル `t-self-scope-consistency-sensor.test.ts` を拡張する経路もある。

- **manifest 文言の是正が再発防止の一部**: `packages/framework/core/sensors/amadeus-self-scope-consistency.md:37-38` は「advisory at write time。release-blocking は package / promotion drift guards」と書くが、その drift guard は `self-*` 行を見ない（`promote-self.ts:154-157` の extras verbatim 保持、dist に `self-*` 行ゼロ）。この一文は**塞ごうとしている盲点をそのまま前提として文書化している**ため、機構を直しても文言を残すと次の読み手に同じ誤解を与える。severity の扱い（advisory のままにするか blocking へ上げるか）は要件段の裁定事項で、advisory のまま維持する場合は「何が release-blocking なのか」を実態に合わせて書き直す必要がある。

- **発火経路の狭さ**: `self-scope-consistency` を宣言するステージは `code-generation` のみ（`grep -rln "self-scope-consistency" packages/framework/core/amadeus-common/stages/` が 1 ファイル、実測）。ディスパッチャに個別分岐は無く、CI にセンサー実行ステップも無い。したがって拡張後も検査は「self 開発の code-generation ステージを回したとき」にしか発火せず、乖離が入り込む経路（scope prose の編集や `/amadeus compose`）と発火点がずれたままになる。この配置のままでよいかは要件段で明示的に判断する — 検査を強くしても発火しなければ実効は上がらない。

## 2026-08-03 差分更新 — Issue #2018 projection parity 修復

- PR #2049 の `t415` 群はfresh projectの各startupがcurrent hostを動的materializeできることを固定するが、commit済みproject projectionからの初回利用性も、startup後のgit cleanも検証しない。動的修復がgreenでも配布parityは証明されない。
- `t356-promote-self-plugin-carveout` はClaudeの `.claude/skills/amadeus-formal-model-check` を保全するcharacterizationで、Codexの正規 `.agents/skills` を覆わない。誤った `.codex/skills` を生成しても検出するface-aware falling proofが必要である。
- 必須回帰境界は、5 self-install面のtracked projection全数／byte parity、fresh worktreeでstartup前からstageとrunnerが利用可能、startup後 `git status --porcelain` 空、再projection冪等、Codex `.agents/skills` 存在かつ `.codex/skills` 不在、7 package faceのneutral bundle／0-plugin baseline維持である。

## formal-model-check 複数モデル化の品質所見（260801-tla-multi-model、履歴、observed `33e196b8`）

- テスト空白（決定的）: `specs/tla/MirrorLifecycleCore.tla`（648 行、検証本体）を編集しても赤になるテストは存在しない。model-map の MirrorLifecycle モデルが identity 照合するのは wrapper の `MirrorLifecycle.tla`（43 行）と `MirrorLifecycle.cfg` のみ（`tla-model-loader-internal.ts:252-275`、照合対象は model/cfg の 2 資産）で、entries は TS 実装 4 ファイル（`tests/integration/t-formal-verif-mirror-model-registration.integration.test.ts` の MIRROR_IMPLEMENTATION）を指す。Core モジュールは model-map スキーマに載る場所がなく（これが #1921 の aux 拡張要求）、drift 検出も loader 照合も届かない。
- doc と実装の非対称: `plugins/formal-model-check/stages/formal-model-check.md:35-36` は「caller は model-map.json 登録済みの別 `.tla`/`.cfg` ペアを指せる」と約束するが、実行面は `TLA_EXECUTION_MODEL_NAME` 固定（`amadeus-formal-verif-model-map.ts:52`）+ `run-model-check-source.ts:118-123` の byte-pin で、FormalElection 以外を渡すと SOURCE_DRIFT になる — この能力は未実装（#1920 の根）。
- 既存の足場（良い面）: loader は no-arg 1 エクスポートに pin 済み（`tests/unit/t-formal-verif-tla-model-loader.test.ts:10-13`、`loadVerifiedTlaSource.length === 0`）。model-map v2 パーサは plugin/canonical 両コピーを対象にした table test（`tests/unit/t-formal-verif-model-map-v2.test.ts`、`:6` コメント "neither copy can drift"、`:277` `describe.each(modules)`）で二重化。mirror 登録は integration で実 `model-map.json` 読込み検証。`tests/formal-verif/support/` に mutation / real-toolchain probe。一方 FormalElection 参照は tests 27 ファイルに散在し、一般化時の機械的洗い出し対象が大きい。
- 欠陥クラス: 「登録スキーマは複数対応、実行・照合・CI は単一固定」の片側実装 — 前 intent 260731-formal-verif-value-chain が記録した非対称クラスタの継続。schema の `exactObject :204` は fail-closed で安全側だが、aux 追加時の必須変更点となる。

## no-silent-drop の品質所見（260801-silent-drop-gate、履歴、observed `d72f60b5a`）

### 観測事実

- 強み: 既存 callsite guard は shrink-only、missing/malformed allowlist の fail-closed、純粋判定の分離を実装済み（`tests/callsite-guard.ts:13-25`, `:115-205`）。complexity gate は外部 tool failure と baseline failure の注入 seam を持つ（`tests/complexity-gate.ts:12-24`, `:53-69`）。
- #1878: `applyTransition` は failure を判別できる（`amadeus-mirror-executor.ts:77-129`）のに `persistBlocked` が結果を捨てる（`:188-196`）。これは戻り値破棄 shape の実欠陥で、positive fixture と runtime 回帰の両方に使える。
- #1874: `setCheckbox` / `setStageSuffix` は不一致を無変更返却へ潰し（`amadeus-lib.ts:5399-5429`）、既存テストが absent slug の no-op を固定する（`t108.test.ts:207-232`, `t400-lib-record-path-and-field-helpers.test.ts:108-113`）。期待値改訂を伴うため、暗黙の helper 変更ではなく明示的 runtime contract 修正が必要。
- #1963: [PR #1970](https://github.com/amadeus-dlc/amadeus/pull/1970) により malformed/trailing section、decoy checkbox、invalid graph が typed failure と exit 1 になる。`t407:97-212` / `t411:1-22` は健全な回帰面である。

### 設計上の品質条件

- 3 shape の positive／negative fixture を100%分類する。intentional best-effort と void 通知 API を negative fixture に含める。
- repo integration は3 roots の完全走査、生成物・fixture 除外、zero／partial scan 拒否を確認する。rule 数と走査 root 数を typed metadata で照合し、実行された一部だけの green を許さない。
- baseline／exemption の更新は shrink-only。exemption は理由の空文字、離れたコメント、複数 node への波及を拒否する。
- CI gate 単独の cold／warm を計測し、15秒以内を blocking assertion にする。初期 corpus の分類レビューで偽陽性率5%以下を確認する。
- tool missing、rule missing／invalid、baseline missing／invalid、zero scan、partial scan はすべて固有の typed diagnostic と exit 1 を持つ。

### 未確認リスク

- 成否を返す emit／Result API の正準 vocabulary は未確定。名前一致だけでは void 通知 API を誤検出する。
- intentional best-effort catch の初期 census と偽陽性率は未計測。
- ast-grep の Bun 配布形、Linux runner の cold-start、固定バージョンは未検証。

## kimi bootstrap デッドロックの品質所見（260801-kimi-bootstrap-deadlock、履歴、observed `861688c31`）

- テスト空白（決定的）: state-file 無しの SessionStart で `.current-session` が書かれることを検証するテストは存在しない。現行の早期終了挙動は `tests/unit/t10-hook-session-start.test.ts:211`（silent exit）/ `:222`（no heartbeat）が no state file の early-exit（`packages/framework/core/hooks/amadeus-session-start.ts:70`）を直接 pin しており、修正はこの pin の改訂 + 回帰テスト追加を伴う。追加先の自然な場所は同 t10。近傍の足場: `tests/integration/t-kimi-adapter.test.ts:317` 付近、t365（`.current-session` を `:826` / `:958` / `:1199` / `:1884` で使用）、t173。`amadeus-caller-authorization.ts` 専用の単体テストファイルは不在。
- 欠陥クラス: 単一 writer × ガード後段配置 — bootstrap 状態で reader 側が恒久 fail-closed になる writer-reader 不整合。`.current-session` 直読み2箇所（`amadeus-caller-authorization.ts:96-109` / `amadeus-kimi-lib.ts:399-403`）を `readCurrentSessionId`（`amadeus-lib.ts:2159`）へ寄せるリファクタは本 intent スコープ外。
- 根因確度: 機序は observed HEAD で全 file:line 再実測済み（`:70` ガード / `:117` writer / 認可 `:96-109`）。決定的再現はテストなしでもコードパス追跡で確定（writer 到達不能は `:70` の無条件 exit から自明）。

## CG 計画整合ガードの品質所見（260801-cg-plan-guard、履歴、observed `cb809c4de`）

- 欠陥クラス: 無音 degrade 3経路（tryEmitSwarm の bolt_dag 不在 false / autonomy null false / computeBoltDag の stderr+undefined）— いずれも fail-open。既存ノルム（per-unit-loop-activation / recompile-before-construction-bolt-dag）は prose 手動確認で機械ガード不在。
- 真因（#1892 調査）: 実測4件の不履行はすべて conductor の非タスク化 — engine 無音 degrade の確定例 0。よってガードの主敵は「prose 計画の非 directive 化」であり、発行時+approve 時の両点発動が要件。
- 未決2点（RA 送り）: #1893 修正方向（A 受理拡張 / B 訂正+loud 拒否）、autonomy null 期の扱い。

## オープンバグ一括修正バッチ第5弾の品質所見（260801-open-bug-batch-5、履歴、observed `c49e385ac`）
## 価値チェーン3件の品質評価（260731-formal-verif-value-chain、履歴、observed `da51af375`）

file:line はすべて HEAD `16486d3c` 断面の実測。3 Issue が扱う欠陥は**いずれも「片側だけ実装された非対称」クラスタ**に属する（`cid:requirements-analysis:symmetric-pair-review`）。

### 欠陥クラス 1 — 配布経路の非対称（#1829）

| 経路 | 駆動 | tools |
| --- | --- | --- |
| projection | ディスク（`plugin-projection.ts:158` walkFs 全走査） | 運べる |
| compose | 宣言（`amadeus-plugin-compose.ts:330-334` parser → `:1021` `composeWriteSet`） | 運べない |

同じ「plugin の中身を配る」責務が2経路で**異なる駆動様式**を持ち、片方だけが宣言を要求する。生きた証拠として `dist/` には 8 変種 / 38 ファイルが並ぶのに compose 済み host には stage md 1本しかない。

**品質上の評価**: これは欠陥というより**未完の機能**（tools 配布が要求されたことがない）。ただし `tests/.coverage-patch-allowlist.json:35-36` が「trusted path は `plugins/<plugin>/stages/` 始まり限定」と明記しており、tools を配る設計は**この防御的制約と正面衝突する**。allowlist の reason 文が防御の意図（containment rejection）を述べているため、単純な緩和ではなく境界の再設計が要る。

### 欠陥クラス 2 — 死んだコードの体積（#1829 のスコープ）

`scripts/formal-verif/` 54 ファイル中 **30（56%）がどの CLI からも到達不能**（群 D）。実験（arm-s / eligibility / full-matrix / tla-skeleton / evidence・fixture・provenance 群）の残骸。

品質指標への現れ:

- `tests/.complexity-baseline.json` の formal-verif エントリ 22 件中 **20 件（91%）が群 D**（`contract.ts` × 2 のみが群 A）。すなわち複雑度 baseline のほぼ全量が死んだコードを守っている
- `tests/.coverage-patch-allowlist.json` の formal-verif 系 waiver も群 D 側に厚い（`fs-fixture-registry.ts` × 2 ほか）。reason は一貫して「e2e-only + `bun --coverage` の spawn 盲点」（`cid:requirements-analysis:bun-coverage-spawn-blindspot`）
- テスト側からは広く生きている（`provenance.ts` 14 件、`execution-evidence.ts` 10 件参照）。**「本番から死んでいるがテストから生きている」**という状態が、削除判断を単純な dead-code 除去にさせない

**評価**: 削除すれば baseline 20 件と allowlist 複数エントリが同時に消え、台帳の見通しが大きく改善する。一方で削除範囲の誤りは 72 本の `.test.ts` に波及する。**削除は独立 Bolt にし、baseline/allowlist の機械 remap（`cid:code-generation:c1-allowlist-mechanical-remap`）を必須手順に含めるべき。**

### 欠陥クラス 3 — 単一発火点前提の脆さ（#1738）

`amadeus-orchestrate.ts:1296-1297` のコメント verbatim「single guarded call site — emitForSlug — so no latch is needed for BR-U6-8」は、**冪等性を構造（呼出しが1つしかない）に委ねた設計**である。

**品質評価**: この設計自体は健全（余計な状態を持たない、`amadeus-plugin-activation.ts:272` 直上の「Never writes state / Never throws」と整合）。ただし前提がコメントにしか書かれておらず、**発火点を増やす変更を機械的に止めるガードが無い**。#1738 が advisory を前倒し・複数化するなら、(a) 発火点を単一に保ったまま位置だけ動かす、(b) ラッチを新設する、のいずれかを選ぶ必要があり、(b) を選ぶ場合は「重複発火しないこと」の落ちる実証（`org.md § Mandated`）が必須。

チャネル分離（stderr 単線、`:1299-1300`）は `cid:code-generation:stdout-directive-stderr-advisory` に正しく従っており、この面は改修時も維持されるべき契約。

### 欠陥クラス 4 — write⇔check 非対称による詰み（#1510、最重要）

**本 intent で最も明確な欠陥。** 同じ `model-map.json` に対し:

- 読取側（`tla-model-loader-internal.ts:232`）は **entries の impl-hash を照合して fail-closed**
- 書込側（`amadeus-sensor-model-completeness.ts:650-659`）は **model/cfg identity しか見ずに MODEL_UNCHANGED で拒否**

さらにセンサー manifest（`.claude/sensors/amadeus-model-completeness.md:8`）の `matches` は `amadeus-election*.ts` を含むため、**impl 変更でセンサーは発火する**。発火 → 更新拒否 → 実行時 fail-closed という**閉路の詰み**が成立している。

品質評価:

| 観点 | 判定 |
| --- | --- |
| 深刻度 | 高 — 「正しい手順で直せない」状態を作る。運用者は model-map を手編集するしかなく、それは `exactObject` 検証（`:158` / `:186`）を通っても hash の正しさを機械保証しない |
| fail-closed 自体 | 適切（`:232` の drift 返却は正しい設計） |
| 欠けているもの | 更新側の判定条件。model/cfg 不変でも entries の impl-hash が動いていれば更新すべき |
| 修正の性質 | 依存追加を伴わない**判定条件の対称化**。`:650-659` の条件に entries 差分の有無を加えるのが最小形 |
| 文書 | `.claude/sensors/amadeus-model-completeness.md:39-41` が MODEL_UNCHANGED 拒否を**仕様として記述している** — 修正は文書の同時改訂を伴う（`cid:code-generation:same-root-inventory`） |

### 品質の良い面（改修時に壊さないもの）

| 面 | 根拠 |
| --- | --- |
| activation の fail-closed | 読取不能・破損は `never-run` へ落ちて advisory を出す（沈黙しない）。`:272` 直上「Never writes state / Never throws」 |
| model-map スキーマの厳格さ | `exactObject(["implPath","sha256"])`（`:158`）/ `exactObject(["cfg","entries","model","schemaVersion"])`（`:186`）+ 境界検査（`:161`）+ ソート/一意（`:169`）。フィールド追加を fail-closed で拒否する |
| loader の内部 seam 明示 | `:236-237`「Internal/test-only seam. Production callers must use the no-argument wrapper in tla-model-loader.ts so runtime input cannot select a root or filesystem」— テスト都合の口が本番から使えないことを明記 |
| mirror reducer のガード集約 | `:692-715` に4本が隣接配置され、事前条件が読み取り可能。終端集合も `:127-132` に単一定義 |
| CI の限定発火 | `ci.yml:547` `if: github.event_name == 'workflow_dispatch'` — 重い TLC を日常 CI から外す判断（`cid:build-and-test:two-layer-verification-posture` と整合） |

### 新モデル題材としての mirror の品質評価（#1738）

**適格性は高い。** 有限ドメイン10種が `amadeus-mirror-types.ts` の 608 行に集中し全列挙可能（Mode 3 / Operation 3 / Boundary 6 / FailureClass 14 / ReceiptStatus 7 / MutationEffect 3 / PhaseKey 5 / ProjectSyncState 3 / ProjectMutation 2 / RegistryStatus 4）、遷移 21 種・終端4・ガード4本が reducer 823 行に閉じる。

**有限化のリスク**: receipts は可変長 Record で上限が `:42` `MAX_RECEIPTS = 1000`。TLA モデル値では小さな定数へ落とす必要があり、**落とし方によっては検査したい不変量（receipt 履歴に依存する再試行の冪等性）が消える**。有限化定数の選び方は要件段の裁定対象。

**検査価値のある不変量の第一候補**: `amadeus-mirror-coordinator.ts:230-244` の `operationForBoundary` で `intent-capture-approved` のみが `state.issueNumber` を参照せず `create` を返す。「issueNumber 記録済みなら create を発行しない」という不変量は、本日実測の [#1838](https://github.com/amadeus-dlc/amadeus/issues/1838)（重複 create）と直結する。**既知バグを再現できる不変量を最初のモデルに含めることは、価値チェーン貫通の実証として理想的**（`org.md § Mandated` の落ちる実証と同型）。

なお PBT 単独ではこのクラスを取りこぼしうる（`cid:build-and-test:pbt-oracle-cancellation` — オラクル相殺で 7 欠陥中 4 件を恒久見逃した実測）。単一形式モデルの完全探索を併用する二層姿勢（`cid:build-and-test:two-layer-verification-posture`）が本題材にそのまま当てはまる。

## オープンバグ4件の品質評価（260731-open-bug-batch-4、履歴、observed `6e7a9d701`）
## perf 分離に関わる品質評価（260731-perf-ci-separation、履歴、observed `da51af375`）
## オープンバグ一括修正バッチ第5弾の品質所見（260801-open-bug-batch-5、履歴、observed `c49e385ac`）

- 根因確度: 9件すべて独立2名クロスレビューで機序確定（検証 SHA = observed）。うち決定的再現済み5件（#1860 reducer in-process 駆動、#1857 二重登録 throw、#1861 fetch exit 128、#1863 mergeComposedScopes 純関数 A/B/C、#1864 sed 直読）。
- 欠陥クラス分布: 非対称実装3（#1838 policy、#1849 report vs next、#1857 catch の recordHookDrop 有無）、状態機械の橋渡し遷移欠落1（#1860）、scaffold/テンプレ乖離1（#1846）、部分配線1（#1856）、lossy データ変換1（#1863）、一過性/構造的エラーの混同1（#1861）、台帳転位1（#1864）— `cid:requirements-analysis:symmetric-pair-review` クラスタが最頻。
- 原因所在: 実装段5（#1857 移行漏れ、#1860 実装漏れ、#1864 remap 不実施ほか）、要件列挙漏れ2（#1849、#1861）、設計段2（#1838、#1863 knownSlugs フィルタ）。origin:bootstrap は #1846 のみ。
- 未決3点（要件段裁定へ送付）: #1849 機序（state 再構築 vs single マーカー）、#1856 latch 意味論、#1838 修正4面の順序制約の要件転記。

## OTel メタ情報スキーマ実装の品質評価（260801-otel-meta-schema、履歴、observed `9c8df859e`）

本節の file:line はすべて observed `9c8df859e` 時点（`cid:reverse-engineering:measurement-ref-in-artifacts`）。

### 実装しやすさの評価（#1868 の6面）

| 面 | 難度 | 根拠 |
|---|---|---|
| §4 exception | **低** | 患部が `tracer-provider.ts:155-156` の2行と registry def の `optionalAttributes` のみ。safe-key が機械追従するため redaction 改修不要（パス書換えを除く） |
| §2 span attributes | 低〜中 | `subprocess-span.ts:80-87` に write-time redaction の既習様式あり。stage 解決だけが新規 |
| §1 resource | **中** | 一元化先（bootstrap）は明確だが、logs / metrics に resource フィールドを新設する構造追加と、供給元未整備の属性（env / vcs / model / session）が5件 |
| §5 subagent | **中〜高** | PreToolUse hook の新設 + プロセス境界を跨ぐスパン組み立ての設計判断 + canonical イベント追加による 78-pin 全面更新 |
| §6 metrics | **中〜高** | bootstrap arm・register 経路・命名規約のすべてが新規。§1 完了が前提 |
| §3 log | ゼロ | 変更なし |

### 品質上の強み（実装が乗る土台）

- **fail-closed と fail-open の分離が明示的**。監査ジャーナル（canonical）は不変条件違反で throw・書込み失敗で latch（`audit-log-exporter.ts:130-176`）、telemetry（span / metric）は全域 fail-open（`local-span-exporter.ts:110-118` の try/catch + `noteStoreFailure`、`:1-7` のコメントが契約を明記）。#1868 設計原則2「fail-open」はこの既存の分類線にそのまま乗る
- **safe-key の機械導出**（`redaction.ts:65-71`）。コメント `:57-64` が「Taking only the required half is what made an optional key ... vanish from the stored row while the append still reported success」と過去の欠陥まで記録している。手書き複製がないため属性追加が安全
- **一語彙一源**（`redaction.ts:20-22`）: VER-2 credential-free ゲートが `CREDENTIAL_SCRUB_PATTERNS` と同じ語彙で走査する。二重管理なし
- **ランタイム自己検査**（`assertRegistryConsistent`、`event-registry.ts:883-897`）が名前重複・auditEvent 重複・durability/category 整合・cardinality を静的テストとは独立に検査する
- **vacuity guard の実践**: `event-registry-drift.ts:115-117` が「canonical name vocabulary is empty — the sweep would pass vacuously (BR-6)」で空集合走査を拒否。`cid:code-generation:vocabulary-collision-vacuity-guard` の実装例
- **設計意図がコメントに残っている密度が高い**。`bootstrap.ts:1-22`・`:34-39`、`tracer-provider.ts:8-10`・`:196-202`、`relay.ts:294-297`、`local-metric-exporter.ts:52-53` など、なぜその形かが読める

### 品質上の弱み（#1868 が触ると顕在化するもの）

1. **resource の redaction 非対称**（独立検証で判明）。`local-span-exporter.ts:88-99` の `redactRecord` は `attributes` / `events[].attributes` / `links[].attributes` を通すが `resource` は素通りする。Relay 側（`relay.ts:298-312`）は値スクラブのみでキー admission を意図的に迂回（`:294-297` に理由記載）。現状 resource は2キーの定数なので実害は無いが、#1868 が `host.name` / `vcs.*` / `session.id` を載せると **ローカルストアに無処理で書かれ、OTLP へは admission なしで送出される**。設計原則4「resource / span attributes とも二層 redaction の対象」は現状未達で、この差を埋めるのが改修点になる

2. **span event の write-time 層が無い**。`addEvent`（`tracer-provider.ts:98-105`）はフィルタなしで push し、守っているのは export 境界だけ。span attributes は call site（`subprocess-span.ts:82`）が write-time redaction を通す様式なのに対し、event 側にその規律がない — **同じ span record 内で層の数が違う**非対称。#1868 §4 の stacktrace は最も機微な文字列なので、ここに write-time 層を足すかが判断点

3. **credential パターンにパス系が無い**（`redaction.ts:35-45` の6パターンはすべて credential 形）。#1868 §4 が要求するホームディレクトリのマスク／リポジトリルート相対化は、`scrubCredentials` の再帰 string 走査に乗せるか、パス専用の正規化関数を別に置くかの設計判断になる。`scrubCredentials` は複数行文字列にもそのまま効く（`:95-114`）ので機構的な障壁は無い

4. **register 署名の非対称**。`registerMeterProvider`（`meter-provider.ts:112`）だけ `projectDir` を取らず、`registerLoggerProvider`（`logger-provider.ts:154`）だけ `redaction?` 注入スロットを持つ。3プロバイダへ resource を配る改修は、この署名の不揃いを整理する機会でもあり、放置すれば bootstrap 側に3分岐が残る

5. **セッション相関の片側欠落**（独立検証で判明）。`amadeus.session.started` / `.resumed` の def（`event-registry.ts:245-262`）は `Source` のみで session ID を持たない。resource へ `session.id` を載せても突合先が存在しないため、#1868 §1 が謳う「SESSION_STARTED 監査行との突合キー」は registry 側の属性追加とセットでないと成立しない

6. **`Agent Type` の `unknown` 落ち**。`normalizeAgentType`（`amadeus-log-subagent.ts:50`）が空文字を正規化する扱い（#845 由来）。#1868 §5 が「識別性改善は実装時に hook 側で追跡」と留保している既知の品質課題

7. **二重モジュールグラフの偽グリーン risk**。テスト 44 ファイルが dist を読み、6 ファイルが canonical を読む。`otel/` の変更で再生成を怠ると大半のテストが旧バイト列に対して green を返す。`t-otel-core-plumbing.test.ts:4-7` が「separate singletons」の理由を明記しているが、**再生成漏れ自体を検出するのは `dist:check` だけ**で、テストスイートは検出しない

### 検証設計上の注意（新規ガードを足す場合）

- 新設ゲートは失敗注入で実際に赤くなる「落ちる実証」が必須（org.md Mandated）。注入は**テストが実際に読む面**へ行う（`cid:code-generation:injection-surface-verify` — otel 系は大半が dist を読むため、canonical への注入は不発になる）
- 型注釈・型 union のみの変更は TypeScript のランタイム消去で赤くならない（`cid:code-generation:inject-runtime-consumed-lines`）。registry の `optionalAttributes` は実行時配列なので注入面として有効
- `t385` の static admission は **call site の供給キー ⊆ required∪optional** を静的解析する。解析不能サイトは `UNRESOLVED_SITES`（`:70`）へ列挙必須で、新規の解析不能サイトは即 fail（`:398` の `toEqual` 完全一致）。#1868 で emit call site を足すときは、動的キー構築を避けるか列挙追加が要る
- 実 FS を触るテストは integration 層へ置く（`cid:code-generation:fs-tests-integration-first` — size purity ratchet が unit 層の fs トークンを拒否する）

## perf 分離に関わる品質評価（260731-perf-ci-separation、履歴、observed `da51af375`）

本節の file:line はすべて observed `da51af375` 時点（`cid:reverse-engineering:measurement-ref-in-artifacts`）。

### 現状の品質所見

| 所見 | 確度 | 根拠 |
| --- | --- | --- |
| integration tier は1 PR あたり最大3回実行される | **100%** | `ci.yml:189` `tests`、`:320` `coverage-head`、`:395` `coverage-base` がいずれも `--ci` の3 tier を回す（`package.json:19-20`）。`coverage-base` はキャッシュヒット時のみスキップ |
| テストファイルを1つ触ると3ジョブすべてが起動する | **100%** | `scripts/detect-ci-changes.sh` `:9-32` — `tests/*` と `*.ts` は `full=true` かつ `coverage=true` |
| mirror ベンチマーク鎖は既に PR ブロックしない | **100%**（de facto と de jure の両方） | `distribution-release-gate` `:279` が `ci-success` の `needs` `:651-659` に不在、かつ ruleset `18843917` の required check は `CI Success` のみ（2026-07-31 実測） |
| e2e は既に `--ci` の外 | **100%** | `tests/run-tests.ts:197-202` |
| perf テストが偽赤を起こす機序は実証済み | **100%** | #1797（t259 の窓分離）は `20230b90d` で交互計測へ是正済み。#1800（spawn 枯渇）は `7ec3e0eae` でリトライ seam 導入済み |
| perf テストの絶対所要時間は分離の主因ではない | **高** | ローカル実測でスイート最遅3件はいずれも非 perf（105.54s / 64.19s / 34.19s）。t257 6.70s・t292 6.49s は軽量 |

### 分離が新たに作りうる品質リスク

| リスク | 機序 | 予防 |
| --- | --- | --- |
| **project coverage ゲートの赤** | perf テストの行ヒットが消えプロジェクト % が低下（`coverage-project-gate.ts` `:48` vs `:52`） | 分離と同一 PR で baseline 再カット。`cid:code-generation:corpus-sweep-for-new-guards` の両側実測（落ちる／正当ケースで落ちない）を適用 |
| **patch allowlist の stale hard-fail** | 除外ファイルが LCOV から消え既存行ピンが `:295` の stale 拒否に掛かる | `cid:code-generation:c1-allowlist-mechanical-remap` に従い全エントリを機械 remap し、reason と現行行内容の直読照合を併用 |
| **registry drift（手段 B のみ）** | tier 外へ移すと `covers:` claim が落ち units が `UNCOVERED` に反転（`discoverClaims` `:771-774`） | ディレクトリ移動を選ぶなら registry 再生成を同一 PR に含める |
| **drift 報告の無音縮退** | `reportDynamicSizes` `:952` は実行したファイルのみ対象。t258 の現在の `drift=wall-clock` が**修正されずに出力から消える** | 分離前に t258 / t259 の `// @test-size` 綴り（regex `test-size.ts:282` に不一致）を正しい `// size:` 形へ是正し、drift を消す前に直す |
| **「立っているが走らない証明」の再生産** | perf 検証を別面へ移したまま実行トリガを与えないと、ゲートが形式上存在するだけになる | `t257-ci-residency-marker-guard.integration.test.ts` のヘッダが記述する失敗モードそのもの。分離先の実行条件を要件で数値固定する |
| **ランナー CLI 契約の破壊** | 新フラグ・新 tier が t05 のピン（exit 2 メッセージ、バナー、直列/並列サマリ同値性）を動かす | `t05-run-tests-parallel.test.ts` を先に読み、byte 一致を受け入れ基準に置く |

### 検証劇場になりやすい点（`org.md` Forbidden の適用）

perf 検証を非ブロッキング面へ移す変更は、**「ゲートは存在するが誰も結果を見ない」**状態を作りやすい。既存の非ブロッキング様式のうち `metrics-maintenance.yml` は loud-fail 姿勢（job 自体が可視に失敗し `$GITHUB_STEP_SUMMARY` へ tee）を採っており、これが参照すべき先例である。分離先が赤くなったときに誰がいつ気づくかを、要件段で明示する必要がある。

### 未決事項（RA へ送るべき判断）

1. 分離の手段（A 実行除外 / B ディレクトリ移動 / C job 分離）— 波及先が大きく異なる。
2. 分離先の実行トリガ — `schedule:` は本リポジトリに前例がなく、既存様式は `repository_dispatch` と `workflow_dispatch` のみ。
3. t292 のような**純部分と実時間部分が同居するファイル**を分割するか、丸ごと移すか。
4. mirror ベンチマーク鎖（既に非ブロッキング）を毎 PR 実行のまま残すか、トリガを絞るか。


## オープンバグ4件の品質評価（260731-open-bug-batch-4、履歴、observed `6e7a9d701`）

本節の file:line はすべて observed `6e7a9d701` 時点（`cid:reverse-engineering:measurement-ref-in-artifacts`）。

### 根因確度と判定

| Issue | P/S | 判定 | 根因確度 | 患部の層 | 未決事項 |
| --- | --- | --- | --- | --- | --- |
| #1811 | P1/S2 | **現存**（ライブ実測あり: 残留84プロセス、全 PPID=1） | 100% | テスト fixture | 修正案 A/B/C の選択（推奨 C） |
| #1800 | P3/S3 | **現存**（患部行は静的に確定。発火は負荷条件依存） | 機序 90%（`EAGAIN` が第一容疑、実測未確定）／患部所在 100% | テスト診断 | 再現不能時の受理条件 |
| #1797 | P3/S4 | **現存**（実測 `2.5065` vs 閾値 `2.5`、マージン 0.26%） | 100% | テスト計測 | 修正案の選択と、スイープ実測から導く数値 |
| #1816 | P3/S4 | **現存**（2機序が残存） | 100% | 本番（表示層） | `## Stage` / `## Phase` の終端化可否、仕様裁定部分の切り分け |

### 品質所見

#### 所見1: 3件が「テストの設計欠陥」クラスタを構成する

#1811 / #1800 / #1797 はいずれも**本番コードが正しく、テスト側が本番契約を写せていない**という同型である。

| Issue | 本番側の状態 | テスト側の欠落 |
| --- | --- | --- |
| #1811 | supervisor は run record 消滅で自律終了する fail-closed 実装（`team-up-codex-safety-wait.ts:643`、`:561-582` の `catch` → `false`） | stub は SIGTERM だけを終了条件にし（`:218-219`）、掃引の受け皿も無い（`afterEach` `:39-41`） |
| #1800 | — | 3分類の診断設計（`:311-313` / `:218`）を持ちながら失敗系の一箇所（`:1411`）だけがそれを通らない |
| #1797 | — | median 化（`:46-48`）は済んでいるが、計測が逐次別プロセス（`:101` / `:102`）で時間窓を共有しない |

これは `cid:reverse-engineering:seam-writer-mode-precondition`（信号の書き手側の起動条件を実測せよ）と同じファミリの欠陥である — テストが本番の終了契約・診断契約・計測契約を部分的にしか写していない。

#### 所見2: 診断の非対称は「片側実装」クラスタの再発である

#1800 の患部（`:1411` の素の等値比較）と #1816 の患部（close が body を書かない `:1156-1159`、収束判定も同型 `:1038-1041`）は、いずれも `cid:requirements-analysis:symmetric-pair-review`（write⇔check / sync⇔close の対称性を明示観点にする）が対象とするクラスタに属する。bootstrap 由来バグの過半が同クラスタだった実測（`cid:requirements-analysis:symmetric-pair-review` の元根拠）と一致する。

**#1800 は特に、正しい実装（`expectSuccessfulMigration` `:218`）が同一ファイル内に既存する**ため、修正は新機構の導入ではなく既存様式への合流である。

#### 所見3: #1797 は「性能ゲート設計の第2層」である

median 化は `#1424` 起点の t258 裁定で既に適用済みであり、本件はその**先に残った別機序**である。`cid:code-generation:c1-narrow-fix-post-apply-remeasure`（ガード通過 = 症状解消と仮定せず、修正適用後に元症状まで再実測する）の実例に当たる — 前回の median 化は正しかったが、閉包していなかった。

**重要な区別**: 本件は `cid:code-generation:c1-benchmark-baseline-correlation-verify` が禁じる「空ウィンドウ baseline」型では**ない**。`measure(1)` は `measure(2)` と同じ計算を1倍量で行うため負荷相関は健全である。破れているのは**時間窓の共有**であり、別の設計面である。この区別を誤ると誤った修正（baseline の差し替え）へ向かう。

#### 所見4: #1816 は「仕様裁定」と「実装欠陥」が混在する

| 部分 | 分類 | 根拠 |
| --- | --- | --- |
| close が body を書かない（`executor:1156-1159`） | 実装欠陥 | sync との対称性が破れている |
| completion 境界の最終 body が `Running` を表示する（`lifecycle:311-312` × `presentation:259-260`） | 実装欠陥（表示層） | `completionInstance` が presentation で未消費のため、表示層が完了を知る手段を持たない |
| record の main 着地前に close する | **仕様裁定マター** | PR #1689 の設計帰結であり `t361:262` で契約固定済み |

`cid:reverse-engineering:c1-pinned-behavior-ruling` に従い、契約固定された挙動の変更は実装段で着手せず要件段で裁定する。実装スコープを**表示層に限定する**旨を要件段で申告する（無申告のスコープ縮小を避ける — `cid:build-and-test:no-silent-scope-narrowing`）。

#### 所見5: 検査可能性の欠落

| Issue | 退行を検知するテスト | 状態 |
| --- | --- | --- |
| #1811 | プロセス残留を assert するテスト | **0件** — 修正しても退行が検知されない |
| #1800 | 3分類の診断（`:311-313`） | **存在する**が失敗系に適用されていない |
| #1797 | 比 assert（`:108-109`） | 存在するが計測設計自体が患部 |
| #1816 | body の Status を assert するテスト | `t281:55` / `t232:35` に存在するが、いずれも `completionInstance` を持たない fixture のため完了断面を検査していない |

#1811 と #1816 は新規テストによる閉包の実証が必須である。

#### 所見6: allowlist 行ピンの脆弱性が再び顕在化する

`tests/.coverage-patch-allowlist.json` は本区間（`3f73823b1..6e7a9d701`）で `+38/−38` の全面 remap を受けたばかりである。#1816 が `amadeus-mirror-presentation.ts` へ行を挿入すると、presentation 行ピン5件（`193-194` / `230-234` / `237-239` / `245-247` / `266-271`）が再度 stale 化しうる。

**機械 remap + 直読照合の併用が必須**（`cid:code-generation:c1-allowlist-mechanical-remap`）。stale 検査は存在検査のみで意味一致を見ないため、検出に映らないまま別の測定可能行へ無音転位する事例が実測されている（`cid:code-generation:allowlist-line-pin-stale` の追補）。

#### 所見7: 修正の交差リスクは低い

4件のうち **3件がテスト面に閉じる**ため、生成面（7 dist + self-install）の再生成チェーンを通るのは #1816 のみである。ファイル単位の交差も無い。条件は2点のみ:

1. #1811 の**本番非改変を確定**すること（`team-up-codex-safety-wait.ts` / `team-up.sh` を触ると生成面で #1816 と交差する）
2. `tests/.coverage-patch-allowlist.json` へ触れるのは #1816 のみとすること

#### 所見8: #1811 の着地が #1800 / #1797 の再現条件を変える

#1811 の残留プロセス（実測84本）はホスト負荷そのものである。これを解消すると、#1800（spawn `EAGAIN` が第一容疑）と #1797（負荷変動による比のずれ）の**再現条件が変わる**。

負荷スイープ実測を #1811 の着地**前**に取るか**後**に取るかは要件段で固定する。前に取ると「残留込みの最悪条件」を、後に取ると「本来あるべき条件」を測ることになり、導出される数値が変わる。

### 本区間で解消された品質課題（本 intent の患部外）

| 課題 | 解消 |
| --- | --- |
| 未開票中の票本文が共有 tracked ファイルに載る（#1773） | pending lane 新設（`amadeus-election-store.ts` 6関数）+ `.gitignore` 8面で非追跡化。新規テスト `t373-election-ballot-blind-storage.integration.test.ts`（`+323`）で blind 性を assert |
| 配布ビューに設問文・選択肢説明が無い（#1772） | `amadeus-election-model.ts` `+36/−9` で view へ搬送。`t234-election-model.test.ts` `+66/−2` でキー集合の契約を改訂 |
| mirror create 拒否条件の自己矛盾（#1752） | `succeededMirrorCreateExists`（`amadeus-mirror-state-codec.ts:1731`）による receipt ベース判定へ反転。`t265-engine-boundary.integration.test.ts` `+120/−17` で fixture を分岐 |

いずれも「検知テスト 0件」だった面に新規テストが付いており、前 intent の品質所見が閉包されている。

## オープンバグ3件の品質評価（260730-open-bug-batch-3、履歴、observed `3f73823b1`）

本節の file:line はすべて observed `3f73823b1` 時点。3件とも**現存**を実測確認した。

### 根因確度

| Issue | 根因 | 確度 | 未裁定事項 |
| --- | --- | --- | --- |
| #1773 | 票の格納が blind の保護境界の外にある。`appendBallot`（`:464-465`）が票オブジェクトを無加工で単一共有ファイルへ書き、blind lift（`materialize` `:500`、コメント `:498`）は tally 時にしか働かない | **機序 100%**（格納面・git 面とも実測） | **方式裁定が未決** — 格納分離（票ごとの分割 / 暗号化 / 非 tracked 化）vs 通知抑制（読取経路の遮断）。修正面の広さが裁定で変わる |
| #1772 | 型が情報を持たず（`Choice` `:48`）、parse がホワイトリスト再構成で未知フィールドを無音 drop する（`parseChoices` `:80`）。配布ビュー（`:306-310`）に `question` が無い | **100%** | BR-2 blind 契約（`:304-305`）と question / description 追加の両立可否。テスト契約（`t234:190` `:192`）の改訂範囲 |
| #1752 | 受理判定が offer 時点でなく report 実行時点の state 再評価（`:4241-4242`）に立つため、`:4255` の `(answer === "create" && hasMirrorIssue)` が「指示に従った利用者」を拒否する | **100%**（#1791 着地後も再現経路の温存を `:486-500` の実読で確認） | 修正方式 — (a) create receipt の存在判定 vs (b) ask 時 binding の永続化。fixture（`t265:793`）の分岐設計 |

### 品質所見

**1. blind の保護が「配布」に閉じ「格納」に及んでいない（#1773）** — Amadeus 側の寄与因子は**格納設計と配置の2点だけ**である。設計された配布面（`status` / `vote` 出力 / ShortNotification）は健全で、`shuffleView`（`:338`）による構造的 blind も設計どおり機能し、`.claude/hooks/` に election ledger の配信機構は 0件（`grep -rn 'ledger' .claude/hooks/` の3ヒットはすべて**監査シャードの append-only ledger** を指す語彙で、実読により選挙 ledger と無関係と確定 — `cid:requirements-analysis:absence-claim-grep-verify`）。すなわち「守る仕組みを作ったが、守る対象を守っていない場所に置いた」形状であり、機構の不在ではなく**境界の設定誤り**である。修正の受け入れ基準を「配布面が blind であること」に置くと、既に真である命題を検証することになり検証劇場になる（org.md Forbidden）— 基準は collecting 中の格納面と git 面に置く。

**2. blind 性を assert するテストが 0件（#1773）** — 退行が構造的に検知されない。BR-2 の blind 契約は配布ビューのキー集合（`t234:190`）でピンされているが、**collecting 中に票内容が他の投票者から到達不能であること**を検査するテストは存在しない。修正時は「落ちる実証」（org.md Mandated）を格納面へ注入して行う必要がある。注入面は `cid:code-generation:injection-surface-verify` に従い、テストが実際に読む面（core 正本か dist か）を注入前に実測確認する。

**3. fail-open な無音 drop（#1772、`cid:code-generation:verification-numeric-parse` の同族）** — `parseChoices`（`:73`）は `internalNo` / `label` の型不正では `null` を返して fail-closed に振る舞う一方、**未知フィールドは exit 0 のまま黙って捨てる**。起草者は description が失われたことに気付けず、投票者は説明の存在自体を知らない。「検証して証明を捨てる」のではなく「検証済みであることを型で運ぶ」（parse-don't-validate）という construction.md の原則からは、捨てるなら loud に、運ぶなら型にという二択であり、現行はどちらでもない。

**4. write⇔read 非対称クラスタの継続（#1772 / #1752、`cid:requirements-analysis:symmetric-pair-review`）** — 3件のうち2件が非対称クラスタに属する。#1772 は `OriginalBallot` の `reservation`（`:135`）/ `rationale`（`:136`）が書かれるが配布ビューに現れない write⇔read 非対称。#1752 は `create` にだけ state 照合があり `sync` / `skip` には無い片側実装。前 intent（260730-open-bug-batch-2）の #1734（apply⇔check 非対称）・#1711（produces⇔consumes 非対称）に続き、**3 intent 連続で同型が観測されている**。修正時は他の対操作（resolve⇔commit、emit⇔terminal、fork⇔merge）にも同型が無いか棚卸しする（`cid:code-generation:same-root-inventory`）。

**5. 3重固定は「バグでない」ことの証明ではない（#1772）** — `DistributionView` のキー集合は型（`:306-310`）・設計コメント（`:304-305`）・テスト（`t234:190`）の3重で固定されている。ただし BR-2 が禁じているのは「推薦マーカー・先行票・peer status」であって設問文ではない。3重固定は**変更に裁定が要ることの証明**であり、実装段で着手せず要件段で仕様裁定とテスト契約の明示改訂をセットで確定してから行う（`cid:reverse-engineering:c1-pinned-behavior-ruling`、`cid:code-generation:cg-invariant-conflict-explicit-revision`）。

**6. 新機能の着地を修正の完了と混同しない（#1752）** — #1791（`ffb68c484`、本区間で着地）は `intent-initialized` boundary を新設し初回 create の遅延を解消したが、その分岐（`:486-500`）は `:488` verbatim: `if (mode !== "auto" && boundary.initialCreate !== "pending") return false;` と **auto モード優先**であり、prompt モードは従来 ask 経路へ落ちる。#1752 の自己矛盾は温存されている。関連機能の着地を根拠に Issue を閉じない（`cid:requirements-analysis:close-after-landing-verification` — 着地面の実読が要る）。

**7. テスト番号の重複採番（本 intent の患部外・プロセス所見）** — 本区間で `t366`（3ファイル）・`t367`（2ファイル）・`t368`（3ファイル）の番号重複が生じている。`cid:code-generation:swarm-test-number-reservation`（並列ディスパッチ時の事前予約）が守られなかった実測であり、`cid:requirements-analysis:mechanism-cite-verify-at-draft` 追補（テスト引用は `tNNN` 短形でなくフルパス）の適用必要性が高まっている。本 intent の新規テスト採番は `t371` より後を使う。

**8. 行番号シフトへの注意（全件）** — `amadeus-orchestrate.ts` は本区間で `unitDirsUnderConstruction`（`:3054`）と初回 create 分岐（`:486-500`）の追加を受け、行番号が base から大きくシフトしている。Issue 起票時点（base 以前）の行引用を HEAD で照合すると偽陽性になる（`cid:reverse-engineering:upstream-cite-reresolve-on-shift`、`cid:requirements-analysis:historical-section-cite-check-at-observed`）。本 codekb の履歴節に含まれる file:line も当時の observed 断面に固定されているため、参照時は当該 observed で照合する。

## オープンバグ5件の品質評価（260730-open-bug-batch-2、履歴、observed `c42ef4d77`）

本節の file:line はすべて observed `c42ef4d77` 時点。

### 根因確度

| Issue | 根因 | 確度 | 未裁定事項 |
| --- | --- | --- | --- |
| #1750 | boundary 種別集合に intent 誕生時点が無く、初回 create が `intent-capture` の EXECUTE に暗黙依存（`amadeus-mirror-lifecycle.ts:640-661` / `amadeus-orchestrate.ts:4492`） | 機序 100% | 新種別追加 vs 既存 phase 経路への条件追加。receipt 表現（`MIRROR_BOUNDARY_PHASES` 拡張 vs `createIdentity` をべき等キーに使う）も未裁定 |
| #1749 | governance protocol 正本1行の誤記が生成面12 + docs 2へ機械投影（`stage-protocol-governance.md:22`） | 100% | drift guard の実装形。既存に本契約の検査テストがあるかは**未確認**（不在主張ではない） |
| #1742 | 発火対象の決定が `matches` glob のみで、宣言 produces との照合が無い（`amadeus-sensor-fire.ts:199-202`、`produces` 参照 = 0） | 100% | `{unit-name}` 解決の seam をどこへ置くか（`amadeus-lib.ts` への抽出 vs directive 解決結果の受け渡し） |
| #1735 | auto-solo 発動指示がハーネス依存のアンビエント層と選挙 SKILL にしか無い（唯一の所在 = `SKILL.md:28`） | 機序 高（設計ギャップとして確定）／ codex 実行時の非投入は Issue の一次証拠（選挙0件）と AGENTS.md の on-demand 記述からの推論 | 中立層（stage-protocol §13）への焼き込み vs ハーネス固有追記 |
| #1734 | apply（`mergeScopeGrid` `:147-160`）が書く順序を check（`scopeGridInSync` `:130-142`）が検分しない write⇔check 非対称 | 100%（read-only シミュレーションで決定的再現） | 書込側の正準化（キー名ソート）vs 検査側の対称化。既存センサーとの責務重複の整理 |

### 品質所見

**1. write⇔check 非対称クラスタ（#1734、`cid:requirements-analysis:symmetric-pair-review`）** — `mergeScopeGrid` は「dist キー順 → extras 順」というオブジェクト挿入順に依存したバイト列を書き、`scopeGridInSync` は JSON 意味比較（dist キーの包含 + 値一致）しか行わない。**check は apply の出力を検分していない**ため、apply が churn を出す状態を check は sync と判定する。この形状は前 intent（260730-skill-reviewer-fixes）の #1711 で観測された produces/consumes の片側実装と同型であり、bootstrap 由来バグの過半を占める非対称クラスタが継続していることを示す。修正時は他の対操作（resolve⇔commit、emit⇔terminal、fork⇔merge）にも同型が無いか棚卸しする（`cid:code-generation:same-root-inventory`）。

**2. Issue 本文の「削除」誤読 — 訂正済み（#1734）** — Issue は「amadeus-bugfix / amadeus-feature / amadeus-refactor のエントリが self-install ツリーから削除される」と記述するが、read-only シミュレーション（Issue 記載の base `c48877451` の実バイトへ `mergeScopeGrid` 相当を適用）では insertions 144 / deletions 144 で **extras 4件は全て merged に保存されている**。144行の正体は削除ではなく**末尾への移動**（4エントリ × 36行）であり、Issue の記述は移動 diff の削除側半分の誤読である。この訂正は修正スコープの縮小に直結する（データ喪失バグではなく順序安定性バグ）。要件段でこの訂正を明示的に引き継がないと、存在しないデータ喪失への対策が設計に入る。

**3. 現 HEAD では #1734 の症状が再現しない** — `.codex` の現状は dist 10キー + extras 4キー（`self-*`）が既に dist 順 → extras 順に並んでおり、`mergeScopeGrid` 相当の再適用結果は現ファイルと**バイト一致**（16673 bytes 同士、difflines 0）。#1683 `dd8532d1c` で `amadeus-*` → `self-*` 改名と全ハーネス統一が着地し、一度 apply された結果が commit されたため。**潜在欠陥は残存**（dist に無い extras が dist キーより前に並ぶ状態が再び生じれば発火する）が、落ちる実証には状態の再構成が要る。修正の受け入れ基準を「現状で churn が出ないこと」に置くと検証劇場になる（org.md Forbidden）— 前状態を再構成した回帰テストが必要。

**4. ハーネス依存の文脈投入ギャップ（#1735）** — 発動ノルムがハーネス非依存層に無いことは、codex 固有の不具合ではなく**設計上の単一障害点**である。claude で動いていたのは `@`-import スタブによる常時投入という偶然の投入方式に依存していたためで、kimi / kiro / cursor / opencode でも同じ穴が開いている可能性がある（**未実測** — 他ハーネスの include 方式は本スキャンで確認していない）。codex 固有面への追記のみで閉じると同型が他ハーネスで再発する。あわせて、`stage-protocol.md` §13 が選挙に一切言及しない（`election|選挙` grep ヒット 0）ことは、engine 指令駆動ループの外に置かれた規範が実行されないという既知パターン（`cid:code-generation:code-generation:bolt-pr-taskization`）の再現である。

**5. テスト契約の構造的盲点（#1742）** — `t94:298-306` と `t95` の11箇所が**非宣言成果物 `intent.md` への発火を正の期待値として固定している**。すなわち現行のバグ挙動がテストでピンされており、修正は必然的にテスト契約の明示的改訂を伴う。実装者の単独判断で期待値を書き換えず、要件・設計段で改訂を宣言してから進める（`cid:requirements-analysis:implementation-deviation-election`）。逆に、`codekb/` 配下の宣言済み成果物が発火 0 である欠落側は既存テストで一切カバーされていない（過剰発火のみが検査対象になっている非対称）。

**6. fail-closed 側が正しく、指示側が誤っている（#1749）** — engine（`amadeus-state.ts:330-334`）とステージファイル（`approval-handoff.md:98` ほか）は正準名で一貫しており、誤っているのは governance protocol 1行のみ。既決ノルム `cid:approval-handoff:c2`（project.md:127）は2026-07-08 時点でこの不一致を認識し「ステージファイル準拠を優先する」と運用回避を宣言していた。**約3週間、正本の誤記を運用知識で迂回し続けていた**ことになる。運用回避をノルムに書いた時点で正本修正の Issue 化が起きていれば、生成面12ファイルへの投影を待たずに閉じられた。

### 検証順序の推奨

1. #1749（散文のみ、engine 挙動に触れない）— 先行着地して差し支えない。
2. #1734（scripts のみ、配布面に触れない）— 独立。ただし回帰テストは前状態の再構成を要する。
3. #1735（protocol 正本 → 全ハーネス投影）、#1742（hook 正本 → 全ハーネス投影）— どちらも `packages/framework/core/` を触り `dist:check` / `promote:self:check` の再生成を伴う。**ファイル単位では非交差**（protocol md と hook ts）だが、生成面の再生成が競合するため PR の着地順に注意する（`cid:code-generation:c6` の実 diff 再評価）。
4. #1750（mirror 層 + receipt スキーマの可能性）— 最も設計裁定が重い。receipt 表現の選択次第で影響面が変わる。

なお本 intent は `self-fix` スコープで走るため units-generation を SKIP する。自らの code-generation ステージが degrade 経路を通るが、本区間で着地した #1760（`e839b20ce`）が `{unit-name}` 解決を実装済みのため、前 intent で必要だった運用回避（`cid:code-generation:degrade-scope-unit-dir-layout`）は不要になっている可能性がある（**未検証** — 実行時に確認する）。

## SKILL/reviewer 2件の品質評価（260730-skill-reviewer-fixes、履歴、observed `278d61d8e`）

測定 ref: すべて observed `278d61d8e`。本 scan は静的解析であり、テスト・full suite は未実行。

### 根因確度と修正境界

| Issue | 根因確度 | 根拠 | 主対象 | 欠落テスト |
| --- | --- | --- | --- | --- |
| #1736 | **100%** | `grep -c 'case "next"' amadeus-utility.ts` = 0、`default:` = `:6182` の die。`--new-intent` 実装は orchestrate `:2405` / `:2412` に実在。単一箇所のツール名誤りで、経路設計は健全 | 正本 SKILL.md 5面 → dist 5面 → self-install 3面 = 13ファイル | **SKILL.md の指示ツール名を検査するテストが存在しない** |
| #1711 | **100%**（機序）／修正方式は未裁定 | degrade 分岐 `:3050-3057` が unit を設定せず、produces に `{unit-name}` が残り `amadeus-reviewer.ts:74` で throw。consumes には exempt（`:1771-1774`）があり produces には無い非対称を実測 | 候補 A = `amadeus-orchestrate.ts:3053-3057`、候補 B = `amadeus-reviewer-runtime.ts:224-246`。**方式の裁定は要件段に属する** | degrade スコープでの reviewer scope 成立を貫通検査するテストが存在しない |

### 品質上の主要所見

**Q-1: #1736 はテストが構造的に検出できない形状（S3 相当）**

`tests/integration/t176-new-work-offer-second-intent.test.ts` はこの経路の専用テストで、ヘッダ `:1` に `// covers: subcommand:amadeus-utility:intent-birth, file:skills/amadeus/SKILL.md`、`:12-13` に「on CONFIRM the prose routes through `next --new-intent`」と明記する。しかし実際の assert は `:143` の `reg.length === 2`（registry エントリ数）と `:157-166`（label 形状）であり、**conductor がどのツールバイナリへ `next` を打つかは一切検査していない**。SDK ドライバでライブに走るテストが存在するにもかかわらず欠陥が生存したのは、assert が「結果として2つの intent ができたか」だけを見て「指示どおりの経路を通ったか」を見ていないためである。修正時は指示ツール名を固定する検査を加えるべき（`cid:code-generation:corpus-sweep-for-new-guards` の両側実測を満たす形で）。

**Q-2: #1711 は現挙動が複数テストで verbatim にピンされている（修正方式の制約）**

`tests/unit/t186-foreach-per-unit-iteration.test.ts:351-361`（test 5）は `expect(d.unit).toBeUndefined()` と `{unit-name}` 入り produces を verbatim 期待し、テスト名自体が `"5: no compiled unit DAG degrades to the single {unit-name} placeholder, no unit field"` である。同型は `t186:490-503`（test 11）と `t116:380-403`（test 9/10/11）にもある。さらに degrade 分岐の直上コメント `amadeus-orchestrate.ts:3052` が `Zero behaviour change off this path.` と明示する。

すなわち **現挙動は「バグ」としてではなく「意図された忠実な発行形」として設計・文書化・テスト固定されている**。候補 A（engine 側解決）はこれらの設計意図とテスト契約の**明示的改訂**を伴うため、実装者が単独で判断せず要件段で裁定すべき事項である（`cid:code-generation:cg-invariant-conflict-explicit-revision` / `cid:requirements-analysis:implementation-deviation-election`）。

**Q-3: 運用回避がプロトコル違反を固定している(負債)**

現行の回避策（conductor が実 unit 名へ解決した directive JSON を reviewer へ渡す — project.md `cid:code-generation:degrade-scope-unit-dir-layout` 追補）は、`stage-planning` ではなく `stage-protocol.md:898` の「pass the **unchanged** current `run-stage` directive JSON on stdin」規定からの逸脱である。この回避は intent ごとに手作業で再演されており、負債として恒久化している。engine 側で解決すればこの逸脱は解消するが、Q-2 のテスト契約変更を伴う。

**Q-4: 非対称の再発クラスタ**

produces / consumes の実在検査扱いの分岐は、`cid:requirements-analysis:symmetric-pair-review`（対操作の対称性を明示観点にする）が対象とするクラスタに該当する。同 cid は「bootstrap 由来バグ14件の過半が片側だけ実装された非対称だった」という実測に基づく。本件は produces 側の exempt 欠落という同型であり、修正時は他の対（write⇔check、resolve⇔commit）にも同型の片側実装がないか棚卸しすべき（`cid:code-generation:same-root-inventory`）。

### 検証順序

1. #1736 を先に着地させてよい（散文のみ、engine 挙動に触れない）。ただし正本5面の編集後は `bun scripts/package.ts` + `bun run promote:self` を実行し、`bun run dist:check` / `bun run promote:self:check` の緑を確認する（7ハーネス全数再生成 — `cid:build-and-test:bt-dist-regen-seven-harnesses`）。
2. #1711 は要件段で修正方式（候補 A / B）を裁定してから実装する。方式によって変更するテストが変わるため、実装着手前に確定が必要。
3. 両 Bolt でファイル交差はないが、最終検証では `bash tests/run-tests.sh --ci` を横断で回す。

### 本 intent 自身への影響

本 intent は `self-fix` スコープ（units-generation = SKIP、scope-grid 実測）で走るため、**自らの code-generation ステージが #1711 の患部経路を通る**。レビュー段が exit 1 する場合は既知の運用回避を適用し、その適用自体を diary に記録する。

## Open bug 6件の品質評価（260729-open-bug-batch、履歴、observed `22ee27dbe`）

### 現行の品質基盤

テストは739ファイル（smoke 15 / unit 323 / integration 314 / e2e 85）で、`bun:test`、型検査、Biome、distribution drift、coverage project/patch gate を CI で組み合わせる。ドキュメントと配布同期の守りは厚い一方、child process の間欠失敗では stdout/stderr/member status の保持が一貫せず、固定 sleep・最終 filesystem scan・別 snapshot の比較が成功証拠を代用している。本 scan は静的解析であり、テストは実行していない。

### 欠陥確度と不足する回帰面

| Issue | 確定している欠陥 | 製品根因の確度 | 不足する回帰テスト | 完了判定 |
| --- | --- | --- | --- | --- |
| [#1667](https://github.com/amadeus-dlc/amadeus/issues/1667) | `spawnSync` 180秒に対し test case 120秒 | 95%。`rm` が直接原因かは未確定 | 並列負荷下で verifier を駆動し timeout envelope を観測 | 単独と通常並列帯の双方で verifier の実結果を得る |
| [#1664](https://github.com/amadeus-dlc/amadeus/issues/1664) | t224 assertion が既存 stdout/stderr を診断に含めない | 診断欠陥100%、製品根因20% | nonzero/timeout 時の stdout/stderr 保存 | 診断追加後に再現し、migrate/doctor/clone-id/audit の原因を確定して修正 |
| [#1663](https://github.com/amadeus-dlc/amadeus/issues/1663) | checkout worker の個別 status を親が保持しない | 観測性95%、欠損根因35% | 複数 worker の個別 status/log 集約 | 失敗 member と原因が最終エラーに残り、partial run がrollbackされる |
| [#1662](https://github.com/amadeus-dlc/amadeus/issues/1662) | committed diff と dirty LCOV の断面不一致 | 100% | line shift / dirty working tree の process-boundary test | mismatch を fail-closed で拒否し、clean snapshot は従来どおり判定 |
| [#1336](https://github.com/amadeus-dlc/amadeus/issues/1336) | 50ms後の PID 生存を readiness に代用 | 99% | 遅延初期化後に exit 9 する決定的 fixture | readiness 前終了を確実に失敗扱いし全 supervisor をcleanup |
| [#1607](https://github.com/amadeus-dlc/amadeus/issues/1607) | registry complete/audit seal後に completion boundary | 100% | multi-intent final report→sync/skip→close→cursor release の貫通 | mirror receipt、WORKFLOW_COMPLETED、registry/cursor が同一 completion instance で一度だけ着地 |

### Observed commit での根拠断面

| Issue | live code 根拠 |
| --- | --- |
| #1667 | `tests/integration/book-pack-verify.test.ts:23-36` は child timeout 180秒、test timeout 120秒。`tests/run-tests.ts:850-872` は parallel band を `Promise.race` / `Promise.all` で駆動 |
| #1664 | `tests/integration/t224-upstream-v2-migration-cli.test.ts:1188-1208` は `migrateWithTool` 後の status assertion に stdout/stderr message を付けない。`amadeus-migrate.ts:2901-2919` が doctor subprocess を起動 |
| #1663 | `team-up.sh:1382-1400` は background checkout 後に裸の `wait`、`:1411-1425` は registry + record 走査で incomplete を判定。`t295:270-279` は最終 stderr と missing member を検証 |
| #1662 | `tests/coverage-patch-gate.ts:234-264` は既存 LCOV を読み、別途 `git diff <base>...HEAD` を取得。`t229-coverage-patch-gate-check.test.ts:100-108` は clean `HEAD...HEAD` のみを process-boundary で固定 |
| #1336 | `team-up.sh:452-463` は supervisor 起動後50ms sleepし、PID/process matchだけを確認。`t-team-up-codex-resume.serial.test.ts:732-754` は即時 launch failure cleanup を固定するが遅延初期化失敗を持たない |
| #1607 | `amadeus-orchestrate.ts:4037-4143` は final report 内で `complete-workflow` を commitして `done` を返す。`amadeus-state.ts:2143-2201` は audit emit→state write→registry complete、`amadeus-audit.ts:401-411` は complete intentへのappendを封鎖、`amadeus-mirror-state-store.ts:383-410` はその封鎖を outbox failure として保持 |

### 技術的負債

- **成功条件の分散**: fixed sleep、PID liveness、registry+record scan、test timeout が個別に成功を定義している。各 Bolt は結果型または耐久 receipt に成功条件を集約する。
- **診断 envelope の不統一**: subprocess は stdout/stderr/status を持つが assertion・Shell worker・member ledger で欠落する。間欠失敗を直す前に観測情報を失わない。
- **completion transaction の跨ぎ**: state、registry、cursor、audit、mirror outbox の commit point が別々で、#1607 と OTel #1679 の最大リスクとなる。
- **coverage snapshot identity 未定義**: LCOV と diff に共通の commit/dirty identity がないため、patch coverage が緑でも反証不能である。
- **巨大ファイルの変更リスク**: `amadeus-orchestrate.ts`、`amadeus-state.ts`、`amadeus-lib.ts`、`team-up.sh` は高変更密度で、局所修正でも認知負荷が高い。新しい汎用抽象化より既存 seam と focused regression を優先する。

### 衝突と検証順序

1. #1607 を OTel #1679 の Construction 前に解決し、完了 transaction の正準を固定する。
2. #1664 の診断を先に着地させ、Journal v2 が t224 の失敗証拠を隠さないようにする。
3. #1336 → #1663 の順に `team-up.sh` を直列変更する。
4. #1662 と #1667 は独立 Bolt として並行可能だが、最後に `bun run typecheck`、`bun run lint`、対象 test、`bun run test:ci`、distribution drift を observed main 上で再確認する。
5. core 正本を触る Bolt は `bun scripts/package.ts` と `bun run promote:self` で生成面を同期し、`dist:check` / `promote:self:check` を通す。

## OTel/observability 面の品質評価（260729-otel-upstream、履歴、observed `22ee27dbe`）

### 現存判定

Focus 5 モジュールの品質水準は高く、#1672 の置換基点として信頼できる断面である（直読 + `grep` 実測、測定 ref: observed `22ee27dbe`）。

- **codec（`amadeus-journal.ts`）**: parse-don't-validate を徹底し、malformed 行は 1-based 行番号付き `JournalCodecError` で loud fail する（「journal shard は security-relevant なので silent skip しない」の設計コメントどおり）。serialize 側でも不変条件（正の整数 seq、raw 改行の禁止、raw/canonical の排他）を強制し、key 順固定で byte-identical な出力を保証する。
- **converter（`amadeus-journal-convert.ts`）**: byte-exact round-trip 自己検証の fail-closed 設計で、部分出力を残さない refusal 規約（ヘッダ欠落 / 末尾ゴミ / unmerged fork の AUDIT_FORKED）を持つ。変換の等価性証明を「バイト一致」に集約している点は簡潔で強い。
- **fail-open / fail-closed の非対称は意図的**: telemetry（seam / projector）は fail-open 端到端（buffer 書込失敗も OTLP POST 失敗もワークフローと exit code を止めない）で、journal は fail-closed のまま。設計裁定 Q12 の非対称が混線なく実装されている。
- **状態の二重表現が解消済み**: 前 intent 260728-slop-cleanup の修正（`ProcessObservation.registered` 削除、journal 配線コメント是正）が本 HEAD に着地していることを確認した。

### テスト層の現況

codec は unit PBT（`t352`、fast-check）、converter / seam / projector は integration（`t356` / `t357` / `t358`）、周辺に `t355`（audit merge seams）と `t315`（doctor observability section）。層は unit + integration で、e2e 面は持たない。`t357` が first-caller-wins / flush / idempotence の回帰境界として機能している（区間の `registered` 削除がこの契約を壊さなかったことの根拠）。

### 品質上の残課題（後続ステージへの引き継ぎ）

- **#1672 置換時の二系統化リスク**: audit writer には Markdown renderer `formatAuditRecord` が converter の lossless proof 専用に残存しており（`amadeus-audit.ts:323` コメント）、OTel EventRecord 化の際にこの残存面の扱い（converter ごと退役か、proof 経路の置換か）を裁定する必要がある。
- **巨大モジュールの継続的肥大**: 区間で `amadeus-orchestrate.ts` が 4257 行（+289）、`amadeus-lib.ts` が 7975 行（+153）、`amadeus-utility.ts` が 6186 行（+91）、`amadeus-mirror-executor.ts` が 1553 行に達した。lint の cognitive-complexity warning は既知ベースラインだが、#1672 の writer 置換は `amadeus-audit.ts`（1094 行）を直接触るため、変更面の局所化が品質リスクになる。
- **区間の主系統（mirror-project）は未評価**: 9 モジュール新設と executor / gateway / lifecycle の大再編（正本面 +4433 / -1559 の主系統）は本 intent の focus 外であり、本 scan はその品質評価を行っていない（別 intent の scan 対象とする）。

## 確定 Slop 5 パスの品質評価（260728-slop-cleanup、履歴、observed `ca8ff0af4`）

確定 finding は 5 パス・3 カテゴリで、いずれも外部挙動を変えない surgical cleanup で閉包できる。

| カテゴリ | 根拠 | 品質リスク | 最小検証 |
| --- | --- | --- | --- |
| 失効コメント | `amadeus-journal.ts:9-13` は「PR-3 まで import なし」と記すが、PR-3 `748e693e3` は着地済みで 5 canonical module が import | 保守者が現行 ownership / migration 状態を誤認 | import 集合確認、typecheck、dist/self-install drift check |
| 未使用状態 | `ProcessObservation.registered` は宣言と `true` 初期化のみ。判定は `_processObservation !== null` | 状態の二重表現が将来の分岐誤りを誘発 | `t357` の first-caller-wins / flush / idempotence、typecheck |
| 空白ノイズ | code-generation plan の trailing spaces 1 件、workspace-layout 日英の EOF blank line 2 件 | `git diff --check` の診断、レビュー noise | 5 target 限定 `git diff --check` |

`bun run typecheck` と `bun run lint` は scan 時点で exit 0。Biome は既存 295 warnings / 21 infos を報告するが、本 intent の 3 finding とは独立する。最新取得済み coverage 86.09% は observed HEAD での再計測値ではないため、現 HEAD の coverage としては扱わない。Markdown whitespace を全 repository で一括拒否する明示 CI gate は確認できず、今回は対象 5 パスへの限定検査を代替 sensor とする。巨大 tool files と既存 complexity は技術負債だが、本 intent では扱わない。

## 4 Issue 閉包後の plugin 品質断面と残存する構造リスク（260727-plugin-verb-skills、履歴、差分リフレッシュ、observed `afb93a825`）

260727-plugin-verb-skills 差分リフレッシュ（2026-07-28、observed `afb93a825`、base `0c4709102`（祖先 exit 0）、距離 **16**）。上流入力: Developer スキャン結果。Architect 段の独立再実測で**訂正 3 件**（行数 1469→**1488** / hook 23→**25** / record 除外 159→**161**）、その他の file:line は訂正 0 件（測定 ref: observed `afb93a825`）。

### 前区間の負債シグナル 6 件の解消状況（`f1d561904` = PR #1596 着地後）

前節（履歴: 260727-e2e-plugin-conformance）が列挙した 6 シグナルを現断面で再評価する。

| # | 前区間のシグナル | 現断面 | 根拠 |
| --- | --- | --- | --- |
| 1 | 検証面が全て正本パスで出荷面が未駆動 | **解消** | `t341` が出荷 `dist/claude` 面から使い捨てワークスペースを構築して駆動（ヘッダ `:10-11` 直読、`:31` は repo 自身の `plugins/` / `dist/` を書かないことも assert と明記） |
| 2 | recompile スタブで end-to-end 効果が未証明 | **解消** | `t341` は出荷 `settings.json.example` から読んだ hook コマンドを**実 spawn**し（`:12-14` verbatim「no hand-written command, no in-process call, no stubbed recompile」）、compose 後に stage が compiled stage graph に載ることを assert（`:15-17`）。recompile 自体も 2 段化（`spawnRecompile:253-263`） |
| 3 | `hashSurface` のファイルバイト限定で空ディレクトリ残渣が検出不能 | **解消** | 判定側が FS 実測へ移行（`amadeus-plugin.ts:422` の合議、`hasEmptyAncestorDir:443` が空の殻を検査）。`t341:24` が「byte + structure baseline」へ戻ることを assert |
| 4 | 0-plugin doctor 経路をどのテストも踏まない | **解消** | standalone / 統合の両 doctor が同一レンダラ `doctorPluginRows` を通る（`renderPluginCliResult:657`）。`t341:20-23` が `--project-root` なしで両 doctor を駆動（`:22-23` verbatim「the shipped default host root (#1591 ruling B) is the thing under test」） |
| 5 | `PACKAGE_HARNESSES` の同義集合三重化 | **解消（部分）** | `promote-self.ts:37` が canonical を import（同名 export の衝突は消滅）。ただしテスト側のハードコード列挙は別途残存しうるため、改名時の 2 キー棚卸し（cid:application-design:dual-key-consumer-inventory）は引き続き要る |
| 6 | e2e 層が既定 CI で一切実行されない | **解消（限定）** | 専用ジョブ `ci.yml:146` `plugin-conformance-e2e` が t341 のみを走らせ、集約ゲートの必須依存（`:678` / `:704`）。**`test:ci` プロファイル自体は不変**（設計コメント `:141-145` が明言）— e2e tier の**他のテストは依然として PR で走らない** |

**総括**: 4 Issue はいずれも「片側だけが canonical を通らない非対称」クラスであり、修正はすべて**非対称の解消**として着地した（定数の import 化・レンダラの一本化・判定の FS 実測化・検証面の出荷面駆動）。cid:requirements-analysis:symmetric-pair-review の適用例が 1 区間に 4 件揃った形である。

### 残存リスク 1: e2e の実行トリガーが「1 ファイル名の直指定」

`ci.yml:165` は `bun test tests/e2e/t341-plugin-conformance-journey.serial.test.ts` とファイルを名指しする。この形は t341 を確実に走らせる反面、**e2e tier へ新規ファイルを足しても自動では CI に載らない**。plugin 面に 2 本目の e2e を足す設計では、ジョブの実行対象をどう広げるか（glob 化 / `--release` プロファイル / ジョブ追加）が判断点になる。cid:build-and-test:test-path-set-completeness の「宣言した test path 集合の全数実行」を、CI ジョブ定義の側で担保する必要がある。

### 残存リスク 2: runner-gen が plugin stage を識別できない（#1598）

`isRunnableStage:88-90` は `phase !== "initialization"` の**単一条件**で、graph ノードに plugin 由来の語彙が無い（`amadeus-graph.ts:1675-1678` が `PluginStageFile` に `pluginName` を持たせない設計を宣言し、`path` もノードに残らない）。帰結として compose 済みホストでは `handleCheck:363` が MISSING を出して exit 1 になる。

**この欠陥は本 repo の CI では構造的に検出不能**である — `ls -d .claude/plugins` = No such file or directory であり、repo 自身は compose 済みホストでないため runner ドリフト検査は常に green を返す。cid:code-generation:corpus-sweep-for-new-guards が要求する「正当な既存データで赤くならないこと」の対称面（**顕在化する状態が corpus に存在しない**）であり、修正時は compose 済みホストを模した fixture を用意しない限り「落ちる実証」ができない。加えて `t129` の硬い数値（`:206` `toBe(29)` / `:208` `toBe(3)` / `:221` `"(29 runners)"`）は plugin stage 1 本で崩れるため、count-free 契約へ寄せるか plugin 除外を明示するかの判断が要る（cid:code-generation:count-comment-sync-on-catalog-change の同族）。

### 残存リスク 3: 統合 CLI の usage 二重定義

`amadeus-utility.ts` の動詞一覧は `switch` の case 群（`:5945` 以降）・default `die` の usage 文字列（`:6033`）・`HELP_TEXT_TAIL`（`:216`、`t67` が pin）の **3 面に手書きで存在**する。現断面ですでに不一致がある — `die` 文字列は `case "init"`（`:6001`）と `case "state-init"`（`:6004`）を列挙しない。動詞を足す設計（`plugin` 委譲など）では 3 面同期が要り、canonical 1 定義から導出する構造（construction.md § Code Completeness）へ寄せる余地がある。

### 残存リスク 4: スキル正本の陳腐化した面列挙

`core/skills/amadeus-mirror/SKILL.md:14-16` はハーネスディレクトリを `.claude` / `.codex` / `.cursor` / `.kiro` / `.opencode` の **5 面で列挙**するが、当のスキルは **7 面へ投影**されている（`.kiro-ide` / `.kimi-code` を欠く）。この列挙は投影行列から導出されず手書きであり、ドリフトガードの対象外。新スキルの雛形として `amadeus-mirror/SKILL.md` を使う場合、この陳腐化パターンを複製しないよう面列挙を count-free / 導出可能な表現にするのが望ましい。

### テスト層の現況（実測）

`git ls-files tests/e2e/ | grep -c plugin` = **1**（前区間 0）。区間で `tests/integration` **9** / `tests/unit` **4** ファイルが変更された。t341 は `size: medium`（ヘッダ `:3`）で、実 FS・実 spawn を使うため integration 相当以上の層に正しく置かれている（cid:code-generation:fs-tests-integration-first）。決定性は「ネットワーク無し・env ゲート無し・LLM 無し」で担保され（ヘッダ `:26-27`）、前区間の既習様式 2 系統のうち **live gate 不要な側**（`setup-install.test.ts` 系）に載った。

## plugin テスト層の盲点と 4 Issue の品質評価（260727-e2e-plugin-conformance、履歴 2026-07-27、差分リフレッシュ、observed `0c4709102`。負債シグナル 6 件はいずれも当時断面 — 現況は上の同 intent 節を参照）

260727-e2e-plugin-conformance 差分リフレッシュ（2026-07-27、observed `0c4709102`、base `1673c433`（祖先 exit 0）、距離 **60**）。上流入力: Developer スキャン結果 `inception/reverse-engineering/scan-notes.md`。Architect 段の独立再実測で **訂正 0 件**（件数・file:line はすべてコマンド出力または実ファイル直読からの転記、測定 ref: observed `0c4709102`）。

### plugin テストの層構成（実測）

`git ls-files tests/ | grep -c plugin` = **24**。層別: unit **8**（`t252` 合成エンジン純関数 / `t300` `parsePluginCliArgs` / `t301` CLI 純 seam / `t306` `PLUGIN_HOST_CLASS` × 7 面 / `t313` `buildDoctorPluginSection` / `t314` `doctorPluginRows` / `t-plugin-projection` / `plugin-discovery-overhead-gate`）、integration **17**（`t253` / `t254` / `t299` / `t302` / `t303` / `t308` / `t310` / `t311` / `t315` / `t321` / `t322` / `t338` / `t-formal-verif-plugin-lifecycle` / `t-formal-verif-plugin-stage-discovery` / `t-plugin-projection-packaging` / `t-plugin-stage-discovery-performance` / `t327`）、**e2e 0**（`ls tests/e2e/ | wc -l` = **83**、うち `*.serial.test.ts` = **35**。`git ls-files tests/e2e/ | grep -c plugin` = **0**）。

### 負債シグナル 1: 検証面が全て「正本パス」で、出荷面が一度も駆動されていない

plugin テストは全て `packages/framework/core/tools/` の正本を import / spawn しており、`dist/<harness>/<dir>/tools/amadeus-plugin.ts`（出荷コピー）を読む・起動するテストは **0 件**。`grep -rn "amadeus-plugin.ts" tests/ | grep -i "spawn\|join("` の唯一のヒットは `t299:206` の `join(REPO_ROOT, "packages", "framework", "core", "tools", "amadeus-plugin.ts")` = 正本パス。cid:code-generation:injection-surface-verify（注入・検証はテストが実際に読む面へ）の観点で、**plugin CLI の出荷コピーは未検証**。

### 負債シグナル 2: recompile スタブ — end-to-end 効果が実ホストで未証明

`t299`（walking skeleton、size: medium）はヘッダ `:1-13` verbatim で「driven IN-PROCESS through handlePluginCli(argv, deps) with an injected dependency bag (**recompile stubbed**, engine real)」と自認し、スタブ本体は `:75-78`（`recompile: () => { recompileCount += 1; return true; }`）。唯一の実 spawn（`:205-218`、BR-U2-6）も設計コメント `:198-204` verbatim が「the post-apply recompile spawns amadeus-runtime.ts compile against a **synthetic host, which has no runtime graph**, so the process exits non-zero after committing — the record write is the proof」と述べており、**compose 後に runtime graph が実再生成され plugin stage が graph に載る**という end-to-end 効果は実ホストで未検証。`t338` も recompile カウンタ方式。

### 負債シグナル 3: `hashSurface` のファイルバイト限定 — #1586 が構造的に検出不能

`t299:166-176`（「drop restores the 0-plugin baseline (BR-U2-8)」）は `:171` `expect(existsSync(join(host, OWNED_STAGE))).toBe(false);` と `:173` `expect(hashSurface(host)).toBe(baseline);` で baseline 復元を主張するが、`hashSurface`（`:88-101`）は `:94-97` verbatim `if (statSync(abs).isDirectory()) walk(abs); else { h.update(abs.slice(root.length)); h.update(readFileSync(abs)); }` の通り **ファイルのバイトのみ**をハッシュする。空ディレクトリは走査しても何も update しないため、残渣の有無でハッシュが変わらない — **構造的に検出不能**。`t254:286-288` はファイル 1 点の `existsSync` のみ。`t311`（全 37 行）は `scripts/plugin-projection.ts` のパッケージャ側 0-plugin baseline（`dist/plugins/` 生成）を見るテストで、ホストへの compose/drop は射程外。`t254:357-369`（Part D）は repo ツリーへの汚染を見るもので temp ホスト残渣は見ない。**`baselineRestored` の判定基準（record）とテストの判定基準（ファイルのみ）が両方ともディレクトリを見ない二重の盲点。**

### 負債シグナル 4: #1585 の 0-plugin 経路をどのテストも踏まない

`t314:36-38` は純関数 `doctorPluginRows` に対して 0 件行を assert し **standalone レンダラを通らない**。`t315:113` / `:204` も統合面・純関数面のみ。`t299:233-238` の doctor テストは **1 plugin composed 済み**の状態で `${PLUGIN} [ok]` を assert するだけで 0-plugin ケースを踏まない。

### 負債シグナル 5: #1575 の衝突を見るガードが無く、同義集合が三重化している

`tests/integration/t-plugin-projection-packaging.test.ts:44` は verbatim `import { PACKAGE_HARNESSES as SELF_INSTALL_FACES } from "../../scripts/promote-self.ts";` と **別名 import で衝突を回避**し、同ファイル `:48` は 7 値を **ハードコード再定義**する（`const PACKAGE_HARNESSES_7 = [...]` = 3 つ目の同義集合）。`:160-163` は 5 値であることと 7 値集合への包含を assert するのみで、**同名 export の衝突自体を検出するガードは存在しない**。参考: `scripts/promote-self.ts:47-54` の `managedDirs` も同じ 5 面を独立に列挙（4 つ目の同義列挙）。改名時の同期対象は展開後リテラルの 2 箇所 — `tests/unit/t209-promote-self-dangling-symlink.test.ts:152` と `t-plugin-projection-packaging.test.ts:161`（cid:application-design:dual-key-consumer-inventory の 2 キー棚卸しによる、`grep -rn "PACKAGE_HARNESSES\|SELF_INSTALL_HARNESSES" scripts/ tests/ packages/ docs/` 出力からの転記）。

### 負債シグナル 6: e2e 層は既定 CI で一切実行されない

`tests/run-tests.ts:125` `--ci  smoke + unit + integration` / `:126` `--release  smoke + unit + integration + e2e`、`:197-200` の `case "--ci":` は `runE2e` を立てない。CI 側は `.github/workflows/ci.yml:163` verbatim `run: bun run test:ci -- -P 4`（`package.json:19` `"test:ci": "bun tests/run-tests.ts --ci"`）であり、`grep -n "run-tests\|--release\|--e2e" .github/workflows/*.yml` のヒットは `:163` のみ。**tests/e2e/ に置くだけではリグレッションガードにならない** — #1589 の要件では実行トリガー（`--release` ジョブの新設 / 専用 workflow / スケジュール）自体を決める必要がある。

### 既習様式（#1589 実装時の準拠先、実測）

`tests/e2e/` には live gate の有無で 2 系統の既習様式がある。

1. **出荷 dist ツリーを tmp へコピーして駆動（live gate 付き）**: `t-print-kimi-doctor.serial.test.ts:1-37` ヘッダ verbatim「drive `/skill:amadeus --doctor` through the Kimi Code CLI's headless surface (`kimi -p`) against the **SHIPPED dist/kimi tree**」/「HERMETICITY (BR-2): the project is a tmp copy of dist/kimi and KIMI_CODE_HOME points at a tmp home」/「LIVE GATE: requires AMADEUS_KIMI_PRINT_LIVE=1 + a kimi binary … SPENDS Kimi credits … Skips cleanly otherwise」。**出荷面駆動の様式は既に存在する**が、既定 skip でクレジットを消費する。
2. **実バイナリ spawn + オフライン既定**: `setup-install.test.ts:1-19` ヘッダ verbatim「spawns the *real built* amadeus-setup binary as its own child process against a real temp target directory, using a real dist/claude archive fixture. The network boundary is faked by rewriting fetch() calls at process start … offline by default」。#1589 の「出荷 dist 導入 → CLI 駆動」は、ハーネス CLI を起動せず `bun <tmp>/.claude/tools/amadeus-plugin.ts ...` を spawn する形で **この live gate 不要の様式に載せうる**（要件段の設計選択肢）。

命名規約: `.serial.` を名前に含むファイルを runner が直列扱いにする（`tests/run-tests.ts:888` verbatim `const serial = pinnedSerial || basename(file).includes(".serial.");`）。

### 品質上の総括

4 Issue のうち #1575 / #1585 / #1586 は **いずれも「既存の正しい実装が隣にあるのに、片側だけがそれを通らない」非対称クラス**（canonical 定数を使わない / canonical レンダラを通らない / 対操作が対称でない）であり、cid:requirements-analysis:symmetric-pair-review をレビュー観点に含めていれば設計段で捕捉できた形状。#1589 はその 3 件を **どのテスト層も検出できなかった構造的理由**そのものであり、修正の順序としては #1589 の検証面設計が他 3 件の閉包実証（cid:code-generation:c1-narrow-fix-post-apply-remeasure）を支える関係にある。

## plugin installDoc/discovery 非対称の品質評価（260727-install-doc-mismatch、履歴 2026-07-27、差分リフレッシュ、Issue #1569）

260727-install-doc-mismatch 差分リフレッシュ（2026-07-27、observed `46a75f2e7`、base `0d83aa48b`、距離 70）。上流入力: Developer スキャン結果。#1569 の欠陥は前 intent `260726-plugin-host-delivery` の U3 host-projection-all（`250265adb`）で導入された、以下の負債シグナルを持つ。

1. **installDoc 文言と discovery 定数の非対称（#1569 真因、S 未確定・後続でトリアージ）**: install bundle が案内するコピー先（`plugin-projection.ts:593` の `<harnessDir>/plugins/<name>/`）と、CLI discovery が実走査する staging root（`amadeus-plugin.ts:278` の `.amadeus-plugin-src`）が別モジュールで独立管理され、一致を強制する機構がない（`plugin-projection.ts` の `.amadeus-plugin-src` grep = **0 hit**、実測）。**対操作の非対称クラス**（cid:requirements-analysis:symmetric-pair-review）— 「doc が案内する先」と「code が走査する先」という書き手・読み手の対が片側だけ実装された。共有定数化（discovery 定数を installDoc から参照）で構造的一致強制が望ましい。

2. **docs prose の二重管理**: `docs/guide/19-plugins.md:183`（EN）と `19-plugins.ja.md:175`（JA 対訳）が installDoc の内容を**手書き複製**しており、`dist:check` / `promote:self:check` のドリフトガード対象外。installDoc を直したのに docs を直し忘れる（またはその逆）ドリフト経路が構造的に残る。canonical な1定義からの導出が入っていない箇所（construction.md「複数箇所で消費される定数を手書き複製しない」に抵触するクラス）。

3. **回帰テストの空白**: 「doc の指示先 == CLI の走査先」という不変量が未固定。t307（`tests/integration/t307-install-artifacts-classes.integration.test.ts`）は installDoc の body flavour（`plugins/${FIXTURE}/plugin.json` を含むか、`:53`/`:60`）のみアサートし、**コピー先パス（`.codex/plugins/...` 等）を非アサート**。discovery 側は t299/t302/t328/t338 が `.amadeus-plugin-src` 配置で実証している（正解パスの一次証拠）が、doc 側との整合を突き合わせるテストがない。回帰テストは「installDoc の案内先 == `pluginSourceRootOf` の返す相対パス」を固定するのが自然（cid:requirements-analysis:symmetric-pair-review の充足）。

4. **修正後の未使用引数リスク**: `installDoc` 内 `:593` で `harnessDir` を copy 先の組み立てに使っているため、文言を `.amadeus-plugin-src/<name>/` へ寄せる際に `:593` での `harnessDir` 参照が減る。ただし `manualComposeCommand:557-559` が `harnessDir` を使い続けるため関数全体では未使用化しない見込み — 実装時に lint（Biome）で要実測。

**機械ガードの現状（良い面）**: installDoc のバイトは `package.ts:787-796` `pluginBundleExpected` が installDoc から再導出し、`:832` `checkPluginProjections` がバイト比較するため、**installDoc 修正後は dist 6 面 INSTALL.md の stale を `dist:check` が必ず検出する**。落ちる実証は「installDoc を直す → dist 未再生成 → dist:check 赤」で成立する（cid:code-generation:injection-surface-verify — テストが読む面 = dist）。ただし docs prose はこのガードの外にあるため、docs 側の落ちる実証は別途 grep ベースの検査が要る。

測定 ref: observed `46a75f2e7`（cid:reverse-engineering:measurement-ref-in-artifacts）。

## docs／実装乖離の品質評価 — 3 クラスタと非欠陥判定（260727-docs-impl-sync、履歴、amadeus-document）

測定 ref: observed `aabc0527d`、base `1673c4332`（祖先 exit 0 / 距離 **47**）。全数値は `grep -ci` / `grep -c` / `grep -o … | wc -l` / `ls … | wc -l` / `find … | wc -l` / `git diff --name-only … | grep -c` 出力からの転記（cid:requirements-analysis:numbers-from-command-output-only）。

### クラスタ A — README のハーネス数（重大度: 高。最初に読まれる面）

| 所在 | 現記述 | 実態 |
| --- | --- | --- |
| `README.md:5` | "running natively inside **six** coding-agent harnesses" | 7 |
| `README.md:67` | "extending the four shipped upstream to **six**" | 7 |
| `README.md:78-83` | ハーネス表 **6 行**（Kimi 行なし） | 7 ハーネス |
| `README.ja.md:5` | 「**6つ**のコーディングエージェントハーネス」 | 7 |
| `README.ja.md:78-83` | 同表 6 行 | 7 ハーネス |

`grep -ci kimi README.md` = **0**、`grep -ci kimi README.ja.md` = **0**。実態は `ls -d packages/framework/harness/*/ | wc -l` = **7**。**区間内で発生した陳腐化**である — `git diff --name-only 1673c4332..HEAD -- README.md README.ja.md` = **0 行**であり、Kimi 追加 PR #1522 が README を同一変更で更新しなかった。project.md § Mandated の「ALWAYS update the framework source, all harness distributions, self-install surfaces, tests, and paired English/Japanese documentation in the same change」に対する**実測された違反**。対照として `docs/guide/harnesses/README.{md,ja.md}` は同区間で更新され Kimi 行を持つ（同一 PR 内でも面によって同期が及ぶ／及ばないムラがある）。

### クラスタ B — plugin 投影面数（重大度: 高。数値が契約の説明そのもの）

`docs/guide/19-plugins.md` は plugin 章でありながら投影行列を旧値で説明する: `:14-15`「the **six** packaged harness faces differ from the **four** self-install faces」/ `:70`「projects every plugin into the **six** packaged」/ `:131`「projects into all **six**」/ `:148` 見出し "Six packaged faces, four self-install faces" / `:150-156`（**六面の明示列挙に kimi なし**、かつ「the four is never widened to six」という規範文まで旧値で書かれている）。`docs/guide/19-plugins.ja.md` も「6 つのパッケージ面、4 つのセルフインストール面」で同型。両ファイル `grep -ci kimi` = **0**。

実態は `scripts/plugin-projection.ts:41-49` = **7** / `:55` = **5**。base 断面（`git show 1673c4332:scripts/plugin-projection.ts` の `:46-53` / `:59`）は 6 / 4 で、**遷移は本区間内**、docs は未追随（`git diff --name-only … -- docs/guide/19-plugins.md docs/guide/19-plugins.ja.md` = 0 行）。本クラスタは単なる数値ずれでなく**列挙の欠落**（kimi が面リストから抜けている）を含むため、読者が「kimi にはプラグインが投影されない」と誤読しうる — クラスタ A より読者への実害が大きい可能性がある。

### クラスタ C — EN/JA 対訳の非同期（重大度: 中。JA 読者のみが旧情報を得る）

12 番目の hook（`core/hooks/amadeus-plugin-compose.ts`）着地に伴い EN 側 **8 ファイル**が更新された一方、**JA 対訳は 1 件も更新されていない**。EN 専用変更 8 件 = `docs/amadeus-files.md` / `docs/guide/01-getting-started.md` / `docs/guide/12-cli-commands.md` / `docs/guide/15-troubleshooting.md` / `docs/guide/glossary.md` / `docs/reference/01-architecture.md` / `docs/reference/06-hooks-and-tools.md` / `docs/reference/11-contributing.md`。

JA 側の残存旧数値（実測）:

| 所在 | 残存記述 | 出現数 |
| --- | --- | --- |
| `docs/reference/06-hooks-and-tools.ja.md:5` / `:13`(×3) / `:15` / `:50` / `:496` | 「11個」 | **7 出現 / 5 行** |
| `docs/guide/15-troubleshooting.ja.md:39` | 「11 個すべての TypeScript フック」+ **11 個の列挙**（`amadeus-plugin-compose.ts` 欠落） | 1 |
| `docs/guide/glossary.ja.md:45` | 「11 個のフックを使い」 | 1 |
| `docs/reference/01-architecture.ja.md:476` | 「11個のフック」 | 1 |

`grep -c 'plugin-compose' docs/reference/06-hooks-and-tools.ja.md` = **0**（EN は **2**）。JA の hook roster（列挙）にも新 hook が現れないため、JA 読者は「12 番目の hook の存在自体」を知る手段を持たない。

### 未裁定仮説 — EN 側是正方針の不整合（欠陥断定しない）

EN 側 8 ファイルのうち 6 ファイルは件数語を除去する **count-free 化**（cid:code-generation:count-comment-sync-on-catalog-change が推奨する形）で是正されたが、`docs/reference/06-hooks-and-tools.md` は逆に**硬数値を採用**している: `:5`「all **twelve** hook scripts」/ `:13`「uses **twelve** hook scripts … All **twelve** are TypeScript … All **twelve** are project-wide … the other **eleven** via the `hooks` block」/ `:15`「**Eleven** of the **twelve** are non-blocking」/ `:52`「All **twelve** TypeScript hooks」。どちらを正準様式とするかは**判断事項**であり、本 RE では欠陥と断定しない（13 番目の hook が着地すれば同じ手動同期負債が再発する構造である、という事実のみ記録する）。

### 非欠陥判定（スコープ膨張防止のため明示記録）

- **(D) `docs/reference/06-hooks-and-tools.md` に CLI ツール目録 46 件の全数記載がないことは欠陥ではない。** 当該章は hook システムのアーキテクチャ・監査イベント分類・ツール設定を扱う章であり、全ツールの網羅目録は章スコープ外である。「不在」を欠陥として起票すると章の責務境界を壊す。
- **(E-1) 「11 domain-expert agents」を主張する docs 20 ファイルは正である。** `ls packages/framework/core/agents/*.md | wc -l` = **14** は 11 domain-expert + reviewer 2（architecture-reviewer / product-lead）+ composer 1 の内訳であり、domain-expert に限れば 11 で一致する。
- **(E-2) ただし `docs/reference/01-architecture.md:60`「**Eleven** flat agent files」と `.ja.md:60`「**11個**のフラットなエージェントファイル」は誤り**（flat agent files = 14）。これは**区間外の pre-existing** 乖離であり、本 intent のスコープに含めるかは requirements-analysis で裁定する（含めない場合は Issue 化して追跡する）。

### 品質機序の総括

3 クラスタの共通機序は「**実装側に単一の機械可読な正準定義があるのに、docs 側でそれを手書き数値・手書き列挙として複製している**」ことである（真実源: `packages/framework/harness/*/`、`PACKAGE_HARNESSES` / `SELF_INSTALL_HARNESSES`、`core/hooks/*.ts`）。construction.md § Code Completeness の「canonical な1定義から導出するか、ディスクから discover する」がコード面のみに適用され、docs 面へ及んでいない。加えて **docs 面には dist:check / promote:self:check に相当するドリフトガードが存在しない**ため、乖離は CI で検出されず、本 intent のような棚卸しでしか顕在化しない（cid:code-generation:count-comment-sync-on-catalog-change が「可能なら件数語自体を除去（count-free）」を第一手として推奨するのはこの理由による）。是正方式（都度同期／count-free 化／生成・ドリフトガード導入）の選択は requirements-analysis 以降で裁定する。

## manual ask→answer 往復のテスト gap と guard 非対称の品質評価（260726-answer-manual-binding、履歴、Issue #1548）

測定 ref: observed `ad1ff5de9`（base `09c669901`、距離 2）。file:line は同 commit の実ファイル直読。上流入力は Developer コードスキャン結果 `re3-dev-scan-result.md`（Architect 段で核心 file:line を spot-check 再検証、訂正 0 件）。**区間 2 コミットは record-only で mirror スタックの source/test 変更ゼロ** — 欠陥は区間の退行でなく guard 導入コミット `2bb63f6b8` から現存。

### 現存判定

| Issue | 現存判定 | 主患部 |
| --- | --- | --- |
| [#1548](https://github.com/amadeus-dlc/amadeus/issues/1548) | **現存**（区間内で無変更） | `runMirrorLifecycleAnswer`（`amadeus-mirror-lifecycle.ts:969-985`）が answer 転送時に `manualOperation`/`invocationId` を渡さず、guard（`:257-265`）が manual ask への answer を常に error 終了させる。manual create（非終端 receipt）＋後続 prompt boundary の reconciliation で発生 |

### 品質欠陥のクラス

**(1) 対操作の非対称（cid:requirements-analysis:symmetric-pair-review）— 主欠陥** — guard（`:257-265`）が要求する `manualOperation`/`invocationId` を、answer 生成側（`runMirrorLifecycleAnswer:969-985`）が転送しない write⇔check 非対称。answer は永続 `expected` を全て持っている（types `MirrorExpectedPrompt:118-124`）にもかかわらず、boundary だけ転送し guard が要求する 2 フィールドを落とすため、字義どおり guard に弾かれる。

**(2) guard の過剰適用（防御範囲の設計ミス）** — guard は本来 **manual decision 実行経路**（`invocationId` 消費 = `:304-308`、`manualOperation` 消費 = `:573-577`、いずれも非 answer 経路）を守るためのものだが、`request.answer` の有無を条件に含めないため answer 経路まで巻き込む。answer 経路の権限は `prompt-approved` 分岐（`:292-303`）が発行し両フィールドを参照しないため、guard の適用は防御目的に対して過剰。

**(3) テスト gap（確定）— manual ask→answer 往復の不在** — t282（998 行）の構造:
- answer 往復テスト（`:579` "answer approve binds to the persisted prompt"）は全て `intent-capture-approved` boundary の ask。
- manual テスト（`:832` "manual create and sync use durable invocation identities"）は `runMirrorLifecycleBoundary({…, boundary:{kind:"manual"}, manualOperation, invocationId})` を**直接**呼び、ask→answer 往復を経ない。
- guard の既存 negative テスト（`:435` "rejects incomplete manual lifecycle requests"）は manual+欠落で error を確認 = **バグの guard が正しく発火する側だけを固定**している。

→ **manual boundary が ask を生成 → その ask を answer で貫通する往復テストが存在しない**。この gap が欠陥を CI 緑のまま生存させた。

**(4) stale expectedPrompt が全 sync を封鎖する連鎖（影響度）** — consume は answer 経由のみで repair verbs は expectedPrompt 非対象（ツール内回復不能）。未 consume のまま次 boundary が prompt 化すると `reduceSetExpectedPrompt` が `a different unconsumed prompt is pending` を返し coordinator が `safety-blocked` で以後の create/sync/close prompt を全滅させる。ただし committed record の `amadeus-state.md` 5 件はすべて `"expectedPrompt":null`（`bindingId` 付き非 null 0 件）で、**修正後の遡及回復手順は不要**。

### 修正時の品質リスク

- **落ちる実証の設計**: regression-first は「先行 manual create（非終端 receipt）＋後続 prompt boundary で manual ask を生成 → answer で貫通」の往復テストを新設する。既存 answer テスト（`intent-capture-approved`）や manual 直接呼びテストの緑では欠陥に貫通しない（cid:requirements-analysis:fix-review-replays-origin-repro — 起票時再現手順の verbatim 再適用）。manual ask の再現シードは reconciliation 経由（`decideMirrorAction` は manual 単独では ask にならない）。
- **修正案の選択**: (a) guard に `&& !request.answer`（最小変更、answer が両フィールド不使用の事実に依拠）vs (b) answer 側で永続値から補填（guard 不変、`invocationId = boundary.instance` / `manualOperation = operation`）。両案とも到達可能で機能等価。
- **配布同期**: `amadeus-mirror-lifecycle.ts` は **13 コピー**（canonical 1 + self-install 5 + dist 7）。正本編集 → `bun scripts/package.ts`＋`bun run promote:self`、`dist:check`/`promote:self:check` で drift 検証（project.md Mandated）。coordinator/types を触る案なら同様に各 13 コピー同期対象。

## 絶対 p95 予算の CI ジッタ偽赤の品質評価（260726-t258-p95-flake、履歴、Issue #1511）

測定 ref: observed `09c669901`（base `f9a0fb86a`、距離 2）。file:line は同 commit の実ファイル直読。上流入力は Developer コードスキャン結果 `re2-dev-scan-result.md`（Architect 段で核心 file:line を spot-check 再検証、訂正 0 件）。**区間 32 ファイルはすべて `amadeus/` record で source/test 変更ゼロ** — 欠陥は区間の退行でなく `2e157d7fe`（#1424）から現存。

### 現存判定

| Issue | P/S | 現存判定 | 主患部 |
| --- | --- | --- | --- |
| [#1511](https://github.com/amadeus-dlc/amadeus/issues/1511) | P2 / S3-MAJOR | **現存**（区間内で無変更） | `t258:461-462` の絶対 latency ceiling 500/750ms を CI `-P 4` 並列負荷のスパイクが 6/100 超で跨ぐ偽赤。RSS `:463` は noop 差分ベースで該当外 |
| same-root（未報告） | — | **現存**（同根） | `t257:240-241`（`strictReadP95Ms<=100` / `migrationP95Ms<=250`）が同じ #1424 由来・同じ 10,000-entry child benchmark の絶対 p95 契約 |

### 品質欠陥のクラス

**(1) 絶対 ceiling による負荷依存の偽赤（主欠陥）** — `t258:461-462` は実測 p95（`archiveP95Ms` / `recoveryP95Ms`）を固定値 500/750 と直接比較する。被測定は child helper（`spawnSync` 1 プロセス、size=10000）の 10,000 行 registry/audit の**実 FS transaction**で FS I/O 律速。`p95()`（`:430-433`）は nearest-rank（`sorted[94]`）で上位 5 サンプル超過を許容するが、`bun run test:ci -- -P 4`（`.github/workflows/ci.yml:162` name / `:163` run）の**並列度 4 integration tier**（専用 perf ジョブ・リトライ・負荷分離なし）での IO/CPU 競合が 6/100 超のサンプルを 500ms 超へ押し上げると偽赤になる（cid:code-generation:fanout-load-settle-before-integration / cid:code-generation:rerun-red-reattribution クラス、ラベル bug/P2/S3-MAJOR）。

**(2) 裸マジックナンバー予算（rationale 不在）** — 500/750/96 は `2e157d7fe`（#1424、t258 追加と同一コミット）で導入されたユーザー選択 round number（intent `260723-archived-status-guard` の nfr-requirements で Options「500ms/750ms, 1s/2s, N/A, Other」から A 案選択）。**CI 実測 p95 = archive 41.177ms / recovery 29.314ms**（同 intent code-summary）で予算の約 12〜25 倍ヘッドルームがあるが、`:461-463` に導出 rationale コメントはなく、noise floor / CI ジッタ実測から導出されていない。ヘッドルームが広くても**絶対 ceiling ゆえ個別サンプルが容易に跨ぐ**構造が残る。

**(3) タイミングシーム不在で決定化できない** — 予算はハードコード数値（named constant でも env でもない）で、child 内 elapsed も `performance.now()` 実測のみ。project.md `cid:build-and-test:bt-timeout-verification-shape` / `cid:build-and-test:wtfbt-c3`（タイミングシームでの決定的検証優先）が適用候補だが、latency は「10,000-entry O(n) を実時間で測る」構造で round 数のような離散量に置換しにくく、**baseline 相対（noop 比）+ noise floor 化**が同型先例に整合する方向。

**(4) same-root 棚卸し漏れの潜在（t257）** — `t257:240-241` が #1511 と同一欠陥形状（絶対 p95 vs CI ジッタ、同じ #1424 由来）で未報告。cid:code-generation:same-root-inventory により修正時は t258 と同一 PR で修正するか Issue 化して同根全数を閉じる必要がある。`t259:209/211` は既に baseline 相対（差分ベース）の安全形で修正参照実装。

### 修正時の品質リスク

- **同型先例が確立済み**: `tests/lib/plugin-discovery-overhead-gate.ts`（#1525）= 「相対比 `>0.2` **AND** 絶対 noise floor `>10ms`」+ 判定述語の計測ループ分離 + fail-closed（`!(baseline>0) || !Number.isFinite(treatment)` → true）、`scripts/mirror-distribution-benchmark-aggregate.ts`（#1507）= median 基準 + 絶対 spread noise floor（予算の 5%）。t258 は RSS 用に **noop baseline を既に測っており**（`:444-447`）archive/recovery も noop 相対へ転用できる素材が既存。
- **落ちる実証の設計**: 予算緩和のみだと欠陥（絶対 ceiling クラス）が残り再発する。regression-first は「CI ジッタ相当のスパイクを注入しても median/baseline 述語が緑を保ち、真の退行では赤」の複合述語テスト。判定述語を計測ループから分離して in-process 駆動する（cid:code-generation:injection-surface-verify — 注入面 = テストが読む面、cid:code-generation:corpus-sweep-for-new-guards — 両側実測）。
- **予算緩和の誘惑**: 500→1000 等の単純緩和は「絶対 ceiling ゆえ負荷次第で跨ぐ」構造を温存し、フレークを先送りするだけ（先例が否定した方向）。
- **配布同期**: 修正対象はテスト（`tests/`）と CI 設定であり mirror スタックのような dist/self-install 増幅面は無い見込み。ただし専用 perf ジョブ分離を採るなら `.github/workflows/ci.yml` を触るため既存 job との整合を確認。

## mirror 状態表現分裂の品質評価（260726-mirror-state-split、履歴、Issue #1547 + #1534）

測定 ref: observed `f9a0fb86a`（base `1673c4332`、距離 38）。file:line は同 commit の実ファイル直読。上流入力は Developer スキャン結果 `inception/reverse-engineering/scan-notes.md`（Architect 段で独立再検証、訂正 2 件 = §6 repair relink 行番号 / §1 orchestrate.ts 区間変更の精密化）。

### 現存判定

| Issue | P/S | 現存判定 | 主患部 |
| --- | --- | --- | --- |
| [#1547](https://github.com/amadeus-dlc/amadeus/issues/1547) | — | **現存**（区間内で無変更） | write=v1 ブロック（`amadeus-mirror-state-store.ts:158`）⇔ read=legacy field（`amadeus-mirror.ts:169` + `amadeus-orchestrate.ts:314` / `:3522`）の非対称。create 後も status が `mirror-missing` |
| [#1534](https://github.com/amadeus-dlc/amadeus/issues/1534) | — | **現存**（区間内で無変更） | marker 無き legacy Issue の in-tool 復旧経路ゼロ（`amadeus-mirror-lifecycle.ts:785` fail-closed / `amadeus-mirror-provenance.ts:165` `missing-marker`）。legacy 10 record が取り残し |

### 品質欠陥のクラス

**(1) 対操作の非対称（主欠陥、symmetric-pair-review 該当）** — Issue 番号の永続化で **write（v1 sentinel ブロック）と read（legacy「Mirror Issue」field）が別表現**を使う。write は `mutateMirrorStateAtomic`（`amadeus-mirror-state-store.ts:158`）が v1 ブロックだけを刻み、read は status（`amadeus-mirror.ts:169`）と orchestrate 境界 2 箇所（`amadeus-orchestrate.ts:314` / `:3522`）が `getField("Mirror Issue")` で legacy field を探す。両者が同じ record を触りながら別フィールドを見るため、create が成功しても read 側には永遠に「不在」に見える。cid:requirements-analysis:symmetric-pair-review が守ろうとした失敗モードそのもの（write⇔check の片側だけ実装/移行された非対称）。

**(2) dead code が偽 green を保つ（org.md Forbidden = 検証劇場の同族）** — legacy field の writer `writeMirrorIssueField`（`amadeus-mirror.ts:363`）の唯一の呼び手 `:413` は `handleCreate` 内で、`main`（`:570-585`）が `args.kind !== "status"` を `runLegacyMutation`（`:533` = 実は v1 lifecycle）へ全転送するため **CLI 実行時に到達しない**。`handleCreate` / `handleSync` / `handleClose` も同様に main 不到達で、参照元は t232 のみ。status テストは `snapshot({ mirrorIssue: 1161 })`（`tests/unit/t232-amadeus-mirror.test.ts:104` / `:124`）で **legacy field を直接シード**し、create は lifecycle stub 化で実 lifecycle を走らせない。⇒ dead path（legacy field 経由）と stub 化 create が別世界で緑を保ち、生きた path（v1 write ⇔ legacy read）の非対称が全 mirror スイート（31 ファイル）で不可視。real-create → status の e2e が構造的に不在（cid:build-and-test:pbt-oracle-cancellation の同族）。

**(3) 命名 misdirection** — `runLegacyMutation`（`:533`）は名称に反し v1 lifecycle（`runMirrorLifecycleBoundary`）を呼ぶ。「legacy」という語が実装と逆で、修正者を legacy field 経路へ誤誘導しうる。

**(4) fail-closed の副作用が復旧経路を塞ぐ（#1534）** — marker 検証（`amadeus-mirror-lifecycle.ts:785` `marker.kind !== "parsed"` / `amadeus-mirror-provenance.ts:165` `missing-marker`）は健全な fail-closed だが、marker 唯一の書き手 `renderMirrorMarker`（`:47`）を legacy 経路が呼ばなかった結果、marker 無き legacy Issue が relink も adopt も拒否され in-tool 復旧経路がゼロになる。fail-closed 自体は正しく、欠けているのは marker 無き Issue の adopt/backfill 設計。

### 修正時の品質リスク

- **同根全数の棚卸し漏れ**: read 面は status 1 + orchestrate 2 の 3 箇所。status のみ直すと orchestrate 境界（`:314` / `:3522`）が非対称のまま残る（cid:code-generation:same-root-inventory）。3 箇所を同一 PR で v1 権威へ寄せる。
- **allowlist 行ピンの stale 化**: `amadeus-orchestrate.ts` を触ると同ファイルの多数ピンが下方シフトし patch gate が赤になる（cid:code-generation:allowlist-line-pin-stale）。mirror スタックのピンは executor 35 / lifecycle 24 / state-store 14 / state-codec 4 / provenance 3（`amadeus-mirror.ts` 本体はピン 0）。同一 PR で更新。
- **落ちる実証の設計**: regression-first の e2e = 「lifecycle create が永続化した v1 ブロックを status が読めるか」。修正前コードで赤（`mirror-missing`）、修正後に緑。既存 t232 の legacy-seed テストは残し、v1-seed / real-create の両経路を持たせて非対称の再発を封じる（cid:code-generation:injection-surface-verify — 注入面 = テストが読む面）。
- **互換フォールバックの誘惑**: write を legacy field へも二重化する案は org.md Forbidden（要求なき互換シム禁止）に抵触。read の v1 片寄せ + legacy 10 record の一度きり adopt が既決ノルムと整合。
- **配布同期**: mirror スタックは各 13 コピー（self-install 5 + dist 7）。触ったモジュールの `bun run promote:self` / `bun scripts/package.ts` + `dist:check` / `promote:self:check`。

## mirror-gateway envelope 欠陥の品質評価（260726-mirror-envelope-lf、履歴、Issue #1498）

## 新規テスト面と perf ゲート再設計の品質評価（260726-plugin-host-delivery、履歴 2026-07-26、差分リフレッシュ）

260726-plugin-host-delivery 差分リフレッシュ（2026-07-26、observed `0d83aa48b886fe85cd977569c0e7b3015b84d3e5`、base `1673c4332`、距離 43）。上流入力: Developer スキャン結果（実測済みスキャンノート）。

- **新規テスト**: `tests/` 配下の新規ファイルは **29 件**（`git diff --name-only --diff-filter=A 1673c4332..HEAD -- tests/ | wc -l`）、うち `*.test.ts` は **15 本**（e2e 2 / integration 7 / smoke 1 / unit 5）。内訳は **kimi 群**（`t-print-kimi-doctor` / `t-print-kimi-status` / `t-kimi-adapter` / `t-kimi-cli-wiring` / `t-kimi-doctor-arm` / `t-kimi-hooks-merge` / `t-kimi-print-drive` / `t150-kimi-dist-structure` / `t-kimi-swarm-resolve` + fixtures 12 + `tests/harness/kimi-print-drive.ts`）、**metrics t298 群**（`t298-metrics-visualize` の unit/integration）、**setup 群**（`setup-engine-layout` / `setup-kimi-hooks-domain`）、および `plugin-discovery-overhead-gate` / `t-artifact-guard-harness-dirs`。
- **plugin stage discovery perf ゲートの再設計**（[PR #1535](https://github.com/amadeus-dlc/amadeus/pull/1535)、`1edf2abfb`。注: ブリーフィングの #1525 は `git log` 実測で **#1535**）: 判定を**相対比 0.2（`tests/lib/plugin-discovery-overhead-gate.ts:15` `DISCOVERY_OVERHEAD_RATIO_LIMIT = 0.2`）と絶対 noise floor の AND** へ変更。ファイル冒頭コメント（`:10-11`）が「mirror benchmark dispersion gate と同じ構成」と明言しており、[PR #1507](https://github.com/amadeus-dlc/amadeus/pull/1507) の dispersion gate 是正と同族の「相対比単独判定はサブミリ秒帯で偽赤」クラスの解消である。
- **CI 構成の変化**（`.github/workflows/ci.yml`、[PR #1528](https://github.com/amadeus-dlc/amadeus/pull/1528) ほか）: 検証ジョブが分割され（旧単一「typecheck - lint - drift - tests」→「Lint and complexity」等へ）、**lizard が `pip install lizard==1.23.0` で pin**、Complexity gate（CCN baseline ratchet）は分割後ジョブへ移設、metrics の **Render metrics dashboard** step と **drift-check** ジョブが追加された（diff 直読）。
- 前節（260726-mirror-envelope-lf、履歴）が指摘した「fixture が自作 CRLF の検証劇場」クラスは、[PR #1537](https://github.com/amadeus-dlc/amadeus/pull/1537) の実 envelope 対応着地により解消方向へ動いた（患部の詳細断面は前節を参照 — 同節の file:line は測定 ref `e39402224` の断面）。

測定 ref: observed `0d83aa48b`（cid:reverse-engineering:measurement-ref-in-artifacts）。

## mirror-gateway envelope 欠陥の品質評価（260726-mirror-envelope-lf、履歴、Issue #1498）

測定 ref: observed `e39402224`（base `1673c4332`、距離 27）。file:line は同 commit の実ファイル直読。上流入力は Developer スキャン結果 `inception/reverse-engineering/scan-notes.md`（Architect 段で独立再検証、訂正 0 件）。

### 現存判定

| Issue | P/S | 現存判定 | 主患部 |
| --- | --- | --- | --- |
| [#1498](https://github.com/amadeus-dlc/amadeus/issues/1498) | P1/S2 | **現存**（区間内で無変更） | `amadeus-mirror-gateway.ts:196`（CRLF 前提の終端探索）→ `:198-199` malformed。影響は 5 verb 全部 |

### 品質欠陥のクラス

**(1) 外部 seam の未実測仮定（主欠陥）** — `:179-215` のパーサは `gh --include` のステータス行終端を CRLF と仮定するが、実出力は LF 単独。設計宣言（`security-design.md:37`）・パーサ・fixture の 3 面に同一の未実測仮定が一貫して焼き込まれているため、内部整合は取れているのに実 seam と全面不一致になる。cid:application-design:external-seam-vocab-measurement（seam 語彙の実測）が守ろうとした失敗モードそのもの。

**(2) 検証劇場クラスの偽 green（org.md Forbidden 該当）** — `tests/unit/t272-amadeus-mirror-gateway.test.ts:61` verbatim:

```ts
  return `HTTP/2 ${status} OK\r\ncontent-type: application/json\r\n\r\n`;
```

`grep -n 'HTTP/' tests/unit/t272-amadeus-mirror-gateway.test.ts` → **1 hit（`:61` のみ）**。`singleEnvelope`（`:63-65`）/ `paginatedEnvelope`（`:67-72`）はこの `block()` を連結して合成するため、paginated fixture も「P 個のブロック連続 + 単一 JSON 配列」= **設計宣言そのものを再現**する。fixture が被検実装と同じ誤仮定を共有しているため、実環境で全 verb が落ちていても CI は緑のまま。cid:build-and-test:pbt-oracle-cancellation の同族（オラクル側が被検側と同じ誤りを持つと欠陥が観測面に出ない）。

**(3) 症状の可観測性は良好、帰属は誤誘導** — 失敗は `:525-534` で `invalid-response` / retryable=false として loud に分類され `GitHub unavailable (invalid-response; no-effect-confirmed; exit=0; http=none)` を出す。サイレント失敗ではない点は良い。一方 Issue 本文の機序記述（主因 = `--slurp` 先頭の `[`、影響 = create/sync）は**本 scan で否定済み** — 先頭 `[` を除去しても malformed のままで、`--slurp` を使わない view/edit/close も落ちる。誤った機序記述に従うと修正が的を外す。

**(4) 副次的な不変条件の脆さ** — `:669` の `outer.length !== interp.pageCount` は「HTTP ブロック数 = ページ配列要素数」を前提とするが、実 `--slurp` 出力は interleave のため `statuses.length` が常に 1 になり、この不変条件は LF 対応後も find を落とす。すなわち **find の修正は単一系より 1 段深い**（パーサ文法の変更か `--slurp` 撤去）。

### 修正時の品質リスク

- **allowlist 行ピンの stale 化**: `:179-235` へ行を挿入すると gateway の 5 ピン（`447-448` / `602` / `615-620` / `702` / `716`）が全件下方シフトし patch gate が赤になる（cid:code-generation:allowlist-line-pin-stale）。同一 PR で更新する。
- **落ちる実証の設計**: 実 `gh` 形式 fixture の追加それ自体が修正前コードで赤になる（cid:code-generation:injection-surface-verify — 注入面 = テストが読む面 = `t272:61`）。既存 CRLF ケースを残して両形式を持つことで、将来の seam 変化にも耐える。
- **配布同期**: 10 コピーへの伝播が必須（`dist:check` / `promote:self:check`）。

## クロスレビュー済みバグ7件の品質評価（260726-crossreviewed-bug-batch、履歴、7 Issue）

測定 ref: observed `1673c4332`（base `e12259ba7`、距離 2）。file:line は同 commit の実ファイル直読。上流入力は Developer スキャン結果 `inception/reverse-engineering/scan-notes.md`（Architect 段で独立再検証済み）。

### 現存判定サマリ

| Issue | P/S | 現存判定 | 品質欠陥のクラス |
| --- | --- | --- | --- |
| #1489 | P2/S3 | 現存 | 比較ゲートの偽赤（noise floor の過小） |
| #1457 | P2/S3 | 現存 | **検証劇場**（org.md Forbidden 該当の自己参照比較） |
| #1377 | P3/S3 | 現存 | fail-open フォールバック（不変条件違反のディレクトリ生成） |
| #1459 | P3/S3 | 現存 | parse-don't-validate の不徹底（無効状態が表現可能） |
| #1462 | P3/S4 | 現存（行シフト `:1795` → `:1823-1824`） | 契約違反の例外伝播（raw `Error` がスキーマ契約を破る） |
| #1458 | P3/S4 | 現存 | dead export と観測不能な状態遷移 |
| #1388 | P3/S4 | 要精査（構造は現存、ただし FR-6 で明示的スコープ外） | 設計既決との衝突（バグ／仕様の帰属が未確定） |

### 最重要: #1457 は org.md Forbidden の「検証劇場」に該当

`amadeus-election.ts:486, 494, 503` で `resolved` 由来の値が `verifySelf` の `ledgerCount` と `ballots`、`storedFreq` と再計算元の双方へ渡るため、ballot-count 分岐（`amadeus-election-record.ts:193` の `if (ledgerCount !== ballots.length)`）と freq 分岐（`:196` の `GoaFreq.fromVotes(ballots.map(...))`）は**恒久 false** である。これは org.md Forbidden の「自己参照比較（x === x）」に直接該当し、「偽の信頼を生む分だけゲート不在より悪い」クラスにあたる。

ただし品質評価としては**限定が要る**: 同ファイルには実効カバーが併存しており（`amadeus-election.ts:495-496` の `checkGoaLine(document, freq)` = record.md の GoA 行との照合、`:487-490` の `tally` 再計算と `t.result` の比較）、timeline 単調性は `verifySelf` の第3クラスとして生きている。したがって**未ガードなのは「ledger.json 件数 vs materialize 済み集合の件数」の乖離のみ**であり、選挙記録全体が無検証というわけではない。

### 設計と実装の乖離（原因の所在 = 実装）

#1457 と #1458 はいずれも、**コード内 doc コメントが正しい設計を宣言しているのに配線がそれを実現していない**クラスである。

- `amadeus-election-record.ts:182-185`: "The check recomputes from the ballots rather than comparing the record to itself (no verification-theatre self-reference)." — 設計は self-reference 回避を明言。逸脱は caller 側。
- `amadeus-election-transport.ts:165-167`: "the tool cannot observe the spawn, so it emits a directive and lets reportDelivery mint the record after the conductor reports completion" — 設計は report 後 mint を明言。その配線が CLI に存在しない。

すなわち両件とも原因の所在は「要件の見落とし」でも「設計の誤り」でもなく**実装（配線）の逸脱**であり、Issue の帰属と一致する（cid:requirements-analysis:bug-intent-linkage）。

### fail-open / fail-closed の非対称（#1377・#1462・#1459）

- #1377: `auditShardDir`（`amadeus-lib.ts:4126-4128`）が `return null` で fail-closed に倒れているのに対し、`auditFilePath`（`:3326-3328`）と `stateFilePath`（`:3313-3316`）は bare `intents/` 直下へフォールバックし、`ensureAuditFile`（`amadeus-audit.ts:258-262`）が `mkdirSync(dir, { recursive: true })` でそのディレクトリを**再帰生成する**。`amadeus-log.ts` 経由の emitter は既にガード（`resolveActiveProjectDir`）で封鎖済みで、`appendAuditEntry` を直接呼ぶ emitter に同ガードが無い — すなわち**部分封鎖の状態で非対称が残っている**。
- #1462: `existsSync` ガード（`amadeus-graph.ts:1828`）と無ガード `statSync`（`:1823-1824`）の同一関数内での非対称。加えて `PluginStageError` へ変換する try/catch はファイル単位ループの内側（`:1837` 以降）にあり、列挙フィルタはその外側 — したがって raw `Error` がスキーマ契約 `amadeus.plugin-stage-error.v1` を破って伝播する。
- #1459: `voters` の空検査（`:82`）に対する `choices` 側の欠落、および internalNo / voter の一意性検査の全面不在。汚染経路は `:449` の `election.choices.map` が重複 internalNo ごとに1エントリを作り、全会一致でも `:456` の `leaders.length !== 1` が成立して**誤 `tie` hold** を返すこと。

### 品質面の残課題（後続ステージへ）

1. **#1388 の性格判定が先決** — 構造は現存するが FR-6 既決。修正対象か、既決設計を根拠にクローズか。仕様変更に当たる可能性があり裁定が要る。
2. **#1458 の方式選択が CLI 契約に触れうる** — `reportDelivery` 配線案と、既定 transport 廃止 + agmsg 必須化案の2案。後者はユーザー可視の挙動変更。
3. **#1377 は3関数の同時棚卸しが本質**（`auditShardDir` / `auditFilePath` / `stateFilePath`）。`RULE_LEARNED` 経路での決定的再現は未実施であり、修正設計時に取ることを推奨する（scan-notes が仮説として明示）。
4. **#1489 は検出力低下の評価が完成条件** — Issue の3案（中央値乖離・ワークロード別 noise floor・replica 増 + 外れ値棄却）はいずれも「どれだけの退行を検出できなくなるか」を伴う。
5. **配布同期が6件で必須** — #1489 以外は core 正本を触るため、`dist:check` / `promote:self:check` を通さない修正は完了と見なせない。

## metrics サブシステムの品質評価と可視化のリスク面（260726-metrics-visualization、履歴）

測定 ref: observed `1c43438df`。件数はすべて `grep -c` / `ls \| wc -l` / `git diff --numstat` 出力からの転記。**本 intent は欠陥修正ではなく機能追加**であるため、本節は「既存 metrics コードの品質水準」と「可視化を足すときに壊しうる契約」の2面で記録する。

### Q-M1. 既存 metrics コードの品質水準（高い — 倣うべき基準）

| 観点 | 実測 | 評価 |
| --- | --- | --- |
| 妥当性定義の単一化 | `metrics-retention.ts:17` が `parseSnapshot` を import、private parser なし（`:6-9` に明文契約）| **良**。writer / reader / pruner が同一の妥当性定義を共有 |
| fail-closed | retention `:6-9`（1件でも不正なら削除 0 件で exit 1）、snapshot `:129`（最初の失敗で即 return）| **良**。部分成功を作らない |
| 検証可能な契約 | `metrics-timeseries.ts:3-4`「must not import any fs write API (AC-1c; **grep-checkable**)」| **良**。契約が機械検査可能な形で書かれている |
| parse, don't validate | `:18-19` — `values` は `unknown` のまま、描画側が `typeof` 分岐 | **良**。検証したふりをしない。ただし下記 Q-M3 の負担を描画側へ移す |
| 原子性 | `writeSnapshotAtomic` `:153-163`（`.tmp` + `flag: "wx"` → `renameSync`）| **良**。クラッシュ耐性あり |
| テスト層の分離 | unit 5 / integration 3、integration は `AMADEUS_METRICS_ROOT` seam 経由 | **良**。cid:code-generation:fs-tests-integration-first に適合 |
| 落ちる実証 | 空 dir / 壊れたファイル / dangling symlink / dir 不在 の4類型 | **良**。cid:code-generation:bun-readfilesync-dir-platform-divergence の dangling symlink 手法を採用済み |

**総評**: metrics サブシステムは本リポジトリ内で契約明文化・fail-closed・テスト層分離のいずれも高い水準にある。可視化機能はこの水準を下回らないことが暗黙の受け入れ基準になる。

### Q-M2. 可視化が壊しうる契約（S2 相当のリスク、未発生）

**リスク形状**: `metrics-timeseries.ts` へ `--html` / `--svg` 等の出力フラグを足す設計は、`:3-4` の AC-1c 契約（fs write API を import しない）を必然的に破る。契約は grep で検査可能な形で書かれているため、破った時点で既存の検査が赤くなる（= 無音の劣化にはならない）が、**契約自体を緩める判断はモジュールの役割分離を失わせる**。

**回避形**: `metrics-retention.ts` と同型（reader を import しつつ自身は書き手）の新規モジュールとして置く。この構図は既に repo 内で先例があり、レビューで新規性の説明を要さない。

**判定**: 設計段で明示的に扱うべき論点。cid:application-design:citation-semantics-check（引用元の契約が自要件と一致するかを設計時に照合する）が該当する。

### Q-M3. `values: unknown` が描画側へ移す負担（設計判断点）

`metrics-timeseries.ts:18-19` の設計により、個々の値の数値性は型で保証されない。既存の描画側は `formatValue` `:117-119` が `typeof v === "number" ? String(v) : v === undefined ? "" : "?"` で吸収している。

チャート描画では「`?` を表示する」で済まず、**非数値・欠測をどう扱うかの明示的な判断**が要る（穴を空ける／0 に潰す／系列から除外する）。無自覚に `Number(v)` すると `NaN` が座標に流れ込み、SVG が無音で壊れる（描画されないが例外も出ない）クラスの欠陥になりうる。

さらに `formatValue` は**非 export** であるため、可視化側は (a) export 昇格 (b) 同等関数の新設 のいずれかを選ぶ必要がある。(b) は妥当性定義の二重化にあたり、Q-M1 で評価した「単一化」の美点を局所的に崩す — cid:construction:意図ベースの重複排除の観点では (a) が素直だが、`metrics-timeseries.ts` の公開面を広げる判断でもある。**設計段の裁定事項**。

### Q-M4. `test_pyramid` のキー可変性（見落としやすい罠）

`metrics-snapshot.ts:102` が `values[`${tier}_${size}`]` でキーを動的合成するため、`test_pyramid` collector のキー集合は**スナップショットごとに変わりうる**（実データで 11 キー）。可視化側が collector のキーを静的に列挙すると、キーの追加・削除が無音で描画から欠落する。

`unionValueKeys` `:103` がこの目的の関数として既に存在するため、**利用は必須**。利用を怠っても例外は出ず、系列が1本静かに消えるだけであるため、テストで「キー集合が変化するスナップショット列」を fixture に含めないと検出できない。cid:code-generation:corpus-sweep-for-new-guards と同族の両側実測が要る面。

### Q-M5. CI 配線に関する既存記録の失効（履歴読解時の注意）

260712 の設計記録は metrics 公開を「`main` へ push、最大3回再試行」と記述しているが、**現実装は `GITHUB_RUN_ATTEMPT` 入りブランチ + `gh pr create` + `gh pr merge --auto --squash`**（ci.yml `:470` / `:475`）である。衝突回避の機構がリトライからブランチ名の一意化へ置き換わっている。

**含意**: 可視化の CI 配線を設計する際、履歴節の push 記述を前提にすると誤った衝突対策を設計する。cid:reverse-engineering:comment-premise-verify-not-just-quote に該当 — 記録の前提が現行実装で成立するかを実測してから引く。

### Q-M6. 未整備面（負債ではないが可視化が埋める必要がある）

| 面 | 実測 | 影響 |
| --- | --- | --- |
| `package.json` の実行導線 | 全 15 scripts エントリ中 metrics 系 **0** | metrics CLI は現状 `bun scripts/...` 直叩きのみ。利用者可視の導線が無い |
| ドキュメント | `docs/` の metrics 言及 **0 ファイル** | 可視化を出荷するなら日英ペアの新規ドキュメントが要る（project.md の言語規約）|
| データ量 | `metrics/*.json` **123 件** / 保持上限 360 | 剪定は未発動。可視化の性能要件は 360 件を上限として設計できる |

### 区間の実装2系統に関する品質所見

系統 B（PR #1493、worktree hooks 修正）は `resolveProjectDirFromHook` `:269` の rung 順序を変更し、`:265-268` のコメントで**なぜ payload cwd が `CLAUDE_PROJECT_DIR` に優越するか**を明文化している（「that env var is pinned to the launch directory ... and does NOT follow a session into a git worktree」）。前 intent の codekb が Q-1 として記録した「テスト helper `currentGitSha` の三重複製」および #1482 の欠陥は、本区間で着地・解消された。**これらは履歴節として読むこと**（以下の 260725-worktree-ref-fixes 節）。

系統 A（PR #1483）は新規2モジュール（合計 +1,388 行）を追加した大規模変更だが、**metrics サブシステムとは依存関係を持たない**（`scripts/metrics-*.ts` の `amadeus-lib` import が各 0 件）。可視化の設計前提に影響しない。

## standing grant の scope 解決欠陥と検出不能な fixture（260726-grant-scope-gate、履歴、Issue #1497）

測定 ref: observed `e12259ba7`（base `11f1ad61f`、距離 4）。判定はすべて再現プローブの実行結果および実ファイル直読からの転記。

### 欠陥 A（#1497 本体）: composed scope で全ゲートが phase boundary と誤判定される

`standingGrantSatisfiesGate`（`amadeus-lib.ts:3985-4017`）の `inScope` クロージャは `stage.scopes` を直読するが、composed scope（`amadeus-bugfix` / `amadeus-feature` 等）は stage frontmatter に**構造上決して現れない**（`stage.scopes` の語彙全数 = stock 10 個、`scopes` キー欠落 stage は 0 件 — observed `e12259ba7` の `stage-graph.json` 実測）。結果:

1. すべての stage で `inScope()` が false
2. `next === null`
3. `crossesPhaseBoundary` が恒真
4. 既定グラント（`includesPhaseBoundary: false`）は**全ゲートで ineligible**

再現プローブ実測（各セル = `includesPhaseBoundary` false / true）:

| scope | reverse-engineering | requirements-analysis | functional-design | code-generation | build-and-test |
| --- | --- | --- | --- | --- | --- |
| `bugfix`（stock） | true/true | false/true | true/true | true/true | false/true |
| `amadeus-bugfix` | false/true | false/true | false/true | false/true | false/true |
| `feature`（stock） | true/true | true/true | false/false（skeleton） | true/true | true/true |
| `amadeus-feature` | false/true | false/true | true(!) | false/true | false/true |

`amadeus-*` 行が opt-out 側で全面 false になっているのが欠陥 A の直接像である。

**症状の性質**: fatal error ではなく**グラントの無音 no-op**。route receipt が発行されず（`amadeus-grant-authorization.ts:762` が directive を無変更で返す）、通常の human presence 経路へフォールバックする。ユーザーには「グラントを発行したのに効かない」としか見えない。この fail-soft 性は project.md Forbidden（想定内の scope 不一致 fallback を fatal error 経路へ流さない）の遵守形であり、**修正で壊してはならない性質**である。

### 欠陥 B（未報告・より重大）: walking-skeleton 除外の無音不発

同じ `inScope` が `firstConstruction` の探索にも使われるため、composed scope では `firstConstruction === undefined` → `isFirstConstructionGate`（`amadeus-lib.ts:4011`）が恒偽になる。すなわち **walking-skeleton ゲートの除外判定へ到達しない**。

実測: `scope = amadeus-feature` + `stance = on` + opt-in グラントで `functional-design` が `covered = true`（= 認可されてしまう）。`SKELETON_ON_SCOPES`（`amadeus-lib.ts:3896-3904`）には `"amadeus-feature"` が `:3900` に登録済みであるにもかかわらず、判定がそこへ到達しない。

これは project.md の以下2条の**現在進行の違反状態**である:

- Forbidden: 「NEVER walking-skeleton stance が有効なとき、standing grant に walking-skeleton gate を認可させない」
- Mandated: 「ALWAYS active scope が `amadeus-feature` なら、既存コードを変更する場合も最初の Construction Bolt に walking-skeleton gate を維持する」

first construction stage の実測値（scope-grid 由来）: `feature` → `functional-design` / `amadeus-feature` → `functional-design` / `amadeus-bugfix` → `code-generation`。

**A と B は単一の根本原因（`inScope` の解決方式）から出る2症状**であり、片方だけを直すと他方が残る。

### 欠陥が検出されなかった構造的理由: fixture の語彙捏造

`t-solo-standing-grant-domain.test.ts`（integration `:47-59`、unit `:33-44`）の fixture ヘルパー `stage()` は `scopes: ["amadeus-feature"]` を**捏造**している — この語彙は実 `stage-graph.json` に存在しない。`t-solo-gate-transaction-seam.test.ts:305-315` の `ROUTE_GRAPH` も同型。捏造 fixture の下では `inScope()` が真を返すため、**実運用で必ず false になる経路がテスト上は正常に見える**。これは「テストが検証したい当の性質をテスト側で作ってしまう」検証劇場クラスであり、欠陥非検出の直接原因である。

実 graph を読む唯一のグラント系ハーネス `tests/harness/solo-gate-fixture.ts:50`（`.codex/tools/data/stage-graph.json`）も、state fixture が `tests/fixtures/state-mid-inception.md:6` = `Scope: bugfix`（stock）、グラントが `Includes Phase Boundary: true`（`:116`）という**欠陥が現れない組合せ**で固定されている。

`t-standing-grant.test.ts` も scope は `"feature"` 固定（`:222`、ゲート分類 `:221-253`）、skeleton 面（`:889-923`）も feature / bugfix のみで、**カスタムスコープのケースはゼロ**である。

### 欠けているテスト面（RED 候補）

1. 実 graph × composed scope × opt-out グラントで ordinary gate が covered になること（#1497 の RED）
2. 実 graph × `amadeus-feature` × skeleton on で first construction gate が **NOT covered** であること（欠陥 B の RED）
3. 実 graph × composed scope × 真の phase boundary で opt-out が denied のままであること
4. stock スコープの非退行 parity（team mode 呼び出し元 `amadeus-state.ts:2470` / `:3269` を含む）

### coverage / allowlist 面のリスク

- `tests/.coverage-registry.json:3509` の `function:standingGrantSatisfiesGate` は `coveredBy: []` / **`status: "UNCOVERED"`** — 患部関数は現在 in-process 計測されていない。修正時は seam 設計を実装時点で行う必要がある（cid:code-generation:bun-coverage-spawn-blindspot）。
- `tests/.coverage-patch-allowlist.json` の `amadeus-lib.ts` 行ピンは 4 件（`2195-2196` / `2708-2710` / `3886-3887` / `5491-5493`、`python3 -c json` 実測）。**`3886-3887` は患部 `3985-4017` の直前**であり、患部より上方へ行を足す修正では stale 化・無音転位のいずれも起こりうる（cid:code-generation:allowlist-line-pin-stale とその追補）。修正 PR では全エントリの reason 記述と現行行内容の一致を直読照合する。

### 別軸の未確認事項

`isPerUnitStage: false` / `isPerUnitFinalGate: false` は `amadeus-lib.ts:4012-4013` でハードコードされている。per-unit 中間ゲートをグラントが覆う挙動は #1497 とは別軸であり、スコープに含めるかは要件段の裁定事項。

## worktree 環境に起因する欠陥と技術的負債（260725-worktree-ref-fixes、履歴: 2026-07-26、Issue #1482 / #1481 / #1455）

測定 ref: observed `11f1ad61f`。件数はすべて grep / find / wc 出力からの転記。

### Q-1. テスト helper `currentGitSha` の三重複製と FS 直読（#1481 / #1455、S3-MAJOR）

**欠陥形状**: git の内部レイアウト（`.git` ファイル／ディレクトリ、`HEAD`、`commondir`、loose ref、`packed-refs`）を**ファイルシステム直読**で辿る helper が、共有されず3つの integration テストに複製されている。

| ファイル | helper 定義 | throw |
| --- | --- | --- |
| `tests/integration/t257-status-registry-migration.test.ts` | `:193` | `:214` |
| `tests/integration/t258-lifecycle-transaction.test.ts` | `:434` | `:455` |
| `tests/integration/t259-guard-integration.test.ts` | `:77` | `:96` |

**品質上の問題は2層ある。**

1. **正しさ**: loose ref を worktree gitDir 配下でしか探さず、common dir へは `packed-refs` としてしか降りない。git worktree ではブランチ ref が common dir の loose ref に置かれるため、**worktree では必ず throw する**。本線チェックアウトでのみ緑になる環境依存の false red であり、`org.md` Forbidden の「既存テストの赤を無視して作業を続行しない」規律と正面から衝突する（worktree 作業者は毎回3スイートの赤を手作業で切り分ける負債を負う）。
2. **重複**: 同型ロジックが3複製されているため、修正は3箇所に及ぶ。しかも3者はエラー文言（`cannot` / `Cannot` / `Unable`）と引数形（t259 のみ `repositoryRoot` を引数に取る）が微妙に食い違っており、**単一の canonical 定義から導出されていない**。`construction.md` の「複数箇所で消費されるリスト・コマンド列・定数を手書きで複製しない — canonical な1定義から導出する」に反する。

**既習の正しい様式が同 repo に存在する**にもかかわらず採用されていない: `packages/framework/core/tools/amadeus-lib.ts:4131` `resolveMainCheckout` は `:4132` `rev-parse --show-toplevel` / `:4135` `rev-parse --git-common-dir` の git plumbing サブプロセスで解決し worktree 安全。同型前例に `codex/tools/amadeus-codex-hooks-migration.ts:590`。**同根棚卸しの結果、git 内部レイアウトを FS 直読するのはこの3ファイルのみ**で、他はすべてサブプロセス経由 — 修正対象は閉じている。

**導入経緯と原因の所在**（cid:requirements-analysis:bug-intent-linkage）: 3ファイルとも導入コミットは `2e157d7fe`（2026-07-23、`archived intent statusと誤resume防止を導入 (#1424)`）。helper 全24行が単一コミット帰属で後続修正なし。原因の所在は **#1424 の実装判断** — 要件・設計は provenance に SHA を記録することを求めたが、その解決手段として git plumbing ではなく FS 直読を選び、かつ共有せず3複製したのは実装段の選択である。設計成果物が FS 直読を指示した形跡はない。

**現症状の実測**（worktree、パイプなし exit 捕捉）: t257 exit 1（10 pass / 1 fail）、t258 exit 1（25 pass / 1 fail）、t259 exit 1（9 pass / 1 fail）。本 scan で t259 を再実行し追認（exit 1、`9 pass` / `1 fail`）。**各スイートで赤くなるのは helper を通る provenance 記録テスト1件のみ**であり、残りは緑 — 欠陥は局所的だが、スイート単位の exit code を汚染するため CI／ローカル双方でノイズになる。

### Q-2. hook の project-dir 解決が worktree を貫通する（#1482）

**欠陥形状**: `resolveProjectDirFromHook`（`packages/framework/core/tools/amadeus-lib.ts:247`）の rung1（`:249`、`CLAUDE_PROJECT_DIR` を無条件採用）が、EnterWorktree セッションで本線を指したままの env を採ってしまい、worktree を正しく返す rung2（`:258-259`）に到達しない。

**品質観点で押さえるべき点**:

- **単一箇所の欠陥が hook 一族12箇所へ一様に波及する**（core hooks 11 + kiro-ide adapter 1、実測列挙は `architecture.md` 同 intent 節）。裏返せば修正も解決関数1点で足りる。
- **姉妹関数との非対称**: `resolveProjectDir`（`:170`）は `:172` で `--project-dir` 明示引数を第1順位に置くため engine 経路は救われている。hook 側だけがこの上位 rung を欠く — cid:requirements-analysis:symmetric-pair-review が対象とする「片側だけ実装された非対称」クラスタに該当する。
- **テストが現状を意図的に固定している**: `tests/unit/t202-hook-project-dir-worktree-marker.test.ts:105` の test 2 が env の優越を assert しており、同ファイル `:1-3` が宣言する #641 の設計意図（worktree を返すこと）と矛盾する。**テストが欠陥を守っている**状態であり、修正には t202 の契約変更を伴う裁定が要る。この矛盾は本 scan で新たに可視化したもので、Issue 起票時の推定機序（env 未設定）とは異なる。

**配布面の負債**: `amadeus-lib.ts` / `amadeus-stop.ts` はいずれも11コピー（正本 + harness 表層4 + dist 6）。1行の修正が11面の同期を要求する構造は既知の設計事実だが、`bun scripts/package.ts` + `bun run promote:self` + `dist:check` / `promote:self:check` の決定的ドリフトガードで担保されている。

### Q-3. 本区間（base `ec624022f` → observed `11f1ad61f`）の品質変化

`git diff --name-only ec624022f 11f1ad61f -- packages/framework/core/tools/amadeus-lib.ts packages/framework/core/hooks/amadeus-stop.ts tests/integration/t257-status-registry-migration.test.ts tests/integration/t258-lifecycle-transaction.test.ts tests/integration/t259-guard-integration.test.ts` の出力は**空**。すなわち上記3 Issue はいずれも**本区間の退行ではない**。区間の実装面は `team-up.sh` 系1系統に閉じており、ビルド／テスト構成・依存（`package.json` / `bun.lock` / `tsconfig` / `biome` / `scripts/` / `run-tests.sh` / `.github/`）の diff はいずれも空 — 品質ゲートの構成に変化はない。

## 起動経路に残る欠陥と技術的負債（260725-teamup-launch-hardening、履歴、Issue #1476 / #1478）

測定 ref: observed HEAD `4a0f91ad07dbe17c6477b7fe9b52a0e9ab4532ba` の実ファイル直読。外部スキル `~/.agents/skills/agmsg/` は読取 2026-07-25。

### D-1: Issue #1384 の保護が現在まったく機能していない（負債、S2 相当）

PR #1477 は「常に失敗する検証」を**ガードで迂回**して解消した。副作用として、Issue #1384 が導入した本来の保護 — TUI コールドスタートで初期プロンプトが取りこぼされた場合の検出と再送 — が**現在1度も発火しない**。

- 出荷既定 `CLAUDE_MONITOR_PROMPT="/agmsg mode monitor"`（team-up.sh:104）は `watcher_verification_applies` の `*" actas "*` case（:1094-1096）に一致しない。
- 結果、:1461 の stale sentinel 除去も :1479 の `verify_watchers_armed` も**両方スキップ**される。実 launch では stderr に1行の advisory が出るだけになる（:1099）。
- したがって「メンバーの watcher が実は起動していない」状態は、**現行構成では検出手段がゼロ**。#1384 の症状（メッセージが誰にも届かないまま作業が進む）は再発しうるが無音である。

これは PR #1477 の欠陥ではなく**意図された暫定状態**である（:1099 の告知文が `#1476` を名指しし、テスト t294 の FR-5 が「検証機構は #1476 がプロンプト変更だけで再有効化できるよう保持する」ことをピンしている）。ただし**負債であることの認識が必要**: #1476 が着地しない限り保護は不在のままで、その期間に制限はない。

### D-2: テストが sentinel を自前で書くため、外部 seam の欠陥を構造的に検出できない

`tests/integration/t-team-up-watcher-arming.test.ts` は agmsg を fixture でスタブし、**テスト自身が sentinel を作る**（測定 ref: `4a0f91ad0`）。

- `:36-44` — `agmsg_ready_path` の自前スタブを書き出す（コメント verbatim: `  // Self-contained stub of agmsg's agmsg_ready_path — same contract team-up.sh`）。
- `:87-92` — `sentinel()` / `armAll()` ヘルパーが `writeFileSync(sentinel(readyDir, role), "")` で全ロール分を直接生成する。
- `:60` — fake herdr が `FAKE_RESEND_ARMS=1` のとき再送に応じて sentinel を touch する。

すなわちテスト世界では **sentinel は常に「書かれうる」**。実世界で唯一の書き手である `watch.sh:307` が actas ガード（`:300`）配下にあり monitor モードでは発火しない、という**本番の非対称は fixture に写されていない**。前 intent（#1449）で 200.85 秒の実障害が出るまでこのスイートが green だったのはこの構造による。

新設の `tests/integration/t294-team-up-watcher-applicability.test.ts` はこの盲点を**部分的に**埋める: `:44` が「出荷既定のプロンプトでは適用されない」、`:52` が「出荷定数が monitor 形であること」を、テスト側でピンせず実定数から読んで固定する。ただし依然として**外部 agmsg 側の契約（第4引数 → sentinel 書込）自体は検証していない**。この境界は repo 外・非バージョン管理であり、repo 内のテスト・センサーからは到達不能である（`dependencies.md` の同 intent 節を参照）。

**#1476 の実装で追加すべき検証面**: プロンプトを actas 形へ変えたとき、検証が再び適用されること（ガードの正方向）と、その状態で `mux_attach` が不当にブロックされないこと（レイテンシ面）。前者は t294 の `:60` が既に forward path として持つ（テスト名 verbatim: `an actas bootstrap prompt applies (FR-1, #1476 forward path)`）。後者は未カバー。

### D-3: `CLAUDE_MONITOR_PROMPT` が単一定数のまま4箇所に散在（#1476 の変更コスト）

`:104` の定数は引数を持たず、4箇所が値そのものに依存する（`grep -n`、測定 ref: `4a0f91ad0`）。

| 参照 | 用途 | actas 化で必要な変更 |
| --- | --- | --- |
| `:861` | `claude_member_cmd` の `init_prompt` 既定値 | **per-member 化**（ロール名 `$m` を埋める） |
| `:1094` | 適用可否ガードの `case` | member 文脈を持たない。**「actas 形を使う構成か」の判定へ書き換え**が必要 |
| `:1202` | `resend_monitor_prompt` への実引数 | per-member 化（対象ロールのプロンプトを再送する必要） |
| `:1211` | 失敗時の手動復旧ガイダンス文言 | per-role 化しないと**誤った復旧手順を案内**する |

「消費されるリスト・定数を canonical な1定義から導出する」（construction phase guardrail）を守るなら、`monitor_prompt_for <role>` のような1関数へ寄せるのが自然。単純な文字列置換で4箇所を個別に書き換えると、`:1211` のガイダンス退行を見落としやすい。

### D-4: `git worktree add` の直列作成（#1478）

`create_run()`（:1267）のループ（:1302-1310）が worktree を逐次作る。実測（feasibility、測定 ref: `c4c9531ee`）で7メンバー **7.39 秒**、並列度4なら **3.32 秒**（55% 短縮）。

負債としての性質:

- **失敗ゼロだが最適でもない**: 全並列度で成功 7/7・stderr 0 bytes。git が `.git` の設定ロックを内部で直列化するため、並列化はクラッシュリスクではなく**スループット最適化**の問題。
- **無制限並列は退行**: 並列度7で 7.55 秒と直列（7.39 秒）より遅い。「素朴に全部同時に投げる」実装は改善にならない。**並列度の上限が実装要件**。
- **ロールバック集約が未対応**: `CREATED_MEMBERS`（:1306）への逐次追記が `rollback_prepared_run`（:1241、読み手 :1244、`handle_exit` :1253 が :1259 で呼ぶ）のロールバック対象を決める。並列化すると成功集合の集約が必要で、**部分失敗時の挙動が現行と等価であることの検証が要る**。feasibility 実験では失敗が発生しなかったため、**失敗注入による検証が未実施**。
- **エラー可視性**: 並列実行では stderr が交錯する。どのメンバーが失敗したかを特定する手段が現行にはない。
- **測定環境の偏り**: 実測は macOS（APFS）のみ。Linux CI 上の並列度特性は未測定。

### 直下の履歴節との関係

前 intent（#1449）が記録した「常に失敗する検証ゲート = 検証劇場クラス」は、PR #1477 により**発火しない状態**へ移った。欠陥そのもの（sentinel を書かせる側を移植していない）は未解消で、#1476 の actas 移行がそれを埋める。本節の D-1 はその移行が完了するまでの中間状態を記録したものである。

## 常に失敗する検証ゲートとテストスタブによる検出不能性（260725-teamup-attach-latency、履歴、Issue #1449）

測定 ref: observed HEAD `ec624022ff65cc8b3912001f768bd66ec41a0e39` の実ファイル直読。

### 欠陥クラス: 「常に失敗する検証ゲート」（検証劇場クラス）

`verify_watchers_armed`（`packages/framework/core/tools/team-up.sh:1151-1190`）は、成功しうる条件を持たない検証である。待機対象の ready sentinel は actas モードの watcher しか書かないが（`~/.agents/skills/agmsg/scripts/watch.sh:300` の `if [ -n "$ACTIVE_NAME" ]` ガード）、`team-up.sh` が投入するのは monitor モードのプロンプト（:104 `CLAUDE_MONITOR_PROMPT="/agmsg mode monitor"`）で、その経路（`delivery.sh:259 emit_monitor_directive()` → `:301`）は `ACTIVE_NAME` を渡さない。詳細な機序は `architecture.md` の同 intent 節を参照。

この形は org.md Forbidden の「検証劇場」と鏡像の関係にある。検証劇場が「**常に通る**ため偽の信頼を生む」のに対し、本欠陥は「**常に落ちる**ため実行時コストだけを課し、シグナルとしては無価値」である。実害は3つ:

1. **性能**: 起動のたびに `WATCHER_READY_TIMEOUT`(90) × `(WATCHER_RESEND_MAX+1)`(2) = 180 秒、`mux_attach` が構造的にブロックされる。実 launch 実測（2026-07-25、3人構成）では `T+200.85s` で rc=1 終了、armed 0/3。
2. **偽陽性アラート**: `:1186` のエラー文（verbatim: `  echo "ERROR: agmsg watcher never armed for: $remaining (after ${WATCHER_RESEND_MAX} re-send(s))" >&2`）と `:1187` の続く案内が原因を Issue #1384（TUI cold-start のプロンプト消失）と断定するが、実際には watcher は正常起動している（`herdr agent list` 上 `agent_status: idle`）。診断が構造的に誤誘導する。
3. **非ゼロ exit の常態化**: `exit "$watcher_status"` により毎回 rc=1 が返り、exit code がシグナルとして機能しなくなる。

### 検出不能性: テストが自分で sentinel を書いている

`tests/integration/t-team-up-watcher-arming.test.ts`（**268 行**、`wc -l` 実測）は本欠陥を構造的に検出できない。

| 箇所 | 内容 | 影響 |
| --- | --- | --- |
| :36-43 | agmsg の `agmsg_ready_path` を自前スタブに差し替え（verbatim :42 `agmsg_ready_path() { printf '%s/run/ready.%s__%s' "\${SKILL_DIR:?}" "$1" "$2"; }`） | 実 agmsg の path 解決は登場するが、**書き手**は登場しない |
| :87-91 | `armAll()` がテスト自身で全 role の sentinel ファイルを直接生成 | 「armed になる」経路がテスト側の書込で代替される |
| :60 | fake herdr が `FAKE_RESEND_ARMS=1` のとき send-text 時に sentinel を touch | 再送で arming する挙動もテスト側の擬似実装 |

すなわちテストは「sentinel があれば 0 を返す / なければ再送してから非ゼロ」という **team-up.sh 内部の分岐だけ**を検証しており、「実運用で sentinel を書くのは誰か」という統合面をスタブで消している。本欠陥は導入（#1391、2026-07-23）以来 CI 上で常時グリーンだった。

**教訓（テスト設計）**: 外部 seam の readiness 信号を待つコードのテストでは、信号の**書き手をスタブで代替した時点で、その検証は seam 契約の妥当性を一切保証しない**。少なくとも「実 agmsg 経路で sentinel が生成されること」を1本の統合テストで固定するか、書き手側のモード条件を明示的にアサートする必要がある。

### 原因の所在

設計段階の誤り（実装逸脱ではない）。`cid:application-design:external-seam-vocab-measurement`。根治は [Issue #1476](https://github.com/amadeus-dlc/amadeus/issues/1476)（actas 移行）で扱い、本 intent（#1449）は起動レイテンシの解消に限定する。

> **訂正（260724-watcher-timeout-fix 節に対して）**: 下記「watcher arming 検証が mux_attach を最大 270 秒ブロック（260724…）」節は当該 intent の observed `6d4df9056` 時点の記述。`9b851c5ae` により worst-case は 180 秒へ短縮済みで、かつ本 scan により**タイムアウト長は症状であり原因ではない**ことが確定した（原因はモード不一致で、待ち時間をいくら延ばしても検証は成功しない）。

## Issue #1466 solo standing grant（260725-solo-standing-grants、2026-07-25、履歴）

base `6d4df90566dcf7aa00980e5f9e85c831ca9108ba`、observed `4491310cc0b432eb404524ef30a7d8a0a3f68f73`。[Issue #1466](https://github.com/amadeus-dlc/amadeus/issues/1466)。[PR #1468](https://github.com/amadeus-dlc/amadeus/pull/1468) は凍結試作で参考のみ、実装前提にしない。

強みは human grounding、4時間既定 TTL、phase-boundary opt-in、walking-skeleton exclusion、issuer provenance、protected audit mint。負債は route / commit identity と carrier の欠如、`findActiveStandingGrant` の最大 expiry 選択・同値 tie-break 不在・broad catch、Grant Id parse shape 検証欠如、raw filesystem audit fabrication、二重 error aggregation である。

## fallback・テスト・保守性

認可拒否は現行 `error()` に直行し、state child と orchestrator の双方が `ERROR_LOGGED` を残し得るため、commit 時失効には使えない。fallback は `emitApprovalAudit` / state mutation 前で typed non-error とし、完了監査を残さない。関連178テスト、dist 6 harness check、promote 4面 check は成功。`bun run check` は `tsc: command not found`（exit 127）で未判定。巨大ファイル `amadeus-lib.ts` 約7,602行、`amadeus-state.ts` 約4,467行、`amadeus-orchestrate.ts` 約3,781行が変更 hotspot。base..HEAD の grant core は無変更だが、orchestrate plugin 系 `+109/-3` が同時編集面である。実装方式は後続設計で比較する。

## PR #1469 レビュー findings（260725-mirror-review-fixes、履歴）

### 基準実測

- PR: [#1469](https://github.com/amadeus-dlc/amadeus/pull/1469)、review head/observed `70336937529f5be31c011de5d368c0f03e534506`、base point `6d4df90566dcf7aa00980e5f9e85c831ca9108ba`、49コミット。
- focused baseline: `bun test` で config、codec、coordinator、lifecycle、legacy CLI、coverage normalizer の7ファイルを実行し、**127 pass / 0 fail / 274 expect()**（16.68秒）。
- baseline が green でも、以下6欠陥条件のテストが不在のため品質保証にはならない。各修正は最初に red reproduction を追加する必要がある。

### P1 — 未完了 lifecycle outcome が exit 0

`runMirrorLifecycleMain` は top-level error だけを検査し、`pending`、`safety-blocked`、`suppressed` を JSON 出力して0を返す。orchestrator 側は子コマンド成功後に receipt を completed とするため、remote effect 不成立を完了扱いにできる。boundary/manual の要求 operation が `completed` でないケースを非0に固定する CLI-level regression が必要。

### P1 — prompt 回答 surface と binding 照合の欠落

coordinator unit と lifecycle integration は event/operation を再送した `answer` が state 内の `expectedPrompt` を消費することを検証するが、`MirrorPromptAnswer` と `ask` outcome は `bindingId` を持たず、保存済み binding と外部回答の一致を検証していない。approve は event/operation のみを照合し、skip はその照合も迂回する。実 CLI parser/entry からの回答経路に加え、default prompt で ask→正しい binding の approve/skip、binding/event/operation mismatch の拒否、同一回答 replay 拒否、次 boundary prompt 成功までの process/CLI integration が必要。

### P1 — legacy mutation による安全境界迂回

legacy t232 は create/sync/close の直接 GitHub mutation を成功契約として固定している。新しい lifecycle の permit、receipt、ownership marker、repair と矛盾する回帰テストである。mutation verb の委譲または拒否へ期待値を更新し、read-only status の互換性だけを維持する必要がある。

### Security — config safe read の TOCTOU

fd 内の start/end fstat は読取中の同一 inode 変化を検知するが、`realpathSync` containment 判定から `openSync(realPath)` までに path を置換する競合は検知しない。既存テストは absent、precedence、dangling symlink、directory、non-write を扱うが、symlink/path swap を再現しない。open descriptor を信頼起点にした fail-closed テストが必要。

### Security — state codec の C0 制御文字

custom strict parser は未エスケープ `\n` / `\r` のみ拒否し、NUL、TAB、BS、FF 等の U+0000–U+001F を受理する。標準 JSON 文法との差で、state の canonical render/parse と downstream Markdown/audit 処理に非正準 bytes を持ち込める。全C0 code point の table-driven rejection と escaped form の許可を対にする。

### Coverage — Cursor/OpenCode source 正規化漏れ

package temp regex と generated prefix table の双方に Cursor/OpenCode がない。`.cursor/tools/*`、`.opencode/tools/*`、`dist/cursor/.cursor/*`、`dist/opencode/.opencode/*` と temp package path が core source へ畳まれず、同じ正本が複数 SF として計測される。全6 harness、Windows separator、temp root containment、harness-dir mismatch の対称テストが必要。

### 保守性所見

Mirror の大型ファイル（lifecycle 909行、coordinator 708行、state codec 1,526行等）と gateway lexer 共通化は実在する技術的負債だが、本 bugfix と変更理由が異なるため別 `amadeus-refactor` intent に隔離する。今回の変更は6欠陥とその回帰テストに外科的に限定する。

## ハーネス provenance・plugin 信頼層のテスト追加（260725-kimi-harness、2026-07-25、履歴）

実測基準は base `6d4df90566dcf7aa00980e5f9e85c831ca9108ba` → observed HEAD `d31b8a5db5798ef761f3871ca66824c87530afb4`、祖先性 exit 0、距離 105。本 intent はコード欠陥の修正ではなく移植面の再測定が目的のため、品質観測は**区間内のテスト資産変化**に限定する(測定 ref: observed HEAD `d31b8a5db` 実ファイル直読 + `git log 6d4df9056..HEAD`)。

**区間内の新規テスト(harness provenance 系、`dc1eeba20` + `58053fa61`)**:
- `tests/unit/t269-harness-provenance.test.ts` — canonical ハーネス写像契約の pure テスト(`HARNESS_DIR_TO_TYPE` / `detectHarnessType`、:1-2 covers 記載)。
- `tests/integration/t269-harness-provenance.cli.test.ts` — resolver provenance・検出優先順位・legacy cache。
- `tests/integration/t270-harness-provenance-birth.test.ts` — 全 packaged ハーネスでの実 intent birth(`Harness` フィールド、workflow:intent-birth)。
- `tests/integration/t271-migration-harness-validation.cli.test.ts` — `amadeus-migrate` dry-run の harness 検証(CLI spawn)。
- `tests/integration/t144-harness-seam.cli.test.ts` — `harnessDir()`/`resolveProjectDir()` の解決 ladder をハーネス dir 横断で固定(harness seam)。

**plugin 信頼層のテスト更新(`f67b931c2` + `454194231`)**: `tests/unit/t252-plugin-composition.test.ts`(in-memory backend で全分岐を駆動する pure unit)が sha256 `contentDigest`・journal 信頼付与・drop 時ドリフト拒否に追随。`454194231`「cover runtime trust verification」は実行時信頼検証を被覆し、`t-formal-verif-plugin-lifecycle.integration.test.ts` にも +90 行の被覆追加(同コミット numstat)。

**kimi 作業時に参照すべき既存ハーネステスト様式(HEAD 実測)**:
- `tests/integration/t145-packaging-parity.test.ts` は `package.ts --check` を spawn する byte-parity の keystone。
- `tests/integration/t-cursor-adapter.test.ts` は注入した spawn spy を使う in-process 型。
- `tests/integration/t-opencode-emit.test.ts` は in-process の write⇔check ラウンドトリップ。
- `tests/smoke/t149-opencode-cursor-dist-structure.test.ts` は module スコープのリテラル期待ファイル表(manifest 由来ではない)で dist 構造を固定。
新ハーネス追加時はこれら 4 様式のどれに倣うかがテスト設計の分岐点(t149 型は期待表の手更新が必要)。

> **以下は intent `260724-watcher-timeout-fix`（2026-07-24、amadeus-bugfix / Minimal）の履歴観測**。以下の過去 intent 節に残る「本 intent」「最新」「現在」は各見出しで明示した履歴 intent を指し、今回 intent の current marker ではない。

## watcher arming 検証が mux_attach を最大 270 秒ブロック（260724-watcher-timeout-fix、履歴、Issue #1449）

実測基準は base `a81c11dde83e0059c48ecc912d2d22dd6bca60eb` → observed HEAD `6d4df90566dcf7aa00980e5f9e85c831ca9108ba`、祖先性 exit 0、距離 155。差分 1762 files のうち本問題の交差面は `packages/framework/core/tools/team-up.sh`(1462 行新規パス)と `tests/integration/t-team-up-watcher-arming.test.ts`(197 行新規)のみ(測定 ref: `git diff --numstat a81c11dde..HEAD -- <両パス>`)。導入は区間内 2 コミット: `42c9341d8`(#1391、`verify_watchers_armed` 検証ロジック本体 = #1384 修正)+ `0d24c6f93`(#1421、`scripts/team-up.sh` → `packages/framework/core/tools/` 昇格 + 配布 11 コピー、ロジック不変)。

**性能欠陥(S3-MAJOR / 回避策あり — 正常系は無影響)**: `verify_watchers_armed`(`team-up.sh:1139-1178`)は外側 = 再送試行(`max_attempts = WATCHER_RESEND_MAX + 1` = 3、:1141)、内側 = 1 秒刻みで unarmed メンバーをポーリングし `[ "$waited" -ge "$WATCHER_READY_TIMEOUT" ] && break`(:1156)で 1 ラウンド最大 `WATCHER_READY_TIMEOUT`(既定 90、:101)秒待つ二重ループ。呼び出し元(:1442-1445)が直後の `mux_attach "$S"`(:1448)の**前**でこれを無条件実行するため、**1 メンバーでも armed しないと 90×3=最大 270 秒(4.5 分)ユーザーの team ペインアタッチをブロック**する。全員即 armed の正常系は内側即 break(:1155)で無待機(Issue 報告の実測 59.1ms)。

**リスク評価**:
- **重大度**: S3-MAJOR。データ・監査整合性の破壊やワークフロー停止ではなく、起動レイテンシの UX 劣化。回避策(手動 Ctrl-C 後アタッチ、env `WATCHER_READY_TIMEOUT`/`WATCHER_RESEND_MAX` 上書き)が存在。限定条件(1 メンバー以上が watcher unarmed)でのみ発現。
- **原因の所在(cid:bug-intent-linkage)**: **設計(受容されたリスクの先送り)**。`260722-teamup-prompt-race`(#1384/#1391)の `requirements.md` FR-4(:17)で 90 値を `~/.agents/skills/agmsg/scripts/spawn.sh:132 READY_TIMEOUT=90` verbatim に接地(**根拠あり・マジックナンバーではない**)、FR-3 [e4] 留保(:16)で「起動レイテンシが将来問題化した場合のみ `--no-wait` を再検討」と本問題を予見・先送り、FR-5 [e5] 留保(:18)で「exit code 分岐は mux_attach より前に検証完了が前提」と attach 前ブロックを契約化。実装は設計どおりで**逸脱なし**。
- **接地の非対称**: agmsg spawn.sh(:576-588)は `WAIT_READY=1` で**単発 90 秒待ち**、タイムアウトで `exit 3`(再送ループ無し = `grep RESEND/resend/retry` 0 hit)。値 90 は一致するが、team-up.sh の `verify_watchers_armed` は spawn.sh に無い再送ループ ×3 を独自追加し worst-case を 3 倍(270 秒)に増幅している。
- **テスト盲点**: `t-team-up-watcher-arming.test.ts` の fixture は `WATCHER_READY_TIMEOUT: "0"`(:79)を設定するため、90/270 秒の実待機はテストで一切踏まれず**タイミング挙動は構造的に無被覆**。落ちる実証・回帰テストには timeout の実待機を注入する seam が要る。
- **修正の設計判断ポイント**: (1) `--no-wait`/`WAIT_READY` フラグ(FR-3 [e4] 予約済み緩和策) (2) `mux_attach` 後への非同期化(FR-5 exit code 契約と衝突) (3) タイムアウト予算縮小(90 接地 or 再送ループのいずれかを崩す) (4) タイミング seam 追加。いずれも exit code 分岐・no-silent-success(検証劇場 Forbidden)を壊さないことが制約。

## marker 成果物への required-sections floor 誤適用（260723-marker-heading-exemption、履歴、Issue #1296）

実測基準は base `a81c11dde83e0059c48ecc912d2d22dd6bca60eb`(直近 freshness pointer の observed)、observed HEAD `ffc79aad9a53c600ea9b464f1f04c6fa627ae59e`、祖先性 exit 0、距離13。差分 96 files のうち本バグ交差面は**ゼロ** — 非 record 差分(`scripts/team-up.sh` +163 ほか、51 files)は required-sections センサー正本・`amadeus-graph.ts` の弁別関数・sensors manifest・stage marker 宣言のいずれとも無交差(測定 ref: `git diff --shortstat/--stat a81c11dde..HEAD`)。よって欠陥は base より前から現存し observed に不変で貫通。

### 確定欠陥 — 汎用 ≥2-H2 floor の marker への無条件適用（S3 相当、#1296）

- `packages/framework/core/tools/amadeus-sensor-required-sections.ts:141` `let pass = h2_count >= 2;`(`:147` `findings_count = Math.max(0, 2 - h2_count)`)が**全成果物へ無条件適用**される。単一行 timestamp / [Answer] 様式 questions のような「意図的に H2 を欠く」marker を floor から免除する分岐が**不在**。
- **偽 FAIL の機序**: marker は H2=0 → `pass:false`, `findings_count:2`。read-only 再現で timestamp marker `{"pass":false,"h2_count":0,"headings":[],"findings_count":2}`、questions marker も同一 floor FAIL を確認(exit code は常に 0、verdict は JSON フィールド)。
- **ELIGIBILITY GATE は不十分**: `:167-186`(stem 判別 `:173` `basename(outputPath).replace(/\.md$/, "")`)は marker に heading-set template を当てないだけで floor は維持する(`:184-185` verbatim `keeping the generic >=2-H2 floor.`)。GA では template は普通 miss するため marker は常に floor で FAIL。
- **manifest 記述も現行仕様を明記**: `packages/framework/core/sensors/amadeus-required-sections.md:52-53` verbatim `a template resolving for a questions/timestamp marker is ignored with a config warning, and the marker keeps the generic floor.` — 免除実装時は同一 PR で更新対象。

### 再利用候補（欠けている免除述語の既存実装）

- `packages/framework/core/tools/amadeus-graph.ts:801-808` `templateEligibleArtifacts` が既に artifact 名 suffix で marker を弁別(`!a.endsWith("-questions")` / `!a.endsWith("-timestamp")`)。artifact 名 X ↔ 出力 stem X 規約により、センサー側 `stem.endsWith("-timestamp"||"-questions")` はこの関数の否定と一致 = floor 免除へそのまま再利用可能。現状 suffix チェックは graph 側にインライン1箇所のみ(canonical `isMarkerArtifact` 抽出で2定義ドリフト回避が設計選択肢)。

### 既決ノルムとの乖離（原因の所在 = 実装、cid:bug-intent-linkage）

- team 規範 `cid:practices-discovery:e-fvepd-marker-heading-floor`(learned 2026-07-20)は「approval 前に H2 を意図的に欠く `*-timestamp.md` / `*-questions.md` を prose-heading floor から明示的に免除する」と**既に規定**している。#1296 は規範が要求する免除がセンサー実装に未反映という乖離であり、修正は文書化済み仕様への回復(バグ修正)であって仕様変更ではない。

### テスト・回帰ガード

- 既存 `tests/unit/t155-template-override.test.ts` は `:130` で marker 弁別、`:251`/`:267` で floor pass:false を prose 入力(`requirements`)で固定。免除の落ちる実証は「marker stem → pass:true」の新テストを integration 層(実 FS、cid:fs-tests-integration-first)へ足し、既存 floor テストの prose 入力を保つ。corpus sweep 対象は `intents/` 配下 `*-questions.md` 391件 / `*-timestamp.md` 22件(免除後に floor 免除で pass:true になる想定、cid:corpus-sweep-for-new-guards / injection-surface-verify)。`codekb/` 配下 timestamp 1件は manifest filter(`:8` `**/{amadeus-docs,intents}/**`)非適合で元々非発火のため免除の対象外(免除は filter を変えない)。

> 以下は過去 intent の履歴。

## t241 の CI-resident 表明と実行実態の乖離（260723-t241-ci-residency）

差分リフレッシュ（base `a81c11dde` → observed `78bce876`、距離 35、bugfix / Minimal）。**本バグ面は base..HEAD で無変更**（`git diff --numstat <base>..HEAD -- tests/e2e tests/run-tests.ts .github/workflows package.json` = 0 行）で、欠陥は intent `260718-election-ts-foundation`（PR #1235）由来、本区間 35 コミットとは無交差（測定 ref: scan-notes @ observed HEAD `78bce876`）。

- **品質欠陥クラス = 検証劇場に隣接する「表明と実行実態の乖離」**: `tests/e2e/t241-election-machine-executor.test.ts` はヘッダ（:1）で「CI-resident」、本文（:4-5）で「strongest standing proof of FR-0」を主張するが、`tests/e2e/` 配置ゆえ自動 CI（`--ci` = smoke+unit+integration、`run-tests.ts:197-202`）では一度も実行されない。FR-0 の「常設保証」が実行実態で担保されていない偽の安心を生む（team.md の検証劇場 Forbidden と同族の弱い形）。
- **原因所在 = 実装逸脱**（cid:bug-intent-linkage）: ADR-6（`application-design/decisions.md:41-48`）は layer (i) 機械実行器を「integration テストで固定する」と明記。設計は正しく integration を指定していたが、実装（#1235）が `tests/e2e/` に配置し、CI 実行範囲との整合検証（--ci に e2e 非含有）を欠いた。
- **対照の健全例**: sibling `t237`（:1-5）は「Layer: e2e」と正直宣言し CI-resident を自称しない（e2e walking-skeleton の正配置）。t241 単独の主張過剰。
- **回復可能性が高い**: integration に election CLI spawn 兄弟が 6 本既存（t235/t236/t240/t242/t244 + t-formal-verif-arm-s-blind、`grep -rln` = 6）で `--ci` により CI 実行済み。t241 は spawnSync+fs → `classifyTestSize`=medium で integration MAX=medium に適合（size purity clean）、`gen-coverage-registry.ts` 未登録のため registry 影響も小。移設は ADR-6 本来配置への回復で新規機構不要。

## team 起動 watcher-arming の品質観測（履歴: 260722-teamup-prompt-race）

実測基準は base `a326f47bc0146a3b4285552f42b92fd61fb343a7`、observed `a81c11dde83e0059c48ecc912d2d22dd6bca60eb`、祖先性 exit 0、距離101。差分 2593 files のうち本バグ交差面は `scripts/team-up.sh`（+212 −8）と付随テストのみ（測定 ref: `git diff --shortstat/--name-only a326f47..HEAD`）。

### 欠陥形状（一発勝負 = 検証・リトライ欠如）

- `scripts/team-up.sh:800` `claude_member_cmd()` が init_prompt `/agmsg mode monitor` を固定し、`:830-832` で `run-claude.sh` の位置引数へ組立（quoting は `%q` で正常）。`run-claude.sh` 末尾 `exec claude --dangerously-skip-permissions "$@"` → claude 初期プロンプトとして**一度だけ**渡り、TUI 起動レースで取りこぼされても再送・検証がない。
- pane 起動 `:429`/`:447` は `herdr pane run` で cmd を一度 exec するのみ。
- `start_safety_wait_supervisors()`（`:338-395`）は `:340` `[ "$RUNTIME" = "codex" ] || return 0`（verbatim）で claude では即 return → claude runtime に起動後 readiness 検証が構造的に不在。

### 対照実装（欠けている契約）

agmsg `spawn.sh:576-588`（repo 外 read-only）は ready センチネル出現までブロックし `status=ready` を出力（default `--ready-timeout` 90s `:46-47`）。センチネルは `agmsg_ready_path`（`lib/actas-lock.sh:69-73`）が team+role でキーし、`watch.sh:294-310` が DB 可読性検査後に touch する。team-up.sh の claude 経路はこの handshake 相当を欠く。

### テスト・回帰ガード

- **watcher arming の回帰テストはゼロ**。既存 team-up テスト（`tests/integration/t-team-up-msg-backend.test.ts` 他）は init_prompt / `agmsg mode monitor` / ready / watch を一切参照しない（`grep -c` = 0）。修正時に落ちる実証（初期プロンプト取りこぼし→watcher 未起動の検出）を新設する必要がある（fs/herdr 実使用は integration 層、fs-tests-integration-first 準拠）。

### 原因の所在（cid:bug-intent-linkage）

**設計（一般化漏れ）**: 直近 intent `260721-teamup-safety-wait` が起動後の pane readiness 検証を Codex 専用に新設（`team-up.sh:212-395`,`:1259` + `team-up-codex-safety-wait.ts` +567）したが、claude 経路へ一般化しなかった。既存の Codex 検証構造は claude 版検証の再利用先例（`resolve` の `agent === "codex"` フィルタは拡張要）。

> 以下は過去 intent の履歴。

## upstream v2.3.0 同期の品質評価（履歴: 260720-upstream-sync-230）

実測基準は base `a326f47bc0146a3b4285552f42b92fd61fb343a7`、observed `545e69c836d46f7bec2fa351c8e668026eb5fad5`、祖先性 exit 0、距離32。差分は865 files、`+48,636/-241` だが、大半は選挙 record、生成投影、工程記録であり、24項目の実装済み根拠として数えていない。次点 observed `591b6a2a` は距離84、他の日付が新しい observed は非祖先（exit 1）のため base 候補から除外した。

### 24項目の品質サマリ

| 判定 | 件数 | 識別子 |
|---|---:|---|
| MISSING | 19 | 1,4-9,11-13,15-23 |
| PARTIAL | 4 | 2 gate-revision-backstop、10 gate-next-stage-naming、14 kiro-ide-hook-context、24 docs-updates |
| EQUIVALENT 候補 | 1 | 3 swarm-batch-advance |

EQUIVALENT 候補は、`amadeus-orchestrate.ts:1961-1972` の全 batch 走査と `amadeus-swarm.ts:724-769` の merge failure 降格を upstream 契約と対応させた結果である。後続 requirements で回帰テストによる確証後、実装項目から外す候補とする。PARTIAL は内部情報・一部 adapter・一般 docs があるだけで、公開契約の完了は意味しない。

### テスト・ドリフトガード

- Tests: 461 files（unit 216 / integration 159 / e2e 70 / smoke 14）。upstream t199-t219/t188 相当は未移植。
- `bun scripts/package.ts --check`: exit 0、6/6 harness PASS。
- `bun scripts/promote-self.ts --check --no-build`: exit 0。
- `bun run lint:check`: exit 0、593 files、208 warnings、16 infos。
- `bun run typecheck`: exit 127（`tsc` 不在）。型品質の green 根拠にはしない。
- Full tests: RE では未実施。Construction の完了判定に流用しない。

### 保守性リスク

巨大ファイルは `amadeus-lib.ts` 6,070行、`amadeus-utility.ts` 4,281行、`amadeus-migrate.ts` 3,823行、`amadeus-state.ts` 3,562行、`amadeus-orchestrate.ts` 3,215行。認知複雑度の高い例は stop 145（`:520`）、swarm 54（`:601`）、stage-schema 49（`:136`）。今回は新しい共通 abstraction を先に作らず、schema、packager、host adapter の既存チョークポイントに最小変更を置く。plugin は最大 block で、non-active の byte-identical、no-clobber、6面 projection を同時に検証しなければならない。

> 以下は過去 intent の履歴。

## hooks-config-conflict の観測面 — tracked canonical と runtime writer の所有権衝突（2026-07-18、履歴、Issue #770）

現行コード基準 observed HEAD `594ba21d636218558b711b371c286f16731fb081`、base `e9a001105d253e14affb77417423d9f0b0360f9e`（祖先・距離8）からの diff-refresh。フォーカス契約は区間で変更0件であり、[Issue #770](https://github.com/amadeus-dlc/amadeus/issues/770) の再発は既存 repository 契約と外部 agmsg 1.1.7 writer の組合せが Codex 再導入で再顕在化したもの。

### 確定 finding

- HEAD の `.codex/hooks.json`、`.codex/hooks.json.example`、dist example は同一 blob（1925 bytes／93 lines）。一方、現 worktree の active file は2021 bytes／改行0、`1 insertion / 93 deletions` で、agmsg monitor の SessionStart／SessionEnd各1件と machine／clone絶対 path を持つ。
- agmsg 所有 entry を除外した意味比較では、Amadeus の9 command と PostToolUse matcher は全て保持される。故障は hook 破壊ではなく、正常な runtime state が tracked canonical に書かれる所有権衝突である。
- `delivery.sh` は既存 agmsg group を strip してから再追加するため entry 重複は防ぐが、SQLite JSON1 の compact rewrite と絶対 path 追加により tracked bytes は不変にならない。pretty-print だけでは受入条件を満たさない。
- `codex-monitor.sh:194` と `scripts/team-up.sh:742-748` が monitor 設定を再適用するため、手動復元や `set off` は次の monitor 起動で再発する。
- [PR #783](https://github.com/amadeus-dlc/amadeus/pull/783) は marker の ignore／preserveだけを解決済み。現行 agmsg 1.1.7 は marker を読まず書かず、hooks自体が mode source of truth である。

### 回帰テストの空白と完了条件

既存 `t150` は example の event／matcher、trust path、dist driftを、team-up integration は delivery呼出しを検証するが、fake delivery は active fileを書き換えない。次の回帰が欠落している。

1. disposable Git fixtureで monitor登録前後の tracked bytes と `git status --porcelain` が不変。
2. Amadeus 9 command／3 PostToolUse matcherを維持し、agmsg mode再設定で重複しない。
3. tracked contentに skill／clone／userの絶対 pathがない。
4. monitor→off→turn→monitor と Codex再起動後のbridge deliveryが成立する。
5. `dist:check`／`promote:self:check`／trust seedを維持し、既存 dirty active fileを安全に移行する。

恒久案A（active hooksのuntrack／ignore）と案B（tracked static dispatcher + ignored sidecar）は `【裁定待ち】`。実装PRは裁定後、上記fixtureを先に赤化し、diff追加行未カバー0を満たす必要がある。

## state-mirror-fixes の観測面 — set-status 無ロック RMW と countStageProgress SKIP 分母(2026-07-18、履歴、#1170 #1172)

現行コード基準 observed HEAD `591b6a2a222357f41061128f1b5a93c7f7a877be`(`git rev-parse HEAD` 実測、worktree = `origin/main` 一致)、base `6495e03a12d9e7149c2e80b59f171a90607a2d2c`(全 `re-scans/*.md` observed のうち HEAD 祖先・距離最小=126、cid:reverse-engineering:rescan-base-ancestry)からの diff-refresh。base/observed 決定過程と現物照合の真実源は本 intent の `inception/reverse-engineering/scan-notes.md` および `re-scans/260717-state-mirror-fixes.md`。件数・行番号は observed HEAD の実ファイル直読(cid:measurement-ref-in-artifacts)。Focus seam(set-status の無ロック RMW と state ロック機構)は区間126コミットで実質不変であり、確定した2欠陥は base より前から現存(#1170、pre-existing)または #1169 で新規導入(#1172)。

### 確定欠陥1 — set-status の無ロック read-modify-write(#1170、S2 相当・pre-existing)

- `handleSetStatus`(`packages/framework/core/tools/amadeus-utility.ts:3666-3690`)は `withAuditLock` を取らない無防備な RMW。`:3679` で state をスナップショット読み(S0)→ setField×6(Lifecycle Phase / Current Stage / Active Agent / In Progress / Status / Last Updated)+ `:3686` `setCheckbox(content, stage, "in-progress")` で `[-]` 化 → `:3687` `writeStateFile` で S0 ベースの全文上書き。関数内に `withAuditLock`/`acquireAuditLock` 呼び出しは皆無(関数内 grep 0)。
- **唯一の非エンジン state.md 内容ライター**: state.md へ内容を書く hook は `.claude/hooks/amadeus-sync-statusline.ts:69-73` の `Bun.spawnSync(["bun", toolPath, "set-status", …])` のみ(11 hook 全数 grep で他10 hook は read・breadcrumb・heartbeat のみ)。TaskUpdate→in_progress ごとに発火(`:44` status ガード、`:50` activeForm `[slug]` 抽出)し、per-unit Construction では各 stage の TaskUpdate ごとに engine report/advance と競合する。
- **対照(エンジン側は保護済み)**: `amadeus-state.ts` の全 RMW ハンドラ(`handleSet:500`、`handleAdvance:1223`、`handleFinalize:1454`、`handleCompleteWorkflow:1573` 等)は `withAuditLock`(`:251-266`)保護下。set-status だけがロックドメイン外にある片側非対称(cid:requirements-analysis:symmetric-pair-review の RMW ロック面)。
- **自己記述コメントが未保護を明言**: `writeStateFile`(`amadeus-lib.ts:3562-3583`)のコメント(`:3578-3581`)— atomic rename は torn-write 防止のみで「Lost-update safety … is a SEPARATE, larger change tracked as a follow-up」。
- **race 機序**: `B.read(S0) → A(エンジン).lock/write(S1) → B.write(S0')` で A の進行が古いスナップショット由来書込に上書きされ、checkbox `[-]` と Current Stage が巻き戻る。`handleSetStatus` は audit を一切 emit しない → 巻き戻りは state.md のみで audit は健全 = **Issue #1170 の症状(audit 健全・state 巻き戻り)と完全一致**。set-status は intent フラグなし(`:3667` `stateFilePath(projectDir)`)で active intent に解決するため、並行 builder/サブエージェントの set-status 同士も相互 lost-update する。

### 確定欠陥2 — countStageProgress の SKIP 語彙取りこぼし(#1172、#1169 で新規導入)

- `scripts/amadeus-mirror.ts:87-105` の `countStageProgress` は分母除外の唯一条件が checkbox `[S]`(`:100` `if (m[1] === "S") continue;`)。
- **実様式との乖離(format-currency-grep 実測、cid:reverse-engineering:format-currency-grep-for-parser-intents)**: scope-SKIP の現行様式は `- [ ] <stage> — SKIP`(空 checkbox + 行末サフィックス)で、`[S]` checkbox ではない。全 state 横断集計: `[ ] — SKIP` **717件** / `[ ] — EXECUTE` 70件 / `[x] — EXECUTE` 414件 に対し、`grep -rn '^- \[S\]' amadeus/spaces/default/intents/*/amadeus-state.md` = **0件**(`[S]` は実コーパスに1件も存在しない runtime jump marker)。
- 結果、scope-SKIP 行が `total++` に混入。260717-mirror-issue-tool の実データ(EXECUTE 18 / SKIP 14 / 全32行)で `countStageProgress` は 18/32 を返す(期待 18/18)— 症状再現確定。
- **根本原因**: checkbox(実行状態、`setCheckbox` `amadeus-lib.ts:3785`)と suffix(計画、`setStageSuffix:3805`、コメント `:3799-3803`「setCheckbox owns the marker (run-state); this owns the suffix (the plan)」)は直交2フィールドだが、`countStageProgress` は checkbox だけ見て計画サフィックスを無視した。信頼できる分母信号は行末 `— EXECUTE`/`— SKIP`(計画)。

### テスト空白(2件)

- **t232 偽 green fixture**: `tests/unit/t232-amadeus-mirror.test.ts:72` の fixture が実在しない `[S]` 様式(`- [S] market-research — SKIP`)を捏造し `:82` で green。実様式 `[ ] X — SKIP` を fixture に含めていれば赤くなった(format-currency-grep-for-parser-intents 違反の典型)。修正 PR は実 state 由来 fixture を追加すべき。
- **t145 の set-status 未カバー**: `tests/integration/t145-state-lock-concurrency.test.ts` はエンジンハンドラ(`set`/`reject`/`approve`/`skip` 等 `:26-27`)の C2b lost-update のみ対象。`set-status` はテスト本体ヒット 0(`grep -rln 'set-status' tests/`)→ #1170 の実欠陥経路(hook 書込)は concurrency 未カバー。

### 品質機構への含意

- 本バッチは2欠陥とも「片側だけ実装された非対称」+「実様式を含まない fixture の偽 green」という既知の再発クラスタ(cid:requirements-analysis:symmetric-pair-review / cid:reverse-engineering:format-currency-grep-for-parser-intents)。修正 intent は bugfix posture でリグレッションを第一級成果物とし、#1172 は実 state 由来 fixture の 18/18 assert、#1170 は set-status の `withAuditLock` 参加 + set-status ∥ advance の並列 spawn テスト(t145 様式拡張)を追加すべき。

## swarm driver 契約の品質評価（2026-07-13、履歴 intent 260713-swarm-driver-migration）

### 現在確認できる強み

- engine eligibility は autonomy、runtime graph、stage mode、walking-skeleton、成果物 coverage から決定される。#841 の「完了した batch 1 を再提示し続ける」欠陥は、`amadeus-orchestrate.ts:1792-1811` の最初の未完了 batch 選択で解消済みである。
- referee は `prepare`／`check`／`finalize` を分離し、protected file の改竄、lying conductor、merge failure、baton return を real process／worktree で検証する既存 e2e を持つ。
- packaging は `dist/<name>/` 全域の orphan scan（`scripts/package.ts:692-709`）と harness source-side unreferenced scan（`:711-725`）を持つ。過去の #701／#735 finding は解消済みである。
- canonical source→6 harness `dist` の byte drift と、Claude／Codex／Cursor／OpenCode self-install drift を決定的に検査する既存 gate がある。
- Codex exec journey、Kiro ACP tool trace、Claude live journey という opt-in transport seam があり、live proof の土台を再利用できる。

### 未解決 finding

| ID | Finding | 影響 | 必要な検証 |
| --- | --- | --- | --- |
| SD-01 | `AMADEUS_SWARM_DRIVER` の製品実装0件 | 公開5値と既定 `auto` を解決できない | 有効値、不正値、harness mismatch、旧変数、設定競合の全 selector matrix |
| SD-02 | driver 選択が harness skill prose に分散 | 同一入力から同一選択を機械保証できない | topology／capability 入力だけから決まる pure selector の unit test |
| SD-03 | native capability probe がない | 明示 driver の保証と `auto` fallback の根拠を作れない | available／unavailable／malformed evidence、worker 起動前 hard error の integration test |
| SD-04 | `invoke-swarm` が driver-neutral、監査は旧 degrade 2値のみ | requested／selected／reason／native evidence を再現できない | 全 swarm event の payload／correlation と secrets 非記録の audit test |
| SD-05 | live AI worker を既存 swarm test が起動しない | driver 名や flag だけの偽対応を検出できない | 4 driver それぞれ2 Unit以上の native event／trace＋referee convergence |
| SD-06 | Claude／Codex／Kiro の実行面が同一 subprocess 形ではない | 共通 dispatcher へ過剰抽象化すると live tool 境界を壊す | harness adapter 単位の command／env／cwd／stdin／trust 契約テスト |
| SD-07 | `scripts/package.ts`／`amadeus-swarm.ts` 冒頭コメントに古い harness／旧変数前提が残る | 保守者が正本境界を誤解する | 実装時の正本コメント、docs、全 dist、self-install 同期確認 |

### 完了判定上の stop-gate

明示 driver が利用不能な場合に別方式で成功扱いした時点、または Agent Teams／Ultra Code／Codex Ultra／Kiro subagent のいずれかで2 Unit以上の native 証跡を機械判定できない時点で、この intent は完了扱いにできない。CLI flag／環境変数の受理、worker の自己申告、referee の convergence だけでは native driver 利用の証明にならない。

### 既存 finding の訂正

| 過去 finding | 2026-07-13 の現状 |
| --- | --- |
| #841 完了 batch 再提示 | 解決済み。未完了 batch の成果物 coverage 選択が実装済み |
| #735 source-side unreferenced 不在 | 解決済み。`readSources` と harness source tree の差集合を検査 |
| #701 dist root orphan blind spot | 解決済み。`dist/<name>/` の whole-tree scan を実装 |

過去節は欠陥発見時の分析根拠として温存するが、上表の3件を現存問題として後続要件へ持ち込まない。

> 「docs-batch10(2026-07-12)の観測面」節は履歴 intent `260711-docs-batch10`(#765 #764 #763 #728、documentation)の候補記録。続く p3-cleanup-batch8 節(#843 #846 #850 #851 #876 #877 #878、intent `260711-p3-cleanup-batch8`)・p2-repair-batch7 節(#834 #839 #844 #845 #849、intent `260711-p2-repair-batch7`)・p3-cleanup-batch5 節(#811 #822 #830 #730 #819 #831、intent `260710-p3-cleanup-batch5`)・p3-cleanup-batch4 節(#757 #758 #753 #739 #740 #784 — 全6件 2026-07-10 修正着地済み、PR #823/#821/#817/#818/#814/#815)・core-repair-batch3 節(#746 ほか9件、2026-07-11)・複雑度ゲート導入節(intent 260710-complexity-gate)・ tools-dispatch-batch 節(#774 / #785 / #787 / #788 / #789)・ bughunt-fix-batch 節(#771/#773/#775/#776/#779)・swarm-worktree-batch 節(#738/#748/#746/#760)・learnings-audit-batch 節(#754 / #745 / #761)・mint-presence-vectors 節(#755)・packaging source-unreferenced 節(intent 260710、#735)・delegate-answer-consume 節(intent 260710、#736)・kiro-stale-hooks 節(#719 / P3 source hygiene)・dynamic-test-size 節(#699 / #684 Phase D)・t92-worktree-hermeticity 節(#709)・packaging-repair-batch 節(#701/#702 = PR #711/#712 解決済み)は過去 intent の記録で、参照用に温存する。以降の「アーキテクチャ横断パターン」以下は `260709-bug-zero-batch`(#674〜#678/#668)の記録。
> 「docs-repair-batch9(2026-07-11)の観測面」節は履歴 intent `260711-docs-repair-batch9`(#812 #824 #680 #885 #886)の記録。続く p3-cleanup-batch5 節(#811 #822 #830 #730 #819 #831 — 候補記録)・p3-cleanup-batch4 節(#757 #758 #753 #739 #740 #784 — 全6件 2026-07-10 修正着地済み、PR #823/#821/#817/#818/#814/#815)・core-repair-batch3 節(#746 ほか9件、2026-07-11)・複雑度ゲート導入節(intent 260710-complexity-gate)・ tools-dispatch-batch 節(#774 / #785 / #787 / #788 / #789)・ bughunt-fix-batch 節(#771/#773/#775/#776/#779)・swarm-worktree-batch 節(#738/#748/#746/#760)・learnings-audit-batch 節(#754 / #745 / #761)・mint-presence-vectors 節(#755)・packaging source-unreferenced 節(intent 260710、#735)・delegate-answer-consume 節(intent 260710、#736)・kiro-stale-hooks 節(#719 / P3 source hygiene)・dynamic-test-size 節(#699 / #684 Phase D)・t92-worktree-hermeticity 節(#709)・packaging-repair-batch 節(#701/#702 = PR #711/#712 解決済み)は前 intent の記録で、参照用に温存する。以降の「アーキテクチャ横断パターン」以下は `260709-bug-zero-batch`(#674〜#678/#668)の記録。
>
> **履歴ラベルの読み方**: 本ページ以下および `architecture.md` / `business-overview.md` / `api-documentation.md` の「本 intent」は、各節見出しで明示した過去 intent 内の自己参照である。現行 view は各ファイル先頭の `260725-mirror-review-fixes` 節であり、ここから下は履歴として読む。

## docs-batch10(2026-07-12)の観測面 — documentation 4欠陥の現物照合(#765 #764 #763 #728)

現行コード基準 observed `d6375bba68f415ce1a31e9a4d70e07fbfe80be85`(HEAD)、base `60f5e1edf472517c5fc2b4a1c388dd9a5030446c`(前回 intent `260711-p3-cleanup-batch8` の observed、HEAD 祖先の最新・距離64)からの diff-refresh。base/observed 決定過程と現物照合の真実源は本 intent の `inception/reverse-engineering/scan-notes.md`。本バッチは restart-loss ではなく起票時からの docs ギャップ(および tests の stale コメント)であり、区間 `base..observed` diff に4欠陥トークン(`set-skeleton-stance` / `--new-intent` / `18-workspace-layout` / `assertNotSiblingWorktree`)は不在 = 区間で未変化のまま observed に現存。

- **#765(S4/documentation)**: `amadeus-state.ts` の subcommand `set-skeleton-stance`(`packages/framework/core/tools/amadeus-state.ts:371` case、`:445` の Valid 一覧、`:518` handler)が `docs/` 全体で未記載。`grep -rln set-skeleton-stance docs/` = 0 件(実測)。当該 verb は **audit row を持たない**(`:508-517` コメント: 「No audit row — the stance is metadata …」)walking-skeleton stance の runtime metadata(`Skeleton Stance` フィールドを `## Runtime State` 下へ upsert)であり、次の `amadeus-orchestrate next` が deferred Construction Bolt-1 gate を解決するために読む。記載すべき正準ページは `docs/reference/12-state-machine.md`(state verb / `## Runtime State` フィールド / audit event taxonomy の構造。ただし audit event ではないため taxonomy 表ではなく verb・Runtime State 側へ)。
- **#764(S4/documentation)**: `amadeus-orchestrate next` の `--new-intent` フラグ(`amadeus-orchestrate.ts:321` 宣言、`:336` parseNextFlags、`:375` の `--new-intent` 分岐、`:1427` Branch 4a)が `docs/reference/` で未記載。`grep -rn -- --new-intent docs/reference/` = 0 件(実測)。姉妹フラグ `--resume`(`:371`)・`--single`(`:373`)も同 parser 内に実在。正準ページは `docs/reference/03-orchestrator.md`(Entry Points / Intent birth 節、`:115`)。
- **#763(S4/documentation)**: `docs/reference/18-workspace-layout.md`(145行、ADR 体裁)に `.ja.md` ペアが欠落。`docs/reference/*.md` 全数走査で `.ja.md` ペア欠落は **18-workspace-layout.md のみ**(他19ファイル=00〜17・diagrams は全ペア有り、実測)。E-L56 の「ペア規約の唯一の欠落が 18 のまま」を再確認、新規欠落なし。
- **#728(S4/documentation)**: `tests/` 配下13ファイル・14参照が旧名 `assertNotSiblingWorktree` を stale 参照。product は `resolveWorktreeAnchor` へ改名済み(`amadeus-worktree.ts:167` 定義、旧名は source に**不在**=`grep` 0 件、実測)。コメントは行番号(`:101` / `:101-121` / `:112` / `:459->101` / `:162`)も stale で、現定義 `:167` と不一致。`tests/harness/fixtures.ts` のみ2参照(`:283` `:542`)、他12ファイルは各1参照。

## docs-repair-batch9(2026-07-11)の観測面 — フォーカス5欠陥の現存確認(#812 #824 #680 #885 #886)（履歴、observed `13598b752`）

現行 HEAD `13598b752`(base `b845478bb`=前回 bughunt-fix-batch observed からの diff-refresh、59コミット)で確定した、docs/harness 修理バッチ第9弾フォーカス5欠陥の現物照合。出典は本 intent(docs-repair-batch9)の `inception/reverse-engineering/scan-notes.md`(全 file:line 実測付き)。5欠陥の欠陥クラス分類: **byte-copy localize 漏れ2件**(#812 SKILL.md / #824 onboarding.fills.ts)+ **ヘッダ契約乖離1件**(#680 sensor self-contained)+ **restart-loss 2件**(#885 slug 正規化 / #886 phase-check ゲート、詳細は architecture.md「docs-repair-batch9 の観測面」節)。#812/#824/#680 の欠陥3ファイルは `b845478bb..HEAD` 区間内で**一切変更されず欠陥が区間を貫通して現存**、#885/#886 の lib/state/worktree は区間内で #880 flip 配線・#869 jump per-phase の行番号シフトを受けたが**欠陥自体(normalizeWorktreeSlug 喪失 / phase-check ゲート喪失)は未修復で残存**。

### #812 — kiro-ide SKILL.md が kiro CLI 版の byte-copy(localize 漏れ・未修正)

- **欠陥**: `diff harness/kiro/skills/amadeus/SKILL.md harness/kiro-ide/skills/amadeus/SKILL.md` → **IDENTICAL**(バイト同一 = 完全 byte-copy、localize 未実施)。kiro-ide 側に kiro CLI 固有記述が残存: `:14` 見出し `# AI-DLC Orchestrator (Kiro CLI harness)`(IDE ハーネスなのに「Kiro CLI harness」)、`:84` `under \`kiro-cli chat --no-interactive\` the stop-hook enforcement backstop does not fire`(CLI 固有 headless caveat)。`grep -c "Kiro CLI"` = 1 + `kiro-cli` 参照 :84。
- **対照面**: kiro-ide skills 配下に `references/` サブディレクトリ不在(`find` で `skills`/`skills/amadeus` のみ)、kiro CLI 側も `SKILL.md` + `question-rendering.md` の2ファイルのみ。#812 の対照面は SKILL.md 本体に限定。
- **修理の型**: kiro-ide SKILL.md を IDE ハーネス向けに localize(`:14` 見出し / `:84` CLI 固有 caveat の IDE 版差し替え)。SKILL.md は harness 中立でないため byte-copy 自体が誤り。

### #824 — onboarding.fills.ts の kiro CLI 表記残存 + guide_pointer 誤指し(localize 部分漏れ・未修正)

- **欠陥**: `diff harness/kiro/onboarding.fills.ts harness/kiro-ide/onboarding.fills.ts` → DIFFERS。kiro-ide 版は `:13`(`Kiro IDE harness`)/`:37`(`Kiro IDE installs`)の**2箇所のみ** localize 済で、残りに kiro CLI 表記が残存。`grep -noE "Kiro CLI|kiro-cli"` = 7残存: `Kiro CLI`×3(`:1` ヘッダコメント `harness/kiro/onboarding.fills.ts — Kiro CLI's …` = パス+名称とも誤り、`:15` `Kiro CLI ≥ 2.6`、`:30` `rendered onto Kiro CLI. On Kiro:`)、`kiro-cli`×4(`:15` `kiro-cli --version`、`:17` `kiro-cli chat`×2、`:26` guide_pointer 内)。
- **guide_pointer 誤指し**: `:26` `guide_pointer` が kiro-ide 用ドキュメントを指すべきところ CLI 版 `docs/guide/harnesses/kiro-cli.md` を指す。差し替え先 `docs/guide/harnesses/kiro-ide.md` は **実在**(`kiro-ide.ja.md` も存在)= 受け皿あり。
- **dist 伝播**: `manifest.ts:93` の `onboarding: { dst: "AGENTS.md", … fills: onboardingFills }` により生成物 `dist/kiro-ide/AGENTS.md` にも誤表記が伝播済み(`:7`/`:9`/`:36`/`:39`)。正本修正後は `scripts/package.ts` 再生成で dist 同期が必要。
- **修理の型**: kiro-ide onboarding.fills.ts の残 7箇所 CLI 表記を IDE 版へ localize + guide_pointer を `kiro-ide.md` へ差し替え + dist 再生成。

### #812 未カバー面候補 — question-rendering.md の localize 漏れ2箇所(新発見・同根)

- **同根棚卸し**(`diff -rq harness/kiro/ harness/kiro-ide/`): localize 漏れは SKILL.md(#812)・**question-rendering.md**・onboarding.fills.ts(#824)の**3ファイル**に集中。`skills/amadeus/question-rendering.md` は kiro と **byte-identical** で `Kiro CLI` 表記2箇所残存: `:1` `Kiro CLI harness annex`、`:11` `Kiro CLI has no structured-question tool`。**#812 起票文が SKILL.md のみを対象にしている場合、question-rendering.md は同根の未カバー面**(SKILL 以外の annex の同一 localize 漏れクラスタ)。修理時に #812 スコープへ取り込むか別 Issue 化するかは requirements 判断。
- **共有妥当の確認**(誤修正防止): `agents/*.json`(5)・`settings/cli.json` は byte-identical だが `Kiro CLI`/`kiro-cli` 出現 0 = ハーネス中立で共有妥当(localize 対象外)。

### #680 — sensor-type-check.ts の self-contained ヘッダ主張と実 import の矛盾(ヘッダ契約乖離・未修正)

- **欠陥**: `amadeus-sensor-type-check.ts:4-5` ヘッダが `// Self-contained: no imports from sibling tools.`(兄弟ツール非 import を明言)だが、`:89` `import { sensorsDir } from "./amadeus-lib.ts";`(同ディレクトリ兄弟ツール)で**主張と実態が矛盾**(self-contained 主張は虚偽)。他 import は node 標準のみ(`:86-88`)で矛盾は lib import 1件に起因。
- **同型棚卸し**(全 sensor 5件): self-contained を明言するのは type-check と linter の2件のみ。`amadeus-sensor-linter.ts` は主張どおり兄弟 import ゼロで整合(主張 TRUE)。required-sections / schema / upstream-coverage は主張自体がなく整合。**矛盾は type-check.ts 単独**。
- **修理の型(2択、requirements/architect 判断)**: (a) ヘッダ主張を実態(lib へ依存)に合わせて書き換える、(b) `sensorsDir` 依存を除去して主張を真にする。主張のない3 sensor は対象外(誤修正しないこと)。

### #885 / #886 — restart-loss 2件(slug 正規化 / phase-check ゲート)

- 両件とも restart 前旧系譜 `.agents/amadeus/tools/` の契約が現行正本 `packages/framework/core/tools/` へ未移植で喪失し、区間内の #880/#869 再構築でも復元されなかった **restart-loss** クラスタ。品質観点の欠陥形状(機能面だけ再構築し precondition/正規化を復元しない非対称)と旧系譜 vs 現行の file:line 対照は **architecture.md「docs-repair-batch9(2026-07-11)の観測面」節** に詳述。
- **#885**: `normalizeWorktreeSlug` grep 0件。旧 `63314bc82`(#478 gap2)が lib/worktree/state の slug 境界を同一チョークポイントへ一本化し大文字混じり slug を寛容受理+小文字正規化していたが、現行は `amadeus-lib.ts:2099` worktreePath 無正規化 / `:2580` validateBoltSlug + `amadeus-worktree.ts:195` / `amadeus-state.ts:250` validateSlug が大文字を reject。batch8 #850 gap2 と同一 archive の分割で lib.ts 交差。
- **#886**（**当時断面。observed `89532174c` では解決済み** — `verifyPhaseCheckArtifact` は `amadeus-state.ts:392` に実在し `:2775` / `:2926` / `:3059` / `:4009` + `amadeus-jump.ts:581` の 5 箇所から呼ばれる。2026-08-14 追記、260813-lifecycle-guard-runtime）: `phase-check|PHASE_CHECK|verifyPhaseCheck` core 全域 0件。旧 `8cf816138` の `verifyPhaseCheckArtifact`(`verification/phase-check-<phase>.md` を PHASE_VERIFIED 前に強制)が現行 state.ts 4経路(advance :1104 / finalize :1333 / complete-workflow :1428 / approve :1670)+ jump のいずれからも呼ばれず、#880 flip 配線(`setPhaseProgress` :101 / `markPhaseVerified` :114)・#869 jump per-phase が flip のみ再構築し precondition 未復元。

## p2-repair-batch7 の観測面 — restart-loss クラス5欠陥の現物照合(#834 #839 #844 #845 #849)

現行コード基準 `37ad36a97`(observed HEAD、base `d8de2362b`=前回 batch5 RE observed からの diff-refresh、区間13コミット)で確定した、restart-loss クラス5件の現物照合。base/observed の真実源は本 intent の `inception/reverse-engineering/scan-notes.md`。

**差分区間のフォーカス面変化(base→observed)**: 6フォーカスファイル中、変更は `amadeus-utility.ts`(#830/#855 の doctor Check1/3 を worktreeBaseDir に anchor する `5c5e042a2`)のみで、#844 の workspace-shell-ready ブロック(`:619-632`)には非関与。残る5ファイル(orchestrate / log-subagent / learnings / runtime / runtime-compile)は base 時点とバイト同一。**5欠陥はいずれも observed HEAD に未修正で現存**。区間で着地した周辺変更(#837 CCN ゲート・#855 doctor anchor・#856 coverage strip・#863 kiro adapter cwd・#865 lock 隔離+stamp guard 等)は本5欠陥のフォーカス面に非関与。

**クラス分類**: 5件はいずれも**セッション再起動/fresh clone で失われる状態(runtime-graph・active-intent cursor・監査シャード)を跨いだ経路が非対称・不完全に配線された restart-loss 欠陥**。うち #839/#845/#849 は cid:symmetric-pair-review の「片側だけ実装された非対称」(emit⇔terminal・ゲート⇔素通し・read⇔self-heal)、#834 は運用回避策 cid:parked-intent-birth-workaround(#750)の恒久修正面、#844 は 2状態判定と誤誘導 fix 文言。いずれも**挙動欠陥であって構造変化を伴わない**。

### #834 — orchestrate parked 短絡パスが `--new-intent` を検査しない(未修正・実在確認)

- **欠陥**: `packages/framework/core/tools/amadeus-orchestrate.ts:1243-1259`(Branch 2.5、PARKED workflow、issue #367)。ガード条件(`:1243-1249`)は `stateContent && !flags.resume && !flags.stage && !flags.phase && Parked` のみで **`!flags.newIntent` を含まない**。`Parked At Stage === Current Stage` なら `parkedDirective` を emit して `return`(`:1252-1257`)。
- **非対称**: `--new-intent` を処理する Branch 4a は後段 `:1357-1377`(`if (flags.newIntent) :1369`、`birthPrintDirective` emit `:1376`)。parked な active intent 上で `next --new-intent` を打つと Branch 2.5 が先に `parked` を emit して短絡し、新 intent birth(Branch 4a)へ到達できない。#832 面の roll-forward latch(`:1121-1151`、turn counter ベースの読み取り専用ガード)は別系統で不関与。
- **restart-loss 由来**: 運用知識 cid:parked-intent-birth-workaround(#750 — active-intent cursor が parked を指すと `--new-intent` が握りつぶされ、cursor ファイル手動削除で回避)の恒久修正面。
- **archive 参照解**: **なし**(新規修正)。archive `archive/main-before-restart-20260706-224926` を grep しても #834 相当のコミットは不在。切り分けは Issue 本文。
- **修理の型**: Branch 2.5 ガードへ `!flags.newIntent`(および同様に短絡しうる compose/newScope/report は Branch 4c で後段処理される点)を足す方向。latch 面には触れない。

### #839 — orchestrate トップレベル catch / error 分岐が ERROR_LOGGED 非配線(未修正・実在確認)

- **欠陥**: `amadeus-orchestrate.ts:2913-2920` — `if (import.meta.main) { try { main(); } catch (e) { console.error(...); process.exit(1); } }`。未捕捉例外は **stderr 出力 + `process.exit(1)` のみ**で監査イベント ERROR_LOGGED を emit しない。error directive 構築子 `errorDirective`(`:236`)も JSON directive を作るだけで監査を書かず、全 `emit(errorDirective(...))` 呼び出し(`:1209`/`:1303`/`:1329` ほか)も同様。
- **非対称の対照**: 兄弟 CLI は `amadeus-lib.ts:4353` `export function emitError`(コメント `:4333-4342`)経由で ERROR_LOGGED を `appendAuditEntry` 記録する。orchestrate は lib から `errorMessage` のみ import し `emitError` を import していない → orchestrate のクラッシュ/エラーは監査に痕跡を残さない(cid:symmetric-pair-review の emit⇔terminal クラスタ)。
- **restart-loss 由来**: 再起動を跨いだ障害調査で、クラッシュした orchestrate 実行が監査シャードに痕跡を残さないため、restart 後に「何が落ちたか」を監査から復元できない。
- **archive 参照解**: `460f56ba0`(`fix: エンジンの error directive と未捕捉例外を ERROR_LOGGED として audit へ自動記録（Issue #431）`、2026-07-05)。旧系譜パス `.agents/amadeus/tools/amadeus-orchestrate.ts`(+52 行)。
- **修理の型**: `emitError`(lib)を import し、トップレベル catch と `errorDirective` 発火点で ERROR_LOGGED を記録する対称化。

### #844 — utility doctor の workspace-shell-ready 2状態判定 + 一律 fix 文言(未修正・実在確認)

- **欠陥**: `amadeus-utility.ts:619-632`(`handleDoctor` 「5. Workspace shell ready」)。`const shellReady = existsSync(harnessEngineDir) && existsSync(defaultMemoryDir)`(`:627`)の **pass/fail バイナリ判定**。fix 文言(`:631`)`copy the workspace shell from \`dist/<harness>/\` into your project root` は **harness engine dir と memory dir のどちらが欠けても一律**に出す。
- **非対称の対照**: 同関数「6. Hook heartbeats」(コメント `:635-640`)は 3状態((a)未生成=advisory pass /(b)ディレクトリはあるが `.last` なし=fail /(c)`.last` あり=pass)で状態別の文言を出す。#844 は shell-ready を同様に細分化し、欠けている側を指す fix 文言にする面。
- **restart-loss 由来**: 導入直後/fresh clone で workspace shell が部分的に欠けた状態を doctor が誤誘導する(どちらが欠けたか判別できない)。
- **archive 参照解**: `a59590b32`(`fix: 導入直後の doctor / installer smoke の誤誘導を修正（Issue #573）`、2026-07-06)。旧系譜パス `.agents/amadeus/tools/amadeus-utility.ts`(+45 行)ほか `dev-scripts/evals/installer/check.ts`・`scripts/amadeus-install.ts`。
- **修理の型**: shell-ready を欠落側別(engine/memory)の状態に細分化し、状態別 fix 文言を出す(heartbeat の3状態パターンと揃える)。

### #845 — log-subagent 完了 intent ゲート不在 + agent_type 空文字素通し(未修正・実在確認)

- **欠陥(2件)**: `packages/framework/core/hooks/amadeus-log-subagent.ts`(全61行)。
  - **完了 intent ゲート不在**: `:48` `if (!hasActiveWorkflowAudit(projectDir)) process.exit(0);` — active な監査シャードが在れば発火するのみで intent の Status=Completed を除外するゲートがなく、完了済み intent へも SUBAGENT_COMPLETED を追記しうる。
  - **agent_type 空文字素通し**: `:41` `const agentType = parsed.agent_type ?? "unknown";` — `??` は `null`/`undefined` のみ既定化し **空文字 `""` は素通し**。`:50-52` の fields は `"Agent Type": agentType` を**無条件**格納(`agentId :53`/`agentMessage :54` は truthy ガードありに対し agentType はガードなし)。空文字が `"Agent Type": ""` として監査に載る。
- **restart-loss 由来**: 完了 intent の監査シャードが残存した状態で再起動後にサブエージェントが発火すると、閉じた intent へイベントを追記して監査整合を壊す。
- **archive 参照解**: `a2202f58b`(`fix: log-subagent の完了ガードと agent_type 既定、parity 宣言（Issue #555、B003 + FR-4）`、2026-07-06)。旧系譜パス `.agents/amadeus/hooks/amadeus-log-subagent.ts`(+13 行)ほか `dev-scripts/evals/hooks-state-bugfix/check.ts`。
- **修理の型**: Status=Completed 除外ゲートを追加し、agentType を truthy ガード(空文字も既定化 or 非格納)へ揃える。

### #849 — learnings readRuntimeStageRow の3経路 hard fail(runtime-graph 欠落で自己修復せず)(未修正・実在確認)

- **欠陥**: `packages/framework/core/tools/amadeus-learnings.ts:127-153` `readRuntimeStageRow` の3 hard-fail 経路: (1) runtime-graph.json 不在 `:129-130` / (2) malformed(parse 失敗 `:135-136`、非 object `:138-139`、stages 非配列 `:142-143`) / (3) stage 未発見 `:152`。呼び出しは `handleSurface` `:184`。
- **restart-loss 由来(本丸)**: runtime-graph.json は `.gitignore` 対象の per-intent ランタイム生成物(`amadeus/spaces/*/intents/*/runtime-graph.json`)。セッション再起動/fresh clone で欠落した状態で §13 surface が走ると**自己修復せず hard-fail** する。
- **self-heal 移植の seam**: コンパイル正本は `packages/framework/core/tools/amadeus-runtime.ts:319` `export function compile(opts: CompileOptions)`(runtime-graph.json を materialise)。PostToolUse フック `amadeus-runtime-compile.ts` はこれを `spawnSync` で発火するだけ(`:121` `const args = ["run", runtimeTs, "compile"]`)。#849 の自己修復は runtime.ts の `compile` を **in-process import** して、readRuntimeStageRow が不在時に再生成してから読む(フックのプロセス跨ぎではなく関数直呼び)。
- **archive 参照解**: `a62efe182`(`fix: runtime-graph 登録経路の修正と surface の自己修復（Issue #558）`、2026-07-06)。旧系譜パス `.agents/amadeus/tools/amadeus-learnings.ts`(+64 行)・`.agents/amadeus/hooks/amadeus-runtime-compile.ts`(+11 行)ほか `dev-scripts/evals/{engine-e2e,hooks-state-bugfix}/check.ts`。
- **修理の型**: readRuntimeStageRow に不在時 self-heal(`compile` in-process 呼び)を挟む。

### archive 参照解の所在と移植注意(#834/#839/#844/#845/#849 横断)

- archive ブランチ `archive/main-before-restart-20260706-224926`(tip `bc76b6303`、実在確認済)に4件の参照解(#834 は新規で参照解なし)。全参照解は**旧系譜パス `.agents/amadeus/{tools,hooks}/...`** で、現行正本は **`packages/framework/core/{tools,hooks}/...`**。移植時はパスを現行正本へ読み替え、`bun scripts/package.ts`(dist 再生成)+ `bun run promote:self`(セルフインストール昇格)を**同一コミット**で実施する(Mandated)。
- 旧系譜には `dev-scripts/evals/` の check.ts が同梱されるが、現行のテスト機構は `tests/` 配下の Bun ランナー。eval check.ts をそのまま移植せず現行テスト様式へ写像する。

### batch6(#841 tryEmitSwarm)との交差観測

- #841(batch6)対象は `amadeus-orchestrate.ts` の `tryEmitSwarm`(定義 `:1703`、`readBoltDagBatches` 近傍 `:1717-1720`、呼び出し元 `:1643`/`:1669`)。#834(本 batch7)対象は同ファイル Branch 2.5(`:1243-1259`)。
- **ファイル交差・リージョン非交差**(約450行離れる)。cid:code-generation:c6 は静的目録でなく先行 PR の実 diff でリージョン非交差を再評価する規律のため、batch6 の #841 PR が in-flight なら (a)着地待ち or (b)実 diff で非交差実測後に並行。他4欠陥(#839/#844/#845/#849)は #841 と別ファイル/別リージョンで交差なし。

## p3-repair-batch6(履歴・全6件修正着地 2026-07-11)の観測面 — restart による過去修正喪失 regression 6件の現物照合(#841 #842 #836 #840 #847 #848)

現行コード基準 `37ad36a97`(base `d8de2362b`=前回 batch5 RE observed からの diff-refresh、現 origin/main)で確定した、フォーカス6欠陥の現物照合。介在13コミットのうち `packages/framework/core/tools/` のコア tools 変更は `amadeus-lib.ts`/`amadeus-state.ts`/`amadeus-swarm.ts`/`amadeus-utility.ts` の4ファイルに限定され、**本 intent のフォーカス6欠陥が属する `amadeus-orchestrate.ts` / `amadeus-jump.ts` / `amadeus-sensor-linter.ts` / `amadeus-graph.ts` / `amadeus-stage-schema.ts`(および utility の一部関数)は本区間で未変更**。6件はいずれも**挙動欠陥であって構造変化を伴わず**。base/observed の真実源は本 intent の `inception/reverse-engineering/scan-notes.md`。

**欠陥クラス = restart/reset による過去修正の喪失 regression**: 6件はいずれも本区間の新規回帰ではなく、より古い時点で **元修正が既に着地していたにもかかわらず、後の restart/reset により喪失し元修正前の状態へ逆戻りした既存欠陥**であり、現 observed で現存する。各欠陥は元修正コミット SHA と対で接地でき、「元修正との差分再接地」が Architect 合成/開発の一次材料になる(元修正: #486=`3eca83a56`, #481=`2c2c48a39`, #459=`765fe4f20`, #538=`c6597bf18`, #499=`c8ddabffc`)。うち #842(forward⇔backward 非対称 emit)・#836(init で書くが advance/approve で更新しない write⇔update 非対称)は team.md `symmetric-pair-review`(write⇔check / emit⇔terminal / fork⇔merge)クラスタの「対称対の片側喪失」に該当。

### #841 — tryEmitSwarm が完了バッチを除外せず静的 batches[0] を無条件再提示【現存】

- **現行 file:line**: `amadeus-orchestrate.ts:1703`(`tryEmitSwarm`)、欠陥本体 `:1717-1720`。`readBoltDagBatches` の返す静的トポロジ第1バッチ `batches[0]` を無条件採用し、`unitCovered` 等のカバレッジ判定で完了済みバッチを除外していない。`next` が毎回バッチ1を再提示しバッチ進行が手動追跡になる。
- **元修正/喪失**: `3eca83a56`(#486「invoke-swarm を coverage ベースのバッチ進行へ」)が batches を走査し未カバー unit を含む最初のバッチを採るロジックを追加していたが、現行はこの走査が失われ `batches[0]` の静的採用へ逆戻り。

### #842 — jump が backward でも PHASE_VERIFIED を emit・多相 forward の単一イベント化・PHASE_SKIPPED 不在【現存】

- **現行 file:line**: `amadeus-jump.ts:432-447`(`execute` 内の phase 境界イベント emit ブロック)。ガードが `direction` を見ないため (a) **backward jump でも** PHASE_COMPLETED/PHASE_VERIFIED/PHASE_STARTED を emit(Verified ロールバック不可契約に反し前進 Verified を偽発行)、(b) 複数 phase を跨ぐ **forward jump が単一の from→to 対**しか出さず中間 phase を per-phase 列挙しない、(c) 実行済み stage を持たない phase の **PHASE_SKIPPED が皆無**、加えて同一トランザクションの Phase Progress 更新も欠落。
- **元修正/喪失**: `2c2c48a39`(#481「jump の phase 境界に #479 の契約を適用」)が「per-phase 列挙 → forward のみ emit → work 有り=VERIFIED / work 無し=SKIPPED → 同一トランザクションで Progress 更新」を実装し `markPhaseVerified`/`PHASE_PROGRESS_FIELD` を export していたが、direction 分岐・per-phase 列挙・SKIPPED・Progress 更新が全て喪失。

### #836 — delegate 承認フローで Phase Progress ロールアップが更新されない【現存】

- **現行 file:line**: 更新コード自体が不在。`## Phase Progress` を**書く**のは init テンプレートのみ(`amadeus-utility.ts:2449` 見出し、生成ロジック `:2396-2414`)。`amadeus-state.ts` の `handleAdvance:1135` は `Lifecycle Phase` を `setField` 更新するのみ、`handleDelegateApproval:1655` は DELEGATED_APPROVAL audit を追記するのみで、advance/approve/delegate のいずれも `## Phase Progress` を更新しない。init テンプレートのコメント(`:2398-2399`)が約束する Active/Verified への flip を行うコードが存在せず、Progress は init 以降 stale(delegate 承認=本チームの主経路でも未更新)。
- **write⇔update 非対称**: init で「書く」が advance/approve で「更新しない」片側欠落。#481 元修正(`2c2c48a39`)が jump 経路で `PHASE_PROGRESS_FIELD` を同一トランザクション更新していた痕跡があり、Progress 更新機構が過去に存在し喪失したことを示す。advance/approve 経路の Progress 更新は本 batch で新規配線が必要な可能性(要 Architect 合成確認)。

### #840 — detectWorkspace の言語走査が SCAN_SOURCE_DIRS 限定で Greenfield 誤判定【現存】

- **現行 file:line**: `amadeus-utility.ts:1917`(`detectWorkspace`)、欠陥本体 `:1949-1954`。定数 `SCAN_SOURCE_DIRS`(`src`,`app`,`lib`,`pages`,`components`,`tests`)は `:1762`。言語カウントの再帰対象が定型 source dir に限定され、`packages/`・`dev-scripts/`・`skills/` 等にコードを置く repo(本 repo 自身が該当)では `langCounts` が空 → `hasSourceFiles=false`(`:1977`)→ トップレベル framework config 等も無ければ `brownfield=false` で **Greenfield 誤判定** → bugfix scope の reverse-engineering が SKIP 降格。
- **元修正/喪失**: `765fe4f20`(#459「workspace-detection の言語走査を全トップレベル dir へ一般化」)が「SCAN_EXCLUDE とドット始まりを除く全トップレベル dir を再帰対象へ」一般化していたが、現行は `SCAN_SOURCE_DIRS` 限定へ逆戻り。project.md Mandated(workspace 分類の CodeKB 根拠参照)の観点では、本現状が `technology-stack`/`code-structure` の workspace 分類根拠の現行限界。

### #847 — sensor-linter が eslint ラップ専用に逆戻りし lint:check 2段検出が不在【現存】

- **現行 file:line**: `amadeus-sensor-linter.ts`(全357行、冒頭ドキュメントコメント `:5-43`)が `bunx eslint` ラップ専用。`bunx eslint --version`/`--print-config`/`--format json` のみで、workspace の `package.json` が `lint:check` を宣言する場合にそれをラップする1段目が無い。よって Biome 等 eslint 非採用の repo(本 repo 自身)では常に 127 quiet PASS になり実 linter が gate で発火しない(`lint:check`/`bun run` の grep ヒット 0)。
- **元修正/喪失**: `c6597bf18`(#538「linter sensor を 2 段検出化」)が「`lint:check` 宣言 → `bun run lint:check` ラップ、不在なら従来 eslint 検出」の2段検出を追加していたが、1段目(lint:check ラップ)が喪失し eslint 専用へ逆戻り。

### #848 — docs-only intent の workspace_requires 免除経路(declare-docs-only / GUARD_EXEMPTED)が喪失【現存】

- **現行 file:line**: 免除経路自体が不在(`declare-docs-only`/`GUARD_EXEMPTED`/`docsOnly` は tools 全域で 0 ヒット、実測済み)。拒否経路のみ現存: `amadeus-state.ts:952` `verifyStageArtifacts` の `:967-975` が `stage.workspace_requires && !workspaceHasWork(pd)` で無条件 `error()`(免除分岐なし)。型宣言・parse・serialize・graph 登録・schema 検査(`amadeus-lib.ts`/`amadeus-graph.ts`/`amadeus-stage-schema.ts`)はいずれも現存。
- **元修正/喪失**: `c8ddabffc`(#498 #499 #501、B002=#499)が「registry の docsOnly 宣言で workspace_requires ガードを免除でき、免除発動を `GUARD_EXEMPTED` audit に記録。宣言なしの拒否経路は従来どおり」を追加していたが、declare-docs-only サブコマンド・GUARD_EXEMPTED audit・免除分岐が全て喪失し拒否経路のみ現存。

## p3-cleanup-batch5(候補)の観測面 — 候補6欠陥の現物照合(#811 #822 #830 #730 #819 #831)

差分区間 `9738580ef..60f5e1edf`(observed HEAD `60f5e1edf`)で確定した、修理候補7件の現物照合。base/observed の真実源は当該 intent(`260711-p3-cleanup-batch8`)の `inception/reverse-engineering/scan-notes.md` および `re-scans/260711-p3-cleanup-batch8.md`。7件は**2クラスに分かれる**: (I) restart-loss 4件(#843/#846/#850/#851)= 旧 `.agents/`・`aidlc/` 系譜 → `packages/framework/` 移行の境界で復元漏れした既存欠陥(差分区間**外**)、(II) 区間内3件(#876/#877/#878)= 差分区間で導入・変更された面(それぞれ 要件見落とし由来 / テストインフラ由来 / #879 導入ギャップ)。

### restart-loss クラス(#843/#846/#850/#851、区間外)— E-L53 3点法で接地

4件とも (a) archive 元修正コミットが実在し、(b) 現行正本コードで欠陥が現存し、(c) 喪失は差分区間の**外**(base `9738580ef` 時点で既に喪失済み)。archive 側は旧系譜パスのため、修理は現行正本パスへの**再適用**(旧パス直移植は不可)。

| Issue | archive 元 SHA | 旧→現行正本パスの読み替え | 現行欠陥 file:line |
|---|---|---|---|
| #843 | `4d5a0f5a5` | 旧 `.agents/.../protocols/stage-protocol.md` → `packages/framework/core/amadeus-common/protocols/stage-protocol.md` | `:611-614`(subagent 節の persona 注入指示が残存)+ `:842-843` |
| #846 | `657dc9267` | 旧 `.agents/amadeus/tools/` → `packages/framework/core/tools/` | `amadeus-sensor-required-sections.ts:229` / `amadeus-sensor-upstream-coverage.ts:111` / `amadeus-validate.ts:305`(末尾で無条件 `main()`。import しただけで CLI 発火) |
| #850 | `63314bc82` | 旧 `.agents/amadeus/tools/amadeus-audit.ts` + `amadeus-lib.ts` → `packages/framework/core/tools/` | `amadeus-audit.ts:471-475`(wtAuditPath 存在のみで一律拒否、reentrant/DIVERGED 判定欠如)。lib gap2(slug 正規化一本化)は toLowerCase seam が `:746`/`:1828`/`:1980` に散在、単一正準関数化は未確認(functional-design で突き合わせ要) |
| #851 | `589687a19` | 旧 `.agents/skills/amadeus/references/issue-ref-contract.md` → `packages/framework/harness/<name>/skills/amadeus/references/issue-ref-contract.md` | **不在**(全面 0 件、base でも不在)。同種サイドカー `question-rendering.md` の実配置は正本4面+dist4面+self-install2面=計10面。harness スコープは合成で確定要 |

- **#846 の型**: `import.meta.main` ガード有無の不統一が既知アンチパターン。`amadeus-learnings.ts:916`(`if (import.meta.main) main();`)が正しい参照実装。3ファイルとも末尾の無条件 `main()` を同型へ是正する。
- **restart-loss の系譜的含意**: 旧 `.agents/` / `aidlc/` → `packages/framework/` の移行境界で復元漏れした修正群が4件現存する。同型の restart-loss 再発検知の観点(移行時に archive 修正の再適用棚卸しを漏らさない)になる。

### 区間内クラス(#876/#877/#878、区間内)

- **#876 — `computeStrippableLines` が brace-only 行を strip しない(区間内新規)**: `tests/lib/coverage-normalize.ts`(base に不在の新規 +284行)。`computeStrippableLines`(`:40`)の code モードで `:117`(`{` を含む行を markCode)/ `:126-132`(`}` を含む行を markCode)/ `:135`(`;` `)` 等の非空白で markCode)が、brace-only 行(`}` `};` `});`)を全て code-bearing にマークする。`:190-193` の `!codeBearing.has(ln)` 判定で strippable から外れ、lcov 上で DA:0 の閉じ括弧行が strip されず未カバー扱いになりうる。区間内で導入された新規ロジックの欠陥(regression 候補、要件見落とし由来)。
- **#877 — run-tests バッチ時の persist seam 分離不全(区間内新規)**: 現行ランナー `tests/run-tests.ts:692`(`runBunTestFile`)は `bun test <file>` を **1ファイル/1invocation** で実行し、複数ファイルを同一 bun プロセスにバッチ**しない**(unit tier は `pinnedSerial`+`effectiveParallel=1`)。よって #877 は手動 `bun test tests/unit`(ディレクトリ一括)や複数ファイル明示指定でのみ再現する。干渉相手 `tests/unit/t-learnings-persist-seam.test.ts`(新規)は `handlePersist` を in-process 直接 import(`:15`)し、`callPersist`(`:40-61`)で **`process.exit` と `process.stderr.write` をグローバルに monkey-patch**(復元は finally `:57-58`)。共有 `tests/harness/fixtures.ts` は `resetAidlcEnv()` で `process.env.AMADEUS_DEFAULT_SCOPE` を delete。**修理対象はランナーのバッチ構成ではなく、同一プロセス共有時の process-global 汚染耐性**(persist-seam の monkey-patch 残留 / fixtures の env 変異)に定める(テストインフラ由来)。
- **#878 — orchestrate default 出口が recordEngineError 非配線(区間内、#879 の残存ギャップ)**: `packages/framework/core/tools/amadeus-orchestrate.ts:2995-3001` の `default:` ブロックが `console.error` + `process.exit(1)` で、throw しないため上位 catch を通らない。`recordEngineError` 定義は `:195`、配線は `runEngineMain`(`:3017`)の try/catch のみ。#879(= observed HEAD `60f5e1edf`、"record ERROR_LOGGED for orchestrate error exits #839")が recordEngineError を導入したが、**Unknown subcommand の default 出口は未配線のまま**残った(base `9738580ef` には recordEngineError 自体が不在)。修理は default 出口を recordEngineError 配線 or throw 化して runEngineMain catch へ流す2案が候補。構造面は architecture.md の同名節を参照。

## p3-cleanup-batch5(履歴)の観測面 — 候補6欠陥の現物照合(#811 #822 #830 #730 #819 #831)

現行コード基準 `d8de2362b`(base `58f3453ad`=前回 batch4 RE observed からの diff-refresh。現 HEAD `6279efe58` は intent birth checkpoint のみでフォーカスファイル無変更。介在16コミット、うち #751/#753/#746/#758 の4件のみフォーカス領域に触れたが**いずれも本候補6件の欠陥箇所は未修正**で行番号シフトのみ)で確定した、候補6件の現物照合。6件はいずれも**挙動欠陥であって構造変化を伴わず**。base/observed の真実源は当該 intent(260710-p3-cleanup-batch5)の `inception/reverse-engineering/scan-notes.md`。

現行コード基準 `d8de2362b`(base `58f3453ad`=前回 batch4 RE observed からの diff-refresh。現 HEAD `6279efe58` は intent birth checkpoint のみでフォーカスファイル無変更。介在16コミット、うち #751/#753/#746/#758 の4件のみフォーカス領域に触れたが**いずれも本候補6件の欠陥箇所は未修正**で行番号シフトのみ)で確定した、候補6件の現物照合。6件はいずれも**挙動欠陥であって構造変化を伴わず**。base/observed の真実源は当該 intent(260710-p3-cleanup-batch5)の `inception/reverse-engineering/scan-notes.md`。

分類: 3件(#811/#822/#830)は「安全側/正しい対照実装が兄弟にあるのに片系統が非対称に素通しする」非対称欠陥、#730 は lcov merge union の DA 加算合成による false-red、#819/#831 は並列フレーク(それぞれ非ヘルメティックな実 eslint spawn / 時間・cursor 解決依存)。

### #811 — adapter inline mint が #755 分類器をバイパス(未修正・実在確認)

- **欠陥**: codex/kiro/kiro-ide の3アダプタとも `case "mint"` で `appendAuditEntry("HUMAN_TURN")` を**state 存在のみでゲート**し、機械注入ターン分類器 `isMachineInjectedTurnText` を通していない。正の対照は core `amadeus-mint-presence.ts`(`:65` で `isMachineInjectedTurnText(prompt)` を呼び機械注入なら mint 抑止)。
- **起票パス誤りの正誤**: 起票の対照実装 path「core/tools」は**誤り**。正は **`core/hooks/amadeus-mint-presence.ts:65`**。分類器の定義・export は **`core/tools/amadeus-lib.ts:347`**(`export function`。stop-hook `amadeus-stop.ts:584,626` も共用し #755 tier-3 carve-out と分岐一致)。
- **現行 file:line**: codex adapter HUMAN_TURN 直呼び `:357`(起票 :347-362 → 現行 `:349-364`、+2 シフト)、kiro mint HUMAN_TURN `:132`(`:130-134`)、kiro-ide mint HUMAN_TURN `:88`(`:84-94`)、codex emit HOOK_WIRING `emit.ts:31`(変化なし)。
- **決定的裏取り**: `grep -c isMachineInjected` が**3アダプタとも 0**(共有分類器を import すらしていない)。
- **修理の型**: 3アダプタの mint case に共有分類器 import + 抑止分岐を追加(mint-presence hook と同カタログ共有)。実機の HOOK_WIRING/HUMAN_TURN 発火の実証テストが完成条件。

### #822 — kiro 系 runCore の cwd 喪失(未修正・実在確認)

- **欠陥**: kiro/kiro-ide adapter の `runCore` が `Bun.spawnSync` に `cwd` を渡さず、spawn された core フックがアダプタプロセスの cwd を継承する(kiro が渡す `kiro.cwd` が伝播しない)。`stdin/stdout/stderr` のみ指定で `cwd` フィールド欠落。
- **非対称の対照**: codex adapter runCore(`:162-169`、spawnSync `:163`)は `cwd: projectDir`(`:167`、`:90` で `codex.cwd ?? process.cwd()` 解決)を渡す**正しい側**。3アダプタで唯一 codex だけが正しい。
- **現行 file:line**: kiro runCore `:378-385`(spawnSync `:379`)、kiro-ide runCore `:232-239`(spawnSync `:233`)。buildForward は `kiro.cwd ?? process.cwd()` を各ハンドラで解決するが runCore へ未伝播。
- **修理の型**: kiro/kiro-ide の runCore spawnSync に `cwd:` を追加(codex の解決規則と対称化)。#753 の kiro-ide 変更は buildForward(:179-203)止まりで runCore(:232)未到達のため現存。

### #830 — doctor Check1/Check3 が anchored base dir 非適用(未修正・#746 の直接残渣)

- **欠陥**: `amadeus-utility.ts` の doctor Check 1(`:831`)/ Check 3(`:998`)が `const worktreesDir = join(projectDir, ".amadeus", "worktrees")` の**生 join** のまま。Check 2(`:960`)は `worktreePath(projectDir, slug)` の anchored 版(正しい側)を使う**非対称**。lib は `worktreeBaseDir`(`:1981`)/ `worktreePath`(`:1989`)を export 済み。
- **因果(same-root-inventory の実例)**: #830 は **#746(`3563d84c3`)の伝播漏れの直接残渣**。#746 は lib に `worktreeBaseDir` を新設し `amadeus-worktree.ts` の読み側を移行したが、**`amadeus-utility.ts`(doctor)を touch していない**(`git show 3563d84c3 -- amadeus-utility.ts` = 空)。Check 1/3 が生 join のまま取り残された。cid:code-generation:same-root-inventory(同根パターンの全数棚卸し)の実例。
- **クロスレビュー**: 2名 CONFIRMED 済み、行番号は起票時から完全一致。
- **修理の型**: Check 1/3 の生 join を `worktreeBaseDir`/`worktreePath` の anchored 導出へ差し替え(Check 2 と対称化)。

### #730 — bun lcov の関数内コメント/空白行 DA:0(未修正・merge union 経路特定)

- **欠陥の本丸**: `tests/run-tests.ts`(テストインフラ側、`packages/framework` 配下ではない → **dist/self-install 同期不要**)の `normalizeCoverageReport`(`:509`)。union/merge の核心は **`:534`** `current.lines.set(lineNo, (current.lines.get(lineNo) ?? 0) + count)` の **DA 加算合成**。ロードのみチャンクが in-body コメント/空白行を `DA:N,0` で stamp し実行チャンクが正 count を与えないため、`0 + 0 = 0` が恒久化 → LH から漏れて false-red。
- **チャンク連結の実体**: `combineCoverageReports`(**`:674`**)が各 per-file lcov を `chunks.join("\n")`(**`:689`**)で連結し `normalizeCoverageReport` へ渡す。ここが「外部 lcov merge union」の実体。単一プロセスでは1チャンクのみで union が起きず再現しない(レシピの説明と整合)。
- **#772 リマップとの独立**: `normalizeCoverageSourcePath(source, COVERAGE_SOURCE_PATH_CONTEXT)`(`:519`、context `:61`)は SF 行のソースパス正規化で DA:0 問題とは独立。
- **修理の型**: 計測不能行の false-red を merge/normalize 経路(`:534` の union)で loud 検出 or 除外する設計。発生源コード側の回避策 cid:code-generation:bun-inbody-comment-da0(説明コメントをモジュールスコープへ退避)とは別に、本丸は merge 経路の是正。

### #819 — t92 case 15 並列フレーク(未修正・非ヘルメティック spawn が根)

- **欠陥**: `tests/integration/t92.test.ts` case 15(`:661-663`、`test("15: linter — failing TS ... Findings count=1")`、timeout 60000ms)。本体 `runFailedTsReal`(`:610-637`)→ `fire`(`:327-333`)→ `spawnSync(BUN, [SENSOR_TS, "fire", ...])` で **amadeus-sensor.ts を実プロセス spawn → その先で実 eslint バイナリを spawn**(manifest `timeout_seconds=30`)。
- **フレーク機序(Findings 1→0)**: **非ヘルメティックな実 eslint spawn**。full-suite 並列負荷下で eslint が(a)timeout 打ち切り→tool-unavailable→0 findings、(b)リソース競合で空結果、のいずれかに落ち、期待 Findings=1 に対し 0 を返す。`fire` は child_process 側 timeout を指定せず sensor manifest の timeout_seconds と bun-test 60000ms 上限に依存。
- **修理方向の含意**: #741 手法(順序に効くタイムスタンプの定数化)では**閉包しない**。フレークは外部プロセス(実 eslint)の並列競合由来でテスト内部の wallclock 結合ではないため。eslint spawn の hermetic 化(結果を固定 fixture 化 / スタブ経路へ寄せる)が必要。実 eslint を保つなら競合非依存の隔離が要る。

### #831 — t76 test 12 並列フレーク(未修正・起票仮説を反証、真機序候補を特定)

- **欠陥**: `tests/unit/t76.test.ts` test 12(`:626-654`、`test("12: merge audit-lock timeout — slug-tagged failure, no partial state write")`)。`auditLockDir(proj, DEFAULT_RECORD_DIR, DEFAULT_SPACE)`(`:641`)へ lock dir を先行作成し `owner.json` を自 PID + fresh startedAtMs で stamp(`:644-645`)。reaper が live+fresh を reap 拒否 → merge の lock 取得が retry 予算を使い切って失敗する期待。
- **起票仮説(PID/プロセス依存でパス不一致)は反証済み**: ロックパスは**決定的**。`auditLockDir`(lib `:2798`)= `join(tmpdir(), '.amadeus-audit-<md5(identity)[:8]>.lock')`、`auditLockIdentity`(`:2790` 付近)= `` `${projectDir}\x00${space}\x00${intent}` `` で **PID を含まない**(区切りは NUL、#786 と同系)。tmpdir() は `TMPDIR` env 由来で兄弟プロセス間同値 → テストと merge サブプロセスは同一 lockDir を算出するはず。
- **真の機序候補(修正設計は機序切り分けが前提)**: (1) **active-intent cursor 解決 divergence**(最有力): `intent` 成分は merge 時に active-intent cursor から解決される(`:637-639` コメント)。並列負荷下で cursor 解決がテスト前提の DEFAULT_RECORD_DIR と食い違えば merge は別 bucket の lockDir を算出し、植えたロックを観測せず merge 成功 → 期待 failure に対しフレーク。(2) **timeOrigin 依存の staleness マージン**: staleness は `lockAcquireEpochMs()`(`performance.timeOrigin + performance.now()`、`:2845`)と `owner.startedAtMs` の差 > `lockStaleMs()`(default `DEFAULT_LOCK_STALE_MS=10*60*1000`、env `AMADEUS_LOCK_STALE_MS` 上書き可、`:2775-2783`)で、**cross-process の `performance.timeOrigin` epoch 家系一致前提**(`:2841-2844` コメント)に依存する timing 脆弱性。retry 予算は `acquireAuditLock(pd, 50, 100, intent, space)`(`:3135`)= 50×100ms = ~5s。
- **修理方向の含意**: 機序(1)なら cursor 解決を決定化(テストが merge の解決する intent bucket を明示 pin)、機序(2)なら #741 パターン(`startedAtMs` を明示定数 or `AMADEUS_LOCK_STALE_MS` env 固定)が直接効く。両機序の切り分けが修正設計の前提。

## p3-cleanup-batch4(履歴)の観測面 — P3 欠陥6件の横断分類(#757 #758 #753 #739 #740 #784)

> **全6件修正済み(2026-07-10 着地、PR #823/#821/#817/#818/#814/#815)**。以下の欠陥記述は履歴として温存する(欠陥の型・修理方向の記録)。

現 HEAD(`58f3453ad`、base `da1611a9a` からの diff-refresh。焦点9ファイル中7ファイルは無変更、`amadeus-sensor-fire.ts`(#793)/`amadeus-state.ts`(#804)の2ファイルは行番号シフトのみで欠陥不変)で確定した、P3 バグ6件の現物照合。6件はいずれも**挙動欠陥であって構造変化を伴わず**、ファイル非交差(6ファイル群が互いに独立、バッチ3 および open PR #808/#809 とも交差ゼロ)。base/observed の真実源は当該 intent(260710-p3-cleanup-batch4)の `inception/reverse-engineering/scan-notes.md`。

6件を品質パターンで分類すると、いずれも「安全側の機構は既に在るが、その適用が片側・片系統に限られ、もう片方が素通りする」という**非対称欠陥**に収斂する(横断所見は §4 に詳述)。

### #757 — 正規化変数を計算しながら glob マッチだけ生パスを使う非対称(`packages/framework/core/hooks/amadeus-sensor-fire.ts`)

- **欠陥**: `:88` で `const filePathNorm = filePath.replace(/\\/g, "/")` を計算し、再帰ガード(`:90-91`)は正規化版を使うのに、センサー適用判定の `:194` `if (!glob.match(filePath)) continue` は**生 `filePath`** を渡す(`:193` `new Bun.Glob(entry.matches)`)。正規化済み値が同一スコープに在るのに glob だけ生パス、という計算成果の片側適用漏れ。
- **影響境界**: path セグメント型の manifest(`**/{amadeus-docs,intents}/**` 等)2種が Windows 区切りで取りこぼす。拡張子型2種は無害(macOS では区切りが `/` のため実害非再現=P3 根拠と整合)。
- **修理の型**: `:194` を `filePathNorm` に差し替える1語変更。修理時に「正規化済み変数があるのに生パス使用」の同型が hooks/tools 他所に無いか grep で確認する(Issue 明記)。
- **行番号**: 起票時 `:190/:191` → 現行 `:193/:194`(+3、#793 マージ由来。#793 は advisory hook の発火ゲート条件変更で glob マッチ対象には未介入)。

### #758 — mutating verb 列挙と真実源(state.ts switch)の乖離(`packages/framework/core/hooks/amadeus-stop.ts`)

- **欠陥**: stop-hook carve-out の判定 regex `:552` `/\b(approve|advance|finalize|complete-workflow|gate-start|checkbox|park|unpark|set|skip|reject|revise|resume)\b/` が、真実源である `amadeus-state.ts` の subcommand switch に実在する mutating verb 8件 — `delegate-approval`(:284)/`delegate-rejection`(:287)/`acknowledge-compaction`(:302)/`reuse-artifact`(:305)/`practices-event`(:311)/`practices-promote`(:314)/`fork`(:317)/`merge`(:320)— を**取りこぼす**(`\breject\b` は `delegate-rejection` に不一致 — e4 実測 2026-07-10)。列挙(手書き regex)と真実源(switch)を二重管理した結果の同期漏れ。
- **影響境界**: allow-only(session trap なし)・interactive 限定(tier-3 は autonomous では非発火、`:469` 以降のコメントと整合)。read-only verb(get/count/lookup)は正しく列挙外。
- **修理の型**: (A) 判定を read-only verb 列挙+それ以外は関与へ反転(`:490-491`/`:527` の fail-toward-engagement コメントと整合、追加 verb が安全側デフォルト)、または (B) 現列挙に8 verb 追加+state.ts switch との同期テスト強制。消費者は stop.ts 単一、verb 真実源は state.ts switch。同期テストを置くなら switch を canonical に読む形が望ましい。
- **行番号**: 起票時 `:551` → 現行 `:552`(+1)、switch は `:229-298` → 現行 `:254-320`(state.ts 全体が #804 マージで下方シフト、verb 集合は不変)。

### #753 — IDE/CLI 語彙不一致による dead seam(`packages/framework/harness/kiro-ide/hooks/`)

- **欠陥**: adapter `amadeus-kiro-adapter.ts` の log-subagent case(`:200` `if ((kiro.tool_name ?? "") !== "subagent") return null`)と state-sync case(`:184` `!== "todo_list"`)が CLI 語彙を単独ハードチェックする一方、登録 `.kiro.hook` は IDE 語彙で発火する(`amadeus-log-subagent.kiro.hook` の `"toolTypes":[".*invoke_sub_agent.*"]` は文字列 `"subagent"` に不一致、`amadeus-sync-statusline.kiro.hook` の `"toolTypes":["spec"]` は `"todo_list"` に不一致)。兄弟 `canonicalTool()`(`:131`)は write/shell 系で IDE/CLI 両語彙を受理する二重受理パターンを持つのに、この2 case だけ非対称に単一語彙 — その結果どちらの語彙の payload でも一方の面(登録 or 受理)で不一致が残り、seam が死ぬ。
- **影響境界**: 不整合は live payload の `tool_name` 実値に依らず成立(canonicalTool の二重受理欠如という非対称が根拠)。ただし実機 payload は未捕捉。
- **修理の型**: 2 case を canonicalTool の二重受理パターンへ揃える(log-subagent は subagent/invoke_sub_agent、state-sync は todo_list/spec)+ state-sync は spec 入力の shape マッピング追加。実機 payload 未捕捉のため「発火の実証テスト」が完成条件(Issue 明記)。
- **行番号**: Issue の `:200`/`:184` と現行一致(ずれなし)。

### #739 — stat/lstat の混同による dangling symlink クラッシュ(`scripts/promote-self.ts`)

- **欠陥**: `:146` `if (statSync(full).isDirectory()) yield* walk(full)` が `lstat` でなく **`statSync`** でエントリを stat するため、dangling symlink(リンク先欠落)で `statSync` が ENOENT を throw する。preserved 除外(`:155-157` `isPreserved`、`:192` の適用)は walk の**後段**でファイル単位に効くため、walk 内の stat クラッシュを防げない。`--check` 経路(`:207` `function check`)も orphanedFiles(`:184`)経由でクラッシュが伝播する。
- **影響境界**: preserved 配下の symlink 健全性にゲート成否が依存する(ゲートの緑がゲート対象でなく symlink 状態に依存)。
- **修理の型**: walk を lstat 化(symlink を stat しない)、または preserved サブツリーを走査段階で prune(`isPreserved` を walk 内へ前倒し)。check/apply 両経路が orphanedFiles 経由のため単一修正で両復旧。
- **行番号**: 起票時 `:145` → 現行 `:146`(+1)、その他は関数境界同型で近傍一致。

### #740 — shields.io エスケープの片側適用(`scripts/release-version-sync-plan.ts`)

- **欠陥**: `:30` の accept regex `/badge\/version-[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?-blue/` は prerelease サフィックスを受理するが、`:31` の replacement `(v) => \`badge/version-${v}-blue\`` は**生バージョン文字列を埋め込む**だけで、prerelease の `-` を shields.io 用に `--` エスケープしない。受理側(prerelease 許容)と生成側(エスケープ不履行)の非対称で、prerelease バッジが 404 になる。
- **影響境界**: `.github/workflows/release.yml:36` の `options: [patch, minor, major]`(prerelease 選択肢なし)により標準経路から prerelease 到達不能=P3 根拠と整合。
- **修理の型**: replacement 側で prerelease サフィックス内 `-` を `--` エスケープ + accept 側もエスケープ済み形を受理して冪等性を維持。plan.ts 単一 seam の局所変更(CLI `release-version-sync.ts:20` は plan から `planVersionSync, VERSION_SURFACES` を import する薄いエントリで独自 accept regex を持たない)。既存の版同期系テスト(t68)への波及確認が要る。
- **注**: Issue 本文は accept を `release-version-sync.ts:23` と表記するが実体は同 seam モジュール `release-version-sync-plan.ts:30`(1ファイル取り違え)。指す規則(accept/replacement の非対称)は plan.ts に実在。

### #784 — parse-don't-validate の非対称(`tests/gen-coverage-registry.ts`)

- **欠陥**: `:1243` `if (!existsSync(RATCHET_PATH))` は不在時に `RATCHET FAILED:` 整形診断を出すが、`:1250` `JSON.parse(readFileSync(RATCHET_PATH, "utf-8")) as RatchetDoc` は**検証なしの素 JSON.parse** で、malformed JSON は SyntaxError を無診断 throw、`:1253` `baseline.coveredByClass[c] ?? 0` は形状仮定アクセスで `{}` 入力時 TypeError。存在チェックだけ整形済みで parse/shape は未整形、という parse 経路の片側適用漏れ。兄弟 `tests/coverage-project-gate.ts` の `parseTotalsText`(`:89`、`:188` で `GATE FAILED [MALFORMED]` の整形診断+exit 1)が正の型で、同一リポ内で同種入力(壊れた JSON baseline)への処理が非対称。
- **影響境界**: fail-closed(exit 1)は維持され誤 green はない。欠陥は診断可読性に限局(機能破綻でも誤 green でもない)。
- **修理の型**: `coverage-project-gate.ts` の parseTotalsText と同型の parse-don't-validate を runCheck の ratchet 読み込みへ導入。env seam `AMADEUS_COVERAGE_RATCHET`(`:104-105`)が既にありテスト注入可能。
- **ラベル判定(Developer が再確認)**: 現ラベル **bug/P3/S4-MINOR/origin:bootstrap は変更不要**。bug(誤 green でないが無診断スタックトレース=診断品質欠陥)、P3(CI を止めるが回避可・正しさ/安全性の破綻でない)、S4-MINOR(兄弟非対称を現物裏取り、影響は診断可読性限局)、origin:bootstrap(導入コミット `5cfb16165`、intent record なし)いずれも妥当。
- **行番号**: 起票時 `:1250-1252` → 現行 `:1250/:1253`(+1 以内)。

## core-repair-batch3 の観測面 — read/write 非対称・prototype-chain 残余・非アトミック書き込み・時間依存テスト(#746 / #786 / #742 / #743 / #747 / #741 / #751 / #744 / #749 / #750)

現行 HEAD `58f3453ad` で確定(焦点コードは base `da1611a9a`→observed でいずれも無変更、10 Issue 全件現存。下記は現行コード直読の静的分析)。詳細な file:line 一次記録は当該 intent(260710-core-repair-batch3)の `inception/reverse-engineering/scan-notes.md`、横断整理と修理設計空間は architecture.md の同名節を参照。バッチ3は単一クラスに収斂しないが、品質観点では以下の4アンチパターン群に分類できる。

### read/write 非対称クラスタ(#746)

- **anchor 対応の片側適用**: `amadeus-lib.ts:1905-1907` の `worktreePath(projectDir, boltSlug)` は生 `join` で anchor 概念なし(読み手 `amadeus-swarm.ts:233`)。対して write 側 `amadeus-worktree.ts:316/403/621` は `worktreeBaseDir(…)`(`resolveMainCheckout` :155 / `worktreeBaseDir` :214)で anchor 対応済み。同一パスを組む2つの規則が read/write で食い違う。sibling セッション駆動時に write と read が別ディレクトリを指す。
- **生 read 消費者の広がり**: `amadeus-bolt.ts:653`・`amadeus-audit.ts:456/:570`・`amadeus-runtime.ts:1200/:1291`・`amadeus-state.ts:2600/:2754`(`flags["target-dir"] ?? worktreePath(pd, slug)`)・`amadeus-utility.ts:960/:1074` が同型の生呼び出し。修理は単一 anchor 規則へ統一(lib 昇格 or worktree_path 引き回し)。
- **凍結すべき不変条件**: worktree パスの導出規則は write/read で単一。sibling/anchored 環境でも読み手が書き手と同じ base を解決する。

### prototype-chain 残余サイト(#744、#788 の未完部分)

- `PHASE_NUMBERS`(`amadeus-lib.ts:86`、object literal)への生インデックスが3サイト現存: `amadeus-orchestrate.ts:2194`(`canonicalisePhase`)・`amadeus-jump.ts:176`・`amadeus-state.ts:2512`。`Object.hasOwn` ガードなしで `constructor`/`__proto__` が truthy な Object/proto を返し `!canonical` ガードすり抜け → `amadeus-lib.ts:4124` `phase.toLowerCase()` で TypeError crash。
- **バッチ D #788 との同根**: #788 は graph/runtime の dispatch 表に `resolveOwnHandler`(`Object.hasOwn`)を導入したが「lib 共有を避けてローカル保持」と明記。#744 は同一クラスの values 面で未対処。前例に倣うなら**各サイトへローカル own-key ガード適用**が整合し、これで U6 は lib を触らず U1(#746)との交差が消えて並行可能になる(設計含意は architecture.md 参照)。
- **将来顕在化型**: `input.toLowerCase()`(:2192)で全小文字 `constructor`/`__proto__` のみ漏れる稀な crash。exit code/audit を汚す前に弾く硬化が要る。

### 統合境界のエラー握りつぶし + 非アトミック書き込み(#742 / #743、2件連鎖)

- **#742**(err swallow): `packages/setup/src/domain/installation.ts:28-45` が `manifestIo.read` 結果を `:30` `type === "ok" && value !== null` でのみ分岐し **err をフォールスルー**(err と absent を同一視)→ `:44` `noneInstallation()` 誤案内。`manifest-io.ts:19-30` は absent→`ok(null)` / I/O・malformed→`err` を区別しているのに detect 戻り型 `Installation` に err チャネルが無く区別が消滅。「存在するが読めない/壊れている」が診断不能。
- **#743**(非アトミック write): `packages/setup/src/ports/fsops.ts:66` `writeText` の直接 `writeFile`(temp→rename なし。#773 traversal guard 改変で無変更)。`manifest-io.ts:33-38` の唯一の書き込み経路が使用。kill-mid-write の truncated JSON が **#742 がちょうど誤処理する入力を生成**する連鎖。
- **凍結すべき不変条件**: 統合境界(fs I/O)は err を握りつぶさず呼び出し元へ表面化。manifest 書き込みは POSIX アトミック(temp write → same-dir rename)。

### 時間依存・順序依存の脆さ(#741 / #747)

- **#741**(wallclock フレーク): `tests/integration/t90.test.ts:503` test 13 が `setTimeout(2000)` 2回 + `new Date().toISOString()` 秒精度比較で MEMORY_EMPTY Timestamp の前後関係を pin。並列負荷下でスケジューラ遅延が境界を不安定化 → 間欠 fail。**プロダクト(runtime compile 計数)側 vs テスト決定性欠如の切り分け未了**。
- **#747**(prerelease 順序無視、潜在): `internal/semver-factory.ts:15-21` `isLaterThan` が major/minor/patch のみ比較し prerelease を見ない(`:20` out of scope)。`upgrade.ts:42` が誤境界判定(`1.0.0-rc.1`→`1.0.0` が非 proceed)。リポに prerelease タグ非存在ゆえ潜在、発行時顕在化。**#774(バッチ D)が resolver exact 経路を書き換えたため #747 Issue の resolver:60-65 参照は stale だが、根本原因の semver-factory は無変更で現存**(architecture.md 参照)。

### レガシー定数への stale 参照(#751)

- `amadeus-codex-adapter.ts:193/198` の SESSION_ENDED reconcile が `amadeus-docs`(= `FLAT_MIGRATION_ROOT`、`amadeus-lib.ts:850` のマイグレーション専用レガシー定数)を参照 → 現行レイアウトで `:198` early-return 常真、reconcile 常時不発。正準は `hooksHealthDir()`(`amadeus-lib.ts:2120`)。`:59` の `stateFilePath` import が reconcile 未使用(mint 側のみ使用)= 内部不整合の証左。実害は codex SESSION_ENDED の監査欠落(観測性のみ)。

### 生 NUL バイト混入(#786、検証規律への実害)

- `amadeus-learnings.ts:571` emitKey に生 NUL(python 実測: blob 内1個、offset 22828)。in-memory Set 専用(`:574`/`:603`)で永続化されず bun/tsc 受理 → **ランタイム無害・grep binary 誤判定で検証規律に実害**。全7コピーへ dist:check バイト一致で伝播。導入 PR #780。修理は可視区切りへ、挙動不変。

### テスト面(現状カバレッジと欠落 — いずれも「落ちる実証」対象)

- **#746**: sibling/anchored 環境で read が write と同じ base を解決することを pin する回帰(生 read が別ディレクトリを指す現状を再現)。
- **#744**: `canonicalisePhase("constructor")` 等が null を返し crash しないことを pin。
- **#749**: single で construction 先頭ステージが determinate gate を emit(現状 `GATE_UNRESOLVED` 詰みを再現)。**#750**: Kiro latch ターン一致時の素 `next --new-intent` が birth に至ることを pin。
- **#742**: 破損 manifest 存在時に absent と区別して表面化。**#743**: kill-mid-write シミュレーションで truncated JSON が残らない。**#747**: prerelease タグ fixture で正しい proceed/downgrade 判定。
- **#741**: wallclock 依存の除去(決定化)。**#751**: 現行レイアウトで reconcile が発火し SESSION_ENDED を emit。**#786**: emitKey に NUL バイト不在(byte 走査)。

## 複雑度ゲート導入(intent 260710-complexity-gate、2026-07-10)

現行 HEAD からの diff-refresh(フォーカス5面)で確定した、複雑度分布の実測とゲート計画。出典: lizard 実測 + scan-notes + initiative-brief。

### 複雑度分布の実測(lizard、2026-07-10)

- **総関数数 1,093**(lizard が計測した全関数)。うち **CCN(cyclomatic complexity number)> 15 が 42 関数**、CCN 30+ が 12 関数(バグの原因所在分析でバグ多発ファイルに集中)。最大は `blockBoltSlug` の **CCN 65**。
- この 42 関数を baseline として grandfather(現存の高複雑度を許容)し、新規の閾値超過とラチェット悪化のみを赤にする fail-closed 方式。

### 複雑度ゲート導入計画(2層ゲート)

- **方式(確定)**: Biome `noExcessiveCognitiveComplexity`(warn 層)+ lizard CCN の baseline ラチェット(block 層)の2層。
- **閾値**: 初期 CCN 15 で block(E-CX1 Q1=C)。将来の 10 への段階降下は分布改善後にノルム選挙で判断する Issue を起票(受け入れ基準に含む)。
- **Biome スコープ拡大**: biome check の対象へ `packages/framework/core` + `scripts` を追加(E-CX1 Q2=A)。既存6指摘の機械的修正を同一 PR に含む。
- **CI 配置**: 既存 `check` ジョブに lizard ステップを追加(pip 固定インストール、typecheck/lint 直後、E-CX1 Q3=A)。
- **落ちる実証**: NEW_VIOLATION / RATCHET_REGRESSION / fail-closed 各系の注入テスト(team.md Mandated「落ちる実証」)。ゲート実装は `tests/coverage-project-gate.ts`(#762)の正準テンプレート(env seam・parse-don't-validate・fail-closed FailReason・`--check`/`--update`)を踏襲する(architecture.md / code-structure.md 参照)。
- **業務根拠**: バグの原因所在分析(2026-07-10)で実装逸脱・非対称実装が上位原因であり、その温床の高複雑度関数がバグ多発ファイルに集中。人手レビューに頼らない決定的ラチェットで悪化を構造的に止める。
- **残余リスク**: baseline キー(path+name)のリネーム摩擦(R2、頻発時は関数 fingerprint キーへ移行 Issue 化)、lizard の TS 新構文計測ゆらぎ(R1、計測補正で対応、誤検知の握りつぶしはしない)、CI の Python 供給変化(R3、バージョン固定・最悪時 vendoring)。

## mint-presence-vectors(履歴)の観測面 — #755 機械注入ターン分類器の単一プレフィックス欠陥

現行 HEAD(`fc5a34cf1`、base `584262c1a` からの diff-refresh。フォーカス面のコード diff は空で、下記はすべて現行コード直読 + 当該 intent(mint-presence-vectors)の動的/法医学的実測に基づく)で確定した、human-presence 分類器の注入ターン取りこぼしの観測。base/observed の真実源は `re-scans/260710-mint-presence-vectors.md`。

## tools-dispatch-batch の観測面 — caller 供給パラメータの照合欠落と dispatch/prune の非対称(#774 / #785 / #787 / #788 / #789)

現行 HEAD で確定(焦点5ファイルは base→observed でコード diff 空。`amadeus-runtime.ts` のみ #781 で改変されたが dispatch site を含む hunk は無し。下記は現行コード直読の静的分析)。詳細な file:line 一次記録は intent `260710-tools-dispatch-batch`(2026-07-10)の `inception/reverse-engineering/scan-notes.md`、横断整理は architecture.md の同名節を参照。5欠陥は「caller 供給の遷移/ディスパッチ/ページング境界パラメータを、enum・SKIP・存在チェックのみで受理し、index・方向・prototype-own・全件走査の照合をしない」同一クラスで、いずれも導出版(権威経路)が併存しながら実経路がそれを迂回する。

### #787 / #789 — caller 供給遷移パラメータの照合欠落(方向盲目)

- **#787**(`amadeus-jump.ts` handleExecute `:220-`): `direction = flags.direction`(`:228`)を enum メンバーシップのみ(`:229-235`)で受理し target/current の index 関係を再検証しない。同ハンドラ内 scope 側は再検証あり(`:250`/`:256`)=**非対称**。権威版は `handleResolve`(`:173-180`)が direction を index から導出。resolve を迂回した `--target <過去> --direction forward` で後退なのに前進 skip 副作用(`:289-311`)が走る。
- **#789**(`amadeus-state.ts` advance): 2 引数 `nextSlug`(`:1006-1007`)を `nextAction === "SKIP"` 拒否のみ(`:1010-1018`)で受理し隣接性・index を見ない。省略時は `nextInScopeStage`(`:1019-1028`)で導出=権威。さらに `crossesPhaseBoundary`(`:1077`)が **方向を見ない** phase 不一致判定で、別 phase の nextSlug を渡すと後退/横断でも `PHASE_COMPLETED`/`PHASE_VERIFIED`/`PHASE_STARTED`(`:1103-1126`)を鋳造。→ 誤方向の phase 境界イベントが emit されうる(虚偽の phase 進行)。
- **凍結すべき不変条件**: 遷移パラメータは caller 供給値を enum/SKIP チェックだけで信頼せず、resolve と同じく index から導出/照合し、phase 境界判定は方向(前進のみ)を条件に含める。

### #788 — 生 object-index dispatch の prototype-chain 露出(検証機構外の関数実行)

- `amadeus-graph.ts:1901` `COMMANDS[cmd]`(定義 `:1670`)/ `amadeus-runtime.ts:1453` `SUBCOMMANDS[cmd]`(定義 `:1412`)がユーザー供給 `cmd` をブラケット index するため prototype chain を辿る。`cmd === "constructor"`/`"toString"`/`"hasOwnProperty"` 等で Object.prototype の truthy 関数が返り `if (!handler)` ガード(graph `:1902`/runtime `:1454`)を通過して呼び出す(graph `:1910`/runtime `:1459`)。
- **全 tools 中この2サイトのみ**が生 object-index 方式で、他はすべて switch(prototype 汚染に無縁)。防御候補 `Object.hasOwn` / `Object.create(null)` / switch 化は未適用。#744 既知の `PHASE_NUMBERS[…]` 生 index(orchestrate/jump/state)は同型だがバッチ D スコープ外。
- **将来顕在化型**: 現状は不正 subcommand 名で稀に非ハンドラ関数を呼ぶ将来リスク。exit code/audit を汚す前に弾く硬化が要る。

### #785 — runner-gen write/check の走査源非対称(修復不能な赤ドリフト)

- `handleWrite` の prune(`:295-300`)は `loadGraph()` 現存ノードのみ走査 → graph から消えた slug の orphan runner dir は反復対象外で **write では永久に到達不能**。`handleCheck`(`:343-365`)は FS 走査 `onDiskRunnerSlugs()`(`:324-336`)− `compiledSet` で orphan を正しく検出・flag(`:361`)し、修復案内(`:363`)が `write` を指すが、その write は当該 orphan を消せない → **ドリフトガードが赤のまま解消できない詰み**。
- **state/checkbox 乖離型**: 検出条件(FS 実在 − compiled)と修復条件(graph 現存)が非対称で、ガードが指す修復手段が検出対象を満たせない。走査源を FS 側へ揃えるのが修理方向(決定は requirements)。

### #774 — setup version resolver のページング欠落(無言の版取りこぼし)

- `resolver.ts` の URL(`:13-14`)に `per_page` 無し(既定30件)、`fetchNames`(`:22-37`)が単発 getJson で Link 追従なし、`resolveVersion`(`:57-79`)の exact/latest とも単一ページ制約を継承。ポート `http.ts` の `getJson`(`:9-12`/`:23-33`)が **JSON body のみ返しヘッダ非露出**でページング実装が不能。BR-F09(`:12`、1 resolve ≤2 API call)が全件走査より優先され、**版数が30超で新版を無言に発見できない**(notFound 誤失敗 / 最新取りこぼし)。
- **無言偽成功型 + 設計緊張**: 誤って notFound/取りこぼしを返す点が静かな正しさ破綻。BR-F09 制約と全件走査要件の緊張が争点で、修理は「上限維持のページング再定義」か「上限緩和」かを requirements で確定する必要がある。

### テスト面(現状カバレッジと欠落)

- いずれも「落ちる実証」対象。#787/#789 は resolve/導出版と execute/2 引数版の**方向取り違え**を突く回帰(過去 stage を forward 指定 → 副作用差)が要る。#788 は `cmd="constructor"` 等で prototype 関数が呼ばれない(未知コマンドとして拒否される)ことを pin。#785 は graph から消えた slug の orphan dir を注入し `check` 赤 →(修理後)`write` が消せることを実証。#774 は31件超の tags/releases fixture で目標版を発見できることを実証。既存テストにこれらの負の実証は不在(scan-notes 実測)。

## learnings-audit-batch の観測面 — §13 learnings の persist 判定と runtime 集計窓(#754 / #745 / #761)

現行 HEAD で確定(両焦点ファイル `amadeus-learnings.ts` / `amadeus-runtime.ts` は最終変更 `0801d2100`=2026-07-07、base→observed でコード diff 空。下記は現行コード直読の静的分析)。詳細な真理値表とデータフローは architecture.md の同名2節を参照。

### #754 / #745 — persist dedup 判定マトリクスの2穴(同根)

- **共通根**: `handlePersist`(`amadeus-learnings.ts:411-608`)の `withAuditLock` ボディで、重複判定入力 `hasRow` が `:431` の**静的 audit スナップショット**由来(ループ内 `appendAuditEntryUnlocked` `:492` で再読込されない)、かつ `priorAuditRow`(`:348-358`)が `(Stage, Candidate-ID)` のみ照合し **Destination を無視**、加えて `hasLine`(`:476`)が per-file 累積で cross-file を見ない。
- **#754**(同一 file・cid 衝突): 真理値 `hasRow=F, hasLine=T` で行書き込みスキップ(`:483`)+ RULE_LEARNED emit(`:491`)→ audit 行のみ増え practice 行が伴わない row/line 不一致。
- **#745**(別 file・同一 cid): project→team の順で同一 cid を振ると両者 `hasRow=F`(snapshot が先行 emit を見ない)・`hasLine=F`(別 file)で **RULE_LEARNED 二重 emit**。
- **凍結すべき不変条件**: 1 `(Stage, Candidate-ID)` につき RULE_LEARNED は最大1行、かつ audit 行があれば必ず対応 practice 行が存在。
- **テスト欠落**: t99 は異なる cid の2 emit(Case 1)と同一 selection 再実行の直列化(Case 5)を pin するのみで、同一 cid の複数宛先(#745)/ cid 衝突(#754)は未カバー。t112 は sensor guard 専用。

### #761 — per-unit stage の learnings 集計が常に 0

- **欠陥**: instance-bearing(construction・window 内 STATE_FORKED distinct slug ≥2)parent stage の `learnings_captured` が `:739` で `countLearnings` 再計算されず、rollup が置いた `{0,0}`(approved 時)固定のまま。実際に RULE_LEARNED 行があっても数えない。
- **窓終端のデータフロー**: rollup(`:375`)が親 STAGE_COMPLETED を `completed_at` に置くが、BoltInstance populator が `:551` で `null` 上書きし、以後スキーマ(`:83-105`)に保持先がない。
- **e6 訂正の妥当性**: RULE_LEARNED は親ゲート承認時(最終 STATE_MERGED = `parentEnd` より後)に emit されるため、窓終端を `parentEnd` にすると `countLearnings` の `ev.timestamp >= windowEnd`(`:693`)で全除外され 0 のまま。よって窓終端は**親 STAGE_COMPLETED or null(open)**が正。`maxInstanceCompletedAt`(`:1034`)は parentEnd 同値で流用不可。

## mint-presence-vectors の観測面(前 intent、履歴)— #755 機械注入ターン分類器の単一プレフィックス欠陥

現行 HEAD(`fc5a34cf1`、base `584262c1a` からの diff-refresh。フォーカス面のコード diff は空で、下記はすべて現行コード直読 + 当該 intent(mint-presence-vectors)の動的/法医学的実測に基づく)で確定した、human-presence 分類器の注入ターン取りこぼしの観測。base/observed の真実源は `re-scans/260710-mint-presence-vectors.md`。

### #755-O1 — mint 分類器が単一プレフィックス startsWith しか見ず、teammate-message(形式 D)を素通しさせる(確定ベクタ)

- **単一プレフィックス判定**: `packages/framework/core/hooks/amadeus-mint-presence.ts` は `MACHINE_INJECTED_PROMPT_PREFIX = "<task-notification>"`(`:47`)を唯一の抑止シグネチャとし、`isMachineInjectedTurn()`(`:51-66`)は `prompt.startsWith(MACHINE_INJECTED_PROMPT_PREFIX)`(`:62`)だけで機械注入を判定する。先頭バイト一致のみのため、`<task-notification>` 以外の開頭を持つ全注入ターンが素通りして `appendAuditEntry("HUMAN_TURN", {}, projectDir)`(`:71`)で phantom HUMAN_TURN を鋳造する。
- **確定ベクタ = 形式 D(teammate-message)**: agmsg/SendMessage の inbox 配信は user-role ターンとして `Another Claude session sent a message:` 開頭で届き、`<task-notification>` プレフィックスに一致しないため無条件に鋳造される。本番 amadeus transcript 2 セッションで計 **18 件**の実注入を確認(worktree-engineer3=11、worktree-engineer2=7)。これが #755 の実害源。
- **形式 A(裸 `<task-notification>`)は正しく抑止**: 本番 monitor 注入は **439/439 が裸の形式 A** で配信され、startsWith が正しく弾く(t203:90-94 の pin と一致)。
- **形式 B(`[SYSTEM NOTIFICATION - NOT USER INPUT]` 前置き)は合成でのみ鋳造・本番非該当**: 合成 stdin では preamble により startsWith が失敗し鋳造する(測定 HUMAN_TURN=1)が、当該前置き文字列は amadeus 本番 transcript に **0/439 で不在**・レポジトリコードにも不在(grep ヒットは #755 バグ記述のみ)の外来ハーネス artifact。e1(「B も鋳造」)は合成ペイロード限定で真、本番の注入形式は裸 A のため非該当。争点は e6(確定ベクタは D)が正。

### #755-O2 — stop.ts tier-3(`transcriptIsConversational`)が同カタログを共有せず、A も D も素通り(同根・露出大)

- **tier-3 の無防備**: `packages/framework/core/hooks/amadeus-stop.ts` の `transcriptIsConversational()`(`:581-737`)は終端ターンの会話性で tier-3 会話カーブアウト可否を決めるが、user-role ターンの除外ヘルパ `isInjectedHookFeedback()`(`:568-`)は `"Stop hook feedback:"` 系の自己注入しか弾かない。task-notification(A)も teammate-message(D)も除外対象に無く、両形式とも `humanPrompt=true` として「直近の genuine human prompt」に採用される(`:721-728`)。
- **mint より露出が大きい**: mint は少なくとも startsWith で形式 A を弾くが、tier-3 には marker チェックが**皆無**で A・D の双方が素通りする。終端が注入ターンで後続 engine call が無い場合(`:731-736`)、`isConversationalStop`(`:753`)が機械注入 ping を人間チャットと誤認し会話カーブアウトを付与しうる。#755 と**同根**(注入ターンを人間ターンと誤認)であり、修正時は mint hook と共通の注入カタログを共有すべき。

### #755-O3 — HUMAN_TURN 消費系への波及と t203 のカバレッジ欠落

- **presence gate**: `humanActedSinceGate(projectDir, verb?)`(`amadeus-lib.ts:1507-1546`、判定 `:1544` `lastHuman > lastResolution`)は phantom HUMAN_TURN が gate 後に鋳造されると true に転じ、無人でゲート解決が通る。消費点は `assertHumanPresentForGateResolution`(`amadeus-state.ts:1456`)。
- **委任 provenance 汚染(#671)**: `handleDelegateApproval` は DELEGATED_APPROVAL を自 shard の最新 HUMAN_TURN timestamp で grounding する(`amadeus-state.ts:1645`、`handleDelegateRejection` は `:1715`)。形式 D 由来の phantom HUMAN_TURN がこの grounding を満たし、`verifyDelegatedProvenance` が on-disk 実在(ただし phantom)の HUMAN_TURN を根拠に委任を受理する。これが #755 が「#671 委任 provenance を汚染」と述べる経路。CLI minting guard(`amadeus-audit.ts:753/768`)は模倣鋳造を拒むが、UserPromptSubmit hook 自身の in-process 鋳造は正規経路のため、分類漏れ鋳造はこの guard を通り抜ける。
- **t203 の形式 D テスト不在**: `tests/unit/t203-mint-presence-classify.test.ts` は現状 form A 抑止のみを pin し、`grep "Another Claude session" tests/` はヒット 0。#755 修正は t203 に form D の RED→GREEN ケース追加を要する。
- **修正方針への含意(所見のみ、修正はスコープ外)**: 分類は単一 marker の startsWith では不十分で、実注入形式のカタログ(最低でも `<task-notification>`(A)と `Another Claude session sent a message:`(D))を網羅し、mint hook と stop.ts tier-3 で共有すべき。

## packaging の source 側 unreferenced 検査ギャップ(intent 260710、#735)

> 前回 intent の2バグは出荷済み: **#685→#729**(`DELEGATED_REJECTION` 追加)、**#670→#727**(worktree write パスのアンカー化)。以下の #685/#670 節は歴史的記録。

### 技術的負債: build 入力の source 側に未参照検出がない

| リスク | 影響 | 注記 |
| --- | --- | --- |
| **#735**: `harness/<name>/` の manifest 未参照ソースが build 不可視のまま残存しても何も鳴らない | 中(dead source の蓄積、意図せぬ「出荷したつもり」の欠落) | `checkHarness` の orphan scan(`package.ts` L574-628)はすべて**出力側**(committed dist vs 再ビルド dist)で働く。harness ソースは `harnessFiles` に列挙された `src` のみコピーされる(L357-363)ため、未列挙ソースは dist に到達せず出力側検査に載らない。source 側に「全 authored ファイルが manifest から参照されているか(または既知の build 機構ファイルか)」を照合する検査が存在しない |
| **vacuous exemption アンチパターン(#719/#737 の実害)** | 中(検証劇場: 存在しないものを除外する「文書のふりをした」regex) | kiro CLI manifest の `authoredExempt` に `/^hooks\/[^/]+\.kiro\.hook$/` があったが、kiro CLI は `.kiro.hook` を dist へ一切出荷しない(hooks は `agents/amadeus.json` 経由)ため、この regex は**何にもマッチしない vacuous な除外**だった。一方で同名のソース7個が `harness/kiro/hooks/` に manifest 未参照のまま滞留していた。exemption が「未参照ソースの存在を正当化しているかのように」読めてしまう点が負債。#737 は7ソース削除 + exemption 除去 + `t148` 再注入ガード追加で是正 |

### #735 修理時の設計上の注意

1. source-unreferenced check は **build 機構ファイル**(`manifest.ts`/`onboarding.fills.ts`/codex の `emit.ts` — いずれも `package.ts` が `require()` で読み dist へコピーしないモジュール)を誤検出しない除外設計を要する。この3種は「正当に未参照(=出荷されない)」なソース。
2. 検査は「dist 全域 orphan scan(#711)」の source 側対称物として位置づけると一貫する: 出力側は「期待出力集合に属さない committed dist ファイル」を鳴らし、source 側は「manifest 参照集合にも build 機構集合にも属さない authored ソース」を鳴らす。
3. team.md Mandated の「落ちる実証」に従い、未参照ソースを注入して検査が赤くなることを実証してから完成扱いにする(#737 が `t148` で `.kiro.hook` 注入 → 赤、除去 → 緑を実証した先例に倣う)。

## 260709-gate-mechanics(前 intent、履歴)対象2バグの評価

## delegate-answer-consume intent(260710、#736)の観測面 — 委任発行 grounding の QUESTION_ANSWERED 先食い

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

## kiro-stale-hooks(intent、履歴)の確認済み欠陥 — #719(P3 / source hygiene)

現行 HEAD(`e1a07fada`、base `24197d755` からの diff-refresh)の実コードを直読して file:line を確定した、drift-guard の2層マスキング欠陥1件。Developer(スキャン)→ Architect(合成)の2サブエージェント直列で実施(cid:reverse-engineering:c3)。base→HEAD 差分13ファイルは本フォーカス面(kiro ハーネスの hook 出荷経路・orphan 検査機構)に非関与(監査エスケープ #204/#205・テストサイズ動的計測系)のため、下記はすべて現行コード直読による。base/observed の真実源は `re-scans/260710-kiro-stale-hooks.md`。

### #719 — Kiro CLI の unshipped な stale `.kiro.hook` を drift-guard が検出できない(2層マスキング)

- **欠陥の本体(dead な source)**: `packages/framework/harness/kiro/hooks/` に 7 件の `.kiro.hook`(audit-logger / log-subagent / runtime-compile / session-end / session-start / stop / sync-statusline)が source に残存するが、kiro CLI はこれらを**出荷も登録もしない**。出荷は `manifest.ts` が hooks 由来を adapter 1 件(`{ src: "hooks/amadeus-kiro-adapter.ts", ... }`、`:55`)のみ列挙し `.kiro.hook` を harnessFiles に1件も含めない。登録は `agents/amadeus.json` の `hooks` オブジェクト経由で全 seam が `amadeus-kiro-adapter.ts` を叩く(`.kiro.hook` は登録経路にも不在)。→ 7 件は出荷・登録とも完全に冗長。うち `amadeus-session-end.kiro.hook` のみ command が `bun .kiro/hooks/amadeus-session-end.ts`(adapter 非経由)で内容ドリフトしており(CLI/IDE 分離前の残骸)、他 6 件は kiro-ide 版と同内容。
- **1層目(主因)= source 側 orphan 検査機構の不在**: `scripts/package.ts` の `checkHarness(name)`(`:554-633`)は committed dist ツリー(`dist/<name>/`)と tmp build 出力のみを walk し、**source(`harness/<name>/`)を走査する経路が存在しない**。built→committed(MISSING/DIFFERS `:565-573`)、harness-dir subtree orphan(committed→built、authoredExempt 消費 `:579` / ORPHAN 判定 `:580`)、whole-tree orphan(`:605-628`、ORPHAN 判定 `:626`)のいずれも dist 側しか見ない。kiro CLI は `.kiro.hook` を dist に投影しない(`dist/kiro/.kiro/hooks/` の `.kiro.hook` は 0 件)ため、source の 7 件はどの walk にも載らず `bun run dist:check` は exit 0 で通過し、stale を一切検出できない。
- **2層目(補助的マスク)= 空振り authoredExempt regex**: `packages/framework/harness/kiro/manifest.ts:81` の `authoredExempt` 第3 regex `/^hooks\/[^/]+\.kiro\.hook$/` は「全 `.kiro.hook` を orphan 免除」するが、kiro CLI は `.kiro.hook` を 0 件出荷するため守る実体が無い純粋なマスク。万一 stale な `.kiro.hook` が dist に混入しても orphan 検査を素通りさせる第二の網として働く(コメント `:76-80` は regex1/2 の正当化のみで regex3 の根拠を記述しない)。対照的に `harness/kiro-ide/manifest.ts` は `.kiro.hook` を 9 件正当出荷(`:51-59`)し、同一 3 regex の authoredExempt(`:96`)は出荷対象という文脈で防御的に妥当。
- **同型性(#701 との関係)**: 本欠陥は下記 #701(orphan スキャンの dist ルート盲点)と同種の drift-guard 穴。#701 が「dist ツリー内の検査対象集合の穴」だったのに対し、#719 は「そもそも source 側を検査する機構が無い」という一段上流の穴で、2層目の空振り exemption がそれを補助的に隠す二段構え。#701 の whole-tree 化(`:605-628`)は dist 側の穴を塞いだが、source 側の未参照ファイルは依然どの検査にも当たらない。
- **テスト影響(削除の安全性)**: `tests/smoke/t148-kiro-file-structure.test.ts` は SHIPPED `dist/kiro` ツリーのみ(`hooks` の `.ts` ≥10 件を数える)、`tests/unit/t147-kiro-hook-adapter.test.ts` は `dist/kiro/.kiro/hooks/amadeus-kiro-adapter.ts` を subprocess 起動する。どちらも source の `.kiro.hook` を参照しない。リポ全体 grep でも source `harness/kiro/hooks/*.kiro.hook` を直接参照するテスト/スクリプトは皆無。→ 7 件の stale source `.kiro.hook` 削除は t147/t148 を含む既存テストを破壊しない(`bun test t148 t147` が exit 0 / 23 pass を実測)。
- **修正境界の候補**: (a) source の 7 `.kiro.hook` を削除して dead を排す、(b) kiro CLI manifest の authoredExempt regex3(空振りマスク)を除去して 2 層目を閉じる、(c) source 側 manifest 未参照ファイルを検出する検査機構を `checkHarness` に追加して 1 層目を塞ぐ。設計判断は requirements-analysis で確定。「落ちる実証」は source に stale `.kiro.hook` を残したまま検査が赤くなること(1 層目を塞ぐ場合)で担保する。

## dynamic-test-size(intent、履歴)の観測面 — #684 Phase D 実装への含意

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

## t92-worktree-hermeticity(intent、履歴)の確認済み欠陥

現行 HEAD(`be205cfca`)の実コードを直接読解して file:line を確定した、tsc 解決の非ヘルメチシティ欠陥1件。

### #709 — t92 test 44 が install 済 node_modules へのシンボリックリンクを前提し、worktree の install 状態で exit code がドリフトする

- **原因1(exit-code そのまま伝播の設計)**: ステータスゲート `packages/framework/core/tools/amadeus-sensor-type-check.ts:368` の `if (status !== null && status !== 0 && allErrors.length === 0) process.exit(status)` は、`allErrors` 空(TS18003「No inputs were found」等、`PRIMARY_RE` 不一致で line:col を持たない)かつ tsc 非 0 のとき tsc の生 exit code をそのまま伝播する。この code は TS のバージョン/`--incremental` 有無で 2 か 1 に揺れる。
- **原因2(環境依存 launcher)**: `resolveTscLauncher(tsconfigDir)`(`:182-201`)は起点 dir から上方向に `node_modules/.bin/tsc` を探索し、`existsSync`(`:192`)がシンボリックリンク追従で判定するため、リンク先欠落(未 `bun install`)だと false。ツリー上端まで無ければ `bunx tsc`(`:200`)へフォールバックし、グローバルキャッシュの別バージョン TS(観測 7.x)が走る。原因1と原因2の組合せが #709 の非対称の根本 — pinned tsc(typescript ^6 + `--incremental`)は exit 2、bunx フォールバックは exit 1。
- **バグの核心(test 44 の非ヘルメチシティ)**: `tests/integration/t92.test.ts` test 44(`:1160-1189`)は唯一 exit code(=2)を厳密ピンし、`:1180` の `symlinkSync(REPO_ROOT/node_modules, proj/sub/node_modules)` が**リポジトリの node_modules が install 済である前提**に立つ。未 install の worktree ではリンクが壊れ → bunx → exit 1 → `Note` が `script-error: exit-2` を満たさず**失敗**する。これが #709 の非ヘルメチシティ本体で、テストの緑がテスト対象ではなく worktree の install 状態に依存する。
- **堅牢な対照テスト(要修正外)**: test 45(`:1206-1234`)は node_modules シンボリックリンクなし・`allErrors` 非空(other.ts の実型エラー)でゲート不発火のため exit code ドリフトに非依存。test 12/16(`:557-567`, `:666-668`)は pass/fail 件数のみ検証で exit code 非依存。`tests/unit/t202-sensor-type-check-tsc-launcher.test.ts` は `resolveTscLauncher` の純関数テストで自前 temp ツリーを組み(`:37-101`)リポジトリ node_modules に非依存。tsc 解決を持つのは t92・t202 のみで、脆弱なのは t92 test 44 単独。
- **修正境界の候補**: test 44 の install 済 node_modules 前提を、worktree の install 状態に依存しない形(install 有無を前提しない skip ガード、または launcher を明示注入して exit code 依存を除去)へ。requirements で確定。「落ちる実証」は未 install 相当環境での再現で担保する。

## packaging-repair-batch(intent、履歴)の確認済み欠陥 — PR #711/#712 で解決済み

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

## 既知の欠陥 — integrity-batch(intent `260709-integrity-batch`、履歴)の修理対象4件

> 上記の6バグ(#674/#675/#676/#677/#678/#668)は前回 intent `260709-bug-zero-batch` のスキャン記述であり、integrity-batch のスコープ外。本節が当時の diff-refresh(`a1c79dc12..162553b99`)で焦点化した4件。いずれも当該区間の焦点コードに未着手で残存する欠陥であり、#707・#708 は今回区間で入った前提機構(#693 origin 由来 repo 名 / #671 delegate provenance)の隣接領域として顕在化した。file:line は self-install ツリー(`.claude/`)を実測面として引用する — 修正は source of truth の `packages/framework/core/` を編集し dist/self-install へ伝播させる(team.md Mandated)。

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
- **伝播構造**: 破損参照は既に `.claude/knowledge/.../workflow-planning-guide.md:3` と `dist/claude/` 複製にも伝播済み。L3 は当該 diff 区間で未変更(L55 のみ #672 で編集)= 恒久的な既存欠陥。修正は core を直し `bun scripts/package.ts` + `bun run promote:self` で全ツリー再同期(`dist:check`/`promote:self:check` を同一コミット)。修正方向は (a) 参照文言の削除/修正、(b) `product-guide.md` を delivery ディレクトリにコピー(重複負債・NEVER 二重実装ノルムと緊張)、(c) delivery-agent のロードパスに product-agent knowledge を追加 — 設計判断は requirements-analysis へ。

### 構造的共通性(4バグの分類)

- **検証機構の正しさ系(#705・#708)**: どちらも「偽の信頼を生む機構」= team.md/project.md の「検証劇場 Forbidden」の趣旨に直結。修正時は「落ちる実証」(失敗ケース注入で赤くなること)が team.md Mandated で要求される。
- **共有ストア/参照の一貫性系(#706・#707)**: #693(origin 由来 repo 名)後の単一 codekb ストアという新しい共有面で、並行書き込み(#707)と tree 外参照(#706)が顕在化。

## Issue #857 差分スキャン（2026-07-23）

旧「`handleDoctor` は全行0 coverage」という評価は失効した。export 済みハンドラに対する monkeypatch 型 in-process テストは6ファイル104ケースが成功し、LCOV 437/771行 hit である。一方、t37/t83/t210 の spawn 契約41ケースは成功しても LCOV 1/771行 hit であり、別プロセス由来の観測盲点は存続する。

主な技術的負債は、約1,371行の `handleDoctor` に検査編成・出力・終了・環境依存が集中していること、正式な戻り値 seam がないため `process.exit`・stdout・env の monkeypatch が重複すること、cwd と env/cache の暗黙依存である。

## 品質改善の限定範囲

推奨改善は `runUtilityMain → 薄い CLI wrapper → doctor core → checks/dependencies` の最小分割である。全 check の純関数化や5,205行の utility 全体の再編は行わない。成功判定は既存104ケースとspawn 41ケースの維持に加え、stdout 診断・集計、exit 0/1、audit、stale lock cleanup、CLI/cwd 契約が回帰しないこととする。

## 記録系 round-trip PBT の品質所見（260802-record-roundtrip-pbt、履歴、observed `9750f8aea`）

本節の file:line・件数はすべて observed `9750f8aea` 時点。実測手順とコマンド出力は `re-scans/260802-record-roundtrip-pbt.md` を正本とする。

### 既存 PBT の被覆分布（4 境界）

| 境界 | 既存 round-trip PBT | 判定 |
| --- | --- | --- |
| mirror | `t274-amadeus-mirror-state-codec.test.ts` — `:58` `round-trip: render -> parse -> equal snapshot` は **example-based**、property は `:341` `property: arbitrary surrounding bytes round-trip` の周辺バイト保存のみ。`t275-amadeus-mirror-state-reducer.test.ts:373` に reducer の property（`:375-376`） | **半分** — `render → parse` の property 版と妥当 snapshot の arbitrary が不足 |
| audit / journal | `t204-audit-escape.pbt.test.ts`（P-AE1 = loss-free domain 上の条件付き round-trip `unescape ∘ escape = id`）、`t352-journal-codec.pbt.test.ts`、`t364-journal-v2.pbt.test.ts`（バイト水準） | **あり** |
| state | `fast-check` 使用 0 件 | **なし** |
| election | `fast-check` 使用 0 件（`t234` / `t235` / `t238` は example-based のみ） | **なし** |

測定: `grep -rln "fast-check" tests/` の全数（10 パス = `tests/unit` 7 / `tests/integration` 1 / `tests/helpers/arbitraries` 2、observed `9750f8aea`）。

**棚卸し手法の罠（後続検証者向け）**: `.pbt.` 命名でのファイル探索は `t274` / `t275` を構造的に取りこぼし、「mirror に PBT なし」という**偽の不在主張**を作る（`cid:requirements-analysis:absence-claim-grep-verify`）。棚卸しは必ず `grep -rln "fast-check" tests/` で行う。あわせて `grep -rlin "round-trip" tests/` は coverage-registry / patch-allowlist をヒットさせるため、`tests/unit/` `tests/integration/` に限定する。

### 残存欠陥クラス: 硬化が読み戻し経路を通らない

#1459（CLOSED 2026-07-26）は `Election.parse` 側を硬化した（`amadeus-election-model.ts:77` 空 choices 拒否 / `:96` 重複 internalNo 拒否 / `:109` 重複 voter 拒否）。しかし `Store.load`（`amadeus-election-store.ts:503-510`）は `readJson<ElectionFile>`（`:71`、`:80` で `JSON.parse(text) as T`）を通るだけで `Election.parse` を再適用しないため、**ディスクからの読み戻しでは当時の欠陥入力がそのまま受理される**。`Election.parse` のプロダクション呼出は発行側 2 箇所（`amadeus-election.ts:310` / `:433`）のみで消費側 0 件。

→ #1459 の再現は pre-fix 面切替を要さず、読み戻し経路の fail-closed プロパティが現行コードでそのまま赤になる。対照的に #1547（CLOSED 2026-07-26）の再現は pre-fix 面切替が要る（`cid:code-generation:falling-proof-no-stash` に従い、fix コミット後に対象ファイルのみ `git checkout <sha> -- <path>` で切替。stash は使わない）。

### 境界ごとの読み側硬さのばらつき（品質面）

- **state 構造フィールド**は既に読み側 fail-closed（`amadeus-state.ts:248` 重複 phase / `:257` 不正 JSON / `:261` 非オブジェクト / `:266` 未知 phase / `:270` 不正 status を throw）。欠けているのは検査ではなく**プロパティ**である。書き手が正規化書き手（`:278` が `MIRROR_BOUNDARY_PHASES`（`:225`）順へ並べ替え）であるため、プロパティは「正規化後の同値」で張る必要があり、素朴な `serialize ∘ parse = id` は成立しない（偽の赤になる）。
- **state テキストフィールド**は fail-open と fail-closed が同居する。`setField`（`amadeus-lib.ts:5237`）はフィールド行が無いとき無変更の content をそのまま返す（サイレント no-op）一方、`setFieldStrict`（`:5271`）は同状況で throw する。`getField`（`:5179`）は値を `.trim()` して返すため round-trip は trim 込みの条件付き同値でしか成立しない。受理ドメインを設計段で明示しないと、恒真プロパティか偽の赤のどちらかに落ちる。
- **election** は読み側の検査がゼロ。`writeStoreFile`（`:60`）は tmp→rename のアトミック書き込みだが、読み側の crash-consistency プロパティは存在しない（本 intent では将来課題として記録のみ）。

### PBT 実装規約の現況と揺れ

既存規約は `tests/unit/setup-semver.pbt.test.ts` を canonical 定義とし、`t204-audit-escape.pbt.test.ts:16-28` がヘッダで 4 点を明文化している（verbatim: `DETERMINISTIC PR CI` / `FAILURE OUTPUT` / `PINNING SHRUNK COUNTEREXAMPLES` / `DEEP RUNS (opt-in, no new CI job)`）:

1. PR CI は per-property の固定 seed + fast-check 既定 `numRuns`（100）。`t204:38` `const PBT_SEED = 0xa0_d17;`、`t352:25` `const PBT_SEED = 16280702;`、`t364:41` `const PBT_SEED = 26072903;`
2. 失敗時は fast-check が seed / replay path / shrink 済み反例を出力する（追加配線不要）
3. shrink 済み反例は example-based テストへ写して恒久 pin にする
4. 深掘りは `AMADEUS_PBT_DEEP=1` で既存 `--release` tier へ分離（`t204:39` `const DEEP = process.env.AMADEUS_PBT_DEEP === "1" || ...`、`:41` `const OPTS = DEEP ? { seed: PBT_SEED, numRuns: 50_000 } : { seed: PBT_SEED };`）

**揺れ 1（deep tier の非一貫）**: `AMADEUS_PBT_DEEP` の実装は `setup-semver.pbt` / `setup-manifest.pbt` / `setup-plan-decisions` / `t204-audit-escape.pbt` の 4 ファイルのみで、`t352` / `t364` / `t274` / `t275` は固定 seed のみ（`grep -n "AMADEUS_PBT_DEEP" tests/unit/*.ts tests/integration/*.ts` の全数、observed `9750f8aea`）。すなわち setup ドメイン 3 本 + audit 1 本が第 4 項を満たし、記録系の journal 2 本 + mirror 2 本は満たしていない。

**揺れ 2（import 面の 2 流儀）**: dist 出荷コピー import が `t204:35`（`"../../dist/claude/.claude/tools/amadeus-audit.ts"`）/ `t352:23` / `t364:39`（ともに `"../../dist/claude/.claude/tools/amadeus-journal.ts"`）、core 正本 import が `t274:13`/`:22` / `t275:13`/`:19`（`"../../packages/framework/core/tools/..."`）。新規 PBT がどちらを読むかは設計段で確定して成果物に明記する（実装段へ丸投げしない — `cid:code-generation:golden-regen-from-shipped-surface`）。読む面が変われば「落ちる実証」の注入面も変わる（`cid:code-generation:injection-surface-verify`）。

### 静的ガードの品質要件

「共有バリデータを経由しない読み戻し経路」の検出は grep 単体では不足で、`tests/callsite-guard.ts` 同型の allowlist ratchet が必要。同ファイルのヘッダが記す設計理由（verbatim: `WHY COUNTS AND NOT LINE PINS. An allowlist of file:line identifiers goes stale the moment an unrelated edit shifts a file`）に従い、`(file, symbol)` 単位のカウントで単調減少性を保つ（`cid:code-generation:allowlist-line-pin-stale`）。新設ガードは失敗ケースを注入して実際に赤くなる「落ちる実証」を完成条件に含める（org.md Mandated）。あわせて corpus sweep（既存の正当なデータで赤くならないこと）も両側で実測する（`cid:code-generation:corpus-sweep-for-new-guards`）。

### オラクル相殺リスク（`cid:build-and-test:pbt-oracle-cancellation`）

round-trip プロパティはメタモルフィックで独立オラクル不要のため相殺しない。ただし **fail-closed プロパティで棄却規則をテスト側に再実装すると相殺に落ちる** — arbitrary は非適合入力の生成に徹し、判定は被検バリデータ自身へ委ねる。さらに、発行⇔消費が同一バリデータを共有する構造へ収斂させた後は、round-trip 単独ではバリデータ自身の欠陥が恒真化して見えなくなるため、2 種のプロパティを分けて張ることが品質上の必須条件になる。

### 投影・ゲートの品質コスト

core/tools を触るため coverage patch ゲートの母集団に入る。CLI spawn 経由でしか通らない行は lcov に載らないため（`cid:requirements-analysis:bun-coverage-spawn-blindspot`）、in-process seam の設計を実装時点で行う。加えて `dist:check` / `promote:self:check`（7 ハーネス — 5 で止めると kiro / kiro-ide が DIFFERS）、`t258-boundary-guard`（出荷 core/tools は `scripts/` 非参照 — コメント文字列にも `scripts/<file>` を書かない、`cid:code-generation:c1-1569-shipped-comment-vocab`）が連動する。

## Issue #2813 品質評価（履歴、observed `c0f9edf2782`）

### 強み

- model は filesystem/network/clock から分離された純粋層で、tally と resolution を単体・PBTで検査できる。
- store は single-writer、tmp + rename、append-only ledger/history、blind pending lane、legacy direct-path fallback を持つ。
- transport は over-informed payload を型で防ぎ、agmsg と subagent を同じ port に閉じ込める。
- record は GoA line を実 parser で往復し、票数・留保数・timeline を別ソースと照合する。
- 選挙関連の既存テストは直接対象だけで21ファイルあり、example/unit/integration/PBT/e2e を持つ。

### 残存リスクと技術的負債

1. **単問 cardinality の横断固定**: definition、ballot、resolution、state、tally、record、formal model が同時に単問であり、partial migration は fail-open になりやすい。
2. **raw tally read**: `readTally` は `JSON.parse` 結果を domain shape として返し、typed validation がない。
3. **弱い同値判定**: verify は `JSON.stringify(recomputed) === JSON.stringify(stored)` を使い、canonical ordering/schema evolution を明示しない。
4. **責務集中**: CLI 853行、store 719行、model 550行、migration 580行。global state と per-question result を同じ条件分岐へ足すと複雑性が増幅する。
5. **global state と voter-only resolution**: 現在の key cardinality 自体が mixed result と held-only rerun を表現不能にする。
6. **norm drift**: bundled workaround は削除済みだが `team.md` の「1選挙1質問」は現行実装に合致して残る。実装と同時に更新しないと新挙動を禁止する規範になる。

### 欠落している回帰クラス

- 複数 question parse、question ID 重複拒否、question 別 choices。
- voter×question response、amend/ref、receipt-order resolution。
- 全問 established、mixed established/hold、複数 hold reason。
- held-only rerun と established result 不変量。
- legacy single-question read → new canonical、new write/read round-trip。
- question 別 ruling、GoA、reservation、record completeness。
- CLI mixed directive/status、question-keyed hold resolution。
- migration fidelity と FormalElection の mixed/held-only invariant。

### 品質ゲート

PR CI は build、typecheck、Biome lint、complexity ratchet、control-byte、no-silent-drop、unchecked-cast、distribution、plugin conformance、smoke/unit/integration、isolated reproducible build、source-only/graph、coverage を含む。project line coverage は絶対 90.00%以上かつ merge-base からの低下最大 0.02 percentage points。`test:ci` は smoke + unit + integration で、e2e、performance、formal verification の全経路を自動的には包含しないため、選挙 walking-skeleton と FormalElection は別途明示実行が必要である。

本 reverse-engineering ではテスト、build、coverage、TLC を実行していない。したがって現行 HEAD の pass/fail、coverage、state-space 規模、性能は未測定であり、コードと設定の静的観測だけを品質評価へ使った。

## Issue #2985 品質評価（履歴、observed `0fbbec42bb33d625bdb9d034789c0ff391df1287`。**現在時制マーカーのみ降格**（`cid:reverse-engineering:c1`、260814-priority-bug-batch の差分リフレッシュ時。本節の file:line は本節が宣言する observed 断面の値として保存する））

### 実測テスト

Developer scan は `t448` CLI、`t450` sensor、`t534` mandatory lifecycle、`t541` resume、`t532` provenance、`t534` attestation の6 filesを実行し、**187 pass / 0 fail / 552 expect、Bun 1.3.13** を得た。これは単一 Unit の CLI、provenance、attestation、sensor、mandatory lifecycle、resume の現行挙動を支持する。

repository test files は実測 **1119**（unit 422 / integration 568 / e2e 100）、関連22。Architect synthesis では test、build、lint、typecheck を実行しておらず、focused 6 files 以外を green と評価しない。

### 欠落回帰と品質リスク

2 Unit / 1 Delivery Bolt / 1 PR を正規 create → report → sensor → completion まで完走するテストはない。旧 Intent の5 report を sensor へ直接評価した結果はいずれも `pass:false`、`findings_count:5`（kind、Pull Request、Generated at、Converged、Attestation）だった。これは停止症状の観測であり、構造的不能の単独証明ではない。構造的根拠は単数型、provenance mismatch、per-unit completion guard の組合せにある。

- 用語 debt: Delivery Bolt、runtime batch、execution Bolt が同じ「Bolt」を異なる cardinality で使う。
- 巨大ファイル: `amadeus-state.ts` と `amadeus-orchestrate.ts` は blast radius が大きいが、今回の一般リファクタは対象外。
- fail-closed 保全: sensor / state guard を弱める修正は copy / tamper / replay / stale head 防御を退行させる。
- test gap: 共有 PR evidence の per-unit projection、または複数 Unit Bolt の計画時拒否のどちらも未固定。

### 非重複

#2473 は head binding、#2791 は provenance enforcement、#2358 は gate 再発行、#2359 は review 復旧、#2836 は gate:false reviewer、#2976 は solo election を扱う。#2989 は本 Intent mirror である。open implementation PR は観測されていない。Issue #2985 の Reviewer A / B comments は訂正後 CONFIRMED である。

## 契約文書とエンジン実装の齟齬を拘束しないテスト面（260814-unit-failure-autoelectio、履歴、observed `cd64486a6`。**現在時制マーカーのみ降格**（`cid:reverse-engineering:c1`、260814-priority-bug-batch の差分リフレッシュ時。本節の file:line は本節が宣言する observed 断面の値として保存する））

### 所見 1: 文言検査が挙動検査を代替している

`tests/integration/t369-protocol-autosolo-hook.test.ts` は solo auto-election hook を扱う唯一の専用テストだが、判定述語 `findMissingHookMarker`（`:88-92`）は対象セクション文字列に `open --trigger auto` と `solo-election-manual-trigger-required` が含まれるかを見るだけである。protocol 文言が正しく存在することは保証するが、**engine がその文言どおりに振る舞うかは一切拘束しない**。結果として「protocol が branch 1 で prompt 非提示を規定し、engine は無条件で ask を出す」という食い違いが、8 件のテストすべて緑のまま生存できた。

これは `team.md` § 検証・実測規律の「検証劇場」そのものではない（文言検査には固有の価値がある）が、**文言検査だけを置いて挙動検査を置かないと、契約と実装の乖離が構造的に不可視になる**という一般所見に当たる。契約文書に「engine がこう振る舞う」と書く節を追加・変更するときは、同じ変更で挙動側の述語を持つテストを追加すべきである。

### 所見 2: テスト述語の交差が空であることは設計の穴の指標になる

本スキャンでは 3 群の述語（P1 solo-election 参照 17 ファイル / P2 `--trigger` 5 ファイル / P3 unit failure ruling 3 述語）を取り、**P2 ∩ P3 = ∅** を実測した。両側に属するテストが 1 件も無いという事実が、「config auto と unit failure の組み合わせが検証されていない」という欠陥の存在を直接示している。二つの機構が protocol 上で結合しているのにテスト述語上で交差しない場合、その結合は未検証である可能性が高い。棚卸しの詳細は `component-inventory.md` の本 intent 節。

### 所見 3: 既存テストは修正の Red を作れる形になっている

`tests/unit/t211-swarm-batch-progress.test.ts:326-333` は `amadeus/config.json` を seed しないため、config はデフォルト `manual` 相当で走る。したがって既存期待値は `manual` 経路の正しい固定としてそのまま維持でき、`auto` を植えた新ケースを 1 件追加することで TDD の Red を作れる。既存テストを書き換えて緑にする形（欠陥挙動の固定を追認する形）にはならない — これは修正のコスト面で良好な条件である。

### 所見 4: 修正が触る投影面

`stage-protocol.md` を変更する場合、t369 が `dist/<harness>/amadeus-common/` と self-install ツリーを走査するため `bun run build` による全ハーネス投影の再生成が同一変更に必要である。ソース断面のみの green では配送先の退行を隠す（`project.md` の `cid:requirements-analysis:c2-acceptance-at-delivery-tree`）。

## オープンバグ5件の品質評価（260814-open-bug-batch-6、履歴、observed `a49f9e9fd`。**現在時制マーカーのみ降格**（`cid:reverse-engineering:c1`、260815-priority-bug-batch-2 の差分リフレッシュ時。本節の file:line は本節が宣言する observed 断面の値として保存する））

### 現状の確定事項（実測に基づく成立判定）

| Issue | observed 断面での成立 | 補足 |
| --- | --- | --- |
| #3062 | **成立**（引用パスのみ要訂正） | 患部は rename により `plugins/github-pr-convergence/…` へ移動。内容 R100 のため行番号は有効 |
| #3026 | **成立** | `plugin.json` に `sensors` キー不在を全文実読で確認。投影 13 件に model-completeness は含まれない |
| #3028 | **成立、かつ drift 拡大** | 表 10 行に対し実在 14 件。欠落は起票時 3 件 → 現在 **4 件**（`git-drift` が加わった） |
| #3031 | **患部現存、部分緩和が着地済み** | PR #3056 が git ヘルパへ narrow retry を追加。観測失敗を覆うかは不明 |
| #3032 | **着地2行は現存、機序は未実証** | 2 行は `260807-projectdir-worktree-fix/audit/…d13e4f0ca2c0.jsonl:155-156` に現存 |

### 欠陥クラスの評価

**D-1: 検証劇場の逆パターン — 検出機構が存在するのに診断が届かない（#3032、S3 相当）**

`otel/bootstrap.ts:45 assertSameProject` は workspace 不一致を正しく検出して throw する。しかし唯一の実質的呼び出し元である `emitError`(`amadeus-lib.ts:8087`) が `catch { }`(`:8102-8105`) で全例外を握り潰すため、**不変条件違反が起きても誰にも通知されない**。握り潰しの理由（既にエラー終了中で、記録失敗が元エラーを隠さないため）は妥当だが、結果として「隔離が破れているのか、単に state が無いのか」を呼び出し側から区別できない。Issue の完了条件 2 が求める「不一致時は無音の別 workspace 書込でなく loud fail または no-op」は、この握り潰しの粒度を分けることが実装上の焦点になる。

**D-2: 正本集合を機械導出しない面の fail-open 乖離（#3026 / #3028、S3 相当）**

`amadeus-plugin-compose.ts` は `sensors` 宣言があれば厳格に検証する（`parseSensors:415-433` がパス形式・重複・実在の 3 条件を課す）が、**キー自体の欠落は検査しない**。`?? []` フォールバックが 4 箇所（`:554` / `:956` / `:992` / `:1023`）にあり、いずれも欠落を空集合へ落とす。docs 側も固定表であり件数フリー契約ではない。

このクラスの再発は本区間で**実際に観測された**: `git-drift` プラグインの追加 PR は投影と activation に追随したが docs 表には追随せず、欠落が 3 件から 4 件へ増えた。「同クラスの欠落は今後のプラグインでも無音で再発しうる」という #3026 の予測が 1 区間で実現している。**再発検出の要否判定（両 Issue の受け入れ条件 3）は、この実例をもって「要」の側に強い証拠がある。**

**D-3: 緩和が受け入れ条件の一方を後退させうる（#3031、S4 相当）**

PR #3056 が追加した retry は narrow（stderr に `/locked' for writing: No such file or directory` を含む場合のみ再実行）で、他の fixture 失敗をマスクしない設計になっており、その点は妥当である。しかし:

1. Issue が観測した失敗の stderr は**未特定**（attempt 1 ログの該当行が空）であり、retry の発火条件に合致したかは不明
2. アサーション `expect(result.exitCode, result.stderr.toString()).toBe(0)`(`:26`) は retry 後には **2 回目**の stderr を載せるため、初回失敗の本文はむしろ失われる方向に動いた

Issue の受け入れ条件 1（「再発時に exit 128 の本文が assert メッセージへ確実に載ること」）は**未達**であり、緩和の着地をもって Issue を閉じると、診断能力を欠いたまま flake 対策済みと記録することになる。

**D-4: self / 非 self で同一事実の扱いが反転する（#3062、S2 相当）**

`pr-convergence-cli.ts` は非 self record では landed を settled（exit 0、`:1392-1393`）として扱いながら、self record では同じ landed を全 verb で拒否する。この反転は 3 層（`:823` / `:1260` / `:1364`）に分散して実装されており、単一の方針として一箇所に表現されていない。**是正時に 1 層だけを緩めると残り 2 層で落ちる**という形で、修正の不完全さが実行時にしか現れない。

### 未検証面（申し送り）

- **並行実行 tier の並列度**（#3031 の仮説）: `tests/run-tests.ts` への述語 `grep -n "\-P 4\|concurrency\|maxParallel"` は 0 hit。integration tier が 4 並列かは本スキャンでは確定できず、Issue の仮説のまま引き継ぐ
- **#3062 の波及範囲**: `pr-convergence-attestation.ts` / `pr-convergence-ledger.ts` / `pr-convergence-provenance.ts` が是正でどこまで動くかは未調査
- **#3032 の当時断面での再現**: 現行断面の読解のみでは機序が確定しない。2026-08-07 時点のバイトでの再現が必須
- **既存テストのベースライン**: 本スキャンは読取専用のため、フルスイートの実行は行っていない。既存の赤の有無は未確認

### 既存の品質ゲート（変化なし）

`bun run typecheck` / `bun run lint`（Biome）/ 隔離2回ビルドの再現性検査 / `bun run source-only:check` / グラフ不変量検査 / `bash tests/run-tests.sh --ci` / Project Coverage Gate（絶対下限 AND 相対許容幅）/ Patch Coverage Gate / plugin-conformance-e2e。本区間で `.github/workflows/ci.yml` と `pbt.yml` が変更されているが、これは選挙 v2 のテスト構成追随であり、ゲート集合そのものの縮小ではない（本スキャンでは差分の詳細まで追っていない — 実装時に要確認）。

### 台帳同期の注意（実装時）

`cid:build-and-test:bt-ledger-resync` / `cid:build-and-test:c1` の適用対象。本 intent の是正が触りうる台帳:

- `tests/.coverage-registry.json` — テストファイルを新規追加する場合は `bun tests/gen-coverage-registry.ts` の同梱が必須
- `tests/.coverage-patch-allowlist.json` — `amadeus-plugin-compose.ts` などの署名行が動く場合は意味的セレクタの再アンカーが必要
- `amadeus/spaces/default/specs/tla/model-map.json` — 本 Focus は選挙系に非接触のため通常は不要だが、`amadeus-orchestrate.ts` を触る場合は実装ハッシュピンの resync が要る

## blocking sensor の在庫と fail-closed 化、および実時間予算に依存する検証面（260814-priority-bug-batch、履歴、observed `d64fd7cac`。**現在時制マーカーのみ降格**（`cid:reverse-engineering:c1`、260815-priority-bug-batch-2 の差分リフレッシュ時。本節の file:line は本節が宣言する observed 断面の値として保存する））

**観測 ref**: base `1d08374cd7e4ef89637b4a8000bab3fcf1a0f780` → observed `d64fd7cac049d7c2cda7dd7dc7d9d0a652ff02d7`。

### blocking sensor の在庫（再実測）

述語（再実行可能）: `for f in $(git ls-files | grep -E '(^|/)sensors/.*\.md$') tests/fixtures/blocking-sensor/amadeus-blocking-probe.md; do grep -m1 '^default_severity:' "$f"; done`。対象集合は追跡済みの sensor manifest 全 14 件 + blocking fixture 1 件。

**shipped の blocking sensor は 2 件**で、前区間から件数は不変である。ただし**パスが 1 件変わった**。

| manifest | `default_severity` | 位置づけ |
|---|---|---|
| `plugins/github-pr-convergence/sensors/amadeus-pr-convergence-report-format.md:5` | `blocking` | 本ワークスペースで活性な実配布（旧 `plugins/pr-convergence/sensors/...`、PR #3051 で rename） |
| `tests/fixtures/blocking-sensor/amadeus-blocking-probe.md:5` | `blocking` | fixture |

残る 13 件（core 11 + `plugins/formal-model-check/sensors/amadeus-model-completeness.md` + `plugins/git-drift/sensors/amadeus-git-drift.md`）はすべて `advisory` である。**新設の git-drift sensor は blocking ではない** — origin drift の早期通知は助言であり、赤でマージを止める性質のものではないという設計判断である。

### blocking sensor の script-error が fail-closed になった（PR #3045、`c064f9705`）

前区間で「blocking sensor の判定が 2 形しかなく、スクリプト自体のエラーが素通りする」とされていた面が閉じた。`packages/framework/core/tools/amadeus-state.ts` の `evaluateBlockingSensors` は拒否形を **2 形から 4 形へ**拡張している（実装コメント逐語: `Four refusal shapes, all fail-closed:`）。

| 拒否形 | 意味 |
|---|---|
| `never-fired` | この stage に対する `SENSOR_FIRED` が 1 件もない。「走らなかった」は「通ったはず」の証拠にならない |
| `unresolved` | 発火した出力の最新 terminal が `SENSOR_PASSED` でない |
| `stale` | 現在の artifact バイトが terminal receipt と食い違う |
| `script-error`（**新設**） | `SENSOR_PASSED` が script-error 診断を伴う、または `Note` フィールドがこの reader に安全に解釈できない形で存在する |

品質上の要点は 2 つある。

1. **「読めない」を通さない**。`sensorAuditNote`（`amadeus-state.ts`）は `Note` が文字列でない場合に `SENSOR_NOTE_UNREADABLE = "script-error: note-unreadable"` を返し、`isScriptErrorNote` がこれを拒否側へ落とす。未知の形を無視して通す fail-open ではなく、解釈できない時点で止める。
2. **判定式に条件が編み込まれている**。`latestOutputPassed` の合成条件へ `&& !isScriptErrorNote(latest.note)` が入っており、独立した後付けチェックではない。消費されない検証フィールドではない。

検証面は `tests/unit/t511-blocking-sensor-severity.test.ts`（新規 114 行）と `tests/integration/t511-blocking-sensor-gate.integration.test.ts`（+89）。`amadeus-sensor-schema.ts` のヘッダコメントも `verifyBlockingSensors` → `evaluateBlockingSensors` へ同期されており、正本と散文の drift はない。

### 本 intent が扱う品質債務 — 実時間の固定予算に依存する検証面

4 件のうち 3 件（[#3065](https://github.com/amadeus-dlc/amadeus/issues/3065) / [#3040](https://github.com/amadeus-dlc/amadeus/issues/3040) / [#3035](https://github.com/amadeus-dlc/amadeus/issues/3035)）は同一クラスの債務である: **負荷下のプロセス境界イベントを実時間の固定予算で待っている**。これは project.md § Testing Posture の `bt-timeout-verification-shape`（「長い本番タイムアウトを持つ性能要件は、実時間の負荷試験ではなく、同じ制御経路を通る短縮可能なタイミングシームとカウンタ検証で構成する」）に照らして構造的な逸脱であり、症状は「フルスイート並行実行時にのみ稀に赤くなる」という最も帰属の難しい形で現れる。

| Issue | 予算 | `scaleTestTime` の適用 | 実測された振れ |
|---|---|---|---|
| #3035 | 300ms（`tests/unit/t07-hook-audit-logger.serial.test.ts:401-406`） | **なし**（同ファイルの `grep -c "test-time-factor"` = 0。同ファイル `:393-399` の 500ms 側も同様に生の定数） | 324ms |
| #3040 | `scaleTestTime(1_000)`（`tests/integration/t-pi-child-driver.integration.test.ts:177-184`） | あり。ただし競合相手の `CLEANUP_WAIT_MS = 2_000`（`amadeus-pi-driver.ts:30`）は**定数で `scaleTestTime` を通らない** | 2133ms |
| #3065 | — | — | stdout が exit 0 のまま 8192 バイトで切れる |

品質上の含意は、これらの赤が「変更の欠陥」ではなく「CI マシンの空き具合」を反映する点にある。赤を無視する運用が育てば、本物の退行も同じ扱いを受ける。project.md § Forbidden の「既存テストの赤を『自分と無関係』を理由に無視して続行したり、赤いスイートをグリーン・完了として報告したりしない」という規範が実効を保つためには、赤が意味を持ち続けることが前提である。

なお #3065 の患部には**契約の非対称**という別種の債務も含まれる。同じ「git を spawn して stdout を読む」責務に対し、`scripts/no-silent-drop-evidence-adapter.ts` の `systemCommandRunner`（`:62-76`）は `normalizeSpawnOutcome`（`:45-60`）で `result.error` を見て非ゼロへ潰す fail-closed 正規化を持つのに対し、`packages/framework/core/tools/amadeus-migrate.ts` の `git()`（`:439-455`）は `result.status === 0` だけで ok を決め `error` を一切見ない。後者では負荷時の spawn エラー（status = null）が無音で `ok: false` になり、preflight checks が全 pass のまま migration が失敗判定 → rollback → 非ゼロ exit という t224 の観測（`tests/integration/t224-upstream-v2-migration-cli.test.ts:301` の逐語 `"migration subprocess exit status mismatch"`）に整合する。

[#3034](https://github.com/amadeus-dlc/amadeus/issues/3034) だけは別クラスで、テスト隔離の破れである。`tests/integration/t2851-doctor-self-install-freshness.serial.test.ts:78-87` の `repositoryCheckFixture` が live repo の `scripts/promote-self.ts --check` を spawn する薄いラッパであるため、`cwd: projectDir` では隔離できない（`scripts/promote-self.ts:57` が自ファイル位置から `REPO_ROOT` を解決する）。同ファイル `:66-76` の `strictCheckFixture` は exit code をハードコードした自己完結スクリプトで正しく隔離されており、壊れているのは最終ケース 1 件のみである。是正方向のうち「`promote-self.ts` に repo root の明示指定を足す」案は、construction.md § Testing Standards の「テストダブル・fixture 専用の分岐やモードを本番コードに置かない」に触れうるため、採るなら port として設計する必要がある。

## テスト信号の偽陽性クラス — 壁時計予算アサーションの全数と構造（260815-priority-bug-batch-2、履歴、observed `9ba8170bb`。**現在時制マーカーのみ降格**（`cid:reverse-engineering:c1`、260815-per-unit-outcome の差分リフレッシュ時。本節の file:line は本節が宣言する observed 断面の値として保存する））

**観測 ref**: observed `9ba8170bb03996fb98b497cfcbac3d207795018d`（base `a49f9e9fd`）。本 intent の 4 Issue（#3077 / #3074 / #3075 / #3079）のうち 3 件（#3075 / #3079 と、直前区間で着地した #3035 / #3040）は同一の債務クラスに属する — **本番の欠陥ではなく、テストが実時間を信号に使っているために負荷下で偽陽性を出す**面である。#3077 / #3074 は本番ロジックの欠陥であり別クラスに属する。

### 債務: 壁時計予算に依存する検証面が 19 ファイル 24 行に残存する

述語（worktree ルート、再実行可能。exit 0）:

```sh
git grep -n -E "toBeLessThan(OrEqual)?\(" -- 'tests/unit/*.ts' 'tests/integration/*.ts' 'tests/e2e/*.ts' \
  | grep -E "elapsed|duration|Ms\)|journeyMs|performance" | grep -v indexOf
```

→ **24 行 / 19 ファイル**（`wc -l` と `cut -d: -f1 | sort -u | wc -l` からの転記）。層別は unit 6 / integration 16 / e2e 2。ファイル別に複数行を持つのは `tests/unit/t-otel-stacktrace-redaction.test.ts`（4 行: `:317` `:331` `:348` `:361`）、`tests/integration/t370-canonical-lock-target.integration.test.ts`（2 行: `:167` `:251`）、`tests/integration/book-pack-verify.serial.test.ts`（2 行: `:117` `:118`）の 3 ファイルのみで、残る 16 ファイルは各 1 行である。

直前区間（PR #3076）で `tests/unit/t07-hook-audit-logger.serial.test.ts` の 2 行が撤去されており（現行の `grep -c "toBeLessThan"` → **0**）、24 は撤去後の値である。Issue #3075 本文が測定 tree `d64fd7cac` で記す集計値「27」は、Issue 自身の A/B/C 列挙（26 行）とも一致せず、本スキャンの実測とも一致しない。**現存箇所の集合は Issue の列挙と一致しており、ずれているのは Issue 本文の集計値だけである。**

### 構造による下位分類 — 24 行は一様ではない

Issue の A/B/C は「NFR trace の有無」と「負荷下実測の倍率」で分類するが、後者は本スキャンで**未測定**である。代わりに、実読で機械的に確定する構造の違いを記録する。是正方式が分類ごとに異なるため、A/B/C 確定作業の入力として使える。

| 型 | 件数 | 該当 | 性質 |
|---|---|---|---|
| **差分型**（相対比較） | 1 | `tests/integration/t259-guard-integration.test.ts:218-219`（`p95(archived) − p95(allowed) ≤ 100`） | baseline 系列と対象系列を**同一実行内で**測っているため、負荷は両系列に等しく乗る。絶対予算とは失敗様式が異なり、`cid:code-generation:c1-threshold-inside-observed-range` が警告する「空ウィンドウ baseline による絶対判定への無音退化」には該当しない |
| **契約由来定数型** | 3 | `book-pack-verify.serial.test.ts:117`（`PROBE_VERIFIER_TIMEOUT_MS` = 1_000、定義 `:41`）/ `:118`（`PROBE_TEST_TIMEOUT_MS` = 1_500、定義 `:43`）/ `t448-pr-convergence-cli.integration.test.ts:1917` | 検証対象そのものが宣言する timeout を上限に使う。すなわち「timeout 機構が働いたこと」の検証であり、無関係な性能目標ではない。t448 は `sleep 30` を budget で打ち切れたことを固定する形（`:1913-1917`） |
| **絶対壁時計型** | 20 | 上記以外 | 実行環境の速度が合否を決める。負荷下の偽陽性はこの型に集中する |

### 最も重い所見: 24 行のうち `scaleTestTime` を通るのは 1 行だけ

`TEST_TIME_FACTOR` を `tests/lib/test-time-factor.ts` の `scaleTestTime` 経由で適用するのはプロジェクトの明示ノルム（`cid:requirements-analysis:test-time-factor-c1`。「timeout の成立と検証に対応する sleep・poll・settle にも同じ係数を適用する」）だが、**24 行のうち `scaleTestTime` を含むのは `t448-pr-convergence-cli.integration.test.ts:1917` の 1 行のみ**で、残る 23 行は生の定数である（述語: 上記 24 行に対する `grep -c scaleTestTime`）。

これは「そのファイルが `scaleTestTime` を知らないから」ではない。**同じファイルが per-test timeout には係数を適用しながら、テスト本体の壁時計予算には適用していない**ケースが多数を占める:

| ファイル | ファイル内の `scaleTestTime` 使用数 | 当該予算行 | 予算 |
|---|---|---|---|
| `tests/integration/t92.test.ts` | 14 | `:977` | 生の `3000` |
| `tests/unit/t76.test.ts` | 11 | `:527` | 生の `3000` |
| `tests/integration/t46-parallel-bolt.test.ts` | 6 | `:176` | 生の `10_000` |
| `tests/unit/t-otel-stacktrace-redaction.test.ts` | 5 | `:317` `:331` `:348` `:361` | 生の `2_000` ×4 |
| `tests/integration/t487-stage-stats.integration.test.ts` | 5 | `:426` | 生の `60`（**秒**） |

すなわち債務の本体は「係数機構の不在」ではなく**適用面の非対称**であり、`TEST_TIME_FACTOR` を上げても本体予算は縮まないまま per-test timeout だけが伸びる。負荷下では、timeout に守られた状態で本体の予算アサーションが先に落ちる。

### 単位の訂正: `t487-stage-stats.integration.test.ts:426` は 60 ミリ秒ではなく 60 秒

Issue #3075 が「単位要確認」と留保したまま B 群へ置いた箇所である。実読では `:424` が `const elapsed = (Date.now() - started) / 1000;` で**秒へ換算済み**であり、`:426` の `expect(elapsed).toBeLessThan(60)` は **60 秒**の上限を課す。テスト名も逐語で `scanning the real workspace stays well inside the sixty-second ceiling` と宣言している。

したがって「60ms は A 群の最短（250ms）より一桁厳しいので A へ再分類すべき」という上流スキャン報告の判断は成立しない。**実際には 24 行中で最も余裕のある部類**であり、C 群側の値である。単位を読み違えたまま是正すると、正当に余裕のある上限を不要に撤去することになる。

### 是正の設計制約（申し送り）

- Issue #3075 の AC3（新規流入を防ぐガード）を作る場合、対象集合から `tests/perf/` を除外しないと perf スイートの正当な予算を巻き添えにする。ガードの述語はパス限定にする必要がある。
- 契約由来定数型 3 件は撤去対象ではない。撤去すると timeout 機構そのものの検証が消える。
- 絶対壁時計型 20 件の是正方針は、`cid:build-and-test:bt-timeout-verification-shape`（長い本番 timeout は実時間の負荷試験でなく短縮可能なタイミングシームとカウンタ検証で構成する）が既に定めている。#3079 はその適用例で、`amadeus-audit.ts:1011-1014` の `AMADEUS_AUDIT_LOCK_RETRIES` が**既存のシームとして用意済み**である（コメント `:1009-1010` が逐語でテスト用途を宣言する）。`tests/integration/t224-upstream-v2-migration-cli.test.ts:1586` の env にこれを足すだけで、失敗経路の意味を保ったまま実待ちが 20 秒から 0.5 秒へ落ちる。
- **未検証**: 各予算が実際の負荷下でどれだけの倍率で危ういかは本スキャンで測っていない。上表の分類は構造（相対/契約由来/絶対、係数適用の有無、単位）の実読のみに基づく。

## per-unit outcome 経路のテスト空白と、是正時に同期を要する台帳（260815-per-unit-outcome、履歴、observed `78146f435a`。**現在時制マーカーのみ降格**（`cid:reverse-engineering:c1`、260815-stale-epoch-landed の差分リフレッシュ時。本節の file:line は本節が宣言する observed 断面の値として保存する））

**観測 ref**: observed `78146f435a66680055a24144937b5aa03d48bfb4`（base `9ba8170bb03996fb98b497cfcbac3d207795018d`）。

### 既存のテスト面

| テスト | 層 | ケース数 | 何を拘束しているか |
|---|---|---|---|
| `tests/unit/t533-per-unit-consume-fanout.test.ts` | unit | **8** | 純関数としての fanout。`:112` の `fails closed for pending, unknown, or ambiguous producer outcomes` が `producer-outcome-pending` を、`:203` がエッジ在庫 drift（`consumer-edge-inventory-mismatch`）を固定 |
| `tests/integration/t533-per-unit-consume-fanout.integration.test.ts` | integration | **14** | 実プロジェクト上の母集団取得（`readPerUnitConsumePopulation` を `:208` で駆動） |
| `tests/harness/per-unit-consumer-graph-fixture.ts` | harness | — | 7 consumer / 19 edge のグラフ fixture（97 行） |
| `tests/unit/t425-unit-pool.test.ts` / `tests/integration/t425-unit-pool-harness-parity.integration.test.ts` | unit / integration | — | unit pool の decode・fold・ハーネス parity |
| `tests/unit/t-construction-outcome-projection.test.ts` | unit | — | 正準射影の 5 イベント正規化 |
| swarm ガード `t207-swarm-guards` / `t211-swarm-batch-progress` / `t135-invoke-swarm` / `t379-swarm-canonical-emit` / `t251-swarm-and-next-stage`、degrade 経路 `t367-degrade-unitname-resolution` / `t480-degrade-unit-declaration` | 各層 | — | pool 変異源側と degrade 免疫側（実在は `find tests -name "<id>-*"` で確認。同一 id 接頭辞に別主題のファイルが併存するため主題入りの名前で参照する） |

ケース数の述語: `grep -c 'test("\|it("' <file>`（unit **8** / integration **14**）。上流の Developer scan 報告は「9 / 15」だったが、同一述語の再実測では 8 / 14 である。**件数は本再実測を正とする**（`cid:requirements-analysis:numbers-from-command-output-only`）。

### 空白 — 非 pool 由来の母集団を張るテストが 1 件も無い

`grep -rln "readPerUnitConsumePopulation" tests/` → **1 ファイルのみ**（`tests/integration/t533-per-unit-consume-fanout.integration.test.ts`）。そのファイル内で母集団を張る経路を全数列挙すると（`grep -n "createUnitPoolCoordinator\|readPerUnitConsumePopulation" <file>`）、seeding は `:150` / `:326` / `:363` / `:411` の **4 箇所すべてが `createUnitPoolCoordinator(createAuditUnitPoolRepository(project))`**、すなわち swarm と同じ pool 経路である。

したがって:

1. **`readPerUnitConsumePopulation` を pool 以外の起点で駆動するテストはゼロ件。** 「pool イベントが 1 件も無いまま Construction が完走した」という状態は、テストスイートのどこでも再現されていない。
2. **Issue #3099 のシナリオ（units-generation EXECUTE + per-unit dispatch → build-and-test）に対応する再現テストが存在しない。** 既存の 22 ケースはすべて pool イベントが存在する前提の上に建っており、母集団が空になる経路には触れない。

これは「テストが弱い」のではなく、**テストが検証している世界（swarm 経路）と欠陥が起きる世界（per-unit 経路）が交わっていない**という被覆の構造的な穴である。是正の落ちる実証は、この穴を埋める形（per-unit dispatch を実際に通して build-and-test の consume 解決まで到達させる）でしか成立しない（`memory/team.md` § 検証・実測規律「落ちる実証は不可分の1セット」）。

### 是正 PR が同時に同期すべき台帳

| 台帳 | 患部との関係 | 実測 |
|---|---|---|
| `amadeus/spaces/default/specs/tla/model-map.json` | `amadeus-orchestrate.ts` が **2 箇所**でハッシュピンされている。`readPerUnitConsumePopulation` を触るなら resync が必要（`bun plugins/formal-model-check/tools/amadeus-sensor-model-completeness.ts updateModelMap --impl-only`、モデル・cfg 不変時） | `grep -c "amadeus-orchestrate.ts" <file>` → **2** |
| 同上 | `amadeus-unit-pool-runtime.ts` / `amadeus-per-unit-consume-fanout.ts` / `amadeus-construction-outcome-projection.ts` は**ピン 0 件** | `grep -c "unit-pool-runtime\|per-unit-consume-fanout\|construction-outcome-projection" <file>` → **0**（exit 1） |
| `tests/.coverage-patch-allowlist.json` | 全 **448** エントリ中、患部関数を指すセレクタは **1 件のみ** — `amadeus-unit-pool-runtime.ts` の `readUnitPoolEventSetsFromAudit`（`class: "catch-arm"`、`anchorLines: 3`、`targetLines: "1-3"`）。この関数の署名行や catch アームがずれる変更をすると fingerprint 不一致で赤化するため、gate 自身の `createSemanticSelector` で再アンカーする | エントリ総数と該当は Python の `json.load` による全走査 |
| `tests/.coverage-registry.json` | regen の鍵は**ソース側のユニット**（export 関数・監査イベント等）であり、**テストファイル名ではない**。本区間で新規テスト 4 件が入ったが registry は無変更（`git log -1 9ba8170bb..78146f435 -- tests/.coverage-registry.json` → 出力なし、最終更新は `7711246fd`（2026-08-14、#3036））。ただし是正が**新しい export を足す**なら regen が要る | 上記 git log |

**ノルムの訂正申し送り**: `memory/project.md` Learnings Inbox の `cid:build-and-test:c1` は「新規テストファイルを追加する PR は `tests/.coverage-registry.json` の regen を同梱する」と読める文面だが、本区間の実測（テスト 4 件追加・registry 無変更）は registry の鍵がソース側ユニットであることを示す。次回蒸留ラウンドで文面を訂正すべき候補である。

### coverage 母集団への注意

是正が `amadeus-orchestrate.ts`（**7088 行**、`wc -l`）や `amadeus-lib.ts`（**9061 行**）を新たに in-process import するテストを足すと、Project Coverage Gate の相対条件（許容 0.02pp）が構造的に赤化しうる（`cid:build-and-test:bt-coverage-universe-inflation`）。前例どおり、被検関数を小モジュールへ切り出してテストはそれだけを import する形が正しい閉じ方である。**なお `amadeus-per-unit-consume-fanout.ts`（272 行）は既に t533 unit が in-process import 済みで、この面は母集団に入っている。**

### 是正様式の前例

本区間の PR #3101 が `amadeus-election.ts` に `runPreservedDigest()` を新設し、digest 生産の 3 呼び出し点を 1 つの純関数へ統一している（+21/−5）。**「N 個の読み口／書き口を 1 つの純関数へ寄せる」形は本リポジトリの直近の前例を持つ**（Issue #3099 の是正方式のうち「fanout 側で正準射影を読む」案と同型）。方式の選択自体は後続の裁定事項であり、本節は前例の存在のみを記録する。

## head 前進後の stale created 経路のテスト空白と、是正時に同期を要する台帳（260815-stale-epoch-landed、履歴、observed `83e1dbeef`。**現在時制マーカーのみ降格**（`cid:reverse-engineering:c1`、260816-open-bug-batch-7 の差分リフレッシュ時。本節の file:line は本節が宣言する observed 断面の値として保存する））

**観測 ref**: base `78146f435a66680055a24144937b5aa03d48bfb4` → observed `83e1dbeefb3278a00e86f69d3c79071a35ccf043`。対象は [Issue #3110](https://github.com/amadeus-dlc/amadeus/issues/3110)。

### テスト空白 — 「create 後に head が前進した」ケースを 1 本も踏んでいない

`grep -rn "attestation is stale" tests/` → **出力 0 行・exit 1**（grep の exit 1 は「エラーなく不一致」。エラーは exit 2）。すなわち `pr-convergence-cli.ts:746-748` の stale 拒否文言は**どのテストからもアサートされていない**。

pr-convergence 系の既存テスト 4 本へ `grep -c "stale"` を適用した結果は次のとおりで、唯一の hit は無関係である。

| テスト | `stale` hit | 判定 |
|---|---|---|
| `tests/integration/t447-pr-convergence-ledger.integration.test.ts` | 0 | 空白 |
| `tests/integration/t448-pr-convergence-cli.integration.test.ts` | 0 | 空白（in-process の verb surface 全域を駆動するが stale は踏まない） |
| `tests/integration/t449-pr-convergence-packaging-e2e.integration.test.ts` | 3 | **無関係** — `:254` の `mode: … "stale" …`、`:273` の `bolt-plan.md` 改竄、`:490` の `["stale", "STALE"]` はいずれも **bolt-plan の staleness** であり attestation の stale ではない |
| `tests/integration/t3062-pr-convergence-landed-finalization.integration.test.ts` | 0 | 空白 |

**t3062 が landed 最終化を覆っているのに #3110 を捕らえられない理由**は、そのフィクスチャが head を前進させないことにある。`:123-124` で 1 度だけ seed commit を作って `const head = git(["rev-parse", "HEAD"], root);` を取り、`:134` の gh スタブが `"rev-parse HEAD": { code: 0, stdout: \`${f.head}\n\` }` を**全呼び出しで同一値**として返す。したがって create 時と report 時の head が構造的に一致し、`attestationBindsIdentity` を常に通過する。t3062 の冒頭コメント（`:6-11`）も想定シナリオを「auto-merge が report より先に landed した」ケースと明記しており、head 前進は射程外である（ファイル全体 **285** 行）。

**落ちる実証の形**: 是正の受け入れテストは、create 後に **head を前進させてから** report を走らせ、修正前は `:746-748` の stale 文言で拒否、修正後は landed record が書かれることを 1 セットで示す必要がある。t3062 のスタブは head を単一値に固定しているため、既存フィクスチャの流用ではなく **head を 2 値で返すスタブ**（create 時 = 旧 head、report 時 = merged head）が要る。

### 是正時に同期を要する台帳 — 3 種のうち 1 種は確実に、2 種は条件付き

| 台帳 | 本 patch surface への係り | 判定 |
|---|---|---|
| `amadeus/spaces/default/specs/tla/model-map.json` | `grep -c "github-pr-convergence"` → **0**（exit 1） | **resync 不要**。実装ハッシュピンが本 plugin を 1 件も持たない |
| `tests/.coverage-patch-allowlist.json` | `grep -c "pr-convergence-cli.ts"` → **3** | **要 re-anchor 判定**（下記） |
| `tests/.coverage-registry.json` | `grep -c "pr-convergence"` → **2**（いずれも `tests/integration/t2996-pr-convergence-scope-grid.integration.test.ts`） | 新規テストファイル追加時のみ regen（`bun tests/gen-coverage-registry.ts`、`cid:build-and-test:c1`） |

allowlist の 3 セレクタ（`tests/.coverage-patch-allowlist.json:4388` / `:4399` / `:4410` の `file` フィールド）は次のとおり。**`anchorLines` を含む行が動けば fingerprint 不一致で赤化する**ため、是正が触る関数との重なりを事前に確認する。

| セレクタ `function` | `anchorLines` / `targetLines` | 是正との関係 |
|---|---|---|
| `nodeDecisionEmitter` | 17 / `1-17` | 本 patch surface とは無関係（audit tool の spawn 配線） |
| `selfReportLifecycle` | 5 / `4-4` | **直撃しうる** — reason が逐語で `a non-created verb only reaches selfReportLifecycle through currentSelfContext, whose attestationBindsIdentity already requires receipt.prHead === heads.prHead and refuses a mismatch with exit 1 first` と述べ、免除の根拠を**まさに本件で緩める予定の head 束縛**に置いている |
| `<module>` | 4 / `1-4` | `import.meta.main` エントリポイント（`bun-coverage-spawn-blindspot`） |

**`selfReportLifecycle` エントリは設計上の警報である。** その `expiry` は逐語 `remove if the lifecycle is ever callable without the currentSelfContext head binding` であり、#3110 の是正が「stale head でも landed を書けるようにする」方向なら、この免除は **expiry 条件が成立して削除対象になる**（＝防御的 residual arm が到達可能になり、テストで覆う必要が生じる）。逆に是正を `create` 側の read-back（機序 2）だけに閉じるなら head 束縛は不変で、このエントリは据え置きでよい。**どちらの是正方式を採るかが、この台帳エントリの去就を決める** — 方式選択（選挙事項）の判断材料として扱う。

### 品質面の付随所見

- **重大度の再検討（FOLLOW-UP）**: reviewer-2 が `bug.yml` の S1-FATAL 定義（「ワークフロー停止」を明示基準に含む）と実測 park を突き合わせ、現行 S3-MAJOR の格上げを人間裁定事項として提起している。唯一の脱出路が `AMADEUS_SKIP_BLOCKING_SENSOR_GUARD` という緊急バイパスである点が、S3 の想定する「通常の回避策あり」と性質を異にする。
- **エラーメッセージの自己不整合**: `:747` が指示する回復手順（create 再実行）が、その前提（PR が open）を満たさない状態で発行されている。是正では文言も同時に直さないと、修正後も誤った誘導が残る。
- **fail-closed 自体は健全**: sensor の拒否（`:391-393`）は record が created のまま最終化されていない事実を正確に報告しており、これを緩める方向の是正は検証劇場になる。閉路の解消は「report が landed を書けるようにする」側で行う必要がある。

機序は `architecture.md`、patch surface の配置は `code-structure.md` の各対応節を参照。一次記録は Issue #3110 の 2 件のクロスレビューコメント。

## 品質指標の区間差分と、オープンバグ 3 件のテスト空白（260816-open-bug-batch-7、履歴、observed `5c5911ee3`。**現在時制マーカーのみ降格**（`cid:reverse-engineering:c1`、260816-priority-bug-batch-3 の差分リフレッシュ時。本節の file:line は本節が宣言する observed 断面の値として保存する））

**観測 ref**: base `83e1dbeefb3278a00e86f69d3c79071a35ccf043` → observed `5c5911ee3f107152c3173701caf178a746b6e3aa`。

### 1. 品質指標の差分 — 全項目が改善または横ばい

区間の最初と最後の metrics snapshot からの転記。**測定元**: `metrics/2026-08-15T15-18-46-261Z-8ceeb2dc1823.json`（commit `8ceeb2dc1823…`）と `metrics/2026-08-16T11-04-41-875Z-3e1c6a19ed5b.json`（commit `3e1c6a19ed5b…`）。**取得述語**: 各 JSON の `collectors.<name>.values` を直読（本節の起草時に再実行して確認。Developer scan §5 とも一致）。

| 指標 | collector | base | observed | 差 |
|---|---|---|---|---|
| coverage percent | `coverage` | 93.3805400500996 | 93.41934476465595 | **+0.0388pp** |
| coverage hits / lines | `coverage` | 94686 / 101398 | 95724 / 102467 | +1038 / +1069 |
| test files | `tests` | 1017 | 1044 | **+27** |
| assertions | `tests` | 13600 | 13879 | +279 |
| failed files / assertions | `tests` | 0 / 0 | 0 / 0 | 横ばい（緑） |
| unit_small | `test_pyramid` | 258 | 270 | +12 |
| integration_medium | `test_pyramid` | 565 | 580 | +15 |
| loc core | `loc` | 146600 | 148942 | +2342 |
| 関数数 / 閾値超過 | `ccn` | 7218 / 32 | 7301 / 32 | +83 / **±0** |
| open bugs | `bugs` | 4 | 4 | 横ばい |

**注目点**: core が +2342 行増えても coverage percent が上がり（+0.0388pp）、複雑度の閾値超過関数は 32 件で不変である。`cid:build-and-test:bt-coverage-universe-inflation` が記す「大きなソースを 1 本のテストが import して母集団が膨らむ」退行は本区間では起きていない。

### 2. 台帳の同期状況 — 区間内で健全に resync 済み

`git diff --stat 83e1dbee..HEAD -- <5 台帳>`（本節の実測）: `tests/.coverage-patch-allowlist.json` **187 行**、`tests/.coverage-registry.json` **128 行**、`amadeus/spaces/default/specs/tla/model-map.json` **12 行**、`tests/.complexity-baseline.json` **4 行**、`tests/.coverage-ratchet.json` **4 行**（計 301 insertions / 34 deletions）。`cid:build-and-test:bt-ledger-resync` と `cid:build-and-test:c1` が要求する 3 台帳（allowlist / model-map / registry）はいずれも本区間で追随している。

### 3. 領域別のテスト空白

**A. #2363 — 逆向きのガードが存在しない**

`tests/integration/t531-plugin-harness-literal-guard.integration.test.ts:143-148` はテスト名逐語 `PACKAGE_HARNESSES enumerates every self-install face` のとおり **self-install ⊆ package の一方向**しか検査しない。「charter を宣言する package harness が self-install へ配布されているか」という逆向きは**どのテストも検査していない**。この非対称が pi の未配布を無音にしている。`scripts/promote-self.ts:327-329` の `packageFreshnessArgs` 経由で `/amadeus --doctor` に配線された鮮度検査も同じ 5 面しか見ない。

**Red の実測点は既に存在する**: 固定件数ピン 3 本（`tests/integration/t-plugin-projection-packaging.test.ts:148-149` の `toEqual([...])` と `toHaveLength(5)`、`tests/unit/t-plugin-projection.test.ts:308` の `toHaveLength(5)`、`tests/unit/t209-promote-self-dangling-symlink.test.ts:146-150` の `packageFreshnessArgs("apply")` 逐語配列）は pi を足せば確実に赤くなる。ただし**これは「pi が足された」ことを示すだけで、「逆向きガードが無い」欠陥そのものの落ちる実証にはならない** — 後者には新しい双方向ガードと、その注入赤の実測が要る。

**B. #2162 — 通常経路が検証コードを通らない**

`validateBootstrapHistory`（`tests/no-silent-drop/bootstrap.ts:451`）は、`events/` が存在する trustedSha では呼ばれない（`:448` の分岐）。events は 222 ファイルで着地済みのため、CI の通常経路（`.github/workflows/ci.yml:164`）はこの検証を**通らない**。恒久 fail-closed は潜在状態である。

死んだ経路が negative test で固定されている点も品質上の争点である — `baselineAtRevision`（`tests/no-silent-drop/ledger.ts:226-227`）は存在しないファイルを `git show` するため常に throw し、その throw を `tests/integration/no-silent-drop-gate.test.ts:839` が `toThrow("does not contain an unambiguous baseline")` で固定している。**production から呼ばれない経路の例外挙動をテストが保存している**形で、削除する場合はこの negative test も同時に処理する必要がある。

**C. #3097 — 検査射程の外**

`tests/integration/t3028-sensors-docs-sync.integration.test.ts` の `covers:` ヘッダ（`:1-2`）は `docs/harness-engineering/06-sensors.md` と `.ja.md` のみを宣言し、`tableRows()`（`:47-51`）は `docs/harness-engineering` 直下だけを読む。**`docs/reference/07-sensor-system.md` は完全に射程外**であり、Issue の主張はこの点で成立する。06 側は en `:63-76` / ja `:30-43` の 14 行で同期済みなので、drift が起きているのは無検査の 07 だけである。

なお `.github/workflows/ci.yml:14-15` の `paths-ignore` は `metrics/**` のみで docs を除外していないため、`cid:build-and-test:ci-paths-ignore-doc-guard-blindspot` の「doc 変更 → ガード素通り」は本件には該当しない。

### 4. 是正時に同期を要する台帳（領域別、実測）

| 領域 | allowlist hit | registry hit | model-map hit | 判定 |
|---|---|---|---|---|
| A（`promote-self` / `plugin-projection` / `self-install-allowlist`） | **1**（`promote-self` を reason 文中に引く `tests/deletion-gate.ts` の `runDistributionGuards` エントリ。expiry 逐語 `remove if the guards gain in-process entry points`） | 0 | 0 | セレクタの再アンカーは不要。ただし**テストファイルを新規追加するなら registry の regen が必須**（`cid:build-and-test:c1`） |
| B（`no-silent-drop`） | **5** | **3**（すべて `tests/perf/t-no-silent-drop-text-mutation.test.ts`） | 0 | 免除エントリ 5 件の去就を実測で判定する（`cid:code-generation:c-measure-not-prose`: reason の散文でなく lcov の DA で決める） |
| C（docs + t3028） | 0 | 0 | 0 | 台帳の係りなし。ただし t3028 を拡張して**新規テストファイルを足す場合は registry regen**が要る |

いずれの領域も `amadeus-orchestrate.ts` を触らないため、`cid:build-and-test:bt-ledger-resync` が指す model-map の実装ハッシュピン resync は現時点では不要である（是正が同ファイルへ及んだ場合は再判定）。

機序は `architecture.md`、コンポーネント境界は `component-inventory.md`、配置は `code-structure.md` の各対応節を参照。

## 品質指標の区間差分と、優先バグ 5 件のテスト空白（260816-priority-bug-batch-3、履歴、observed `89053172e`。**現在時制マーカーのみ降格**（`cid:reverse-engineering:c1`、260817-inception-cost-batch の差分リフレッシュ時。本節の file:line は本節が宣言する observed 断面の値として保存する。本節が記すテスト空白は本区間で埋められた — 現況は本ファイル末尾の 260817-inception-cost-batch 節を参照））

**観測 ref**: base `5c5911ee3f107152c3173701caf178a746b6e3aa` → observed `89053172ed8b5bb270e254aea029a13291d10b6b`。

### 1. 品質指標の差分 — coverage は微減、オープンバグは急増

**測定元**: `metrics/2026-08-16T11-04-41-875Z-3e1c6a19ed5b.json`（base 側 = base コミット時点で tracked な最後の snapshot）と `metrics/2026-08-16T20-57-24-618Z-2555e5b42914.json`（observed 側 = 区間内で最後の snapshot）。**取得述語**: 各 JSON の `collectors.<name>.values` を `bun -e` で直読（本節の起草時に実行、exit 0）。区間内の snapshot は 4 件（`git diff --name-only 5c5911ee3 89053172e -- metrics/`）。

| 指標 | collector | base | observed | 差 |
|---|---|---|---|---|
| coverage percent | `coverage` | 93.41934476465595 | 93.39685396775708 | **−0.0225pp** |
| coverage hits / lines | `coverage` | 95724 / 102467 | 95474 / 102224 | −250 / −243 |
| test files | `tests` | 1044 | 1045 | +1 |
| assertions | `tests` | 13879 | 13891 | +12 |
| failed files / assertions | `tests` | 0 / 0 | 0 / 0 | 横ばい（緑） |
| unit_small / integration_medium | `test_pyramid` | 270 / 580 | 270 / 581 | ±0 / +1 |
| loc core | `loc` | 148942 | 148956 | +14 |
| loc tests | `loc` | 401163 | 384400 | **−16763** |
| 関数数 / 閾値超過 | `ccn` | 7301 / 32 | 7295 / 32 | −6 / **±0** |
| **open bugs** | `bugs` | 4 | **11** | **+7** |

**読み方の注意が 2 点ある。**

第一に、**coverage の微減（−0.0225pp）は退行ではなく母集団の縮小に伴う変動である。** loc tests が 16,763 行減っており、これは #3155 による no-silent-drop bootstrap fixture（JSON 群）の退役に対応する。hits と lines が同時に減っている（−250 / −243）ことから、`cid:build-and-test:bt-coverage-universe-inflation` が記す「大きなソースを 1 本のテストが import して母集団が膨らむ」クラスとは逆向きの、削除に伴う縮小である。**ただし Project Coverage Gate の相対条件（許容 0.02pp）に対して −0.0225pp は超過幅にある**ため、本 intent の実装 PR では merge-base 相対の再測定が要る（絶対下限と相対条件は AND 条件）。

第二に、**open bugs の 4 → 11 は本区間がバグを増やしたのではなく、バグ探索で新規に可視化された結果である。** 本 intent が扱う 5 件はこの 11 件に含まれる。

### 2. 台帳の同期状況 — 区間内で 2 台帳のみ動いた

`git diff --stat 5c5911ee3 89053172e -- <5 台帳>`（本節の実測）:

| 台帳 | 区間内の状態 |
|---|---|
| `amadeus/spaces/default/specs/tla/model-map.json` | **+2 −2**（`amadeus-state.ts` 変更に対応する impl ハッシュピンの resync。`cid:build-and-test:bt-ledger-resync` どおり同一変更で同期済み） |
| `tests/.coverage-patch-allowlist.json` | **+0 −11**（エントリ削除のみ、追加なし） |
| `tests/.coverage-registry.json` | **無変更** |
| `tests/.complexity-baseline.json` | **無変更** |
| `tests/.coverage-ratchet.json` | **無変更** |

**上流の要確認事項を 1 件解消した。** Developer scan §1.7 / §5 は「新規テストファイル 1 件（`tests/integration/t2363-pi-self-install-delivery.integration.test.ts`）が入ったのに registry が regen されていない」を `cid:build-and-test:c1` に照らして要確認としていたが、**regen 不要が正しい**。根拠は 3 つの実測（すべて本節の起草時、observed 断面）:

- registry の `unitClasses` は `["function","audit","scope","stage","hook","subcommand","render-surface"]` の **7 クラス**で `contract` を含まない（`bun -e` による JSON 直読、exit 0）
- t2363 の `covers:` ヘッダは `contract:pi-self-install-delivery` の **1 件のみ**（`sed -n '1,6p'` の逐語）
- `grep -c '"contract:' tests/.coverage-registry.json` → **0**（exit 1 = エラーなく不一致）。対照として `covers:` に `contract:` を宣言するテストファイルは **12 件**存在する（`git grep -l "^// covers:.*contract:" -- 'tests/**' | wc -l`）

すなわち `contract:` 宣言は enumeration universe に寄与しないため、そのクラスだけを宣言するテストの追加は registry を動かさない。**ただし本 intent が `function:` / `audit:` / `subcommand:` 等の 7 クラスを宣言するテストを新規追加する場合は、`cid:build-and-test:c1` どおり regen 同梱が必須**である。

### 3. 領域別のテスト空白

**A. #3153 — 主座テストは厚いが、「宣言が効くか」の観点が無い**

主座は `tests/unit/t188-human-presence-gate.test.ts` で、`// covers:` に `function:assertHumanPresentForGateResolution` / `function:humanActedSinceGate` / `function:hasOpenGate` / `function:isAutonomousMode` / `function:humanPresenceGuardDisabled` / `file:hooks/amadeus-mint-presence.ts` を宣言する。D8 の fail-closed（`:288`）、reject guard の同一述語経路（`:487`）、record scope seam（`:656-669`）を固定している（Developer scan §3.1 からの転記）。周辺は `t112-delegated-approval` / `t-delegate-answer-consume` / `t509-presence-legacy-shard` / `t208-presence-crossshard-tiebreak` / `t203-mint-presence-classify` / `t-approve-batch-presence-guard` / `t481-autonomy-canonical-state-write`（すべて実在を本節で確認）。

**空白は「autonomy が human-required を宣言した状態で、無関係な HUMAN_TURN が承認を通してしまう」ケースである。** 既存テストは presence 述語の正しさ（誰の、どのレーンのターンか）を検査するが、**autonomy の結論と presence の結論が食い違う組み合わせを固定するテストが無い**。落ちる実証はこの組み合わせを作る形になる。

**B. #3152 — 冪等性の assert は認可側にしか無い**

主座は `tests/integration/t435-intent-autonomy-production.integration.test.ts` で、`productionStageAutonomy` と `commitProductionStageGateDecision` の両方を直接呼ぶ。**`:150` / `:162` / `:243-244` に `decided` → `already-decided` の冪等 assert がある**（Developer scan §3.2 からの転記）。すなわち**認可側の冪等性はテストで固定されているのに、拒否側には対応する assert が存在しない** — これがテスト空白の正確な形である。

落ちる実証は「同一 occurrence に対し `productionStageAutonomy` を 2 回呼び、監査行が 1 行であること」を assert する形が自然で、既存テストが同関数を直接呼ぶ座を持つため seam は既にある。監査面へ新イベントを足す方式なら `tests/integration/event-registry-drift.test.ts` の基数 pin（98）が blocking で発火する。

**C. #3149 — 個別の kind は厚くカバーされているが、衝突の組み合わせが無い**

lifecycle 側の主座は `tests/unit/t481-pr-convergence-lifecycle.test.ts`、sensor 側の主座は `tests/integration/t450-pr-convergence-report-format-sensor.integration.test.ts`（`:294` / `:331-334` の検査）。周辺に `t3062-pr-convergence-landed-finalization`（#3062 の `created → landed`）、**`t3110-pr-convergence-stale-epoch-landed`（クラス B の直接の先行実装）**、`t534-pr-convergence-report-attestation`、`t541-pr-convergence-epoch-resume`、`t482-pr-convergence-landed`、`t534-pr-convergence-mandatory-lifecycle`、`t446-pr-convergence-predicate` / `t413-convergence-policy` ほか（Developer scan §3.3 の一覧。主要 6 本の実在を本節で確認）。

**空白は「`converged` を確定させたあとにマージされ checkout が前進した」という組み合わせである。** CLI 側の遷移拒否も sensor 側の checkout binding も個別にはテストされているが、**両者が同時に塞ぐ状態を再現するテストが無い**。#3110 のテスト（t3110）は `created` 起点の stale 経路を扱っており、`converged` 起点は射程外である。

**D. #3156 — 3 プローブの個別挙動は固定されているが、同時失効の形状が無い**

主座は `tests/unit/t206-source-work-intent-span.test.ts`（`// covers: function:gitHasSourceWork`。ヘッダ `:6` / `:16` に 3 プローブの説明、`:190` に `recordBranchSourceWork` の first-parent 挙動、`:358` に `intentBoltSlugs` のディレクトリ置換ケース）。ガード全体は `tests/integration/t185-stage-artifact-guard.test.ts`（`:432-435` に「`HEAD~1` が無い場合は null を返し FS fallback へ落ちる」契約）。

**空白は「record 初コミットがコードコミット群より後」という形状そのものである。** 3 プローブが同時に false になる fixture が無いため、誤拒否が再現されない。

**検証上の制約が 1 つある**: t206 は `dist/claude/.claude/tools/amadeus-state.ts` から import する（`:33` 逐語、本節で確認）ため、**本領域の修正を検証するには `bun run build` を経て dist を再生成する必要がある**（`cid:code-generation:c1-mirror-and-rebuild-before-review` / `cid:code-generation:c5-regen-needs-build`）。

**E. #3046 — 並行 append を再現するテストが 1 本も無い**

主座は `tests/integration/t549-election-v2-store.integration.test.ts`（`:150-184` に冪等リトライ / duplicate / 複数 voter の append、`:263` / `:425-431` にエラー系、`:512` に canonical encoded form の保持）。周辺は `t235-election-store`（`:129-158`）と `t373-election-ballot-blind-storage`（`:103-155`）。いずれも実在を本節で確認。

**空白は明確である — 現行テストはすべて逐次呼出であり、並行 append を再現するものが存在しない**（Developer scan §3.5 の grep 結果に該当なし）。落ちる実証には別プロセス（`spawn`）か、`readAllPending` と `writeStoreFile` の間へ割り込むシームが要る。**filesystem / process を使う medium test は integration 層に置く**（`cid:code-generation:c2-doctor-seam`）ため、主座 t549 と同じ層が置き場になる。

### 4. 是正時に同期を要する台帳（領域別、実測）

`grep -c <キー>` の転記（本節の起草時に実行、対象 tree = observed `89053172e`）:

| キー | allowlist hit | registry hit | model-map hit | complexity-baseline hit |
|---|---|---|---|---|
| `amadeus-state` | **48** | **33** | **2** | **4** |
| `amadeus-lib` | 2 | 0 | 0 | 0 |
| `amadeus-intent-autonomy-production` | **9** | 0 | 0 | 0 |
| `pr-convergence` | 4 | 2 | 0 | 0 |
| `amadeus-election-store` | **15** | 0 | **1** | 0 |
| `amadeus-orchestrate` | **30** | 0 | **2** | 0 |

**判定**:

- **A / B / D（`amadeus-state.ts` を触る 3 領域）** — allowlist 48 件・registry 33 件・model-map 2 件・complexity-baseline 4 件のすべてが係る。**行シフトを伴う修正では allowlist の意味的セレクタの再アンカーが要る**（`cid:code-generation:c5-ratchet-census-at-final-base` に従い census は**マージ先の最終 base** で採る）。model-map の impl ハッシュピンは `cid:build-and-test:bt-ledger-resync` どおり同一変更で resync する（是正は `bun plugins/formal-model-check/tools/amadeus-sensor-model-completeness.ts updateModelMap --impl-only`）。
- **B が `amadeus-orchestrate.ts:2822` へ及ぶ場合** — allowlist 30 件と model-map 2 件が追加で発火する。**方式裁定の時点でこの分岐を明示すること**。
- **C（`plugins/github-pr-convergence/`）** — allowlist 4 / registry 2 と係りは小さい。
- **E（`amadeus-election-store.ts`）** — allowlist 15 / model-map 1。並行性テストの追加は新規テストファイルになる可能性が高く、その場合 **registry regen が必須**（`cid:build-and-test:c1`）。

### 5. 本 intent の運用上の注意（後段への申し送り）

- **単一 intent に 5 unit を載せる構成の制約**: `cid:code-generation:oq-singleton` により degrade スコープ（`self-fix`）では pr-convergence の Delivery Bolt authority が construction 配下の unit ディレクトリを**ちょうど 1 つ**であることを要求する。units-generation / delivery-planning を EXECUTE するか、`cid:code-generation:multiunit-pr-procedure` の per-unit PR 定型に従う必要がある。
- **自己適用の注意（#3149）**: 本 intent の Bolt PR も pr-convergence 機構で収束させるため、**修正中の CLI を自 intent の配送に使う**。attestation は self-install 投影（`.claude/plugins/...`）からの起動を要する（`cid:code-generation:c2-pr-record-in-head-checkout`）。
- **coverage の相対条件**: 区間で −0.0225pp の変動が既にあるため、実装 PR では merge-base 相対の再測定が要る（`cid:code-generation:coverage-patch-quick-pre-push-standard` の advisory 往復は push 後に CI と並列で回す — `cid:code-generation:push-first`）。
- **フルスイート未実行**: 本スキャンはテストを一切実行していない（読取専用）。上記の「関連する既存テストファイル」は grep とヘッダ実読による同定であり、赤／緑は未測定である。

機序は `architecture.md`、コンポーネント境界は `component-inventory.md`、配置は `code-structure.md` の各対応節を参照。

## 品質指標の区間差分と、focus 2 件のテスト空白（260817-inception-cost-batch、履歴、observed `23d4ae767`。**現在時制マーカーのみ降格**（`cid:reverse-engineering:c1`、260818-priority-bug-batch-4 の差分リフレッシュ時。本節の file:line は本節が宣言する observed 断面の値として保存する））

**観測 ref**: base `89053172ed8b5bb270e254aea029a13291d10b6b` → observed `23d4ae767956cd56fc28fa78abe28096712eff8a`。

### 1. 品質指標の差分 — 前区間の悪化が反転した

**測定元**: `metrics/2026-08-16T20-57-24-618Z-2555e5b42914.json`（base 側 = base コミット時点で最後の snapshot）と `metrics/2026-08-17T12-24-08-673Z-0b652d2cd1a6.json`（observed 側 = 区間内で最後の snapshot、commit `0b652d2cd` 対応）。**取得述語**: 各 JSON の `collectors.<name>.values` を `bun -e` で直読（本節の起草時に実行、exit 0）。区間内の snapshot は **5 件**（`git diff --name-only 89053172e..23d4ae767 -- metrics/`、5 本の bugfix PR に 1:1 対応）。

| 指標 | collector | base | observed | 差 |
|---|---|---|---|---|
| coverage percent | `coverage` | 93.39685396775708 | 93.39885723200531 | **+0.0020pp** |
| coverage hits / lines | `coverage` | 95474 / 102224 | 95788 / 102558 | **+314 / +334** |
| test files | `tests` | 1045 | 1047 | +2 |
| assertions | `tests` | 13891 | 13939 | +48 |
| failed files / assertions | `tests` | 0 / 0 | 0 / 0 | 横ばい（緑） |
| unit_small / integration_medium | `test_pyramid` | 270 / 581 | 270 / 583 | ±0 / **+2** |
| loc core | `loc` | 148956 | 149387 | +431 |
| loc tests | `loc` | 384400 | 386333 | +1933 |
| loc scripts | `loc` | 13092 | 13092 | ±0 |
| 関数数 / 閾値超過 / 最大 | `ccn` | 7295 / 32 / 38 | 7320 / 32 / 38 | +25 / **±0** / ±0 |
| bugs total / open / closed | `bugs` | 398 / 11 / 387 | 400 / **13** / 387 | +2 / **+2** / ±0 |

**読み方の注意が 3 点ある。**

第一に、**coverage は前区間の −0.0225pp から +0.0020pp へ反転した。** 母集団は +334 行に対しヒットが +314 行なので、区間で追加されたコードの被覆率は **約 94.0%**（314/334、派生値）である。前区間で問題になった Project Coverage Gate の相対条件（許容 0.02pp）に対して、本区間の変動は**符号が逆かつ幅が 1/10 以下**である。

第二に、**複雑度は関数を 25 本増やしながら閾値超過を 32 のまま維持している。** ccn の `max` も 38 で不変。198 行を足した `amadeus-state.ts` を含めて、既存の複雑関数を悪化させていない。

第三に、**open bugs 11 → 13 は「5 件を直したのに 2 件増えた」ではない。** `closed` は 387 で**不変**であり、区間内 5 件の Issue クローズはこの snapshot（区間内最後、commit `0b652d2cd` 時点）より後に行われている。増分 +2 は `s4_minor` の +2（79 → 81）と一致するので、**区間内に新規起票された S4 が 2 件ある**という読みが指標と整合する。本 intent が扱う 2 件がこれに含まれるかは metrics からは判定できない。

### 2. 是正の品質面での作り込み — 5 件すべてが落ちる実証形のテストを伴っている

`cid:code-generation:falling-proof-injection-one-set` の観点から、区間の各 PR がどのテスト面を伴ったかを記録する（`git diff --numstat 89053172e..23d4ae767 -- 'tests/**'`、本節の実測）。

| Issue | 新規 | 拡張 |
|---|---|---|
| #3149 | `tests/integration/t3149-pr-convergence-merged-finalisation.integration.test.ts`（+739、**区間最大のテスト追加**） | `t450-pr-convergence-report-format-sensor`（+94）/ `t3110-pr-convergence-stale-epoch-landed`（+16 −7） |
| #3046 | `tests/integration/t3046-election-append-voter-race.integration.test.ts`（+348）+ `tests/helpers/election-append-race-child.ts`（+72） | `t549-election-v2-store`（+63 −21） |
| #3153 | — | `tests/unit/t188-human-presence-gate.test.ts`（+212 −2）/ `tests/unit/t112-delegated-approval.test.ts`（+32） |
| #3152 | — | `tests/integration/t482-autonomy-refusal-event.integration.test.ts`（+229 −106）/ `t435-intent-autonomy-production`（+27 −1） |
| #3156 | — | `tests/unit/t206-source-work-intent-span.test.ts`（+167、**既存ファイルの拡張**） |

**2 つの最大ソース変更が 2 つの最大テスト追加と対応している** — `pr-convergence-cli.ts`（+318 −53）↔ t3149（+739）、`amadeus-state.ts`（+198 −39）↔ t188（+212）+ t206（+167）。

**#3046 の落ちる実証には実プロセスが使われた。** 前節の申し送りが「並行 append を再現するテストが存在せず `spawn` かシームが要る、置き場は integration 層」と記していたとおり、`tests/helpers/election-append-race-child.ts` が子プロセスを駆動する形で integration 層に置かれた（`cid:code-generation:c2-doctor-seam` に整合）。

**上流入力の訂正 1 件**: Developer scan §3 は t206 を「1 new unit suite」と記すが、**新規ではなく既存ファイルの拡張**である（`git diff --name-status` → `M`、base に 402 行で実在、observed 569 行）。unit 層の総数が base / observed とも **432** で不変であることが裏づける。**区間の新規テストスイートは integration 2 本のみ。**

### 3. 台帳の同期 — 5 クラスすべてが同一区間内で resync された

`cid:build-and-test:bt-ledger-resync` / `cid:build-and-test:c1` / `cid:code-generation:c1-260803-state-integrity` が要求する台帳同期は、本区間ですべて in-band に行われている（`git diff --numstat`、本節の実測）。

| 台帳 | 規模 | 発火要因 |
|---|---|---|
| `tests/.coverage-registry.json` | +23 −6 | 新規テストファイル 2 件の追加（`bun tests/gen-coverage-registry.ts` の freshness 検査。`cid:build-and-test:c1`） |
| `tests/.coverage-patch-allowlist.json` | +34 −1 | 意味的セレクタの再アンカー + #3153 の in-process 到達不能 arm 2 件の新規免除 |
| `tests/.coverage-ratchet.json` | +2 −2 | shrink-only ratchet |
| `tests/no-silent-drop/approval.json` + `tests/no-silent-drop/events/01M06XDWGXGY27WD0XSET1R3Q0.json` | +9 −1 / +13（新規 ULID event 1 件） | `recordAutonomyRefusalAtGateOpen` の fail-open catch（ADR-2 契約） |
| `amadeus/spaces/default/specs/tla/model-map.json` + `specs/tla-evidence/fb1029e4….json` | +3 −3 / +1 | `amadeus-state.ts` と `amadeus-election-store.ts` の impl ハッシュピン **3 箇所**の更新 |

**上流入力への追補**: Developer scan §3 は「4 つの ledger クラス」と数えているが、**TLA の `model-map.json` / `tla-evidence` を含めると 5 クラス**である。この 2 面は `amadeus/spaces/` 配下にあるため path 接頭辞で workflow exhaust と誤分類されやすい（#2415 の述語設計に直結。`architecture.md` §1 の reconciliation を参照）。

**新規免除の内容**（`tests/.coverage-patch-allowlist.json`、observed の `:3691` / `:3702` を実読）: いずれも #3153 の milestone presence 判定で、スイート全体が `AMADEUS_SKIP_HUMAN_PRESENCE_GUARD=1` 下で走るため in-process では guard-disabled arm で return してしまい到達不能な 2 行。**免除の reason は代替の被覆先を明示している** — 挙動は t188 シナリオ M / M2 / M3 が spawn した dist ツール経由で assert し、presence 判定自体は `resolveGateResolutionPresence`（`amadeus-lib.ts`）を通じて in-process で被覆される、と述べる。`cid:code-generation:c-measure-not-prose` の観点では、この reason は散文根拠ではなく**代替測定先を名指す**形式であり、免除の妥当性が検証可能である。

### 4. focus 2 件のテスト空白

**是正方式は未決**（`memory/team.md` P1 の裁定事項）なので、ここでは**現況として存在するテスト面と、存在しない面**だけを記録する。

| focus | 現存するテスト面 | 空白 |
|---|---|---|
| **#2415**（RE スキャン入力の除外） | stage 契約の構造検査は `question-budget` sensor の corpus sweep（`tests/integration/t517-question-budget-sensor.integration.test.ts`）など、**契約ファイルの形式面**を見るテスト群が存在する | **入力面（何を読むか）を拘束するテストは同定できていない。** 除外規則そのものが不在（grep exit 1）なので、規則を追加する側が落ちる実証の形を新規に設計する必要がある。散文契約の変更に対する落ちる実証は、契約を機械消費する面（sensor / corpus sweep）を経由しないと成立しない点に注意 |
| **#3181**（Issue 証跡の一級化） | `consumes` の schema 検証は `packages/framework/core/tools/amadeus-stage-schema.ts:277-316`、graph 不変量は `packages/framework/core/tools/amadeus-graph.ts:1192-1206` に実装があり、いずれも既存テストの射程 | **Issue 証跡を artifact として読む経路が存在しない**ため、その round-trip（`cid:build-and-test:pbt-developer-testing-posture` が新設の永続化境界に要求する write⇔read プロパティ）は当然ゼロ。gateway 側の `parseIssueObject` / `readiness` には既存の被覆があるが、**「Issue → artifact → RA の consume」という経路全体を通す検証は無い** |

**共通の注意**: `upstream-coverage` sensor（RA 契約 `:185`）は出力散文が `consumes:` の各 artifact を参照することを要求する。consume を 1 件増やすと、**frontmatter の変更だけでは sensor が赤になる** — `requirements.md` 側の散文と、`:185` の括弧書き（現状 3 件のみ列挙）の両方が同期対象である。

### 5. 検証の未実施面

- **フルスイート未実行**: 本スキャンはテストを一切実行していない（読取専用）。上記の「拡張されたスイート」は `git diff --numstat` とファイル冒頭の `covers:` ヘッダ実読による同定であり、赤／緑は未測定である
- **`bun run build` 未実行**: `tests/unit/t206-source-work-intent-span.test.ts` は `dist/` 経由の import を含むため（前節が逐語確認済み）、当該テストの実行には build が要る。本スキャンでは実行していない
- **coverage / TLC 未実行**: 指標はすべて region 内の metrics snapshot JSON からの転記であり、本スキャンで再計測したものではない

### 6. 是正時に同期を要する台帳（本 intent の focus 面）

| 触る面 | 発火する台帳 / ゲート |
|---|---|
| `packages/framework/core/amadeus-common/stages/**` の frontmatter | runtime graph の再 compile、`/amadeus --doctor` の参照検査、`bun amadeus-graph.ts artifacts` |
| 新規テストファイルの追加 | `tests/.coverage-registry.json` の regen（`bun tests/gen-coverage-registry.ts`。`cid:build-and-test:c1`） |
| `packages/framework/core/tools/amadeus-orchestrate.ts` の変更 | `amadeus/spaces/default/specs/tla/model-map.json` の impl ハッシュピン + `tests/.coverage-patch-allowlist.json` の意味的セレクタ（`cid:build-and-test:bt-ledger-resync`） |
| `packages/framework/core/**` の変更全般 | 全ハーネス向け `bun run build` と隔離 2 回ビルドの再現性検査、`source-only:check`（`cid:build-and-test:bt-dist-regen-seven-harnesses`） |
| docs 対訳面（`docs/reference/16-artifact-vocabulary.md` 等）を触る場合 | 対訳同時更新と、doc を消費するテストの paths-ignore 盲点（`cid:build-and-test:ci-paths-ignore-doc-guard-blindspot`） |

機序は `architecture.md`、コンポーネント境界は `component-inventory.md`、配置は `code-structure.md` の各対応節を参照。

## 品質指標の区間差分と、focus 2 件のテスト空白（260818-priority-bug-batch-4、履歴、observed `127be70c5`。**現在時制マーカーのみ降格**（`cid:reverse-engineering:c1`、260820-fmc-drift-batch の差分リフレッシュ時。本節の file:line は本節が宣言する observed 断面の値として保存する））

**観測 ref**: base `23d4ae767956cd56fc28fa78abe28096712eff8a` → observed `127be70c5d7a584016f88a5d44e8715904020721`（5 コミット）。

### 1. 指標の区間差分

**測定元**: `metrics/2026-08-17T12-24-08-673Z-0b652d2cd1a6.json`（base 側 = base 以前の最後の snapshot）と `metrics/2026-08-18T04-53-24-170Z-43a2e2978678.json`（observed 側 = 区間内最後）の `collectors.<name>.values` を `bun -e` で直読（本節の実行、exit 0）。**区間内 snapshot は 2 件**（`git diff --name-only 23d4ae767..127be70c5 -- metrics/` の実測）。

| 指標 | base 側 | observed 側 | 差 |
|---|---|---|---|
| coverage percent | 93.39885723200531 | 93.41203240015948 | **+0.0132pp** |
| coverage hits / lines | 95788 / 102558 | 96064 / 102839 | +276 / +281 |
| test files / assertions | 1047 / 13939 | 1055 / 14030 | **+8** / +91 |
| failed files / assertions | 0 / 0 | 0 / 0 | 横ばい |
| unit_small / integration_medium | 270 / 583 | 273 / 588 | **+3 / +5** |
| loc core / tests / scripts | 149387 / 386333 / 13092 | 150065 / 388125 / 13092 | +678 / +1792 / ±0 |
| ccn 関数数 / 閾値超過 / max | 7320 / 32 / 38 | 7340 / 32 / 38 | +20 / **±0** / ±0 |
| bugs total / open / closed | 400 / 13 / 387 | 405 / **13** / 392 | +5 / **±0** / +5 |

**coverage は 2 区間連続で上昇**した（前区間 +0.0020pp → 本区間 +0.0132pp）。新規行の被覆率は **約 98.2%**（276/281、派生値、算出式併記）。前区間の約 94.0% を上回る。

**test files +8 は新規テスト 8 ファイルと一致**し、その内訳（unit_small +3 / integration_medium +5）も新規ファイルの層分布（unit 3 本 / integration 5 本）と一致する。

**bugs は total +5 / closed +5 / open ±0** である。区間内で 5 件がクローズされ、同数が新規に total へ入った形ではなく、`closed` の +5（387 → 392）と `total` の +5 が同期しているので、**open は動かず 13 のまま**である。重大度分布では `s3_major` 191 → 192（+1）、`s4_minor` 81 → 85（+4）。

**ccn の閾値超過は 32 で不変、max も 38 で不変**である。関数数 +20 に対し閾値超過が増えていないので、新規コードは複雑度の面で既存分布の内側に収まっている。

### 2. 台帳の resync — 5 面

| 台帳 | 規模（本節の実測） | 内容 |
|---|---|---|
| `tests/.coverage-registry.json` | **+48 −5** | 新規 unitId 4 件（`function:issueEvidencePath` / `function:relativeIssueEvidencePath` / `function:RE_SCAN_EXCLUDED_PATHSPECS` / subcommand `amadeus-utility issue-evidence`）ほか |
| `tests/.coverage-patch-allowlist.json` | **+36 −0** | 免除エントリの追加（削除ゼロ） |
| `tests/.coverage-ratchet.json` | **+2 −2** | `function` **189 → 191** / `subcommand` **86 → 87** |
| `tests/integration/t-coverage-mechanism-ratchet.test.ts` | **+2 −0** | mechanism honesty 台帳へ integration 2 件を追加（`t3181-issue-evidence-fetch` / `t3181-issue-evidence-upstream-coverage`） |
| `tests/fixtures/designer-export/export.json` | **+8 −0** | artifact 語彙 122 → 123 の投影同期 |

**TLA の `model-map.json` は本区間で動いていない**（区間の変更ファイル一覧に `amadeus/spaces/default/specs/` は不在）。前区間では impl ハッシュピン 3 行が resync されていたが、本区間の変更ファイルに `model-map.json` の `entries[].implPath` に載る面（`amadeus-orchestrate.ts` / `amadeus-state.ts` / `amadeus-election-store.ts`）が含まれないためである。**#3106 の是正は `amadeus-orchestrate.ts` を触るので、この台帳が発火する見込みである**（`cid:build-and-test:bt-ledger-resync`）。

**mechanism honesty 台帳への 2 件追加は、新規 integration が「実行結果から導出した検証」であることの申告**である（`memory/team.md` P2 の系）。台帳に載ることで、当該テストが検証劇場でないことがゲートの検査対象になる。

### 3. focus 2 件のテスト空白

**両 focus とも是正が着地していないため、空白はそのまま残っている**（`git grep -n "3106" 127be70c5 -- packages/ plugins/ tests/ docs/` → **exit 1**、`"2837"` は `tests/.coverage-patch-allowlist.json:183` / `:566` の sha256 値の内部文字列 2 hit のみ）。

#### 3.1 #2837 — batch 番号の**導出**をテストしている面が存在しない

| 既存テスト | 何をテストしているか | 空白 |
|---|---|---|
| `tests/integration/t135-invoke-swarm.test.ts` | `invoke-swarm` directive の `kind` / `units` / `cap` の 3 面。**`--batch` は全てハードコード** | batch 番号が engine のどの値から導かれるかを検証していない |
| `tests/integration/t379-swarm-canonical-emit.test.ts` | canonical emit | 同上 |
| `tests/unit/t211-swarm-batch-progress.test.ts` | batch progress。**`tests/unit/` 配下**（`git ls-tree -r --name-only 127be70c5 tests/` の実測。`tests/integration/` には存在しない） | 同上 |
| `tests/e2e/t134-swarm-referee.test.ts` | referee の verdict | 同上 |
| `tests/unit/t113.test.ts:303-322` | `prepared_batch` / `retry_unit` の **pair 整合のみ** | 初回 fan-out の batch 搬送は対象外 |

**2 種類の空白がある**:

1. **batch 導出テストの不在** — `firstUncoveredBatch`（`amadeus-orchestrate.ts:3906`）が返す `batchNumber` が directive へ届くかを検証する面がどこにもない。届いていない現況が「仕様」なのか「欠陥」なのかをテストが判別していない。
2. **failed batch → replan → 同一 Unit redispatch の回帰テスト不在** — 旧 batch が terminal の状態で同じ Unit を再実行する経路を固定するテストが存在しない。これは Issue 本文が明示的に要求している面である。

#### 3.2 #3106 — per-unit 経路 × cancelled の対が存在しない

`tests/integration/t533-per-unit-consume-fanout.integration.test.ts:786-801` に **pool 経路の cancelled** テストが 1 本ある（逐語 `test("does not emit paths for a cancelled producer Unit even when files remain", …)`、本節の実測）。**per-unit（solo）経路の対が無い。**

| 経路 | cancelled のテスト | 現況 |
|---|---|---|
| pool（swarm） | `t533:786-801` | あり。cancelled Unit は consumer を止めない |
| **per-unit（solo）** | **なし** | 空白 |

**是正時に置くべき位置**: 同ファイル `:786-801` の直後（対になる位置）。fixture は同ファイルの `seedPerUnitProject`（`:101-167`）を使い、cancel は `resolve-failure --user-input Skip` で駆動する形が最短である。

**落ちる実証の設計上の注意**（`memory/team.md` § 検証・実測規律）: 是正は発行側（`amadeus-orchestrate.ts:4706` / `:2475`）と読み側（`:2508`）の**2 面を同時に**開く必要があるため、片方だけを直した中間状態でも Red が正しく赤くなることを確認する必要がある。`cid:code-generation:cg2-agreeing-predicate-drift`（同一述語の複数箇所への手書き複製）と同族の形であり、**修正前に全複製箇所を grep で列挙する**のが定型である。

### 4. 検証面の健全性

| 面 | 状態 |
|---|---|
| CI ワークフロー | 区間で**変更なし**（`git diff --name-only 23d4ae767..127be70c5 -- .github/` → 空出力・exit 0） |
| blocking gate 集合 | 不変 |
| failed files / assertions | **0 / 0**（両 snapshot） |
| dist parity | **本スキャンでは未測定**（`bun run build` は read-only 制約により未実行）。追跡ファイルの `dist/` 面は区間の変更ファイル一覧に不在 |

**新規テストが drift guard を持つ点を記録する。** `tests/integration/t2415-re-scan-exclusion-contract.integration.test.ts` は契約散文とコード定数の一致を検査するが、その検査を **source 断面だけでなく全 delivered tree** に対して行う（`:159` 近傍）。ソース断面だけの green が配送路の退行を隠す形（`cid:requirements-analysis:c2-acceptance-at-delivery-tree`）に対する、正しい形の実装である。

## 品質指標の区間差分と、focus 4 件の技術的負債シグナル（260820-fmc-drift-batch、現在、observed `e86fbe125`）

**観測 ref**: base `c8c393bba` → observed `e86fbe125`（97 commits）。

### 1. 品質指標

**測定元**: `metrics/2026-08-18T04-53-24-170Z-43a2e2978678.json`（base 側 = base 以前の最後の snapshot）と `metrics/2026-08-20T06-35-41-011Z-e452d3892135.json`（observed 側 = 区間内最後の snapshot、対応コミット `e452d3892`）の `collectors.<name>.values` を `bun -e` で直読。

| 指標 | base 側 | observed 側 | 差 |
|---|---|---|---|
| coverage percent | 93.41203240015948 | 93.58238736717489 | **+0.1704pp** |
| coverage hits / lines | 96064 / 102839 | 98021 / 104743 | +1957 / +1904 |
| test files / assertions | 1055 / 14030 | 1070 / 14332 | **+15** / +302 |
| failed files / assertions | 0 / 0 | 0 / 0 | 横ばい |
| unit_small / integration_medium | 273 / 588 | 277 / 599 | +4 / +11 |
| e2e_medium | 87 | 88 | +1 |
| loc core / tests / scripts | 150065 / 388125 / 13092 | 151910 / 398684 / 13630 | +1845 / **+10559** / +538 |
| ccn 関数数 / 閾値超過 / max | 7340 / 32 / 38 | 7428 / **32** / **38** | +88 / **±0** / **±0** |
| bugs total / open / closed | 405 / **13** / 392 | 416 / **0** / 416 | +11 / **−13** / +24 |

**coverage は 3 区間連続で上昇**（+0.0020pp → +0.0132pp → **+0.1704pp**）。新規行の被覆率は **約 102.8%**（1957/1904、派生値、算出式併記 — 100% を超えるのは既存未被覆行が新規テストで被覆されたためで、新規行だけの被覆率ではない）。

**複雑度は増えていない。** 関数数が +88 でありながら閾値超過 32・max 38 が横ばいである。

**bugs の `open` が 0 に到達した。** ただし**この計数の母集団述語は本スキャンでは測定していない** — 本 intent の focus 4 件は observed 断面で機構が実在する（§3）ため、`bugs` コレクタの母集団は 4 件を含まない。open 0 を「未解決の課題ゼロ」と読んではならない。

**`loc tests` の +10559 が区間最大の増分**である。これは #1982（`tests/lib/silent-success.ts` + `run-tests.ts` +214 + 台帳）、release-land のテストと fixture、live LLM journey e2e、および新規テストファイル群の合計である。

**テストファイル数の 2 つの計数は突き合わない — 突き合わせは行っていない。** git 断面の実測は `git diff --name-status -M c8c393bba..e86fbe125 -- tests/` の A 行のうち `*.test.ts` が **17**、D 行のうち `*.test.ts` が **1**（`tests/integration/t-run-codex-project-target.test.ts`）で **net +16**。一方 metrics コレクタの `tests.files` は **+15**（1055 → 1070）である。差 1 の由来は特定していない（コレクタの母集団述語を本スキャンでは測定していない）。**両者を一致するものとして扱わない。** なお `ls tests/{smoke,unit,integration,e2e,formal-verif}/*.ts | wc -l` は **1170** を返し、これは helper / fixture を含む述語なのでコレクタの 1070 とは母集団が異なる。

### 2. 品質機構の新設 — silent-success 3 ゲート（#1982）

**このリポジトリで初めて、「テストが実際には何も検証していない」を機械検出する機構が入った。**

| ゲート | 検出対象 | 初期免除 |
|---|---|---|
| zero-assertion | アサーションを 1 件も実行せず成功したファイル | **0** |
| skip | 恒常的に SKIP されている testcase | **19** |
| leak | テスト終了後に残るマーク付きプロセス | **0** |

台帳 `tests/.silent-success-baseline.json` の `description` 逐語:

```
Registered exemptions for the silent-success gates (#1982). Direction is
shrink-only: entries come out as the debt is paid, and are never added to wave a
new violation through. There is deliberately no --update writer. Populated from a
full `bun tests/run-tests.ts -P 4` census in report mode on 2026-08-20 (1068
files: zero zero-assertion violations, zero process leaks, 14 self-skipped
testcases). See docs/reference/09-testing.md.
```

**品質上の意味は 3 つある。**

1. **fail-closed on a broken baseline**（`tests/run-tests.ts:244-248` 逐語 `The silent-success gates are fail-closed on a broken baseline.`）。台帳破損時に「全件免除」へ落ちる設計であれば、それ自体が `memory/team.md` P2 の言う検証劇場になる — その失敗形を構造的に閉じている。
2. **writer を持たない**。免除の追加は手作業でしか行えず、`--update` 相当の自動化が意図的に存在しない。これは `tests/.coverage-ratchet.json` の単調ラチェットと同型の設計である。
3. **初期 census で zero-assertion 0 / leak 0** を得ており、**ゲートは既存の債務を隠すために導入されたのではない**（19 件の SKIP のみが債務として登録されている）。

**本 intent の全 unit がこのゲートの射程に入る。** とくに #3187 は 9 本のテストを削除・更新するため、SKIP 免除の 19 件と交差しないかを実装時に確認する必要がある（実装時に台帳を再読）。

**なお `docs/reference/09-testing.{md,ja.md}` が +161 / +158 でこの機構を文書化している** — 区間の docs 変更 18 面のうち最大である。

### 3. Technical Debt Signals — focus 4 件が触れる 7 件

| # | シグナル | 実測（observed） | クラス |
|---|---|---|---|
| 1 | **t448 の自己参照比較** | `tests/unit/t448-tla-registration.test.ts:2-3` が同一 module specifier を 2 つの名前で import（両行とも逐語 `"../../plugins/formal-model-check/tools/amadeus-formal-verif-model-map.ts"`）。`:74-82` の test `"the shipped plugin copy reaches the same verdicts"` は同一オブジェクトを比較している。直前のコメント（`:72-73`）は逐語 `The plugin tree carries a generated copy of the validator, and it is the one the authoring CLI loads, so the same verdicts are pinned on it too.` と述べるが、**実際には 1 つの実装しか読んでいない** | `memory/team.md` Forbidden の検証劇場。#2890 での無音退化。**#2289 で必ず触るファイル** |
| 2 | **validator / loader の述語不整合** | `IMPLEMENTATION_PATHS`（`amadeus-formal-verif-model-map.ts:248-251`）は `plugins/formal-model-check/tools/` を許可、`implementationRoot`（`tla-model-loader-internal.ts:291`）は `packages/framework/core/tools/` 固定 | 2026-08-11 から休眠中の契約違反。**#2929 の中核** |
| 3 | **3 つの別名 containment 述語** | `isCanonicalImplementationPath`（`amadeus-formal-verif-model-map.ts:330-336`）/ loader の `isContained`（`tla-model-loader-internal.ts:141-146`）/ `run-model-check-artifacts.ts:129` の `isContained`。census `git grep -n -F 'function isContained' -- plugins/ packages/ tests/ scripts/` → **2 定義 / exit 0**（validator 側は別名のため hit しない） | `cid:code-generation:cg2-agreeing-predicate-drift` |
| 4 | **sensor glob と model-map の被覆非対称** | 13 entries 中、自動発火は **9**（FormalElection 5 + MirrorLifecycle 4）。PrConvergenceGate 2 + BoltPrAttestationGate 2 = **4 entries は glob 外**。**本区間でまさにその 4 entries のハッシュが手動 resync された** | 検証の無音欠落 |
| 5 | **`authoringProvenance` の required / optional 非対称** | draft は必須（`tla-registration.ts:203-206`）、map スキーマは optional（`amadeus-formal-verif-model-map.ts:368` `OPTIONAL_MODEL_KEYS`）、実データは **1-of-4**（BoltPrAttestationGate のみ PRESENT） | #3263 が本区間で作った新しい非対称。**#2289 の未定義な裁定点** |
| 6 | **`AUTHORING_ROUTES` の 2 箇所複製** | census `git grep -n -F 'AUTHORING_ROUTES' -- plugins/ packages/ tests/` → **4 hit / exit 0**（定義 `tla-applicability.ts:302` / `tla-registration.ts:87`、消費 `:314` / `:110`） | `cid:code-generation:cg2-agreeing-predicate-drift` |
| 7 | **`landed` 語彙欠落が 2 モデルに同型** | `PrConvergenceGate.tla:14` と `BoltPrAttestationGate.tla:22-23` が逐語同一の `Verdicts` / `TerminalVerdicts` を持つ。census `git grep -c -F 'landed' -- amadeus/spaces/default/specs/tla/` → MirrorLifecycleAsImplemented 1 / MirrorLifecycleCore 3、**exit 0**（PR 系 2 モデルは 0 hit）。対照 `converged` → 各 5 / 5 / 1、**exit 0** | **#3186 のエビデンス基盤は題名の 1 モデルより広い** |

### 4. テスト空隙

| focus | 空隙 | 置き場（既存の対になる位置） |
|---|---|---|
| #2929 | **ローダー境界のテストが 0 件**。`git grep -c -F 'is not a regular in-boundary file' -- tests/` → **0 hit / exit 1**（不一致であってエラーではない）。対照 `outside the canonical implementation boundary` → `tests/unit/t-formal-verif-canonical-core.test.ts:1` / **exit 0** | 同 `t-formal-verif-canonical-core.test.ts`。**落ちる実証は 2 本必要**（validator は既存、loader は新規） |
| #3186 | **語彙 drift の検出テストが不在**（検出述語そのものが不在なので当然） | stage 契約の e2e である `tests/integration/t450-tla-authoring-stage-e2e.integration.test.ts` の近傍 |
| #2289 | **replace-by-name の成功系テストが不在**。存在するのは拒否側の pin（`tests/unit/t448-tla-registration.test.ts:294-307` の test `"refuses a draft that duplicates a registered name (validator on the whole map)"`）のみ | 同ファイル。**この pin は #2289 の実装で期待値が反転する** |
| #3187 | 退役側なので新規テストではなく **削除 2 / 期待値更新 7** | §3 の表（`code-structure.md` の対応節） |

**#2289 の実装で注意が要る点**: `tests/unit/t448-tla-registration.test.ts:294-307` の同名拒否 pin は `if (!snapshot.ok) return;` / `if (!draft.ok) return;` という早期 return を持つ。**parse が失敗するとアサーションを 1 件も実行せずに成功する形**であり、#1982 の zero-assertion ゲートが検出するクラスに構造上該当する（現在の台帳が zeroAssertion 0 件なのは、実行時に parse が成功しているためである）。`authoringProvenance` 必須化のような契約変更で fixture が parse できなくなると、**テストは赤くならず黙って通る**。#2289 の実装でこの pin を触るなら、早期 return を明示的な失敗へ変えるのが正しい形である。

### 5. 台帳の resync 実績（区間内）

| 台帳 | 規模 | 内容 |
|---|---|---|
| `tests/.coverage-registry.json` | +31 −3 | 新規テストファイルに対する regen |
| `tests/.coverage-ratchet.json` | +1 −1 | `function` **191 → 192** |
| `tests/.coverage-patch-allowlist.json` | +137 −21 | 意味的セレクタの再アンカー |
| `tests/.test-time-factor-allowlist.json` | **+138** | 新規 `tests/test-time-factor-census.md`（+38）を伴う |
| `tests/.silent-success-baseline.json` | **新規（160 行）** | #1982 |
| `amadeus/spaces/default/specs/tla/model-map.json` | +14 −6 | 実装ハッシュピン 6 件 + `authoringProvenance` 1 件 |

**本 intent が触る面から発火する台帳**（実装時の resync 対象）:

- `tests/` を触る → `tests/.coverage-registry.json` の regen（`bun tests/gen-coverage-registry.ts`、`cid:build-and-test:c1`）と **#1982 の 3 ゲート**
- `plugins/` を触る → `plugin.json` の `tools[]` 宣言と実ファイルの一致（t3078、blocking）
- `packages/framework/core/tools/amadeus-orchestrate.ts` / `amadeus-state.ts` を触る場合のみ → model-map の実装ハッシュピン 4 箇所（`cid:build-and-test:bt-ledger-resync`）。**focus 4 件はいずれもこの 2 ファイルを患部に持たないため、通常は発火しない**
- `packages/framework/harness/` の conductor 散文を触る → `tests/` の `toContain` pin（`cid:build-and-test:bt-prose-literal-test-ledger`。本区間でも 8 面が同期された）
