# AI-DLC v2 Reviewer Mapping（AI-DLC v2 の reviewer 写像）

この文書は、Issue #391 の判断として、AI-DLC v2 の stage 定義にある `reviewer` と `reviewer_max_iterations` を Amadeus DLC でどう扱うかを定義する。

参照元は次である。

- リポジトリ: https://github.com/awslabs/aidlc-workflows/tree/v2
- 参照 commit: `d341522e1491db4884e9127004c3882365229218`
- stage 定義: `core/amadeus-common/stages/**`、reviewer 実行手順: `core/amadeus-common/protocols/stage-protocol.md` §12a

## 判断

Amadeus DLC は、reviewer sub-agent を採用しない。

reviewer が担う独立確認は、既存の成果物確認へ写像する。

写像先は次の 3 つである。

1. **stage gate**。各 stage の人間承認（Approve / Request Changes）。Construction の autonomous mode では、Bolt PR の人間レビューと merge が承認証拠になる。
2. **PR レビュー**。phase PR と Bolt PR の人間レビュー、および CI（`npm run test:all`）。
3. **`amadeus-validator`**。成果物の構造検証。

## 本家 reviewer の動作と対応関係

本家の reviewer は、stage 本体が成果物を作った後、承認 gate の前に独立 sub-agent として起動し、成果物へ `## Review`（READY / NOT-READY）を追記する。NOT-READY の場合は builder が指摘へ対応し、`reviewer_max_iterations`（既定 2）まで再レビューする。上限に達したら未解決の指摘を添えて人間の gate へ進む。最終判断は常に人間が行う。

Amadeus DLC では、この動作を次へ対応させる。

| 本家の要素 | Amadeus DLC の対応 |
|---|---|
| reviewer sub-agent の独立確認 | stage gate の人間承認。autonomous mode では Bolt PR レビュー。構造面は `amadeus-validator`。 |
| NOT-READY → builder 修正 → 再レビュー | Request Changes → checkbox `[R]` → `STAGE_REVISING` → 修正 → gate 再提示のループ。 |
| `reviewer_max_iterations` の上限と、上限到達時に未解決指摘つきで gate へ進む動作 | Request Changes が 3 回連続した場合に Accept as-is を選択肢へ追加する規則。 |
| 最終判断は常に人間 | phase PR と Bolt PR の人間 merge を承認証拠にする既存 gate 契約。 |

## reviewer 指定がある stage の一覧と写像

参照 commit 時点で `reviewer` を持つ本家 stage は次の 11 個である。いずれも `reviewer_max_iterations: 2` である。

| 本家 stage | reviewer | Amadeus skill | 写像先 |
|---|---|---|---|
| ideation/rough-mockups | amadeus-product-lead-agent | `amadeus-ideation-rough-mockups` | stage gate の人間承認、Ideation phase PR レビュー、`amadeus-validator`。 |
| inception/requirements-analysis | amadeus-product-lead-agent | `amadeus-inception-requirements-analysis` | stage gate の人間承認、Inception phase PR レビュー、`amadeus-validator`。 |
| inception/user-stories | amadeus-product-lead-agent | `amadeus-inception-user-stories` | stage gate の人間承認、Inception phase PR レビュー、`amadeus-validator`。 |
| inception/refined-mockups | amadeus-product-lead-agent | `amadeus-inception-refined-mockups` | stage gate の人間承認、Inception phase PR レビュー、`amadeus-validator`。 |
| inception/application-design | amadeus-architecture-reviewer-agent | `amadeus-inception-application-design` | stage gate の人間承認、Inception phase PR レビュー、`amadeus-validator`。 |
| inception/units-generation | amadeus-architecture-reviewer-agent | `amadeus-inception-units-generation` | stage gate の人間承認、Inception phase PR レビュー、`amadeus-validator`。 |
| construction/functional-design | amadeus-architecture-reviewer-agent | `amadeus-construction-functional-design` | stage gate の人間承認（autonomous mode では Bolt PR レビュー）、`amadeus-validator`。 |
| construction/nfr-requirements | amadeus-architecture-reviewer-agent | `amadeus-construction-nfr-requirements` | stage gate の人間承認（autonomous mode では Bolt PR レビュー）、`amadeus-validator`。 |
| construction/nfr-design | amadeus-architecture-reviewer-agent | `amadeus-construction-nfr-design` | stage gate の人間承認（autonomous mode では Bolt PR レビュー）、`amadeus-validator`。 |
| construction/infrastructure-design | amadeus-architecture-reviewer-agent | `amadeus-construction-infrastructure-design` | stage gate の人間承認（autonomous mode では Bolt PR レビュー）、`amadeus-validator`。 |
| construction/code-generation | amadeus-architecture-reviewer-agent | `amadeus-construction-code-generation` | Build and Test（Stage 3.6）の検証、Bolt PR の人間レビューと CI、stage gate。 |

各 Amadeus skill の `SKILL.md` の Gate 節に、この写像を明記する。

## 採用しない理由

1. **gate の重複を避けるため**。本家でも reviewer は人間 gate を代替せず、最終判断は人間に残る。Amadeus DLC は phase PR と Bolt PR による人間 gate を一次の承認契約としており、reviewer sub-agent を挟んでも承認境界は変わらない。
2. **配布契約を小さく保つため**。Amadeus skill は配布先ユーザー環境で動く。reviewer agent 群（`core/agents/*`）相当の実行時依存を追加すると、単一公開入口と skill 一式という現在の配布契約が広がる。
3. **反復の上限と逸脱時の扱いが既にあるため**。`reviewer_max_iterations` が担う「反復を有限にし、未解決のまま人間へ委ねる」動作は、Request Changes 3 回連続で Accept as-is を提示する既存規則で満たしている。

## 検証手段

reviewer を採用しない代わりの検証手段は次である。

- `amadeus-validator` による成果物の構造検証（起動条件と検証範囲は `skills/amadeus-validator/SKILL.md` に従う）。
- phase PR と Bolt PR の CI（`npm run test:all`）と人間レビュー。
- Build and Test（Stage 3.6）による build とテストの実行記録（Code Generation の成果物に対して）。

## 将来の再検討条件

次のいずれかが起きた場合、reviewer 採用を別 Issue で再検討する。

- Amadeus DLC が gate 前の機械レビューを必要とする運用実績（gate 差し戻しの頻発など）を確認した場合。
- 配布契約に agent 実行基盤を含める判断が別途確定した場合。

## 関連文書

- [AI-DLC v2 Difference Response Plan](aidlc-v2-difference-response-plan.ja.md)
- [Skill Language Policy](skill-language-policy.ja.md)
- [Skill Englishization Rollout Plan](skill-englishization-rollout-plan.ja.md)
