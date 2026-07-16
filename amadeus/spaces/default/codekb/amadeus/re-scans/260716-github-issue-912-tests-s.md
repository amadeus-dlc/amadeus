# RE スキャン記録 — 260716-github-issue-912-tests-s

## 実行メタデータ

- **base**: `e55cc25143717d84b3e7f1a543151f0b7c99b96f`(祖先性 `git merge-base --is-ancestor` exit 0 実測、HEAD の直系祖先。距離最小の指定 base を採用)
- **observed**: `8e8cc9b14d9c21e3e8282e3fdb6ae30db7f0f478`(`git rev-parse HEAD` 実測)
- **base..observed コミット数**: 37(`git rev-list --count e55cc25..HEAD`)
- **祖先性判定**: `git merge-base --is-ancestor e55cc25 HEAD` → exit 0(祖先で採用可)。`git merge-base e55cc25 HEAD` = base 自身を返す(base は HEAD の直系祖先)
- **手法**: diff-refresh(cid:reverse-engineering:c1、E-L63 の base 選定則)。フォーカス面は observed HEAD 実コード直読で file:line 確定。真実源は本ファイルと `inception/reverse-engineering/scan-notes.md`。
- **intent 目的**: Issue #912(bugfix)。t05 の planted-failure ケースが高負荷ホストで `--parallel 4` 下 120005ms タイムアウト間欠 FAIL(state=OPEN、labels=`bug / P3 / S4-MINOR`)。単独実行では 28 pass/0 fail(15.9s)、負荷収束後の再 `--ci` は PASS。「実行コード変更なし、負荷起因」の見立てを実測で裏付け、修正方向性を設計へ渡す。

## base 決定の実測根拠(E-L63)

指定 base `e55cc25` について HEAD 祖先性(`git merge-base --is-ancestor e55cc25 HEAD` → exit 0)と距離(`git rev-list --count e55cc25..HEAD` = 37)を実測し、祖先かつ距離最小の base として採用。base は HEAD の直系祖先(`git merge-base e55cc25 HEAD` が base 自身を返す)。

## 区間 diff 実測(base→observed、フォーカス面)

`git diff --stat e55cc25..HEAD -- tests/smoke/t05-run-tests-parallel.test.ts tests/run-tests.ts tests/run-tests.sh` = **空**。

| ファイル | 区間内変更(base..observed 37コミット) |
|---|---|
| `tests/smoke/t05-run-tests-parallel.test.ts` | なし(区間 diff 空) |
| `tests/run-tests.ts` | なし(区間 diff 空) |
| `tests/run-tests.sh` | なし(区間 diff 空) |

含意: 本 intent の観測面(t05・テストランナー本体・並列制御)は base..HEAD の37コミット区間で一切変化していない。以下の file:line は現行 worktree の行番号であり、Issue #912 実測(2026-07-11)時点のコードとバイト同一とみなせる(「実行コードに変更なし、負荷起因」という Issue 見立てと整合)。再検証時は上記 diff-stat が空であることを先に確認すれば行番号の再グラウンディング不要。

## フォーカス所見

### 1. planted-failure ケースの機序(`tests/smoke/t05-run-tests-parallel.test.ts`)

- 該当ケース = test 8「planted failure propagates under --parallel 4 (RESULT: FAIL, non-zero exit)」= **L411-438**。契約(コメント L406-410)= 「§6-E: the failure FIRES」= 本物の `not ok` が `--parallel 4` 下で SUMMARY を `RESULT: FAIL` に反転させ非ゼロ exit を返す(`run-tests.sh:818` の失敗伝播)。happy path では等価・強化にならないため実失敗の伝播を必須検証。
- 機序(L412-428): 冒頭で `tests/integration/tZZ-planted-fail-t05.test.ts` を `expect(false).toBe(true)` 本体で書き出し(L413-420)、`run(["--integration","--filter","t12-state|tZZ-planted-fail-t05","--parallel","4"])`(L422-428)を実行。`run()`(L104-125)は `spawnSync("bash",[RUNNER,...args])`(L113)で `bash tests/run-tests.sh` を入れ子 spawn。フィルタが2ファイルにマッチし、内側ランナーが各ファイルにつき `bun test` を更に spawn(二重 spawn: bun→bash→bun×2)。
- **120s タイムアウト定義箇所 = `const PER_TEST_TIMEOUT = 120000;`(L161)**。bun の per-test タイムアウトで `test(name, fn, PER_TEST_TIMEOUT)` の第3引数(test 8 は L438 で適用)。`run()` 内 `spawnSync` には `timeout` オプションが無い(L113-120 のオプションは `cwd`/`encoding`/`env`/`maxBuffer` のみ)。ゆえに 120s を食い切って FAIL させるのは spawnSync のプロセスタイムアウトではなく、外側 bun が test() 全体を 120s で打ち切る per-test timeout。内側ランナーは 120s に無頓着で走り続け、外側 bun が先にタイムアウトを宣告する構造。
- 二重 spawn の支配項: `tests/integration/t12-state-fixture-validation.test.ts` はヘッダ L16 に「zero tool spawn, zero LLM, zero tokens」と明記、spawn grep = 0。t12 側は軽量 in-process fixture 検証で、入れ子コストの支配項は run-tests.ts 起動オーバーヘッド + cold bun 起動 ×2 の直列化。高負荷時は CPU 待ちで伸び 120s 予算を超過。

### 2. run-tests.ts の並列制御(`tests/run-tests.ts`)

- 並列度既定 = 1(`args.parallel`、L163)。`--parallel|-P` は `/^[1-9][0-9]*$/` で正整数検証し `Number(value)` 代入(L223-233)。CPU 由来の自動決定は無い(nproc/os.cpus 参照なし)。
- worker プール = `runFileBand`(L839-862)。`serialFiles` 直列実行(L845)後、`effectiveParallel<=1` なら残りも直列(L846-849)。並列時は `Set<Promise>` スライディングウィンドウで `executing.size >= effectiveParallel` になったら `Promise.race`(L857-858)で1つ空くのを待つ素朴なセマフォ。各ファイルは `runBunTestFile`(L693)→`runSpawnCapture`(L647-691)→`spawn(cmd,cmdArgs,{cwd,env,stdio})`(L653-657)。
- テスト子プロセス spawn には timeout オプションが無い(L653-657)。既存 `timeout:` は補助 spawn 2箇所のみ(`commandExists` の `--version` プローブ `timeout: 30_000`、L360-363)で対象外。個々の `bun test` 子には時間上限が掛かっていない。
- 負荷適応機構: `grep -nE 'os\.cpus|loadavg|nice|AMADEUS_.*PARALLEL|settle|adaptive'` = NONE FOUND。load-average 参照・nice 降格・並列度の環境変数上書き・収束待ちの seam はいずれも不在。smoke/unit は L890 で強制直列だが、本件の内側ランナーは `--integration` なので `args.parallel=4` がそのまま効く。
- t05 は smoke 層(`tests/smoke/`)配置ながら 28 test を持ち複数ケースが per-test 120s(L161)を要求する重量級で、smoke 層(本来軽量ガード)では例外的に重い。これが「smoke 段で 1 fail により全体 abort」(Issue 実測)の被害拡大要因。size ドリフトガードの発火有無は本スキャン範囲では未確認(修正方針判断には非必須)。

### 3. 先行修正3クラス(#819 / #831 / #877、参考 #741)

- #819(`e9c49a4ae`): case 15 が `-P 8` フル負荷でフレーク(linter sensor が実 eslint spawn、`amadeus-sensor.ts:470`、Findings 1→0 間欠)。対策 = (a) --ci 段で spawn を hermetic stub 化(`AMADEUS_T92_FINDINGS` 注入で両極決定化)、(b) 実 eslint ラウンドトリップを assertion 同一のまま `tests/e2e/t92-linter-eslint-roundtrip.test.ts`(--release 段)へ物理移設 = 重い入れ子 spawn を高頻度 tier→低頻度 tier へ隔離。#912 に最も近い(重い入れ子 spawn が高負荷で予算超過)。ただし #912 の入れ子は外部プロセスでなく run-tests.sh 自身の再帰。
- #831(`f09e84128`): t76 が並列で共有 audit-lock 競合によりフレーク。対策 = run 毎に `AMADEUS_LOCK_BASE_DIR` でロック基底を隔離 = 共有リソース競合の分離(タイムアウトではなく競合)。
- #877(`8922e8002`): in-process の clone-id/audit-shard キャッシュを test 間でリセット = プロセス内共有状態のリセット。
- 参考 #741(`fd4009671`): t90 test 13 の wallclock 順序依存を固定定数へ置換して負荷下決定化 = タイミング依存の除去。
- 整理: #831/#877/#741 は「競合/共有状態/タイミング依存」を断つ決定化、#819 は「重い入れ子 spawn を tier 移設で隔離」。#912 は #819 型だが隔離先が「別 tier」か「spawn 除去」かで手が分かれる。

### 4. 修正3案の実現可能性評価

- 案A(タイムアウト負荷適応): `PER_TEST_TIMEOUT`(L161)を環境変数(例 `AMADEUS_T05_TIMEOUT_MS`)で延伸可能に、または run-tests.ts の spawn(L653)へ `timeout` 配線。実現可能性 **中**。surgical(1定数)だが症状を隠すだけで根本(入れ子コストの負荷依存)は残る。延伸は真の hang 検出も遅らせるトレードオフで、ノルム P2(検証劇場回避)と緊張。単独では非推奨、安全網に留めるのが妥当。
- 案B(#819 型の tier 隔離): 重い入れ子 spawn ケースを smoke→e2e/--release へ物理移設、assertion 同一で温存。移設先の cli-spawner 登録(EXPECTED_NONE_TO_CLI)+ coverage registry 再生成が必須(integration-registry-regen ノルム)。実現可能性 **中〜高**。前例確立・手順明文化済みだが t05 の「smoke tier の parallel 契約ガード」から失敗伝播ケースだけ切り出すとケース分割で設計意図がやや分散。有効だが構造分散のコスト。
- 案C(入れ子 spawn 分離/削減 — 本命): (c1) test 8 のフィルタを `t12-state|tZZ-planted-fail-t05`→`tZZ-planted-fail-t05` 単独へ絞り、入れ子で走る bun test を2本→1本へ半減(L422-428 の1行 diff、契約=失敗反転は planted 1本で完全保存)。t12-state は失敗伝播契約に非寄与(interleaving 契約は別ケース test 6 = L334-365 が既にカバー)。(c2) 併せて内側 `--parallel 4` を削るか環境変数上書き seam(run() 経由)で CI 時 1 に落とす。実現可能性 **高**。最小・surgical で入れ子コストの支配項(cold bun 起動数)を直接削減、副作用リスク最小。ただし「--parallel 4 下の並列 race」観点をどこまで残すかは要件で確定すべき。
- 総合: 案C を主軸に、必要なら案A を安全網併用が bugfix スコープ内で surgical かつ根本に効く。案B は前例強だが構造分散コストあり、案C 不足時の代替。最終選択は requirements/選挙で確定。
- 入れ子 spawn なしで同契約を検証できる構造の実在可能性: 集計反転ロジック(SUMMARY 生成 = `run-tests.sh:809-824`)を fixture/直接呼びで検証する seam があれば入れ子 spawn 全廃可能だが、`run-tests.sh` は bash スクリプトで in-process seam を持たず(t05 冒頭 L11-19「Mechanism: cli … nothing to import」)、現状 CLI 境界でしか観測面が無い。直接呼び化は run-tests.sh の TS 化/ロジック抽出を要し bugfix スコープを超える。

### 5. E-L71(fanout-load-settle)との関係

E-L71(team norm、`3392f962a`/#913 で persist)=「fan-out 直後のフルスイート統合検証はホスト負荷収束を待つか並列度を落とす」は運用手順であって、テストコード側に「負荷収束待ち/並列度低減」を強制する seam は現状不在(上記 NONE FOUND が裏付け)。構造化余地: (a) 内側ランナー呼び出しの `--parallel` を環境変数で上書き可能にする seam(run() 経由)、(b) run-tests.ts の spawn(L653)に timeout オプションを配線し子の暴走を loud に打ち切る seam。いずれも現状は配線ゼロからの新設。

## CodeKB 更新表

| 成果物 | 更新 | 内容 |
|---|---|---|
| `code-structure.md` | 追記+relabel | 「t05 並列フレーク観測面 — 260716-github-issue-912」節を H1 直後に新設(planted-failure 機序 / 並列制御の実態 / 先行修正3クラス / 修正3案評価)。旧「harness port 開放性の観測面」節の「最新」→「履歴」降格(c3-relabel) |
| `reverse-engineering-timestamp.md` | 追記+relabel | 「最新: 260716-github-issue-912-tests-s」メタデータを先頭新設。旧「最新: 260715-opencode-cursor-harness」→「履歴」ラベル化 |
| `re-scans/260716-github-issue-912-tests-s.md` | 新規 | 本ファイル |

## 温存判断(churn 回避、cid:reverse-engineering:c1)

architecture / business-overview / api-documentation / component-inventory / technology-stack / dependencies / code-quality-assessment の **7点は温存**。判定根拠: フォーカス3ファイルの区間 diff は空で、本 intent 観測面(t05 planted-failure 機序・並列制御・負荷適応 seam 不在)は挙動欠陥・構造変化を伴わない(Issue #912 は「実行コード変更なし、負荷起因」)。body 成果物への追記は churn。

## 未解決ギャップ(設計判断へ持ち越し)

1. **修正案の最終選択**: 案C(フィルタ最小化)を主軸とするか、案A の env seam を安全網併用するか、案B の tier 隔離とするか。requirements/選挙で確定。
2. **`--parallel 4` 下の並列 race 観点の保存度**: test 8 で planted 単独に絞る場合、interleaving/並列度2以上の race 観点を test 6(L334-365)のカバレッジで十分とみなすか、planted+t12 を残すか。
3. **負荷適応 seam の新設要否**: run-tests.ts spawn(L653)への timeout 配線や `--parallel` 環境変数上書き seam を本 intent スコープに含めるか(bugfix スコープと surgical 性のトレードオフ)。
