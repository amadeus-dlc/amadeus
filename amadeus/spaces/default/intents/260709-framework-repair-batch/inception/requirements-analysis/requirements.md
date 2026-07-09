# Requirements — framework-repair-batch

> scope: bugfix / intent: `260709-framework-repair-batch`。上流 codekb(`amadeus/spaces/default/codekb/claude-leader/business-overview.md`、`architecture.md`、`code-structure.md`)を参照して作成。回答は `requirements-analysis-questions.md` の選挙結果に基づく。

## 1. Intent analysis

本 intent は前回 intent `260708-installer-distribution` の完了後、運用フェーズで見つかったオープンバグ4件(#656/#657/#641/#661)をまとめて修理するバッチである。`business-overview.md` の「この intent が対象とする業務境界(バグ4件)」節が記す通り、`packages/setup` の配布フロー自体は完成済みで変更しない。目的は次の4つの安全性・決定性・運用性・用語一貫性の欠陥解消に限定する。

- **installer の安全性**(#656): `Installation.detect`(`architecture.md` の「#656 installation.ts の evidence 検出と LegacyLayout 判定」節が示す `packages/setup/src/domain/installation.ts`)の evidence 収集が anchor-less レガシーレイアウトを検出できず、BR-U07(unsupported レイアウトの無条件ハード拒否)が実装上は到達不能になっている。
- **テストの決定性**(#657): `amadeus-sensor-type-check.ts` が `bunx tsc` を無条件使用し、bunx の解決 TS バージョンが repo ピン(`typescript ^6.0.3`)と食い違うと `tests/integration/t92.test.ts` Group N test 44 が誤って赤くなる。
- **worktree 運用**(#641): hooks 側の `resolveProjectDirFromHook()`(`.claude/tools/amadeus-lib.ts`)が worktree セッションで launch dir に収束し、engine が書く record dir と分岐して human-presence gate が誤拒否する。
- **用語一貫性**(#661): stage ファイル・knowledge・docs の Bolt/Unit グロッサリーが AI-DLC v1 本家の定義(Unit ⊇ Bolt、時間軸)と逆(Bolt ⊇ Unit、スコープ軸)になっている。実装の機構自体は正しく、用語表記のみのドリフト。

`architecture.md` の「正規化の影響」節が明記する通り、architecture の骨格(one-core-many-harnesses、staged layout)自体には手を入れない。4件はいずれも各コンポーネント内部の実装是正であり、新規 architecture decision を要さない。

## 2. Functional requirements

### FR-656: Installation.detect の evidence gap 解消(Q1=A, Q2=A)

`packages/setup/src/domain/installation.ts` の `scanEvidence` と `Installation.detect` に以下2点を実装する。

- **FR-656-1**: `scanEvidence` が `tools/`・`amadeus-common/`・`VERSION` の3アンカーに加え、loose な `amadeus-*` ファイル(アンカー配下以外に存在する `amadeus-*` 命名のファイル/ディレクトリ)を evidence として収集する。両アンカーが false かつ loose `amadeus-*` ファイルが存在する場合、`LegacyLayout.isUnsupported` の条件(b)が真になり、`detect` は `unsupported-layout` を返す。
- **FR-656-2**: `Installation.detect` が manifest を読めた場合でも、manifest に記載された各エントリの実ファイル存在をディスク上で検証する。1件以上欠落していれば `manifested` ではなく `partial` を返す(全件揃っていれば従来どおり `manifested`)。
- **FR-656-3(BR-U07)**: `unsupported-layout` に分類された場合、`--force` の有無に関わらず upgrade を無条件でハード拒否し、明示エラーメッセージで終了する(`partial-forced` のような続行パスを設けない)。

**合否基準**: (a) アンカーなし・loose `amadeus-*` ファイルのみ持つレガシー fixture で `detect` が `unsupported-layout` を返し、`--force` 付きでも upgrade コマンドが非ゼロ終了で拒否することを回帰テストで実測する。(b) manifest ありだが実ファイルが一部欠落する fixture で `detect` が `partial` を返すことを回帰テストで実測する。(c) 修正前にこれら2ケースが失敗する(赤)ことを実証してから修正後の緑を確認する。

### FR-657: type-check センサーの tsc 解決順修正(Q3=A)

`packages/framework/core/tools/amadeus-sensor-type-check.ts`(および複製先 `.claude/tools/`、`.codex/tools/`、`dist/*/tools/` の同名ファイル)の tsc 起動処理を、`node_modules/.bin/tsc` が存在すればそれを優先起動し、存在しない場合のみ `bunx tsc` にフォールバックする方式に変更する。`tests/integration/t92.test.ts` Group N test 44 の exit code 期待値(2)は変更しない。

**合否基準**: (a) `node_modules/.bin/tsc` を意図的に隠す/異なる TS バージョンを bunx に解決させる環境で修正前に test 44 が赤くなることを実測する。(b) 修正後、repo ピンの `typescript ^6.0.3` を使う限り test 44 が決定的に緑になることを実測する。(c) core 正本での修正が `bun scripts/package.ts` と `bun run promote:self` により `.claude/`・`.codex/`・`dist/*` の4複製先すべてに反映されていることを diff で確認する。

### FR-641: hooks の project dir 解決順修正(Q4=A)

`.claude/tools/amadeus-lib.ts` の `resolveProjectDirFromHook()` のフォールバック順を変更する。cwd(またはその祖先ディレクトリ)に amadeus ワークスペースマーカー(`amadeus/` ディレクトリ かつ `.claude/tools/` ディレクトリの組)が存在する場合、そのディレクトリを cwd として優先採用し、script-path 逆算より先に評価する。既存の env(`CLAUDE_PROJECT_DIR`)チェックとの優先順位、および該当マーカーが見つからない場合の既存フォールバック(script-path 逆算 → cwd probe → cwd)は維持する。

**合否基準**: worktree ディレクトリ構成(`.claude/worktrees/<name>` 配下に `amadeus/` と `.claude/tools/` を持つ fixture)を模した回帰テストで、hooks 側が解決する project dir と engine 側が書く record dir のパスが一致することを実測する。修正前にこの一致検証が失敗する(launch dir に収束して不一致になる)ことを実証してから修正後の一致を確認する。

### FR-661: Bolt/Unit グロッサリー逸脱注記の追加(Q5=C)

AI-DLC v1 本家の定義(Bolt = sprint 相当のタイムボックス、Unit ⊇ Bolt)と実装の用語(Bolt = deployable slice、Bolt ⊇ Unit)が異なることを明文化する注記を、以下の全転記箇所に追加する。既存文言の意味・定義そのものは変更しない(注記の追加のみ)。

- canonical: `stage-protocol.md` Glossary(この注記の一次ソース)
- `delivery-planning.md` Step 3 グロッサリー
- docs 対応ページ(英語版・日本語版のペア)
- `glossary.md` / `glossary.ja.md`
- `workflow-planning-guide.md`(delivery agent knowledge)

**合否基準**: 上記5箇所すべてに「AI-DLC v1 の Bolt(sprint 相当のタイムボックス)とは異なり、本実装では deployable slice の意味で用いる」旨の注記(EN/JA ペア)が存在することをファイル単位で確認する。既存の定義文言(「A Bolt wraps one or more Units of Work」等)自体は変更されていないことを diff で確認する。回帰テストの新設は行わない(Q7=A、テスト態勢節を参照)。

## 3. Non-functional requirements

- **NFR-1(配布規律)**: FR-657 の修正は `packages/framework/core/tools/amadeus-sensor-type-check.ts` を正本として編集し、同一コミットで `bun scripts/package.ts` によるビルドと `bun run promote:self` によるセルフインストール昇格を実施する(`project.md` Mandated 節「ALWAYS `core/` または `harness/<name>/` を編集したら…両方を同一コミットに含める」)。
- **NFR-2(既存スイートのグリーン維持)**: 4 Bolt いずれの変更後も、既存の `bun run typecheck`・`bun run lint`・`bun run dist:check`・`bun run promote:self:check`・`bash tests/run-tests.sh --ci` を実行し、自分の変更前から赤かったテスト以外はすべて緑を維持する(`team.md` Testing Posture)。
- **NFR-3(後方互換シム禁止)**: FR-656/FR-641 の修正で、旧挙動を残すフォールバック分岐や移行シムを追加しない。`unsupported-layout` の判定・拒否ロジックは新しい正しい挙動に置き換える(`team.md` Forbidden 節)。
- **NFR-4(検証劇場の回避)**: FR-657/FR-641 の回帰テストは、修正前に実際に赤くなることを実証してから修正後の緑を確認する(`team.md` Forbidden 節「NEVER 検証・ゲート・チェックの結果を実行結果から導出せずに構築しない」)。

## 4. Constraints

- スコープは `bugfix`(`org.md` Walking Skeleton 節)であり、既存コードベースへのインクリメンタルな修理のためスケルトンのセレモニーは適用しない。最初の Bolt も他の Bolt と同様に実行する。
- 4バグ = 4 Bolt = 4 PR とし、Bolt ごとにブランチ切り出し・PR 発行を行う(`team.md` Way of Working、Corrections 節)。4 Bolt は相互独立のため並列バッチで実行する(Q6=A)。
- リリース系ファイル(バージョンバンプ、`CHANGELOG.md`、リリースノート)には一切触れない。バージョンバンプは `release.yml` の `workflow_dispatch` のみが行う(`project.md` Decided/Mandated 節)。
- `dist/<harness>/` 配下を実装の近道として手編集しない。`core/` または `harness/<name>/` の編集 → `bun scripts/package.ts` → `bun run promote:self` の経路を必ず踏む。

## 5. Assumptions

- **A-1**: FR-657 の t92 test 44 が exit 2 を期待する契約は、リポジトリの `package.json`/lockfile が `typescript ^6.0.3` を固定し続ける前提で決定的に成立する。将来 TS メジャーバージョンを更新した際は test 44 が意図的に赤くなり、その時点で再評価が必要になる(Q3=A の採用根拠)。根拠: `code-structure.md`/`dependencies.md` の typescript バージョンピン記述。
- **A-2**: FR-641 のマーカー判定(`amadeus/` + `.claude/tools/`)は、通常の worktree 構成(`git worktree add` で作成され、リポジトリ全体を含む)であれば常に真になる。マーカーとなるディレクトリ構造が将来変更される場合は本 FR の判定条件も追随が必要になる。
- **A-3**: FR-656 の loose `amadeus-*` ファイル検出は、ユーザーが実際にアンカーなしレガシー導入を行っていたケース(Issue #656 が指摘する実運用リスク)をカバーする範囲に限定し、evidence 収集ロジック全体の再設計(Q1=D)は行わない。

## 6. Out of scope

- #656 の evidence 収集ロジック全面再設計(アンカー中心 → ファイル台帳中心、Q1=D)。
- #657 の tsc 解決を typescript のフレームワーク配布物 runtime 依存への昇格で固定する方式(Q3=D)。
- #661 の Bolt 改名・方法論への語彙統一(Issue 案2、大規模リネーム)。上流 awslabs リポジトリ(AI-DLC workflows の v2 実装ブランチ)への報告(Issue 案3)。
- CodeKB の分裂に関する課題(GitHub Issue #668、別課題として起票済み)。
- `modelOverride` フィールドのドリフト(既に PR #669 で修正済み、本 intent の対象外)。

## 7. Open questions

なし。全7問とも `requirements-analysis-questions.md` で選挙結果が確定し、意見が割れた Q1/Q4/Q5 についてはユーザー承認を得ている。
