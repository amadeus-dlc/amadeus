# 実測・補正記録 — u001-lifecycle-inputs（260706-lifecycle-inputs）

上流入力: [business-logic-model.md](../functional-design/business-logic-model.md)（B001〜B003 の執筆計画）、[business-rules.md](../functional-design/business-rules.md)（BR-1〜9）

FR-2.3 / FR-4.2 の単一成果物。実測抜粋（frontmatter の該当行）と補正内容を Bolt ごとに記録する。

## B001（#510）: overview.md

### 追加

- `## ステージ契約の I/O 記法` 節を「成果物配置」の後、「v2 との構造差分」の前に追加した。内容は B001 規則 1〜6 のとおり（3 列の意味と英語化後ラベル、供給元語彙 4 値と書式、エンジン実態との対応、CONDITIONAL 供給元の qualifier、phase 共通入力の縮退、実在しない入力の禁止）。
- qualifier の代表書式は、既存文書の実例に合わせてステージ名ベース（`必須（Application Design 実行時）`）を正とした（§12a functional-design 反復 2 の非ブロッキング観察を反映）。

### GD009 残存の補正（4 箇所 + 同一廃止対象 2 箇所）

| 行（着手時） | 旧記載 | 補正 |
|---|---|---|
| 27 | 互換方針「モジュールファイルとモジュールディレクトリの対で配置する」 | 「Intent の記録は record ディレクトリで配置し、正準台帳は `intents.json` が持つ」へ更新 |
| 169 | 成果物配置ツリーの `<YYMMDD>-<label>.md`（モジュールファイル）行 | 行を削除 |
| 203 | 「Intent のモジュールファイル（`<dirName>.md`）は `概要`、`依存`、`目標プロファイル` だけを扱う」 | 「モジュールファイルと `intents.md` 索引は GD009 で廃止した」+ 一覧は `intents.json` から都度生成、へ更新 |
| 217 | v2 差分表「Intent の記述の分割」行（モジュールファイルへの分割を意図的差分として維持） | 行を削除（廃止により差分が消滅） |
| 168（追加検出） | 成果物配置ツリーの `intents.md`（IndexGenerate.ts で再生成）行 | 行を削除。`intents.md` 索引はモジュールファイルと同じ GD009 の廃止対象（AMADEUS.md）であり、requirements 前提実測の grep（キーワード = モジュールファイル）では拾えなかった同一廃止対象として B001 で補正した |
| 218（追加検出） | v2 差分表「Intent 一覧」行（`intents/intents.md` 生成索引の維持） | 行を削除（同上） |

### 実測根拠

- AMADEUS.md「Intent モジュールファイル（`intents/<dirName>.md`）と `intents.md` 索引は廃止した（GD009）。人間向け一覧が必要な場合は、`intents.json` から都度生成する。」
- 補正後の残存検査: `grep -n 'モジュールファイル|intents\.md|IndexGenerate' docs/amadeus/lifecycle/overview.md` の該当は「GD009 で廃止した」という廃止宣言の 1 行だけである。

## B002（#511〜513）: frontmatter 実測抜粋（22 ステージ）

実測方法: `.claude/amadeus-common/stages/<phase>/<slug>.md` の frontmatter から `execution` と `consumes`（artifact、required、conditional_on）を機械抽出した（2026-07-06、rename 後 main 9dd93f50 基点の branch 上）。
表記: `artifact(required[,conditional_on])`。

```
ideation/intent-capture [ALWAYS] :: (consumes なし)
ideation/market-research [CONDITIONAL] :: intent-statement(true)
ideation/feasibility [CONDITIONAL] :: intent-statement(true) competitive-analysis(false) market-trends(false) build-vs-buy(false)
ideation/scope-definition [ALWAYS] :: intent-statement(true) feasibility-assessment(false) constraint-register(false)
ideation/team-formation [CONDITIONAL] :: scope-document(true) intent-backlog(true) feasibility-assessment(false)
ideation/rough-mockups [CONDITIONAL] :: intent-statement(true) scope-document(true) intent-backlog(true)
ideation/approval-handoff [ALWAYS] :: intent-statement(true) scope-document(true) intent-backlog(true) competitive-analysis(false) feasibility-assessment(false) constraint-register(false) team-assessment(false) wireframes(false)
inception/reverse-engineering [CONDITIONAL] :: (consumes なし)
inception/practices-discovery [CONDITIONAL] :: code-structure(false,brownfield) technology-stack(false,brownfield) dependencies(false,brownfield) code-quality-assessment(false,brownfield) architecture(false,brownfield) business-overview(false,brownfield)
inception/requirements-analysis [ALWAYS] :: intent-statement(false) scope-document(false) business-overview(false,brownfield) architecture(false,brownfield) code-structure(false,brownfield) team-practices(false)
inception/user-stories [CONDITIONAL] :: requirements(true) business-overview(false,brownfield) component-inventory(false,brownfield) team-practices(false)
inception/refined-mockups [CONDITIONAL] :: wireframes(true) user-flow(true) stories(false) requirements(true) team-practices(false)
inception/application-design [CONDITIONAL] :: requirements(true) stories(false) architecture(false,brownfield) component-inventory(false,brownfield) team-practices(false)
inception/units-generation [ALWAYS] :: components(true) component-methods(true) services(true) component-dependency(true) decisions(true) requirements(true) stories(false)
inception/delivery-planning [ALWAYS] :: requirements(true) stories(false) mockups(false) components(true) unit-of-work(true) unit-of-work-dependency(true) unit-of-work-story-map(false) team-practices(false)
construction/functional-design [CONDITIONAL] :: unit-of-work(true) unit-of-work-story-map(false) requirements(true) components(true) component-methods(true) services(true)
construction/nfr-requirements [CONDITIONAL] :: business-logic-model(true) business-rules(true) requirements(true) technology-stack(false,brownfield)
construction/nfr-design [CONDITIONAL] :: performance-requirements(true) security-requirements(true) scalability-requirements(true) reliability-requirements(true) tech-stack-decisions(true) business-logic-model(true)
construction/infrastructure-design [CONDITIONAL] :: performance-design(true) security-design(true) scalability-design(true) reliability-design(true) logical-components(true) components(true) services(true) business-logic-model(true)
construction/code-generation [ALWAYS] :: business-logic-model(false) business-rules(false) domain-entities(false) performance-design(false) security-design(false) deployment-architecture(false) unit-of-work(true) requirements(true)
construction/build-and-test [ALWAYS] :: code-generation-plan(true) code-summary(true)
construction/ci-pipeline [CONDITIONAL] :: code-summary(true) build-and-test-summary(true) build-test-results(true)
```

`conditional_on` の使用は brownfield 条件のみである（B001 規則の裏付け）。

### per-stage 突き合わせと補正（B001 承認後に実施）

| 文書 | ステージ | 判定と補正 |
|---|---|---|
| ideation.md | 1.1 | frontmatter は consumes なし。Inputs の「入力テーマ（Intake）」は Intake 供給の実入力として維持。自己矛盾回避（手順 6）: Outputs のモジュールファイル行を削除、Purpose と Notes の散文を補正（GD009 廃止の明記と overview への参照） |
| ideation.md | 1.2 / 1.3 / 1.4 / 1.6 / 1.7 | GD009 残存「Intent のモジュールファイル（必須、Stage 1.1）」×5 を `intent-statement.md`（必須、Stage 1.1）へ置換。frontmatter の intent-statement(true) と一致 |
| ideation.md | 1.5 | frontmatter と一致。変更なし |
| inception.md | 2.1 | frontmatter は consumes なし。「対象リポジトリのコード（workspace）」は実入力として維持 |
| inception.md | 2.2 / 2.3 / 2.4 / 2.6 | 必須値の表記統一「brownfield のみ」×4 → `条件付き（brownfield）`（frontmatter の conditional_on: brownfield に対応）。2.2 の「Space の既存 memory/team.md」は frontmatter 外だが skill 実手順（practices 解決順）の実入力として維持 |
| inception.md | 2.3 | GD009 残存「Intent のモジュールファイル（任意、Stage 1.1 または Intake）」を `intent-statement.md`（任意、Stage 1.1）へ置換 |
| inception.md | 2.5 | wireframes / user-flow の必須値へ qualifier 付与 → `必須（Rough Mockups 実行時）`（供給元 Stage 1.6 = execution: CONDITIONAL。BR-9） |
| inception.md | 2.7 | `intent-backlog.md`（任意、Stage 1.4）行を削除。stage 定義と skill に参照根拠なし（grep で 0 件。BR-1 = 実在確認できない入力を書かない） |
| inception.md | 2.8 | frontmatter と一致（unit-of-work 系、components の qualifier 含む）。変更なし |
| construction.md | 3.1 | frontmatter と一致（qualifier 2 種を含む）。変更なし |
| construction.md | 3.2 | 表記統一「brownfield のみ」→ `条件付き（brownfield）` |
| construction.md | 3.3 | NFR Requirements の 5 成果物へ qualifier 付与 → `必須（NFR Requirements 実行時）`（供給元 Stage 3.2 = execution: CONDITIONAL。BR-9） |
| construction.md | 3.4 | frontmatter と一致（qualifier 3 種すべて既設）。変更なし |
| construction.md | 3.5 | 非標準の必須値「実行した場合」×2 を `任意` へ統一（frontmatter は該当 artifact をすべて required: false と定義） |
| construction.md | 3.6 / 3.7 | frontmatter と一致。変更なし |

### 記法統一で維持した既存表現（補正しない判断）

- 2.2 / 2.3 の「`codekb/<repo>/` の成果物」の総称表記は、frontmatter の個別 artifact 列挙（6 件 / 3 件）へ展開しない。総称は虚偽ではなく、展開は表の可読性を下げるため（最小補正 = FR-2.4 の趣旨）。
- 3.1 の `requirements.md` は plain `必須` を維持する。Requirements Analysis は execution: ALWAYS であり、functional-design を含む scope で Requirements Analysis を欠く組み合わせは scope 定義に存在しない（3.2 の qualifier は security-patch が Requirements Analysis を SKIP する実在の組み合わせに基づく）。

### Phase Overview への共通入力段落（手順 5）

ideation.md / inception.md / construction.md の Phase Overview へ、rules_in_context（org.md、team.md、project.md、phases/<phase>.md）の段落を各 1 回追記した（overview.md の記法定義「phase 共通入力」への参照付き）。

## B003（#514）: scopes.md / state.md の適用可否

### 判断

| 文書 | 判断 | 理由 |
|---|---|---|
| scopes.md | 縮退形で適用 | ステージ単位の文書ではないため Inputs 表は構造に合わない。文書が参照する契約（エンジンの scope 定義 = `.agents/amadeus/scopes/amadeus-<scope>.md`、stage 定義の execution / condition）を冒頭の `## Inputs` 節 1 段落で明記した。scope 定義 path は実在確認済み（`ls .agents/amadeus/scopes/` で 1 scope 1 ファイルを確認） |
| state.md | 縮退形で適用 | 同上。文書が参照する契約（amadeus-state.md、audit/、intents.json）を冒頭の `## Inputs` 節 1 段落で明記した。3 参照は本文「責務」節の記述と一致する |

どちらも「理由付き不適用」ではなく「縮退形での適用」とした。Inputs 観点そのものは両文書に意味があり、不適用にする理由がないため。

### GD009 残存の補正

- scopes.md 縮退時の入力代替表の 2.7 行: 「Unit の記述は Intent のモジュールファイルと `requirements.md` で代替する」→「Unit の記述は `requirements.md` で代替する」（モジュールファイルは GD009 で廃止済み）。
- state.md 台帳と PR 断面節の「索引」段落（147〜148 行）: `intents/intents.md` を `IndexGenerate.ts` で再生成する現行仕様として記述していた残存を、GD009 廃止宣言 + `intents.json` からの都度生成へ補正した。`IndexGenerate.ts` はリポジトリに実在しない（find で 0 件）。この残存は §12a code-generation 反復 1 が検出した。キーワード `intents.md` / `IndexGenerate` での横断 grep を初回実測（キーワード = モジュールファイルのみ）で行っていなかったことが検出漏れの原因である。

### GD009 補正の全数集計（訂正）

初回宣言の「計 17 箇所」は state.md の 1 箇所を見落としており不正確だった。確定値は次のとおり。

- 前提実測（キーワード = モジュールファイル）: 15 箇所
- B001 追加検出（overview.md の intents.md 索引言及）: 2 箇所
- §12a 反復 1 検出（state.md の intents.md / IndexGenerate 言及）: 1 箇所
- **計 18 箇所を全数補正**。補正後の横断 grep（`モジュールファイル|intents\.md|IndexGenerate`）の残存は、意図的な廃止宣言 3 行（overview.md 201、ideation.md 85、state.md 147）だけである。
