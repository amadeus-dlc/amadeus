# Functional Design: 業務ルール — U5 authoring-stage-e2e

上流入力(consumes 全数): `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`

本書は U5(C7 stage 文書 + 未知題材 E2E)の不変条件・検証規則を定義する。構造要素は `domain-entities.md` を正本とする。各ルールは `requirements.md` FR-002/FR-009/FR-012/AC-007、`components.md` §C7 の境界、`unit-of-work-story-map.md` の U5 主担当行へ trace する。

## 不変条件(invariants)

| # | 不変条件 | 根拠 | 強制点 |
|---|---|---|---|
| BR-U5-01 | 進行の所有者は stage を実行する conductor(S2)ただ一つ。referee(U3)・store(U1)・committer(U4)は自律的に次工程を起動しない | `services.md` §オーケストレーションパターン | stage 文書の手順構造 |
| BR-U5-02 | referee の typed failure は成功へ暗黙変換せず、全数を人間へ提示して halt する | `components.md` §C7(halt 条件)、NFR-003 | stage 文書の失敗時挙動の明記 + レビュー観点 |
| BR-U5-03 | 独立レビューの reviewer はモデル作成主体と別主体で、read-only 許可のみで実行する(engine 操作・成果物書込・Git 操作を持たない) | FR-009、`memory/project.md` read-only サブエージェント規律 | stage 文書のディスパッチ規定 |
| BR-U5-04 | ReviewReceipt.modelAuthor は独立レビュー段が authoring 作業の実行主体名から記入する — 空文字・未記入の receipt は U4 が reviewer-not-independent で拒否するため、記入は省略不能 | U4 FD(BR-U4-10)からの引継の確定 | stage 文書の記入手順 + U4 の登録時検査 |
| BR-U5-05 | 人間ゲートの承認なしに登録(U4 commit)へ進まない。いかなる receipt・レビュー結果も人間承認の代替にならない | FR-009、`services.md` §オーケストレーションパターン(grant はゲート承認のみ) | stage 文書の手順順序 + U4 の provenance 二重照合 |
| BR-U5-06 | ReductionManifest には invariant ごとの vacuity witness と declaredIdentity を必ず宣言する — 欠落は U3 の proof 評価が missing として拒否するため、authoring 段で書き切る | U3 FD(witness 到達性・identity 結束)との契約整合 | stage 文書の author/revise 手順 + U3 の評価 |
| BR-U5-07 | stage 文書は既存 plugin stage 様式(frontmatter + Steps + Sensors + Learn)に従い、新しい文書発明をしない | `memory/team.md` ui-less-mockups 系の既習様式優先、plugin stage の既習形 | 文書レビュー |

## E2E 検証規則(FR-012 / AC-007)

| ルール | 内容 | 根拠 |
|---|---|---|
| BR-U5-08 | E2E は要求入力 → 適用判定 → authoring → referee → レビュー → 承認 → bundle → 登録 → 既存 `formal-model-check` 実行 → 相関 verdict の**全経路**を実測する — 部分経路の green を全経路成立と読み替えない | FR-012(`unit-of-work-story-map.md` FR-012 行「全 unit(統合対象)」) |
| BR-U5-09 | E2E は composed runtime(配布面)で実行し、missing import ゼロを併せて実測する — canonical source 直実行の成功で代替しない | AC-007、`requirements.md` §2.4 失敗シナリオ(配布契約違反として失敗させる) |
| BR-U5-10 | 題材 fixture の要求断片は U1 C2 の見出し駆動文法(FR/NFR/AC 見出し)で抽出可能な形式で書く — 抽出不能な fixture は E2E の起点に使えない | U1 FD(Q2 裁定)との契約整合 |
| BR-U5-11 | E2E の人間ゲート・独立レビュー段は、テストでは検証可能な代替(記録済み承認 fixture・スタブ reviewer)を使ってよいが、**代替が写せない境界(実 HUMAN_TURN の provenance 検証)はテストの検証対象として明示し、免責で実質基準を代替しない**。provenance 検証の owning test は **U2(C1.buildReceipt の承認 provenance 照合 — BR-U2-24 の偽装負例 fixture)と U4(commit の二重照合 — BR-U4-15 の provenance 偽装 fixture)**であり、E2E のスタブ承認はこの 2 面の負例テストが red を実証済みであることを前提に成立する(build-and-test での機械照合点: BR-U2-24 / BR-U4-15 の fixture 実在 + red 実証記録) | NFR-006、`memory/project.md` cid:requirements-analysis:exemption-clause-must-not-substitute |
| BR-U5-12 | E2E の合否実測は build-and-test stage が受け入れ主体。U5 は stage 文書と fixture を成果物として提供し、判定を所有しない | `decisions.md` 末尾注記、`unit-of-work.md` U5 境界 |

## テスト形状(NFR-006、Comprehensive)

- **BR-U5-13**: stage 文書は plugin projection の検査対象(U6 の import closure guard は tool を対象とするが、stage 文書は plugin.json の stages 宣言 + 既存 compose 検証が担う)。文書の様式検査(frontmatter・必須節)は既存 plugin stage の検査機構に従う。
- **BR-U5-14**: E2E fixture は「正常(全経路成立)」に加え、authoring 経路の fail-closed を最低 2 系(referee failure での halt、承認欠落での登録拒否)含める(`memory/phases/construction.md` § Testing Standards: ハッピーパス + 最低 2 のエラー/エッジ)。

## 上流トレーサビリティ

- `unit-of-work.md`(U5 定義・境界)、`unit-of-work-story-map.md`(FR-002/FR-009/FR-012 主担当、AC-007)
- `requirements.md`(FR-002、FR-009、FR-012、AC-007、§2.4、NFR-003、NFR-006)
- `components.md` §C7、`component-methods.md` §C7、`services.md` §S2
- `functional-design-questions.md`(0 件判定、人間承認 2026-08-04T22:33:20Z)

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-04T22:39:02Z
- **Iteration:** 1
- **Scope decision:** none

手順契約1:1・E2E全経路契約・spec kind2成果物構成・0件判定はいずれも上流契約と整合し実装者が問い直さず進められる欠落はない

### Findings

- FOLLOW-UP | business-rules.md §BR-U5-11 — 免責で実質基準を代替しない旨は明記されているが「実 HUMAN_TURN の provenance 検証」を実際に担う成果物・テストの所有者(U2/engine既存機構か)を名指ししていない。code-generation着手前に owning test を明示し、E2E内のスタブ承認が cid:requirements-analysis:exemption-clause-must-not-substitute の抜け道にならないことを機械照合可能にすること。
- FOLLOW-UP | domain-entities.md §AuthoringStageDoc の構造契約(登録節) — 「C4 build → C6 commit」の記述は component-methods.md §C7 の表と1:1で正しく引き継いでいるが、components.md §C6 の `commit(entry, bundle: VerifiedBundle, pre)` は `VerifiedBundle` を要求し C4.verify が前段に必要となる。上流表自体がこの中間ステップを省略しているため本 unit の欠陥ではないが、stage 文書の実文執筆時(code-generation)に verify 呼出しを明示し、型契約との齟齬を防ぐこと。
- NIT | domain-entities.md §AuthoringStageDoc の構造契約(route受領行) — 「receipt 欠落・terminal route は開始拒否」の後半(terminal route 拒否)は component-methods.md §C7 の対応行「receipt 欠落で開始拒否」に無い追加規定。論理的に妥当だが上流表との完全一致を検査観点1に据えている以上、追加である旨をどこかに一言明示するか、上流表側の更新を検討すること。
