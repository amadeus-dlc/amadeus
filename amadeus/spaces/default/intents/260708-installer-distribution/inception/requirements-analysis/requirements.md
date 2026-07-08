# Requirements — インストーラの実装(installer-distribution)

> Stage: requirements-analysis / Intent: `260708-installer-distribution` / Scope: installer-distribution
> Sources: `../../ideation/intent-capture/intent-statement.md`、`../../ideation/scope-definition/scope-document.md`、`amadeus/spaces/default/codekb/installer-distribution/business-overview.md`・`architecture.md`・`code-structure.md`、`../practices-discovery/team-practices.md`、`requirements-analysis-questions.md`(グリリング4問+前 intent の合意7決定を継承)

## Intent Analysis

Amadeus の現行導入方式は、ユーザーが `dist/<harness>/` を自プロジェクトへ手動コピーする方式である(intent-statement の3課題: 導入摩擦・更新困難・導入ミス)。この intent は、初回導入、更新、導入ミス防止をまとめて解決する npm 配布インストーラ `@amadeus-dlc/setup` を `packages/setup` に実装する。

主な利用者は、新規に Amadeus を試す OSS 利用者と、既に導入済みでバージョンアップしたい既存ユーザーである。成功状態は、クローン不要の1コマンド導入(`bunx @amadeus-dlc/setup install`)、既存カスタマイズを失わない更新、README から手動コピー手順を削除できる導入体験である(scope-document の MVS)。

## Functional Requirements

### CLI Contract(コマンド契約)

ユーザー可視の最小コマンド契約:

```bash
amadeus-setup install [--harness <claude|codex|kiro|kiro-ide>] [--target <path>] [--version <semver|tag>] [--yes] [--force]
amadeus-setup upgrade [--harness <claude|codex|kiro|kiro-ide>] [--target <path>] [--version <semver|tag>] [--yes] [--force]
amadeus-setup            # サブコマンドなし = ヘルプ表示(scope-document Q4-f: 完全対称文法)
```

- **サブコマンドなし**: ヘルプを表示して終了コード 0。暗黙に install / upgrade を実行しない(非対称文法の否認、scope-definition Q4)
- **対話モード**: stdin が TTY かつ `--yes` なしのとき。不足値はプロンプトで補える
- **非対話モード**: `--yes` あり、または stdin が非 TTY のとき。`--harness` と `--target` が必須
- `--harness`: 対象ハーネス。初回リリースは1回の実行につき1ハーネスのみ
- `--target`: 変更対象のプロジェクトルート。対話モードでのみ cwd を既定にできる
- `--version`: 明示バージョン指定(省略時は FR-006 の既定解決)
- `--force`: 衝突時のプロンプト/中断のバイパス**のみ**。非対話モードを含意せず、必須値を補完せず、共有ファイルのバックアップ要件を免除しない

### FR-001: npm CLI パッケージ

`@amadeus-dlc/setup` という npm パッケージを bin 名 `amadeus-setup` で提供する。実装の置き場所は `packages/setup`(bun workspace メンバー)。

- Priority: Must
- Source: `scope-document.md` P4、constraint T1/T2/T6
- Acceptance:
  - Given パッケージが `bunx`/`npx` で起動される、When ユーザーがコマンドを実行する、Then リポジトリのクローンなしで CLI エントリポイントが起動する
  - Given package metadata を検査する、Then `license` は `(MIT OR Apache-2.0)`、`repository` は `https://github.com/amadeus-dlc/amadeus` を指す(root package.json の既知不備 I1/I2 を**継承しない**)

### FR-002: bunx / npx 両対応

`bunx @amadeus-dlc/setup` と `npx @amadeus-dlc/setup` の双方をサポートする。

- Priority: Must
- Source: intent-statement、constraint T2
- Acceptance:
  - Given Bun がある環境、When bunx で実行する、Then CLI が正常起動する
  - Given Node/npm のみの環境、When npx で実行する、Then CLI が正常起動する(ビルド済み JS で TypeScript ランタイム非依存)

### FR-003: ハーネス選択

サポート対象4ハーネス(`claude` / `codex` / `kiro` / `kiro-ide`)から、1回の実行につき**ちょうど1つ**を選択させる。

- Priority: Must
- Source: intent-statement Q5、scope-document
- Acceptance:
  - Given 対話モードでハーネス未指定、Then CLI はハーネス選択をプロンプトする
  - Given 非対話モードで `--harness` 欠落、Then 明確なバリデーションエラーで終了する
  - Given 複数ハーネスが指定された、Then 複数指定非対応エラーで終了し、1ハーネスずつ実行するよう案内する

### FR-004: install コマンド

選択したハーネスのファイル一式を対象プロジェクトへ導入する `install` フローを提供する。

- Priority: Must
- Source: `scope-document.md` P2、requirements Q2
- Acceptance:
  - Given クリーンな対象プロジェクト、When install を実行する、Then 選択ハーネスの必須ファイルが対象へコピーされる
  - Given 導入完了、Then 導入したハーネス・バージョン・対象パス・ネクストステップを報告する
  - **Given バージョン検出が既存の Amadeus 導入を発見した(マニフェストまたは `VERSION` ファイル等)、When install を実行する、Then `--force` なしでは中断して `upgrade` を案内し、ファイルを変更しない(requirements Q2)**
  - Given `--force` 付き install が導入済みプロジェクトで実行された、Then 強制再導入として続行する(FR-008/FR-009 のバックアップ要件は維持)

### FR-005: upgrade コマンド

導入済みの Amadeus を新しい配布バージョンへ更新する `upgrade` フローを提供する。

- Priority: Must
- Source: `scope-document.md` P3
- Acceptance:
  - Given インストーラマニフェストを持つ正常な導入、When upgrade を実行する、Then 導入済みハーネスとバージョンを検出し更新プランを作成する
  - Given マニフェストなしだが認識可能なハーネスファイルがある手動コピー導入、Then `manual-or-unknown` と分類し、変更のある共有ファイルをバックアップしてからコピーする保守的プランを作成する
  - Given 必須ファイル欠落の部分導入、Then 部分状態を報告し、`--force` なしの非対話適用を拒否する
  - Given 認識可能な導入が存在しない、Then `install` の実行を案内して終了する
  - Given 非対応の旧レイアウトを検出した、Then 明確な非対応メッセージで終了し、ファイルを変更しない
  - Given 導入済みバージョン = 解決/要求バージョン、Then already-up-to-date を報告しファイルを変更しない
  - Given 要求バージョン < 導入済みバージョン、Then ダウングレード非対応で終了しファイルを変更しない
  - Given 導入済みバージョン > 既定解決の最新安定版(`--version` なし)、Then installed-newer-than-latest を報告しファイルを変更しない
  - Given より新しい明示バージョンが要求された、Then そのバージョンへの更新プランを作成する
  - Given upgrade 完了、Then フレームワーク所有ファイルが非破壊マージポリシーに従って更新される

### FR-006: 配布物の取得とバージョン解決

Amadeus 配布物を GitHub のタグアーカイブから取得する。team.md の新タグ規約(リリース時に CHANGELOG と一致する `vX.Y.Z` タグを発行)が取得対象を保証する。

- Priority: Must
- Source: feasibility T3、requirements Q1-②、team-practices(タグ規約)
- Acceptance:
  - Given 明示バージョンなし、When install / upgrade が配布物を取得する、Then 最新の安定 GitHub Release を最優先で解決する
  - Given Release が存在せずタグのみ存在する、Then 最大の安定 SemVer タグ(`vX.Y.Z`)を解決する
  - Given プレリリースセグメント付きバージョンが存在する、Then 既定解決から除外する
  - Given ドラフト Release が存在する、Then 既定解決から除外する
  - Given 安定 Release も安定 SemVer タグも存在しない、Then no-stable-version エラーで終了しファイルを変更しない
  - Given `--version` が指定された、Then 完全一致する GitHub タグを取得する(プレリリースは明示要求時のみ許可)
  - Given 複数の安定バージョンが存在する、Then 辞書順ではなく SemVer 順序で最新を決定する

### FR-007: ファイルレベル差分レポート

変更適用前にファイルレベルのレポートを生成する。

- Priority: Must
- Source: `scope-document.md` P3
- Acceptance:
  - Given install / upgrade がソースと対象のファイルを解決済み、When 変更をプランする、Then 追加/更新/スキップ/バックアップ/衝突のファイル一覧をレポートする
  - Given 非対話モード、Then 適用または終了の前にレポートを出力し、CI ログで監査可能にする

### FR-008: 非破壊共有ファイルポリシー(md5+バックアップ)

`amadeus-*` プレフィックスを持たない共有ファイルの上書き可否は、期待 md5 チェックサムで判定する。

- Priority: Must
- Source: requirements Q1-①(前 intent Q1 のユーザー独自回答)、constraint T5
- Acceptance:
  - Given 対象共有ファイルの md5 が導入済みバージョンの期待 md5 と一致する、When upgrade が適用される、Then そのファイルは上書きしてよい
  - Given md5 が期待値と相違する、Then 既存ファイルを `$namefile.$timestamp.bk` へ退避してから新ファイルをコピーする
  - Given 期待 md5 が存在しない既存共有ファイル、When install / upgrade が適用される、Then ユーザー変更済みとして扱い、退避してからコピーする
  - Given 1回の install / upgrade で複数ファイルがバックアップされる、Then `$timestamp` は**インストール開始時刻の単一値**を全バックアップファイル名で共有する

### FR-009: `--force` セマンティクス

`--force` はプロンプト/衝突中断のバイパスのみを行い、変更済み共有ファイルのバックアップは維持する。

- Priority: Must
- Source: intent-statement Q5、requirements Q2
- Acceptance:
  - Given 対話モードで `--force` なし、Then 衝突は適用前に確認提示される
  - Given 非対話モードで `--force` なし、Then 衝突は操作を中断させる
  - Given `--force` あり、Then install / upgrade は衝突の対話確認なしに続行できる
  - Given TTY で `--force` ありかつ `--harness`/`--target` 欠落、Then プロンプトしてよい(`--force` は非対話モードを含意しない)
  - Given 非対話モードで `--force` ありかつ必須値欠落、Then バリデーションエラーで終了する
  - Given `--force` 下で変更済み共有ファイルに遭遇、Then それでも `$namefile.$timestamp.bk` へ退避してからコピーする
  - Given `--force` 下で期待 md5 のない既存共有ファイル、Then それでも退避してからコピーする
  - Given `--force` 下で `amadeus-*` 所有ファイルに遭遇、Then 共有ユーザー編集可能に分類されない限りバックアップなしで上書きしてよい
  - Given `--force` あり、Then 適用前レポートは force 適用された操作を明示する

### FR-010: install の衝突ハンドリング

既存ファイルとの衝突は対話/非対話で挙動を分ける。

- Priority: Must
- Source: requirements Q1-③
- Acceptance:
  - Given 対話 install が既存ハーネスファイルを発見、Then 続行可否をユーザーに確認する
  - Given 非対話 install で衝突、Then 明示オーバーライド(`--force`)なしでは衝突レポートを出して中断する

### FR-011: 非対話モード

CI・スクリプト向けの非対話実行をサポートする。

- Priority: Must
- Source: `scope-document.md`、requirements Q1-⑤
- Acceptance:
  - Given 非対話モード、Then `--harness` と `--target` が必須
  - Given `--version` 省略、Then FR-006 の既定解決(最新安定タグ)を使う

### FR-012: ネットワーク失敗ハンドリング

GitHub アーカイブ取得は失敗時に1回だけ自動リトライする。

- Priority: Must
- Source: requirements Q1-④、feasibility R2
- Acceptance:
  - Given 初回取得が一時的ネットワークエラーで失敗、When リトライが成功する、Then 導入を継続する
  - Given 2回とも失敗、Then 原因分類(DNS/接続/HTTP ステータス等)と具体的な再実行案内を出して終了する

### FR-013: 導入後検証

導入成功は、ファイル存在検証+`/amadeus --doctor` 相当の起動前提チェックで確認する。

- Priority: Must
- Source: requirements Q1-⑥
- Acceptance:
  - Given ファイルコピー完了、Then 選択ハーネスの必須ファイルが生成されたインストールマニフェストどおりに存在する
  - Given 対象が準備完了、Then doctor 相当チェックが最低限「ハーネスディレクトリ存在・tools ディレクトリ存在・active-space メモリシェル存在・state/intent 不在の正常処理」を報告する
  - Given 検証失敗、Then 失敗したチェックを報告し非ゼロ終了する

### FR-014: ドキュメント更新

ユーザー向けドキュメントの導入手順をインストーラフローへ置き換える。

- Priority: Must
- Source: intent-statement 成功指標2、`scope-document.md` P5
- Acceptance:
  - Given README の導入手順を検査する、Then 手動 `cp -r dist/<harness>` 手順が主経路ではなくなっている
  - Given docs が導入に言及する、Then `bunx`/`npx`、ハーネス選択、install、upgrade に言及している

### FR-015: publish 手順書

初回リリース向けの npm publish 手順書を含める。

- Priority: Must
- Source: requirements Q1-⑦、Q3
- Acceptance:
  - Given メンテナがリリース準備をする、Then 手順書がパッケージビルド、メタデータ確認、手動 publish 手順、公開後検証を記述している
  - Given CI 自動 publish はスコープ外、Then 手順書は初回リリースにそれを要求しない
  - Given 開発中の検証、Then 手順書は publish しないローカル検証(`bun link` / `npm pack` tarball)を標準とし、プレリリース公開時は `X.Y.Z-rc.N` + dist-tag `next` を規定する(`latest` は安定版のみ)

### FR-016: インストールマニフェスト

対象プロジェクトの `amadeus/.installer/amadeus-setup-manifest.json` にインストーラマニフェストを書き込む。導入ハーネス・バージョン・ソースタグ・導入時刻・必須ファイルリスト・フレームワーク管理共有ファイルの期待 md5 を記録する。

- Priority: Must
- Source: 前 intent レビュー指摘、requirements Q1-①⑥
- Acceptance:
  - Given install 完了、Then 将来の upgrade が読めるマニフェストが対象に存在する
  - Given upgrade 完了、Then マニフェストが新バージョンへ更新されている
  - Given QA がマニフェストを読む、Then 最低限 `schemaVersion`、`installerPackageVersion`、`distributionVersion`、`sourceTag`、`installedAt`、`harness`、`files[]` を含む
  - Given QA が `files[]` を読む、Then 各エントリは最低限 `path`、`class`、`required`、`md5` を含み、`class` は `owned` / `shared` / `user-preserved` のいずれかである
  - Given upgrade 中に共有ファイルを評価する、Then 期待 md5 はマニフェストから読むか、なければ manual-or-unknown として保守的に扱う
  - Given 導入後検証が実行される、Then 必須ファイルリストはマニフェストから読む

### FR-017: setup パッケージのバージョンライフサイクル

`@amadeus-dlc/setup` は framework 版(`AMADEUS_VERSION`)から独立した semver を持つ。

- Priority: Must
- Source: requirements Q3、project.md 是正事項 c4
- Acceptance:
  - Given `packages/setup/package.json` を検査する、Then `version` は 0.1.0 起点の独立 semver であり、`AMADEUS_VERSION` と一致する必要がない
  - Given setup のバージョンバンプ、Then publish を行う PR で実施され、publish 手順書がその手順を規定している
  - Given リポジトリの `vX.Y.Z` git タグ・CHANGELOG・README バッジ・t68 同期、Then これらは従来どおり framework 版専用であり、setup のバージョンには**適用しない**(setup 用の git タグは発行しない)
  - Given CLI が `--version`(情報表示)相当で自身を名乗る、Then setup 自身のパッケージ版と、対象とする framework 配布版を区別して表示できる

### FR-018: 公開物の実ツール検証

publish される tarball の内容契約を、実ツール(`npm pack --dry-run` 等)を実行して検証するテストを常設する。

- Priority: Must
- Source: requirements Q4、project.md 是正事項 c4、team.md Mandated(落ちる実証)
- Acceptance:
  - Given integration テスト層が実行される、Then `npm pack --dry-run --json`(または同等の実パック)を `packages/setup` に対して実行し、ファイルリストが契約(bin エントリ、ビルド済み JS、LICENSE-MIT、LICENSE-APACHE、README)を満たすことをアサートする
  - Given 契約外のファイル欠落・混入がある、Then テストが失敗する(失敗ケースを注入して赤くなることを実証してから完成扱いにする)
  - Given CI が実行される、Then このテストは通常の `tests/run-tests.sh` プロファイルに含まれ常時実行される

## Non-Functional Requirements

### NFR-001: 導入時間

新規プロジェクトへの導入は通常のネットワーク条件下で1分以内に完了すべきである。

- Source: intent-statement 成功指標1
- Verification: E2E またはスクリプト化スモークテストで経過時間を測定(適切な場合はキャッシュ/モック済みアーカイブを使用)

### NFR-002: 安全性

upgrade はサイレントな破壊的上書きを行わず、ユーザーカスタマイズを保持しなければならない。

- Source: intent-statement 成功指標3、requirements Q1-①
- Verification: 変更済み共有ファイルが単一操作タイムスタンプで退避されてからコピーされることをテストで検証

### NFR-003: トレーサビリティ

インストーラのすべてのファイル操作は適用前レポートから説明可能でなければならない。

- Source: `scope-document.md`、practices-discovery
- Verification: 追加/更新/スキップ/バックアップ/衝突の各経路のレポートエントリをテストでアサート

### NFR-004: ポータビリティ

Bun/Node が利用可能な macOS・Linux・Windows 互換シェルで動作しなければならない。

- Source: コードベースのポータビリティ慣行(実行ビット不要等)
- Verification: パス処理テストが POSIX 前提を避ける。バックアップファイル名が対象プラットフォームで有効

### NFR-005: 依存規律

フレームワークのユーザー側 Bun-only 前提は維持する。インストーラが導入する実行時依存は文書化と正当化を必須とする(目標は依存ゼロ、build-vs-buy 決定)。

- Source: practices-discovery、project.md Forbidden(依存追加の無断禁止)
- Verification: 依存マニフェストのレビューと FR-018 のパッケージ内容テスト

### NFR-006: CI 互換

既存の検証コマンド(`bun run typecheck`、`bun run lint`、`bun run dist:check`、`bun run promote:self:check`、`tests/run-tests.sh` の該当プロファイル)を維持する。加えて team.md の新 Mandated により、`packages/setup` の lint(Biome)・型検査(tsc)配線をパッケージ追加と同一 PR で行う。

- Source: team-practices.md(Code Style 更新)
- Verification: CI とローカルのテスト実行。lint/typecheck 対象に packages/setup が含まれることの確認

## Constraints

| ID | Constraint | Source |
|---|---|---|
| CON-001 | パッケージ名は `@amadeus-dlc/setup`。npm org スコープの確保を publish 前に確認する(2026-07-08 実測: 名前未使用、保有者未確定 — RAID R1) | constraint T1 |
| CON-002 | 実装は Bun/TypeScript。npx 互換のため JS ビルド成果物を公開する | constraint T2/T4 |
| CON-003 | 配布物は GitHub タグアーカイブから取得。オフライン導入はスコープ外 | constraint T3、scope W2 |
| CON-004 | 初回リリースに npm provenance / CI 自動 publish を含めない | scope W5、requirements Q1-⑦ |
| CON-005 | ソース編集は `packages/framework/{core,harness}` または `packages/setup` で行い、生成物 `dist/` を手編集しない(root symlink は PR #644 で削除済み) | team-practices.md、codekb |
| CON-006 | ユーザー可視変更は framework 版バンプ・README バッジ・CHANGELOG の同期を要する(docs/test/internal のみの変更は除く)。setup 版はこれと独立(FR-017) | project.md、t68 |
| CON-007 | リリース時に CHANGELOG と一致する `vX.Y.Z` git タグを発行する(当面手動)— FR-006 の取得対象を保証する | team-practices.md(新規約) |

## Assumptions

| ID | Assumption | Validation |
|---|---|---|
| ASM-001 | 最新安定 GitHub Release/タグは既定バージョン解決として妥当 | FR-006 が Release/タグ優先順位・SemVer 順序・プレリリース除外を定義済み |
| ASM-002 | 期待 md5 は install / upgrade が書くマニフェストに保存される | FR-016 がマニフェスト生成を要件化済み |
| ASM-003 | 変更済みファイルの `.bk` 退避+コピーは「カスタマイズを失わない」を満たす | 前 intent Q1 でユーザーがバックアップ+コピー方式を確定済み |
| ASM-004 | `/amadeus --doctor` 相当はアクティブなワークフローなしで対象から実行できる | 現行 doctor 実装に対して functional-design で検証 |
| ASM-005 | npm publish は初回リリースでは手動のまま | publish 手順書が手動プロセスを規定する(FR-015) |
| ASM-006 | `vX.Y.Z` タグはリリース運用(team.md 新規約)により今後実在する。初回 publish 時点で最低1つの安定タグが存在する | リリース準備の手順書に「タグ発行」を含め、E2E がタグ実在を前提化しない(no-stable-version 経路をテスト) |

## Out of Scope

- 組織一括・複数プロジェクト同時導入
- `dist` 同梱のオフラインインストーラ
- install/upgrade 中のバックアップを超えるロールバック復元ワークフロー
- 旧手動導入向けの専用マイグレーションフロー(通常の install/upgrade 挙動を超えるもの)
- npm provenance と CI 自動 publish
- 既存 `/amadeus --doctor` と別のインストーラ専用 `doctor` サブコマンド
- ファイルレベルレポートを超える内容差分表示
- サブコマンドなし実行での install/upgrade 自動判定(ヘルプ表示に固定 — scope W8)

## Open Questions

| ID | Question | Owner | Target Stage |
|---|---|---|---|
| OQ-001 | 各ハーネスについてマニフェストへ出力する正確なファイルリストは何か(`scripts/manifest-types.ts` の HarnessManifest からの導出方法) | Developer | Functional Design |
| OQ-002 | bunx/npx 両対応と TypeScript ソース保守性を両立する最適なビルド形式(単一ファイルバンドル等)は何か | Developer | Application Design |
| OQ-003 | `promote-self.ts` の所有判定・差分検出ロジックを共有モジュールへ抽出するか、setup 側で独立実装するか(ADR) | Architect | Application Design |

## Traceability Matrix

| Req ID | Priority | Source | Design Ref | Unit Ref | Test Ref |
|---|---|---|---|---|---|
| FR-001 | Must | P4 / T1 / T2 / I1 / I2 | TBD | TBD | TBD |
| FR-002 | Must | T2 | TBD | TBD | TBD |
| FR-003 | Must | Intent Q5 | TBD | TBD | TBD |
| FR-004 | Must | P2 / 今回 Q2 | TBD | TBD | TBD |
| FR-005 | Must | P3 | TBD | TBD | TBD |
| FR-006 | Must | T3 / 前 Q2 / タグ規約 | TBD | TBD | TBD |
| FR-007 | Must | P3 | TBD | TBD | TBD |
| FR-008 | Must | 前 Q1 / T5 | TBD | TBD | TBD |
| FR-009 | Must | Intent Q5 / 今回 Q2 | TBD | TBD | TBD |
| FR-010 | Must | 前 Q3 | TBD | TBD | TBD |
| FR-011 | Must | 前 Q5 | TBD | TBD | TBD |
| FR-012 | Must | 前 Q4 / R2 | TBD | TBD | TBD |
| FR-013 | Must | 前 Q6 | TBD | TBD | TBD |
| FR-014 | Must | 成功指標2 | TBD | TBD | TBD |
| FR-015 | Must | 前 Q7 / 今回 Q3 | TBD | TBD | TBD |
| FR-016 | Must | 前 Q1/Q6 / レビュー | TBD | TBD | TBD |
| FR-017 | Must | 今回 Q3 / c4 | TBD | TBD | TBD |
| FR-018 | Must | 今回 Q4 / c4 | TBD | TBD | TBD |
| NFR-001 | Must | 成功指標1 | TBD | TBD | TBD |
| NFR-002 | Must | 成功指標3 / 前 Q1 | TBD | TBD | TBD |
| NFR-003 | Must | P3 | TBD | TBD | TBD |
| NFR-004 | Should | コードベース慣行 | TBD | TBD | TBD |
| NFR-005 | Must | Practices / Forbidden | TBD | TBD | TBD |
| NFR-006 | Must | Team Practices(検査配線 Mandated 含む) | TBD | TBD | TBD |

## 前 intent からの変更点(差分記録)

前 intent(260706-installer-impl、レビュー2周済み requirements.md)からの主な変更:

1. **`init` → `install` 改名**、およびサブコマンドなし実行を「対話 install」から「**ヘルプ表示**」へ変更(完全対称文法、scope-definition Q4/Q4-f)
2. **FR-004 に導入済み検出時の中断+`upgrade` 案内を追加**(`--force` でのみ強制再導入、今回 Q2)
3. **FR-017(setup 独立バージョンライフサイクル)を新設**(今回 Q3、c4)
4. **FR-018(`npm pack --dry-run` 実ツール検証)を新設**(今回 Q4、c4)
5. **CON-007(`vX.Y.Z` タグ規約)を新設**し、FR-006 の取得前提を ASM-006 とともに明文化(practices-discovery)
6. CON-005 を PR #644 後のレイアウト(`packages/framework`、symlink 廃止)へ更新
7. NFR-006 に packages/setup の lint/typecheck 配線 Mandated を追加(practices-discovery)
