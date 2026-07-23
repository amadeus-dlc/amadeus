# Doctor in-process seam — Business Rules

## 入力と適用範囲

本ルールは `requirements.md` の互換性・テスタビリティ要件を、
`doctor-inprocess-seam` unit の実装不変条件へ変換する。診断項目そのものの
業務ルールは変更せず、core、context resolver、CLI wrapper の境界だけに適用する。

## 実行ルール

### BR-1: exit code は診断失敗数から決める

- `failed === 0` のとき `exitCode` は `0`
- `failed > 0` のとき `exitCode` は `1`
- check の通常失敗を例外として表現しない
- CLI wrapper が独自に exit code を再計算しない

### BR-2: output は既存 CLI と同値である

- header、check 行、fix 行、区切り、集計行の順序を維持する
- 最終改行を含む既存の文字列契約を維持する
- core は完全な1つの `output` 文字列を返す
- wrapper は文字列を加工せず1回だけ stdout へ書く

### BR-3: core は process 制御を行わない

- `handleDoctor` 内から `process.stdout.write`、`process.stderr.write`、
  `process.exit` を呼ばない
- context 構築後に `process.platform`、`process.env`、session cwd、
  `harnessDir`、`rulesSubdir`、graph/rule/agent/scope loader を直接・間接に再読しない
- doctor local helper が同じ値を必要とする場合は context field を引数で渡す
- process 制御は `runUtilityMain` の doctor arm に限定する

### BR-4: context は実行中に不変である

- harness、main checkout、graph、env 由来値は実行開始時に確定する
- 同じ doctor run の途中で graph/cache の内容を再ロードしない
- loader 戻り値は `structuredClone` で cache alias を切る
- clone の nested array/object と outer context を再帰 freeze する
- test context と production context は同じ必須 field を満たす
- test 専用 boolean や production 分岐を context に追加しない
- 既存 TOCTOU 安全性テストの swap target は例外として任意 field に保持できる。
  resolver だけが `NODE_ENV` を読み、production では `undefined`、test では
  対象 path の snapshot を渡す。core は test mode や `NODE_ENV` を知らない

### BR-5: doctor 固有の副作用は維持する

- stale audit lock cleanup は従来どおり実行する
- 既存 audit shard がある場合だけ `GUARDRAIL_LOADED` と
  `HEALTH_CHECKED` を追記する
- pristine checkout では doctor 実行を理由に audit を新規作成しない
- audit、cleanup、check の既存順序を変更しない

### BR-6: 例外分類を変更しない

- 現在 check 単位で catch される回復可能な読取・解析失敗は、診断失敗行へ変換する
- audit write 等、現在伝播する致命的失敗は握りつぶさない
- wrapper は例外から偽の `DoctorRunResult` を合成しない
- output 完成前の fatal は stdout なしで original error を再throwする
- output 完成後の `HEALTH_CHECKED` fatal は `DoctorPostOutputError` で output を運び、
  wrapper が full stdout を1回書いて original cause を再throwする
- fatal 経路では明示 `process.exit` を呼ばず、Bun の status 1 と stderr rendering に委ねる
- empty catch や新しい silent fallback を追加しない

### BR-7: 依存注入は限定する

- context に含めるのは platform、stage graph、rule/agent/scope catalog、
  artifact name union、main checkout、harness/rules subdir、doctor が直接読む env snapshot、
  1 run の鮮度判定時刻、既存 TOCTOU 検証 seam の任意 target
- FS、Bun subprocess、audit writer、clock を包括 port へ包まない。clock は
  callback で注入せず、resolver が `Date.now()` を1回だけ読み `nowMs` として固定する
- lock cleanup subsystem 内の timeout/temp-dir env は既存 subsystem の ambient 入力として維持し、
  doctor routing/catalog の決定性対象には含めない
- 既存 helper を context のためだけに複製しない
- 複数の call site が必要としない抽象を追加しない

### BR-8: 二層テストを維持する

- in-process テストは core の分岐・戻り値・副作用を検証する
- spawn テストは CLI argv、cwd、stdout、exit、配布物契約を検証する
- spawn テストを line coverage の代替にしない
- 新規・変更 doctor 行は in-process 実行で patch coverage 100% を満たす

## 判定表

| 条件 | core の結果 | CLI の動作 |
|---|---|---|
| 全 check 成功 | `{ exitCode: 0, output }` | output を書き exit 0 |
| 1件以上の通常診断失敗 | `{ exitCode: 1, output }` | output を書き exit 1 |
| check 内で回復可能な読取失敗 | 失敗行を含む `{ exitCode: 1, output }` | output を書き exit 1 |
| 既存 audit なし | audit を作らず通常結果 | 通常どおり output/exit |
| stale lock 検出 | cleanup 結果を診断へ含める | 通常どおり output/exit |
| output 完成前の致命的例外 | 結果を返さず original error | stdout なし、stderr に原因、status 1、明示 exit なし |
| `HEALTH_CHECKED` の致命的例外 | `DoctorPostOutputError` | full stdout、cause を stderr、status 1、明示 exit なし |

## 入力不変条件

`DoctorContext` は次を満たさなければならない。

- `projectDir` と `worktreeBaseDir` は空でない絶対 path
- `harnessDir` は実行開始時に解決済みの単一 harness directory
- `rulesSubdir` と `platform` は実行開始時の解決値
- `codexHomeDir` は `CODEX_HOME`、未設定なら HOME 配下の `.codex` から解決済み
- `defaultScope` は trim 済み文字列で、未設定は空文字
- `migrationDoctor` は実行開始時の `AMADEUS_MIGRATION_DOCTOR === "1"`
- `heartbeatSwapTarget` と `healthDirSwapTarget` は production では `undefined`
- `nowMs` は有限の epoch millisecond 値で、1 run 内ですべての鮮度判定に共用する
- `graph`、`rules`、`agents`、`scopeMapping`、`artifactNames` は
  defensively cloned かつ deep-frozen
- `homeDir` は未設定を `undefined` として表現し、推測値を作らない

不変条件違反を production の通常分岐として許容しない。resolver が正しい型を
構築し、テスト fixture も同じ builder/helper を使う。

## 互換性ルール

- `amadeus-utility doctor --project-dir <path>` の argv 契約を維持する
- 既存 label、fix suggestion、passed/failed 集計の意味を変更しない
- `process.exit` を wrapper へ移すこと以外の外部挙動変更を同じ差分へ混在させない
- 失効した「spawn-only」コメントは、新しい正式 seam を説明する内容へ更新する
- Issue #857 と無関係な `amadeus-utility.ts` の整理を行わない

## テスト受入ルール

| 要件 | 最低検証 |
|---|---|
| result contract | success 0 と failure 1、完全 output |
| context snapshot | fixture graph、main checkout、harness/env の差し替え |
| snapshot immutability | nested graph mutation が `TypeError`、loader alias の変更が context に不反映 |
| transitive globals | core 実行中の対象 loader/env/cwd 再読0回 |
| audit cold-safety | shard なしでは新規作成なし |
| audit active path | shard ありで2イベントの意味論維持 |
| stale lock | cleanup の実行と診断表示 |
| wrapper | stdout 1回、返却 exit code で終了 |
| fatal before output | stdout 空、stderr に original message、status 1 |
| fatal after output | full stdout、stderr に original message、status 1、明示 exit なし |
| cwd anchor | session cwd と異なる main checkout fixture |
| coverage | 変更行の patch coverage 100% |

Construction phase の共通基準に従い、happy path に加えて最低2つの失敗・edge
scenario を含める。fixture 専用分岐は本番コードへ追加しない。

## 要件トレーサビリティ

| ルール | 要件 |
|---|---|
| BR-1〜BR-3 | FR-1〜FR-3 |
| BR-4、BR-7 | FR-4、NFR-3、NFR-4 |
| BR-5、BR-6 | FR-5、NFR-1 |
| BR-8、テスト受入ルール | FR-6、NFR-2 |
