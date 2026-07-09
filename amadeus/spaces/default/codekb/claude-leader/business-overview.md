# ビジネス概要

## 目的

Amadeus は AI-DLC ワークフローを複数の AI harness(Claude、Codex、Kiro CLI、Kiro IDE)に配布するための framework リポジトリである。前回 intent `260708-installer-distribution`(commit 8510281ae 時点)で `packages/setup` に publishable な npm パッケージ `@amadeus-dlc/setup` を新設し、`npx @amadeus-dlc/setup install` による配布導線が完成した。本 intent `260709-framework-repair-batch` はその後続として、運用中に見つかったオープンバグ4件(#656/#657/#641/#661)をまとめて修理するバッチである。

## 現在の業務境界

配布フローの三層構造(`packages/framework/core/`、`packages/framework/harness/<name>/`、root `dist/<name>/`)に加え、`packages/setup/` が独立配布パッケージとして確立した。この intent はこの構造を変更せず、その内側で発見された4件の具体的な欠陥を修理する。

## この intent が対象とする業務境界(バグ4件)

- **#656 installation.ts の evidence 検出漏れ**: `@amadeus-dlc/setup upgrade` が対象プロジェクトの導入状態を判定する `Installation.detect` ロジックに、`LegacyLayout.isUnsupported` の条件(b)が本番の検出経路から到達不能という欠陥がある。ユーザーが loose な `amadeus-*` ファイルのみを持つレガシー導入を行っていた場合、正しく `legacy` 判定されない可能性がある。
- **#657 sensor-type-check.ts の bunx tsc ドリフト**: AI-DLC の type-check センサーが `bunx tsc` を無条件使用しており、リポジトリがピンする `typescript ^6.0.3` と bunx が解決する別バージョンの TypeScript が食い違うと、意図しない exit code(意図した TS18003 ではなく別のエラー)でセンサーが誤判定する。
- **#641 hooks の worktree cwd アンカードリフト**: worktree セッションで hooks が書き込む監査シャード/state の basedir と、engine が実際に動く worktree cwd が別ツリーに分岐し、human-presence gate が誤って拒否する。
- **#661 Bolt/Unit グロッサリー逆転**: stage ファイル・knowledge・docs の複数箇所で「A Bolt wraps one or more Units of Work」という記述が canonical な glossary(`stage-protocol.md`)の定義と逆転している。用語の不整合が delivery-planning 等の理解を誤らせるリスクがある。

## 現状の制約・未整備事項

- 4件とも未修正(コード上に修理の痕跡なし)。
- #657 の sensor-type-check.ts は core 正本 + `.claude`/`.codex` self-install + `dist/*` の4箇所に複製されており、修理は core 1箇所 + `bun scripts/package.ts` + `bun run promote:self` による全面反映が必要。
- #661 のグロッサリー逆転記述は少なくとも4箇所(stage ファイル、knowledge、docs 英語版)に存在し、日本語版(`inception.ja.md`、`glossary.ja.md`)は未精査。

## 成功条件

この stage の成果は実装ではなく、後続 stage(requirements-analysis 等)が依拠する CodeKB 更新である。成功条件は次の通り。

- `packages/setup` が完成済みであること(前回 codekb の「未着手」記述を置き換え)を正しく記録している。
- 4件のバグそれぞれの再現条件・原因コード位置を、テスト可能な形で後続 stage へ引き継いでいる。
- 各バグの修理が波及する箇所(複製ファイル、glossary 参照先)を棚卸ししている。
