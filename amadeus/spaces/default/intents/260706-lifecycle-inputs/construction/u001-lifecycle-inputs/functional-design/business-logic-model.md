# Business Logic Model — u001-lifecycle-inputs（260706-lifecycle-inputs）

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)

本 Intent の「ロジック」は文書契約の執筆・整合作業である。Bolt ごとの執筆計画を定義する。

## B001（#510）: overview.md への I/O 記法定義

overview.md の「成果物配置」節の後、「v2 との構造差分」節の前に、`## ステージ契約の I/O 記法` 節を追加する。定義する内容は次の 5 点である。

1. **対の原則**: phase 別文書の各ステージは `### Inputs` と `### Outputs` を対で持つ。
2. **Inputs 表の形式**: `| Artifact | 必須 | 供給元 |` の 3 列。列の意味は次のとおり。
   - Artifact: 読む成果物の record 相対 path または名称。実在する成果物だけを書く（実在しない入力を書かない規律を明文化）。
   - 必須: `必須` / `任意` / `条件付き（条件名）` を基本 3 値とする。エンジンの stage frontmatter `consumes[].required` と `conditional_on` に対応する（例: `条件付き（brownfield）`）。
   - 供給元: 産出ステージ番号（例: Stage 2.3）、または `Intake` / `workspace` / `Space`（語彙は domain-entities.md の表を正とする）。
3. **供給元ステージが CONDITIONAL の場合の必須値**: frontmatter の `required: true` は「供給元ステージが実行された場合に必須」を意味し、供給元ステージ自体の実行条件（`execution: CONDITIONAL`、scope による SKIP）はエンコードしていない。この場合の必須値は `必須（Stage N.M 実行時）` の qualifier 付き表記とする（既存文書の「必須（Application Design 実行時）」等はこの規則の正当な適用であり、frontmatter の `required: true` を根拠に単純な `必須` へ畳まない）。scope 縮退時の入力代替は scopes.md の「縮退時の入力代替」節を参照先とする。
4. **エンジン実態との対応**: Inputs 表はエンジンの stage frontmatter（`consumes` と、供給元ステージの `execution`）を一次実測源とする。upstream-coverage sensor は frontmatter `consumes` の純粋な派生（追加情報を持たない）であり、独立の実測源としない。phase 共通入力は rules_in_context を実測源とする。文書とエンジンが乖離した場合はエンジン実態を正とする。
5. **phase 共通入力の縮退**: 全ステージが共通に読む steering/memory 参照（org.md、team.md、project.md、phases/<phase>.md = rules_in_context）は、各ステージの表に繰り返さず、phase 文書の Phase Overview 節に 1 回だけ書く。現状の 3 文書の Phase Overview にはこの記述が存在しないため、これは B002 の新規追記作業である（手順 5）。
6. **言語非依存の定義**（FR-1.3）: 列の固定ラベルに英語対訳（Artifact / Required / Source、必須値は Required / Optional / Conditional (condition) / Required (when Stage N.M runs)）を併記し、英語化（#515〜520）が 1:1 置換で成立するようにする。

あわせて overview.md 内の GD009 残存 4 箇所（27、169、203、217 行）を FR-2.4 の最小補正原則で補正する（成果物配置ツリーからモジュールファイル行を削除、v2 差分表の該当行を廃止済みへ更新、互換方針の「モジュールファイルとモジュールディレクトリの対」表現を現行契約へ更新）。

## B002（#511〜513）: phase 別 3 文書の Inputs 整合

各ステージについて次の手順で実測し、Inputs 表を B001 の記法へ揃える。

1. `.claude/amadeus-common/stages/<phase>/<slug>.md` の frontmatter から `consumes`（artifact / required / conditional_on）を読み取る。
2. `consumes` の各 artifact について供給元ステージの `execution` も読み取り、CONDITIONAL（または scope により SKIP され得る）なら必須値の qualifier（`必須（Stage N.M 実行時）`）を保持または正規化する（B001 の規則 3。frontmatter の `required: true` だけを根拠に qualifier を畳まない）。
3. 既存 Inputs 表と突き合わせ、乖離（GD009 残存、欠落、過剰、qualifier の不整合）を特定する。
4. 表を補正し、実測抜粋（frontmatter の該当行）と補正内容を「実測・補正記録」（`code-generation/measurement-correction-log.md`）へ記録する。
5. 各 phase 文書の Phase Overview 節へ、phase 共通入力（rules_in_context = org.md、team.md、project.md、phases/<phase>.md）の段落を新規追記する（B001 の規則 5。現状 3 文書とも記述なしを実測済み）。
6. Inputs 補正の副作用で自己矛盾が生じる箇所（ideation.md Stage 1.1 の Outputs 表・散文のモジュールファイル生成記述）は最小範囲で補正する（FR-2.4）。

対象は ideation 7 ステージ、inception 8 ステージ、construction 7 ステージの計 22 ステージである。

## B003（#514）: scopes.md / state.md の適用可否

- scopes.md: scope 別ステージ集合の文書であり、ステージ単位の Inputs 表は構造に合わない。適用形の判断は「scopes.md が入力として参照する契約（scope 定義ファイル、stage 実行条件）を冒頭に 1 段落で明記する縮退形」を第一候補として検討し、適用または理由付き不適用を確定する。scopes.md 111 行の GD009 残存（Units Generation 縮退記述）は同時に補正する。
- state.md: 状態契約の文書であり、同様に「state.md が入力として参照する契約（amadeus-state.md、audit、registry）」の縮退形を検討する。
- どちらも判断結果と理由を「実測・補正記録」へ記録する（FR-3.2）。

## 検証（FR-4）

B003 完了後に validator（Intent 指定）と `npm run test:all` を実行し、build-and-test で記録する。
