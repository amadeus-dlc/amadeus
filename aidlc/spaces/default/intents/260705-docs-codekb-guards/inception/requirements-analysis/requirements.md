# Requirements：260705-docs-codekb-guards

## Intent 分析

### 目的

Issue #497 の試行 1 周で検出された同一系統の摩擦 3 件（Issue #498、#499、#501）を解消し、docs 系・codekb 採用方式の Intent が多体運用で回避手順なしに通るようにする。達成したい状態は次の 3 点である。

1. `amadeus-worktree/<role>` 配下の worktree から実行しても、codekb の repo キーが `amadeus` に解決される（#498）。
2. docs 系 Intent の code-generation が、手動の reject → skip なしに規約どおり閉じられる（#499）。
3. codekb 採用方式の Intent で、アドホックな作り込みなしにエンジン検査と validator の両方が pass する（#501）。

### 上流の位置づけ

- 要求の正は Issue #498、#499、#501 である。intent-statement と scope-document は scope（bugfix）により SKIP のため存在せず、Issue 3 件とディスパッチ定型文（state-init 宛 DECISION_RECORDED に転記済み）が上流入力を代替する。
- コードベース知識は既存の `aidlc/spaces/default/codekb/amadeus/`（business-overview、architecture、code-structure ほか。PR #496 で全面更新済み、reverse-engineering ステージで採用済み）を参照する。
- 対処方式はピア協議（engineer1・engineer2 の 2 名回答、全問 A で一致。requirements-analysis 宛 DECISION_RECORDED に記録済み）で確定した。
- チームの働き方（team-practices 相当）は `aidlc/spaces/default/memory/team.md` の並行運用ポリシー、Git Branching Policy、検査責務境界（validator = 実行時の成果物構造の検証、sensors = gate 時の決定論的検査）を参照する。

## 機能要求

### FR-1: codekbRepoName の主リポジトリ名解決（#498、B001）

- FR-1.1: `codekbRepoName`（`.agents/amadeus/tools/amadeus-lib.ts:501`）は、recorded repos がちょうど 1 件でない場合、`basename(projectDir)` フォールバックの前に、git 由来の主リポジトリ名（`git rev-parse --git-common-dir` の親ディレクトリの basename）で解決する。
- FR-1.2: linked worktree（`amadeus-worktree/<role>`）から実行した場合も、通常 checkout から実行した場合も、repo キーが `amadeus` に解決される。
- FR-1.3: git リポジトリでない場合、または git 情報を取得できない場合は、従来の `basename(projectDir)` フォールバックを維持する。
- FR-1.4: registry の `repos` を運用回避として使う案（Issue #498 候補 2）は採用しない。`repoDir` が `join(projectDir, repoName)` で存在しない子ディレクトリを返し、Construction の repo 解決を壊すためである。運用ガイドにも載せない。

### FR-2: workspace_requires ガードの docs-only 宣言例外（#499、B002）

- FR-2.1: code-generation の workspace_requires 検査（`.agents/amadeus/tools/amadeus-state.ts` の stage-completion artifact guard）に対し、「本 Intent の produces は record 内文書だけで成立する」ことを宣言できる docs-only 宣言を導入する。宣言があるときは workspace_requires 検査を免除する。
- FR-2.2: 宣言は決定論的 marker（state または registry のフィールド）とし、prose の自己申告にしない。
- FR-2.3: 宣言は人間承認由来の証拠（ディスパッチ承認要旨、または gate 承認済み decision）に紐づけ、ガード回避の自己申告にならないようにする。最低限の合格基準として、宣言 marker は対応する承認証拠への参照（decision の記録先 stage と記録時刻、または audit イベントの識別情報）を 1 つ以上含むこと。
- FR-2.4: 免除の発動は audit イベントとして記録し、後から追跡できるようにする。
- FR-2.5: 宣言がない場合の挙動は従来どおりとする。#366 型の抜け（実装コードを書くべき Intent で source work がゼロ）は引き続き検出される。
- FR-2.6: scope 契約（scope grid、stage の EXECUTE/SKIP 構成）は変更しない。

### FR-3: validator の codekb 採用方式判定（#501、B003）

- FR-3.1: AmadeusValidator の reverse-engineering produces 検査に codekb 採用方式の判定を入れる。record 内 stub が「正本 path への相対リンク + 採用根拠（検証基準 commit と判断の出典）」を持ち、参照先の正本ファイルが存在する場合に pass とする。stub の単位は前例 3 件（260705-codekb-refresh、260705-agmsg-trial-docs、260705-steering-learnings）と同じく produces 名ごとの 1 ファイル（9 件一式）であり、各 stub が正本の対応ファイルを参照する。
- FR-3.2: stub の必須要素（正本参照 + 採用根拠）を正式契約として validator の検査仕様に文書化する。形式は前例 2 件（260705-codekb-refresh、260705-agmsg-trial-docs）で収れんした形を正とする。
- FR-3.3: 参照先の正本ファイルが存在しない stub は fail とする。
- FR-3.4: エンジンの produces 検査（codekb root glob）は codekb 共有 store の設計意図どおり変更しない。

## 非機能要求

- NFR-1: エンジンツール・validator の変更は TDD で進める。先に失敗する eval を追加し、失敗を確認してから最小修正を入れる（`.agents/rules/dev-scripts.md`）。
- NFR-2: eval は fixture の手書きを避け、隔離 workspace での実 CLI 駆動または実出力の検査とする（project.md Corrections c5、PR #489 の検査 (f) が参考）。FR-3 の判定ロジックの試験材料には、実 stub（260705-steering-learnings の 9 件 = PR #503、および前例 2 件）を使える。
- NFR-3: エンジンツールを修正した場合は、`dev-scripts/data/parity-map.json` の engineFileExceptions への宣言と `skills/` 正準ソースへの同一反映を必ず伴わせる（project.md Corrections c3）。
- NFR-4: 成果物は日本語で書き、機械可読ラベルは英語のまま使う。各成果物文書は required-sections sensor（H2 見出し 2 個以上）を満たす。

## 制約

- C-1: Bolt は B001（#498）→ B002（#499）→ B003（#501）の直列実行とし、PR の merge は人間が行う。
- C-2: `codekb/amadeus/` と `codekb/engineer3/` は本 Intent で変更・生成しない（reverse-engineering ステージの採用判断）。
- C-3: PR 作成前に対象 Intent の validator と `npm run test:all` を実行し、結果を記録する。

## 前提

- A-1: `git rev-parse --git-common-dir` による主リポジトリ名解決は、本 worktree（engineer3）で検証済みである（`.../amadeus-dlc/amadeus/.git` → 親 basename `amadeus`）。
- A-2: ピア協議の回答者 2 名は 3 件すべての当事者（engineer1 = #497 試行で 3 件を踏んだ、engineer2 = #501 stub と #499 skip を PR #503 で実施した）であり、回答は実例に基づく。
- A-3: Q2 の docs-only 宣言例外は scope 契約・上流パリティに触れないため、承認系エスカレーション対象外である（ピア協議で両名同意。gate の人間承認をもって確定とする）。

## スコープ外

- agmsg 運用や steering（team.md）への反映（Intent 260705-steering-learnings = Issue #502 側の担当）。
- refactor scope の stage 構成変更（Issue #499 候補 1 は不採用）。
- エンジン produces 検査の record 実ファイル要求化（Issue #501 候補 2 は不採用）。
- codekb 共有 store の設計変更。

## 未解決事項

- O-1: docs-only 宣言の具体機構（marker の置き場 = state か registry か、宣言 verb、audit イベント名）は Construction（code-generation）で確定する。FR-2.2〜FR-2.4 の性質を満たすこと。
- O-2: validator の参照解決型判定の検査単位（9 produces の個別判定か、stub 一式の一括判定か）は Construction で確定する。
