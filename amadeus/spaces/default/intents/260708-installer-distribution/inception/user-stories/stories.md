# User Stories — インストーラの実装(installer-distribution)

> ステージ: user-stories (2.4) / 作成: 2026-07-08
> 出典: `../requirements-analysis/requirements.md`(FR-001〜018 / NFR)、`personas.md`、`../practices-discovery/team-practices.md`(タグ規約・検査配線)、codekb `business-overview.md`・`component-inventory.md`
> 形式: INVEST 準拠。受け入れ基準は Given/When/Then。優先度は MoSCoW。各ストーリーは requirements.md の FR/NFR へ遡れる

## Epic A: install ジャーニー(P1 新規ユーザー)

### US-A1: ワンライナー導入(Must)

**As a** 新規ユーザー、**I want** `bunx @amadeus-dlc/setup install`(または `npx`)の1コマンドで導入を開始したい、**so that** クローンや手動コピーなしで Amadeus を試せる。

- 受け入れ基準:
  - Given Bun のみ導入済みの環境、When `bunx @amadeus-dlc/setup install` を実行する、Then CLI が起動しウィザードが始まる
  - Given Node のみ導入済みの環境、When `npx @amadeus-dlc/setup install` を実行する、Then 同様に起動する
  - Given 通常のネットワーク条件、When 導入が完了する、Then 所要時間は1分以内である(NFR-001)
- Trace: FR-001, FR-002, NFR-001 / INVEST: 独立・検証可能(E2E)

### US-A2: ハーネス選択ウィザード(Must)

**As a** 新規ユーザー、**I want** 対話ウィザードでハーネス(claude/codex/kiro/kiro-ide)を選びたい、**so that** 自分の環境に合った1式だけが正しく入る。

- 受け入れ基準:
  - Given 対話モードでハーネス未指定、When install が進む、Then 4択のハーネス選択が提示される
  - Given 複数ハーネスを指定した、Then 複数指定非対応エラーと「1ハーネスずつ実行」の案内が出る
  - Given 選択完了、Then 確認プロンプトの後にファイル展開が始まる
- Trace: FR-003, FR-004 / 依存: US-A1

### US-A3: サブコマンドなしはヘルプ(Must)

**As a** 新規ユーザー、**I want** `bunx @amadeus-dlc/setup` 単体ではヘルプが表示されてほしい、**so that** 何が起きるか分からないまま導入や更新が暗黙に走らない。

- 受け入れ基準:
  - Given サブコマンドなしで実行、Then install/upgrade は実行されず、両サブコマンドの説明を含むヘルプが表示され終了コード 0
- Trace: CLI Contract(対称文法)/ scope W8

### US-A4: 導入済みプロジェクトでの install 保護(Must)

**As a** 新規ユーザー(と誤operationした既存ユーザー)、**I want** 導入済みプロジェクトで `install` したら止めて `upgrade` を案内してほしい、**so that** 意図しない再導入で環境を壊さない。

- 受け入れ基準:
  - Given Amadeus 導入済みの対象、When `install` を実行する、Then 中断して `upgrade` を案内し、ファイルは変更されない
  - Given 同条件で `--force` 付き、Then 強制再導入として続行する(バックアップ要件は維持)
- Trace: FR-004(今回 Q2)/ 依存: US-B1 のバージョン検出

### US-A5: 非対話(CI)導入(Must)

**As a** 新規ユーザー(CI スクリプト作成者)、**I want** `--yes --harness <h> --target <path>` で無人導入したい、**so that** プロジェクトのセットアップスクリプトに組み込める。

- 受け入れ基準:
  - Given 非対話モードで `--harness`/`--target` 指定済み、When install を実行する、Then プロンプトなしで完了する
  - Given 非対話モードで必須引数欠落、Then バリデーションエラーで非ゼロ終了する
  - Given 非対話モードで衝突発生(`--force` なし)、Then 衝突レポートを出して中断する
- Trace: FR-010, FR-011 / INVEST: CI で自動検証可能

### US-A6: 導入結果の検証と案内(Must)

**As a** 新規ユーザー、**I want** 導入完了時に検証結果とネクストステップを見たい、**so that** 正しく入ったと確信して `/amadeus` を使い始められる。

- 受け入れ基準:
  - Given ファイル展開完了、Then マニフェスト由来の必須ファイル存在検証と doctor 相当チェックが実行される
  - Given 検証成功、Then ハーネス・バージョン・対象パス・次の一歩(`/amadeus` の始め方)が表示される
  - Given 検証失敗、Then 失敗したチェックが列挙され非ゼロ終了する
- Trace: FR-013, FR-016 / 依存: US-A2

### US-A7: ネットワーク失敗時の親切な失敗(Must)

**As a** 新規ユーザー、**I want** GitHub 取得に失敗したら1回の自動リトライと明確な原因・対処を知りたい、**so that** プロキシ環境などでも次の行動が分かる。

- 受け入れ基準:
  - Given 一時的な取得失敗、When 自動リトライが成功する、Then 導入は継続する
  - Given 2回連続失敗、Then 原因分類(DNS/接続/HTTP)と再実行案内を表示して非ゼロ終了する
- Trace: FR-012 / feasibility R2

## Epic B: upgrade ジャーニー(P2 既存ユーザー)

### US-B1: 導入状態とバージョンの検出(Must)

**As a** 既存ユーザー、**I want** `upgrade` が導入済みハーネスとバージョンを自動検出してほしい、**so that** 何をどこから更新するかを自分で調べなくてよい。

- 受け入れ基準:
  - Given マニフェストのある導入、When upgrade を実行する、Then 導入ハーネス・現行バージョンが検出され更新プランが提示される
  - Given マニフェストなしの手動コピー導入、Then `manual-or-unknown` と分類され保守的プランになる
  - Given 導入が見つからない、Then `install` の実行案内で終了する
- Trace: FR-005, FR-016

### US-B2: 適用前の差分レポート(Must)

**As a** 既存ユーザー、**I want** 適用前に追加/更新/スキップ/バックアップ/衝突のファイル一覧を見たい、**so that** 何が変わるか理解してから更新を確定できる。

- 受け入れ基準:
  - Given 更新プラン作成済み、When レポートが表示される、Then 全対象ファイルが5分類のいずれかで列挙される
  - Given 非対話モード、Then 適用/終了の前にレポートが標準出力へ出て CI ログに残る
- Trace: FR-007, NFR-003

### US-B3: カスタマイズ保持(md5+バックアップ)(Must)

**As a** 既存ユーザー、**I want** 私が変更した共有ファイルは上書き前に退避されてほしい、**so that** カスタマイズが失われない。

- 受け入れ基準:
  - Given 共有ファイルの md5 が期待値と一致、When 適用する、Then そのまま上書きされる
  - Given md5 が相違(または期待値なし)、Then `$namefile.$timestamp.bk` へ退避後にコピーされる
  - Given 1回の操作で複数退避、Then 全バックアップ名の `$timestamp` は同一(操作開始時刻)
  - Given `--force` 指定時、Then それでも退避は行われる(NFR-002)
- Trace: FR-008, FR-009, NFR-002 / intent 成功指標3

### US-B4: バージョン境界の安全挙動(Must)

**As a** 既存ユーザー、**I want** 同版・旧版・最新超えの各ケースで安全に何もしないでほしい、**so that** 意図しないダウングレードや無駄な再適用が起きない。

- 受け入れ基準:
  - Given 導入済み = 解決バージョン、Then already-up-to-date を報告し変更なし
  - Given 要求 < 導入済み、Then ダウングレード非対応で終了し変更なし
  - Given 導入済み > 既定最新(--version なし)、Then installed-newer-than-latest を報告し変更なし
- Trace: FR-005(境界条件)

### US-B5: 更新版の取得規約(Must)

**As a** 既存ユーザー、**I want** 既定では最新の安定 `vX.Y.Z` を、必要なら `--version` で特定版を取得したい、**so that** 何が入るかが常に予測できる。

- 受け入れ基準:
  - Given `--version` なし、Then 最新安定 Release → 最大安定 SemVer タグの順で解決される(プレリリース/ドラフト除外、SemVer 順序)
  - Given `--version X.Y.Z`、Then 完全一致タグを取得する
  - Given 安定版が存在しない、Then no-stable-version エラーで終了し変更なし
- Trace: FR-006, CON-007 / 依存: タグ規約(team.md)

## Epic C: publish ジャーニー(P3 メンテナ)

### US-C1: 正しいメタデータでの公開準備(Must)

**As a** メンテナ、**I want** `packages/setup` が正しい license(`(MIT OR Apache-2.0)`)と repository を持ってほしい、**so that** 公開ページに誤情報が出ない(root の既知不備を継承しない)。

- 受け入れ基準:
  - Given `packages/setup/package.json` を検査、Then license/repository/bin/name が契約どおりである
- Trace: FR-001 / feasibility I1・I2

### US-C2: pack 内容の機械検証(Must)

**As a** メンテナ、**I want** `npm pack --dry-run` のファイルリスト契約テストが CI で常時走ってほしい、**so that** 同梱物の欠落・混入を publish 前に機械検出できる。

- 受け入れ基準:
  - Given integration テスト実行、Then 実パックのファイルリストが bin / ビルド済み JS / LICENSE 2種 / README を含むことがアサートされる
  - Given 契約違反を注入、Then テストが赤くなる(落ちる実証)
- Trace: FR-018 / team.md Mandated

### US-C3: publish 手順書とバージョン運用(Must)

**As a** メンテナ、**I want** 手動 publish・タグ発行・setup 独立 semver の手順書がほしい、**so that** リリースを暗黙知なしに安全に回せる。

- 受け入れ基準:
  - Given リリース準備、Then 手順書がビルド→メタデータ確認→手動 publish→公開後検証と、`vX.Y.Z` タグ発行、setup 版バンプ(独立 semver、プレリリースは `-rc.N`+`next`)を規定している
  - Given 開発中検証、Then publish せずローカル検証(`bun link` / `npm pack` tarball)が標準経路として記載されている
- Trace: FR-015, FR-017, CON-007

### US-C4: README の導入手順刷新(Must)

**As a** メンテナ(と新規ユーザー)、**I want** README の導入手順がワンライナーに置き換わってほしい、**so that** 手動コピー手順の保守が不要になる(成功指標2)。

- 受け入れ基準:
  - Given README を検査、Then `cp -r dist/<harness>` が主経路でなく、`bunx`/`npx`・install・upgrade が記載されている
- Trace: FR-014 / intent 成功指標2

## Should / Could(後続順位)

### US-S1: 分かりやすいエラー分類(Should)

ネットワーク以外の失敗(権限・ディスク・不正ターゲット)にも分類と対処を表示する。Trace: FR-012 拡張、backlog S2

### US-S2: `--version` によるタグ固定(Could)

`--version` の明示指定で特定版を導入する(US-B5 に既定挙動として包含済み。Could は「ドキュメントでの推奨」レベルの扱い)。Trace: backlog C1

### US-S3: 導入後のネクストステップガイド(Could)

導入完了時に `/amadeus` の使い始めガイドを表示する(US-A6 の案内を拡張)。Trace: backlog C2

## INVEST 準拠ノート

- **Independent**: US-A4/B1 の検出依存を除き、各ストーリーは独立に実装・検証可能。依存は明記済み
- **Negotiable**: 文言・UI 詳細は functional-design で確定(契約は requirements.md が固定)
- **Valuable**: 各ストーリーはペルソナの目標(1分導入 / カスタマイズ保持 / 低負荷リリース)に直結
- **Estimable/Small**: 分岐単位の粒度(Q3)。intent-backlog P1〜P5 に対応付け可能
- **Testable**: 全受け入れ基準が Given/When/Then で、CI(unit/integration/E2E)にマップできる

## ストーリー数と優先度サマリー

| Epic | Must | Should | Could | 合計 |
|------|------|--------|-------|------|
| A: install | 7 | — | — | 7 |
| B: upgrade | 5 | — | — | 5 |
| C: publish | 4 | — | — | 4 |
| 後続 | — | 1 | 2 | 3 |
| **計** | **16** | **1** | **2** | **19** |

Must 16本は Q3 の目安(12〜16)の上限内。MVP 境界の正式決定は delivery-planning で行う。
