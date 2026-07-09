# Requirements — #699 テストサイズの継続的動的計測(dynamic-test-size)

> ステータス: 確定(明確化質問 Q1〜Q4 は選挙で全問 A 採択 — 2026-07-09、4票全会一致。`requirements-analysis-questions.md` 参照)
> 起草: amadeus-product-agent ペルソナ(conductor: claude-engineer-1)
> 上流: GitHub Issue #699(#684 Phase D)、前提再点検記録(#699 comment 4929651967)、codekb(business-overview.md / architecture.md / code-structure.md、2026-07-10 diff-refresh)

## 1. Intent 分析

### 目的(ゴール)

テストピラミッドの軸である **test size(small/medium/large)** を、注釈と静的分類(#696/PR #700 で導入済み)だけでなく**実測に基づいて継続的に検証可能**にする。具体的には:

1. runner が既に計測している per-file wall-clock(`tests/run-tests.ts:724/762`、root JUnit `time`)を**永続化**し(現状は `aggregateTierResults`(`run-tests.ts:430`)で `.meta` ごと削除され経路ゼロ — codekb/architecture.md「ランナー計測ライフサイクル」)、
2. 実測値と宣言/静的分類の **drift を検出**して CI で可視化し、
3. 将来の真の動的観測(Linux strace/eBPF 等)を**接ぎ木できる形**にする。

これは #684(テストピラミッド is size, not directory)の最終フェーズ D であり、#683(Codecov の size 軸 coverage)へ derived size を渡す供給側を完成させる。

### 背景制約(なぜ「継続的・動的」か)

- 真の動的 spawn/FS/network 観測は Bun test preload では発火せず、macOS DTrace は SIP で不可(#684 comment 4924008283 実測、`tests/lib/test-size.ts:11-12` に既存判断として記録済み)。
- #696 の静的分類器は「静的シグナルのみ」で実装され、**wall-clock 軸は Phase D(本 intent)へ明示的に移管**された(`test-size.ts:34` "minus the wall-clock axis, which is dynamic (Phase D)")。
- よって本 intent の「動的」の第一実体は **wall-clock 実測**であり、DTrace/preload 級の syscall 観測は任意バックエンド(Q4)。

## 2. 機能要件(FR)

### FR-1: per-file 実測メタデータの収集(既存計測の活用)

- runner の per-file 実行で得られる wall-clock(root JUnit `time`、秒 float)を、テスト実行の副産物として収集する。**新しい計測メカニズムは導入しない**(既測値の活用)。
- 収集粒度は per-file(Issue AC「結果は per-file metadata に出る」)。per-test 粒度はスコープ外。
- テスト可能条件: `bash tests/run-tests.sh --ci` 実行後、全実行対象ファイルについて `{file, duration}` が永続化先(FR-3)に存在する。例外: レポート構築時点で source が読めない、または duration が欠落/NaN のファイルは、偽データを捏造せず stderr に痕跡を残して除外する(advisory 経路での検証劇場回避 — functional-design レビューで顕在化した要件の絞り込み、2026-07-10 反映)。

### FR-2: 実測と宣言/静的分類の drift 検出

- 各 test file について「宣言 size(`// size:` 注釈、無ければ静的分類値)」と「実測 wall-clock が示す size 帯(FR-4 の閾値)」を突き合わせ、実測帯 > 宣言帯 の file を drift として検出する。
- 静的 drift guard(`tests/unit/t-test-size-drift.test.ts`)とは独立に動作し、静的 guard の契約を変更しない。
- 分類器の出力形状 `SizeClassification { size, signals }`(`test-size.ts:42-45`)は安定契約として保ち、動的観測は**壊さず重ねる**。
- テスト可能条件(Issue AC 準拠、使用バックエンドで検出可能な形態に限定): 赤 fixture(例: `// size: small` 宣言 + 実測 ≥ small 帯上限の sleep/処理)で drift が検出され、緑 fixture(pure in-process・帯内)では検出されない — 両方を実証してから完成扱い(team.md Mandated「落ちる実証」)。

### FR-3: 永続化と CI artifact/registry 化(選挙 Q1=A で確定)

- 実測メタデータ+derived size+drift 判定結果を、runner 実行ごとに機械可読形式で永続化する。
- 永続化先: **新規 JSON レポートファイル**。runner が per-file `{file, scope, staticSize, declaredSize, duration, signals, drift 判定}` 相当を書き出し(正確なスキーマは functional-design で確定)、CI(`ci.yml`)で artifact として upload する(既存 coverage artifact のパターン `ci.yml:75-84` を踏襲)。
- coverage registry(`tests/gen-coverage-registry.ts`)は拡張しない(`covers:` 軸と変更理由が異なる)。`.meta` の削除契約(`run-tests.ts:430`)も変更しない。
- summary matrix(scope×size)に動的実測の情報を反映する(Issue AC「summary matrix に出る」)。既存 `printSizeMatrix`(`run-tests.ts:895-948`)の exit-code 隔離契約(`:882-886`、t112 が固定)を踏襲する。
- テスト可能条件(JSON レポート): `--ci` 実行後にレポートファイルが存在し、実行された全 test file の行を含み、JSON として parse 可能。CI 上で artifact として取得可能。
- テスト可能条件(summary matrix 反映): `--ci` 実行後の標準出力の summary matrix に、動的実測由来の情報(最低限、wall-clock drift の検出件数 — 例: drift 列または drift 件数行)が現れる。drift ゼロの実行でも「0」が表示される(表示経路自体の検証可能性を保つ)。

### FR-4: size↔wall-clock 帯の定義(選挙 Q3=A で確定)

- 閾値帯: **codex-3 実測ルール**(#684 comment 4924008283、329 ファイル実測由来)を採用する — small は <1s、large は ≥30s(または timeout)、medium はその間。
- 閾値は単一定義(canonical 1定義から導出、construction ガードレール準拠)とし、drift 検出(FR-2)と summary(FR-3)の双方が同じ定義を消費する。

### FR-5: 執行姿勢(選挙 Q2=A で確定)

- wall-clock drift の CI 上の扱いは **advisory(段階導入)**: drift はレポート(FR-3)へ記録し summary matrix に表示するが、CI を赤くしない。ゲート昇格(CI 赤化)は実測分布の安定を確認した後続 Issue で判断する。
- 根拠: 実測分布の分散(unit p95=2.0s vs max=11.1s)により即ゲートは flake 源。静的 drift guard が既に CI 赤を担っている。
- advisory であっても、検出結果は実行結果から導出する(検証劇場の禁止 — team.md Forbidden)。赤/緑 fixture の実証(FR-2)は advisory 検出ロジック自体に対して行う。

### FR-6: 観測バックエンドの拡張点(選挙 Q4=A で確定、付帯条件あり)

- 観測バックエンドの **seam(interface)を設計**し、strace/eBPF の実装は後続 Issue とする。
- **付帯条件(選挙で採択)**: seam は現行 wall-clock バックエンドを**初回消費者**として実装する — 消費者ゼロの拡張点を作らない(どのコードも消費しないフィールド/インターフェースの禁止 — construction ガードレールと整合)。すなわち FR-1〜FR-3 の wall-clock 経路自体が seam 越しに動くこと。
- macOS DTrace を前提にしない(Issue AC)。

## 3. 非機能要件(NFR)

- **NFR-1(runner 契約の不可侵)**: runner の exit code == failed-file 数の契約(t112 固定)を一切変更しない。動的計測・レポートの失敗が runner を失敗させない(既存 `try/catch` 隔離、`run-tests.ts:882-886` と同格)。
- **NFR-2(t112 コピー伝播)**: `tests/run-tests.ts` に加える新規 static import は、t112 の scratch runner tree コピーリスト(`tests/integration/t112.serial.test.ts:91-94`)へ同一 PR 内で伝播する。
- **NFR-3(CI 実行可能性)**: すべての新規検査・レポートは特権不要で、GitHub Actions ubuntu-latest(`ci.yml:22`)および macOS ローカルの双方で動作する。
- **NFR-4(オーバーヘッド)**: 既測値の集約のみで新規計測プロセスを追加しないため、`--ci` 全体所要時間への追加は集約・書き出しコスト(1回の JSON 書き出し規模)に限る。
- **NFR-5(カバレッジ盲点)**: 新規ロジックは in-process seam(関数直接呼び出し)でテスト可能に設計する(bun --coverage の spawn 盲点是正 — team.md Corrections)。

## 4. 制約

- #696 成果物(分類器・注釈スキーマ・静的 drift guard・printSizeMatrix)を重複実装しない(Issue 境界補正)。
- `dist/<harness>/` は手編集禁止。`core/`/`harness/` を触る場合は `bun scripts/package.ts` + `bun run promote:self` を同一コミットに含める(該当する場合のみ — 本 intent の主対象は `tests/` 配下で dist 非対象の見込み)。
- 検証コマンド基準: `bun run typecheck` / `bun run lint` / `bun run dist:check` / `bun run promote:self:check` / `bash tests/run-tests.sh --ci`(team.md Testing Posture)。
- 後方互換レイヤー・移行シムを導入しない(team.md Forbidden)。

## 5. 前提(Assumptions)

- root JUnit `time` の per-file wall-clock は drift 検出の入力として十分な精度を持つ(codex-3 の 329 ファイル実測がこの値で分布を得られた実績)。
- CI マシンの実行時間分散は存在する(p95 と max の乖離 — #684 実測分布)。執行姿勢(FR-5)はこの分散を織り込んで決定される。
- #683(Codecov size 軸)は本 intent の成果物(derived size の permanent な供給源)を消費する別 Issue であり、Codecov 側の設定は本 intent に含まない。
- timer/sleep シグナル(静的分類器の `timer` シグナル、`test-size.ts:39`)の動的観測対象化について: timer/sleep の実行時間影響は wall-clock 計測(FR-1)に自然に包含されるため、動的側で個別の timer 検出分岐は設けない(前提再点検 comment 4929651967 の明示要求へのクローズ。静的側の `timer` シグナルは #696 実装のまま不変)。

## 6. スコープ外

- #696 で導入済みの初期注釈配線・静的分類器の再実装/変更(バグ修正を除く)。
- per-test 粒度の計測、テストの物理移設、比率目標(Small≥90)の hard gate 化(= #697 系)。
- Codecov の project/patch gate 閾値・LCOV path-fixing(= #683)。
- macOS での syscall 級観測(DTrace/preload — 実測で不可と確定済み)。
- strace/eBPF バックエンドの実装(Q4 で A が採択された場合。B 採択なら FR-6 を実装スコープへ昇格)。

## 7. 未解決事項(Open questions)

- `size:` 選択フィルタ(#696 スコープ項目5、#700 未実装)は本 intent のスコープ外(#699 AC に含まれない)。必要になった時点で別 Issue として起票する。
- Q2=A の帰結として、advisory の実測分布が安定した後のゲート昇格判断(閾値の余裕係数を含む)は後続 Issue の論点。
