# Requirements Analysis Questions：260705-docs-codekb-guards

回答方法: 各質問の `[Answer]:` に選択肢の記号（A〜E または X）を記入する。X（Other）の場合は内容を併記する。

## Q1: #498（codekbRepoName の worktree 名漏れ）の修正方式

Issue #498 の実施候補を起点に、修正方式を確定する。

技術前提（本ステージで検証済み）:

- `git rev-parse --git-common-dir` は linked worktree から主リポジトリの `.git`（`.../amadeus-dlc/amadeus/.git`）を返し、その親ディレクトリの basename が `amadeus` に解決される。通常 checkout でも同じ式が成立する。
- 実施候補 2（registry の `repos` に repo 名を記録して lone-repo 解決を効かせる）には欠陥がある。`repoDir` は `join(projectDir, repoName)`（amadeus-lib.ts:1537）で projectDir 直下の子ディレクトリを返すため、self-development worktree（workspace root = repo root）で `repos: ["amadeus"]` を記録すると Construction の repo 解決（`resolveConstructionRepo` の cwd）が存在しないディレクトリを指して壊れる。

A. エンジン修正のみ: `codekbRepoName` の basename フォールバックの前に、git common dir 由来の主リポジトリ名で解決する段を入れる（Issue 候補 1）。
B. 運用回避のみ: registry の `repos` に repo 名を記録する（Issue 候補 2。上記の欠陥あり）。
C. 併用: エンジン修正 + 運用ガイドの明記（Issue 候補 3）。
D. 修正せず、codekb 採用方式の前例を文書化するに留める。
X. Other（具体案を記載）

[Answer]: A（ピア協議 2026-07-05T17:00Z、engineer1・engineer2 の 2 名回答で全員一致。engineer2 補足: エンジン修正時は parity-map.json engineFileExceptions 宣言 + skills/ 正準反映（Corrections c3）。engineer1 補足: eval は fixture 手書きでなく隔離 workspace の実 CLI 駆動（Corrections c5、PR #489 検査 (f) 参考））

## Q2: #499（workspace_requires ガードと docs 系 refactor の衝突）の対処方式

Issue #499 の実施候補を起点に、対処方式を確定する。

前提整理:

- ガードの目的は「code-generation が markdown だけ書いて実装コードを書かない」抜け（Issue #366）の検出である。
- docs 系 Intent は正当に実装コードを持たないため、衝突は scope ではなく Intent の性質に起因する。refactor scope は実コードのリファクタリングにも使われるため、scope 単位の SKIP（Issue 候補 1）は過剰に広い。

A. ガードに docs-only 宣言の例外を設ける: produces が record 内文書だけで成立することを stage 実行時に宣言でき、宣言時は workspace_requires 検査を免除する（Issue 候補 2）。宣言の具体機構（宣言の置き場・audit への記録形）は functional 設計と code-generation で確定する。#366 型の抜け（宣言なしで source work ゼロ）は引き続き検出される。
B. refactor scope（または docs 系判定）で code-generation を SKIP にする（Issue 候補 1。scope 契約の変更であり上流パリティ確認が必要）。
C. エンジンは変えず、現行の reject → skip 手順を正式な運用契約として文書化する（Issue 候補 3）。
X. Other（具体案を記載）

[Answer]: A（ピア協議 2026-07-05T17:00Z、2 名回答で全員一致。engineer1 条件: docs-only 宣言はガード回避の自己申告にならないよう、人間承認由来の証拠（ディスパッチ承認要旨・gate 承認済み decision）に紐づける。engineer2 希望: 宣言は決定論的 marker（state か registry のフィールド）とし、免除の発動を audit イベントに残して #366 型の抜け検出を保全する。承認系エスカレーション不要の判断にも両名同意（scope 契約不変のため））

## Q3: #501（エンジン produces 検査と validator の乖離）の対処方式

Issue #501 の実施候補を起点に、対処方式を確定する。

前提整理:

- team.md の検査責務境界では validator = 実行時の成果物構造の検証である。codekb 共有 store（space-level、Intent 横断共有）はエンジンの設計意図であり、エンジンの codekb root glob はこの意図に沿う。
- 前例 2 件（260705-codekb-refresh、260705-agmsg-trial-docs）は record 内の参照台帳 stub（正本への参照 + 採用根拠）で解消しており、形式は事実上収れんしている。

A. validator に codekb 採用方式の判定を入れる: record 内 stub の「正本参照 + 採用根拠」形式を正式契約とし、検査を参照解決型にする（stub があり参照先の正本が存在すれば pass）（Issue 候補 1）。
B. エンジンの produces 検査を record 内実ファイル要求に揃える（codekb root glob をやめる）（Issue 候補 2。codekb 共有 store の設計意図と衝突）。
C. 現行の参照台帳 stub を正式な運用契約として文書化するに留める（validator・エンジンは変えない）（Issue 候補 3）。
X. Other（具体案を記載）

[Answer]: A（ピア協議 2026-07-05T17:00Z、2 名回答で全員一致。engineer1 補足: 正式契約化する stub の必須要素は前例 2 件で収れんした形 = 正本 path への相対リンク + 採用根拠（検証基準 commit と判断の出典）。B（record 実ファイル要求化）には反対 = 共有 store 設計意図どおり。engineer2 補足: eval fixture は validator 期待の手書きにせず実 CLI の実出力で検査（Corrections c5）。実データ提供: aidlc/spaces/default/intents/260705-steering-learnings/inception/reverse-engineering/ の stub 9 件（PR #503）を判定ロジックの試験材料に使える）
