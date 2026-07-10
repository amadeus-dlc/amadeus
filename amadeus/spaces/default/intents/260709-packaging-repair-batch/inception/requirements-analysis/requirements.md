# Requirements — packaging-repair-batch

## Intent 分析

対象: GitHub Issue #701 / #702(いずれも bug/P2、クロスレビュー2名 CONFIRMED 済み)。根本原因の file:line は codekb(`code-quality-assessment.md`、observed 22e3eb5aa)に固定済み。両バグは互いに独立(package 検査系 / release 同期系)で、共有コード・共有テストを持たない。

## NFR / 制約

- 実行環境は Bun 直接実行(TypeScript/ESM)。新規ランタイム依存の追加は不可(project.md Forbidden)。
- `dist/<harness>/` の手編集は不可 — 検証は必ず `bun scripts/package.ts` 再生成と `--check` 実測で行う。
- バージョンバンプ運用(release.yml → release-it → after:bump)は不変。#702 修正はスクリプト内部の正しさのみを対象とする。

## 前提

- dist ルート面の正当なコミット物は現行 manifest 由来(harness dir、`amadeus/`、`.agents/`、宣言済み projectRoot 出力、emit 済みファイル)に限られる(RE スキャンで実測)。
- 現行 README バッジは stable(`0.1.1`)であり、#702 は初回プレリリース発行時に顕在化する潜在バグ(実測済み)。

## 共通要件(全バグ)

- 各修正はリグレッションテストを伴う(bugfix スコープの Testing Posture)。**修正前に赤くなることを実証したテスト**(落ちる実証)を先行させ、修正後に緑を実測する(team.md Mandated)。
- 既存テストスイート(`bash tests/run-tests.sh --ci`)・`bun run typecheck`・`bun run lint`・`bun run dist:check`・`bun run promote:self:check` はグリーンを維持する。
- 修正は Bolt ごとに独立 PR(スカッシュマージ)。両バグは互いに独立のため並列実装可。
- 本番コードへのテスト専用分岐は導入しない(construction ガードレール)。

## FR-701: package --check の dist ルート orphan 検出(P2)

**現状(確認済み欠陥)**: `scripts/package.ts` の --check は自らのコメント(:31-34)で「committed dist/ との byte-for-byte diff」を宣言するが、orphan(committed→built 方向)の検査は (a) harness dir 配下(:575-582)、(b) `.agents`/`amadeus` サブツリー(:611-618)に限られ、projectRoot 出力の明示 diff(:586-592)は built→committed 片方向のみ。結果、`dist/<name>/` 直下(および未宣言サブディレクトリ)に居座る stale ファイル — 典型は manifest から削除・改名された旧 projectRoot 出力 — がどの検査経路にも乗らず --check を通過する(再現実測済み: `dist/kiro/STALE_ROOT_FILE.md` 植込みで exit 0)。

**要件**:
- FR-701-1: `package.ts <name> --check` は、`dist/<name>/` 配下の **committed ファイル全件**について、現行ビルドが生成する期待集合(harness dir サブツリー + 宣言済み projectRoot 出力 + emit 済みファイル集合)に属さないものを `ORPHAN in dist: <name>/<rel>` として報告し、exit 1 で失敗しなければならない。検査対象は dist ルート直下の平坦面に限らず、未宣言サブディレクトリ配下も含む(全域走査)。
- FR-701-2: 正当にコミットされる現行のルート面ファイル(例: `AGENTS.md`、`.gitignore`、`.agents/`、`amadeus/`、harness dir)に対して偽陽性を出さない。クリーンツリーでの `--check` は exit 0 を維持する。期待集合の3分類(harness dir サブツリー+宣言済み projectRoot 出力+emit 済み集合)は現行 manifest の出力分類に対応しており、manifest に新たな出力系統が増えた場合は本要件の期待集合定義も同時に見直すこと(再発防止意図の明示)。
- FR-701-3: リグレッションテストは (a) stale ファイルを dist ルート直下に植えて --check が exit≠0 かつ ORPHAN 行を出すこと(負)、(b) 未宣言サブディレクトリ配下に植えても検出されること(負)、(c) クリーンツリーで exit 0(正)、を実測で検証する。

**受け入れ基準**: 上記 (a)(b) のテストが修正前の package.ts で赤、修正後に緑。既存 `tests/integration/t145-packaging-parity.test.ts` は無改修で緑を維持。

## FR-702: release-version-sync の prerelease バッジ前進+事前検証(P2)

**現状(確認済み欠陥)**: `scripts/release-version-sync.ts` は version 受理(:22)で prerelease を許容する一方、README バッジ regex(:53-54)は stable `X.Y.Z` のみ一致のため、バッジが一度 prerelease(例 `0.2.0-beta.1`)になると以後どの版へも前進できず exit 1(:37-40)。さらに patchFile は version.ts 先行書込(:47-51)→ バッジ失敗の順のため、失敗時に **version.ts のみ更新された半適用状態**が残り、再実行も恒久的に exit 1(冪等性破綻)。再現実測済み。leader ディスパッチにより中途状態問題への対処もスコープに含む。

**要件**:
- FR-702-1: README バッジの一致 regex を version 受理 regex と対称にし、prerelease サフィックス付きバッジ(`badge/version-X.Y.Z-pre.N-blue` 形)にも一致・置換できること。prerelease→prerelease / prerelease→stable / stable→prerelease / stable→stable の4遷移すべてで置換が成功する。
- FR-702-2: **事前検証(all-or-nothing)**: いずれかの patch 対象でパターン不一致が検出された場合、**どのファイルにも書き込まずに** exit 1 する(パターン検証を全対象で先に行い、全通過後に書込を開始する)。半適用状態を構造的に排除する。
- FR-702-3: 静的同期ガード `tests/unit/t68-version-changelog-sync.test.ts` のバッジ regex(:81)も prerelease 対応へ同時更新し、prerelease バッジ状態でも version.ts / CLI / packages/setup/package.json / README の4点同期が検証可能であること(RE スキャンで実測済みの同時更新必要性)。
- FR-702-4: リグレッションテストは (a) prerelease バッジ→次 prerelease への sync 成功(修正前赤)、(b) パターン不一致注入時にどのファイルも変更されないこと(修正前赤 — 現状は version.ts が書き換わる)、(c) stable→stable の既存経路の無退行(正)、を実測で検証する。

**受け入れ基準**: 上記 (a)(b) のテストが修正前のスクリプトで赤、修正後に緑。バージョンバンプは release.yml 一本の運用(project.md Mandated)を変えない — 本修正はスクリプトの正しさのみを対象とし、リリースフローの変更を含まない。

## スコープ外(明示)

- shields.io バッジ URL 形式の妥当性(prerelease サフィックス中の `-` エンコード等)の改善 — バッジ描画の見た目は本バッチの対象外。regex 対称性のみ修正する。
- `package.ts` のビルド生成ロジック(buildTree/emit)自体の変更 — 検査(--check)の網羅性のみを対象とする。
- release.yml / .release-it.json のフロー変更。
- #705(sdk-drive calibration)ほか本バッチ外の Issue。
