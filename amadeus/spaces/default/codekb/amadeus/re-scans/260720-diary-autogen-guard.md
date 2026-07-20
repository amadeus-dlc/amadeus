# re-scan 記録 — 260720-diary-autogen-guard

## 実行メタデータ

- Date: 2026-07-20(Asia/Tokyo)
- Intent: `260720-diary-autogen-guard`
- Issue: [#1279](https://github.com/amadeus-dlc/amadeus/issues/1279)
- Scope / project type: `bugfix` / Brownfield
- Repository / stage: `amadeus` / `reverse-engineering`(2.1)
- Base commit: `a326f47bc0146a3b4285552f42b92fd61fb343a7`(worktree merge-base = origin/main)
- Observed commit: `0b11036d5d990c9f5de98dc172222d8e2df4928a`(現 HEAD、engineer-1 worktree)
- 測定 ref: 特記なき件数・実値は Observed=HEAD `0b11036d5` の engineer-1 worktree 実測(measurement-ref-in-artifacts 準拠)。intent-dir 件数はコマンド出力からの転記(numbers-from-command-output-only)。
- 環境固有バグのため走査は engineer-1 conductor 環境内でのみ実施(cwd 変更・checkout/stash/reset・record/state 書換 verb は不使用)。計装は scratch の read-only probe のみ(正本・配布コピー未改変、instrumentation-syntax-check 準拠)。
- Focus: stage diary 自動生成が e1 でのみ不発になる #1279 の chokepoint(`amadeus-orchestrate.ts:1168-1172`)入力2枝(recordPrefix / codekbCtx)の全導出経路と、時間依存で変わる可変状態(cursor / CLAUDE_PROJECT_DIR / 多 intent 環境)の対応付け。
- 実施体制: Developer code scan(本記録)→ Architect synthesis(後続)。

## 観測行列(確定済み一次データ — 転記)

| 発行 | 時刻(UTC) | 経路 | diary 自動生成 |
|---|---|---|---|
| 260719-goa RE | 07-19 14:33頃 | birth→next | ✅ 生成 |
| 260719-tally RE | 07-19 22:28頃 | birth→next | ❌ 不発(Architect が dir 不在を報告) |
| 260719-tally RA/CG/B&T | 07-19 22:4x〜23:4x | unpark→report(approve)→next | ❌ 不発(conductor が `[ -f ]||cp` で作成) |
| 260720-ballot RE〜B&T | 07-20 00:1x〜01:3x | 同上 | ❌ 不発 |
| **260720-diary-autogen RE** | **07-20 02:48頃** | **birth→next** | **✅ 生成(921B template、ls 実測済み — 本 intent 自身が live プローブ)** |

- e3 環境(engineer-3、同日・同スコープ、cursor=`260720-leader-store-sync`・intent-dir 53件)は全ステージ ✅(クロスレビュー対照)。
- e4 実測: template は e1 の全4ハーネスツリーに実在(template-missing 枝は除外済み)。本走査でも `.claude/knowledge/amadeus-shared/memory-template.md`=921B 実在を確認。

## 結論(根本原因)

**確定した機構(read-only probe で決定的に再現):** diary 自動生成の可否は chokepoint の guard `if (recordPrefix !== null && codekbCtx) ensureStageDiary(...)`(`amadeus-orchestrate.ts:1172`)で決まり、**❌ 枝は例外なく `recordPrefix === null`**。`codekbCtx` は実 `next` 経路では常に truthy(下記で除外)なので、`codekbCtx` falsy 枝は原因ではない。

`recordPrefix === null ⟺ activeIntent(pd) === null`(`relativeRecordDir` は `activeIntent` が null のとき null を返す — `amadeus-lib.ts:1223-1225`)。e1 は intent record dir が **46件**あり `activeIntent` の lone-intent fallback(`records.length === 1`、`amadeus-lib.ts:1080`)は決して発火しない。よって e1 では **`activeIntent` の解決は `active-intent` cursor の解決に完全依存**し、当該 `next` 実行時に cursor が「実在 record を指していない」瞬間だけ null になる。

**pd(projectDir)の解決が本質の可変軸:** `.claude/settings.json:38` の許可 `Bash(bun $CLAUDE_PROJECT_DIR/.claude/tools/*)` が示すとおり、conductor はエンジンを `bun $CLAUDE_PROJECT_DIR/.claude/tools/amadeus-orchestrate.ts` として起動する。`resolveProjectDir`(`amadeus-lib.ts:211-235`)の優先順位は **①--project-dir ②`CLAUDE_PROJECT_DIR` env ③script-path 派生 ④cwd** で、②が③より先に効くため、**エンジンの pd は当該セッションの `CLAUDE_PROJECT_DIR` に支配される**。`CLAUDE_PROJECT_DIR` が cursor 解決不能なツリー(例: main checkout=cursor 不在+intent-dir 42〜53件、あるいは nested Bolt worktree=cursor 不在)を指すと `activeIntent(pd)=null → recordPrefix=null → diary 無音 skip`。

**環境固有性の理由:** goa(✅)・diary-autogen(✅)時は pd/cursor が正しく解決(cursor が当該 intent を指す worktree)。tally・ballot(❌)時は pd/cursor が解決不能だった(セッション再起動・Construction の nested worktree・完了跨ぎの cursor lifecycle などで `CLAUDE_PROJECT_DIR` または cursor が別ツリーへ振れた)。e3 が全 ✅ なのは e3 のセッションが一貫して e3 worktree(cursor 解決可)を pd に解決していたため。intent 件数(多 intent)は e1/e3 共通で、**差は cursor 解決の信頼性**にある。

**設計欠陥(要件関連の中核):** diary chokepoint の guard `recordPrefix !== null` は2つの本質的に異なる状況を無音で混同する。
- (正当な skip)birth 前シェル: intent が存在しない → skip が正しい。
- (バグ)intent は実在しアクティブだが `activeIntent(pd)` が上記条件で null → **本来生成すべき diary を無音 skip**。

guard は「書き込み先 intent が無い」と「intent はあるが cursor/pd が解決しなかった」を区別できず、しかも skip は **無音**(chokepoint コメント「guard skip は無音」)。template-missing 枝は stderr 警告を出す(`amadeus-lib.ts:1121`)のに対し、本 skip は警告すら無い。

**非対称性(なぜ diary だけ落ちるか):** audit / report / state 系(`amadeus-audit.ts:433` の `--intent <record>` セレクタ、`amadeus-state.ts` の verb)は**明示 intent アンカー**を持ち cursor に依存しない。実測: 260719-tally の STAGE_STARTED / reverse-engineering audit イベントは **tally の正シャード**(`260719-tally-choice-ruling/audit/j5ik2o-mac-studio-lan-3840fc2e3ce2.md:144-194`)に着地しており、report/audit 時点では intent 解決が正しかった。一方 `next` の diary 生成経路は `activeIntent(pd)` の ambient cursor 解決のみに依存し、明示 intent override を持たない。この非対称が「audit は正シャード・diary だけ不発」という観測を生む。

**codekbCtx 除外の根拠:** `codekbCtxFor(pd)`(`amadeus-orchestrate.ts:889-891`)は常に object を返し、実 `next`/jump/birth-emit 経路(:1447 / :2375 / :2412 / emitForSlug :1870,:1896)ではすべて truthy な codekbCtx を渡す。undefined になるのは ctx-less な test/default 呼び出しのみ。よって実運用の ❌ 枝は `recordPrefix===null` 一択。

## 決定的再現(scratch read-only probe)

`resolveProjectDir` を経由せず lib の read-only 解決子(`activeSpace`/`listIntentDirs`/`activeIntent`/`relativeRecordDir`)を pd 別に評価(scratchpad、bun build 構文検証済み、書込なし):

| pd | space | recordDirs | activeIntent | recordPrefix | diary |
|---|---|---|---|---|---|
| e1 worktree(現 ✅ 状態) | default | 46 | `260720-diary-autogen-guard` | `amadeus/spaces/default/intents/260720-diary-autogen-guard` | **FIRES ✅** |
| main checkout(cursor 不在) | default | 42 | `null` | `null` | **SKIPPED ❌** |

同ツリー・同コードで pd 差だけで ✅/❌ が決定的に反転することを実証。さらに実エンジン `bun .claude/tools/amadeus-orchestrate.ts next`(pd=e1 worktree)は現在 `memory_path=.../260720-diary-autogen-guard/inception/reverse-engineering/memory.md` を正しく発行(✅ 再現)。

## chokepoint 入力の全導出経路

| 入力 | 導出(file:line) | null/falsy 条件 | 時間依存の可変状態 |
|---|---|---|---|
| pd | `resolveProjectDir` `amadeus-lib.ts:211-235` | — | **`CLAUDE_PROJECT_DIR` env(優先②)** / cwd / --project-dir |
| recordPrefix | `relativeRecordDir(pd)` `:1217-1226` → `activeIntent` `:1059-1084` | activeIntent===null | active-intent cursor 内容 / listIntentDirs 件数(≠1) |
| activeIntent | cursor(`:1069-1076`)→ lone-intent(`:1080`)→ null | cursor が listed record 非該当 **かつ** records≠1 | **cursor ファイル(gitignored per-user)** / 各 record の `amadeus-state.md` 実在 |
| space | `activeSpace(pd)` `:990-1001` | 常に default fallback(throw せず) | `active-space` cursor |
| codekbCtx | `codekbCtxFor(pd)` `:889-891` | 実経路では never falsy | (該当なし) |

`activeIntent` の cursor 判定は `isRealRegularFile`(`lstatSync`、symlink 非追従、`:964-970`)と `isRealDirectory`(`lstatSync`、`:956-963`)を使う。path 構成に symlink が挟まると解決不能になりうるが、本走査では e1 の `amadeus/`〜`intents/` に symlink は無し(実 ls 確認)。

## 復元推定(過去 ❌ 時刻との差分)

- git 履歴では確定不能な項目(**推定**): `active-intent` cursor は gitignored per-user かつ `CLAUDE_PROJECT_DIR`・cwd はランタイム未ログのため、tally/ballot の各 ❌ `next` 時点の pd/cursor 実値は**実測不能・推定**。mtime forensics も無効(worktree checkout でファイル mtime が最近時刻に均一化、state と diary が同一 checkout 時刻)。
- git で確定した事実: (a) chokepoint(#1088 `a815ec4b1`)は e1 base(`a326f47bc`)に既在 → stale-code 仮説は棄却(executed `.claude/tools/` コピーにも chokepoint 実在)。(b) 260719-tally の RE audit は tally 正シャードに着地(report/audit 時点の intent 解決は正)。(c) flat-fallback 漏出無し(`amadeus/spaces/default/amadeus-docs/` および flat `amadeus-state.md` いずれも不在)→ recordPrefix-null の他成果物書込は本ツリーには漏れていない(diary 経路のみが ambient-cursor 依存で単独脆弱)。
- 関連(別バグだが cursor lifecycle の脆弱性を裏付け): engineer-2 branch の #1258 `c499c1efb`「intent 完了時に active-intent カーソルを解放し完了済み intent への監査追記を抑止」。**e1 tree には未取込**(grep hit 0)なので #1279 の直接原因ではないが、cursor が完了跨ぎで stale/解放されうる同族の脆弱性を示す。

## 交差目録(並行 intent)

- 想定修正面: `packages/framework/core/tools/amadeus-orchestrate.ts`(chokepoint :1168-1172)、`packages/framework/core/tools/amadeus-lib.ts`(`relativeRecordDir`/`activeIntent`/`ensureStageDiary`)。dist×6・self-install 再生成面が従属(installer 同期)。
- 他 member worktree(engineer-2〜6)の当該2ファイルへの最近コミット(read-only 実測): `2ecf7208f`(#1208)/`69b2e1d40`(#1153)は全 member 共通の既在。engineer-2 のみ `c499c1efb`(#1258、上記)が当該ファイルに追加 — **`amadeus-lib.ts` の cursor/complete 面で交差の可能性**があり、修正時は #1258 との衝突・整合を要確認(非交差判定は実 diff で再評価、c6 準拠)。scripts/・team-ops 面は本走査対象外だが、chokepoint 修正は core 中立層に閉じるため scripts 交差は想定薄。
- 既存テスト面: `tests/integration/t-ensure-stage-diary.test.ts`、`tests/integration/t72-stage-reverse-engineering.test.ts`、`tests/unit/t201-runtime-graph-memory-path-record-dir.test.ts` が diary/memory_path を被覆。回帰テストはこれらの近傍に置く(fs 実使用は integration 層、fs-tests-integration-first 準拠)。

## Architect / requirements への未決点

1. **修正方針(設計判断・未決)**: 候補は (a) `recordPrefix===null` skip を**無音から loud へ**(template-missing 同様の stderr 警告)、(b) intent 実在時の null 解決を**エラー扱い or 再解決**、(c) diary 経路に audit 同様の**明示 intent アンカー**を導入、(d) pd 解決を `CLAUDE_PROJECT_DIR` より script-path 優先へ変更(影響範囲大)、(e) cursor lifecycle 堅牢化(#1258 と統合)。いずれも要件・設計での裁定事項。後方互換シム追加は Forbidden、既定は古挙動置換。
2. **「pre-birth 正当 skip」と「バグ skip」の識別契約**: guard が両者を区別できる観測可能条件(intent-dir 実在・state 実在・cursor 状態等)を要件でテスト可能に固定する必要。
3. **残る不確定(実測不能・推定)**: 各 ❌ 時点の `CLAUDE_PROJECT_DIR`/cwd/cursor 実値。要件では「pd/cursor がどの状態でも intent 実在時に diary を確実生成する」不変条件として定義し、再現条件(多 intent + cursor 非解決 pd)を注入する落ちる実証テストを要求する。
4. **e3 対照の確定用途**: e3 が全 ✅ である事実は「多 intent 単独では不発しない」ことの対照。要件の受入基準に「多 intent 環境で cursor 解決可なら常に ✅」を明記可能。
