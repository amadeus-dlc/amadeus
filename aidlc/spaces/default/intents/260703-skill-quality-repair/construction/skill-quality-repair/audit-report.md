# 監査記録 — unit: skill-quality-repair

対応 Issue: [#340](https://github.com/amadeus-dlc/amadeus/issues/340)、[#405](https://github.com/amadeus-dlc/amadeus/issues/405)、[#252](https://github.com/amadeus-dlc/amadeus/issues/252)、[#341](https://github.com/amadeus-dlc/amadeus/issues/341)
対応 WF: business-logic-model.md WF1〜WF5
分類語彙: `repairable`（非ステージ skill・修正対象） / `parity-limited`（ステージ skill・parity 契約内で修正対象） / `deferred`（parity 逸脱または engine 側・後続 Issue 候補）

## 対象列挙（WF1 Step 1）

`skills/amadeus*/` 直下 41 skill を、`skills/amadeus/references/stage-catalog.md` を正として分類した。

- ステージ skill（30）: `amadeus-init`（Initialization 0.1〜0.3 をまとめて実行）+ 単一ステージ runner 29 個（`amadeus-application-design`、`amadeus-approval-handoff`、`amadeus-build-and-test`、`amadeus-ci-pipeline`、`amadeus-code-generation`、`amadeus-delivery-planning`、`amadeus-deployment-execution`、`amadeus-deployment-pipeline`、`amadeus-environment-provisioning`、`amadeus-feasibility`、`amadeus-feedback-optimization`、`amadeus-functional-design`、`amadeus-incident-response`、`amadeus-infrastructure-design`、`amadeus-intent-capture`、`amadeus-market-research`、`amadeus-nfr-design`、`amadeus-nfr-requirements`、`amadeus-observability-setup`、`amadeus-performance-validation`、`amadeus-practices-discovery`、`amadeus-refined-mockups`、`amadeus-requirements-analysis`、`amadeus-reverse-engineering`、`amadeus-rough-mockups`、`amadeus-scope-definition`、`amadeus-team-formation`、`amadeus-units-generation`、`amadeus-user-stories`）
- 非ステージ skill（11）: 公開入口 `amadeus`、補助入口 `amadeus-grilling`／`amadeus-domain-modeling`／`amadeus-validator`、scope 入口 `amadeus-bugfix`／`amadeus-feature`／`amadeus-mvp`／`amadeus-security-patch`、utility `amadeus-replay`／`amadeus-session-cost`／`amadeus-outcomes-pack`

30 + 11 = 41 skill、ディレクトリ実数と一致する。

## 判定表（WF1 Step 2〜3）

29 個の単一ステージ runner（`amadeus-init` と `amadeus-intent-capture` を除く）は、`/aidlc --stage <slug> --single` を包む共通テンプレートの適応コピーであり、4 観点とも同一の判定根拠を共有する（テンプレート判定は表の後に一括で記載する）。

| Skill | 種別 | description/trigger | 構造分割 | 言語 policy | 実行可能性 | 分類 |
|---|---|---|---|---|---|---|
| amadeus | 非ステージ | pass | pass（references/、templates/ に分割済み） | pass | fail→**repairable（修正済み）** | 詳細は下記 |
| amadeus-grilling | 非ステージ | pass | fail→**repairable（修正済み）**（Grilling Decision Trail 形式が SKILL.md と amadeus-validator に重複） | pass（根拠は下記） | pass | 詳細は下記 |
| amadeus-domain-modeling | 非ステージ | pass | pass | pass（根拠は下記） | pass | – |
| amadeus-validator | 非ステージ | pass | fail→**repairable（修正済み）**（同上、grilling 形式の重複） | pass（根拠は下記） | pass | 詳細は下記 |
| amadeus-bugfix | 非ステージ | pass | pass | pass | pass | – |
| amadeus-feature | 非ステージ | pass | pass | pass | pass | – |
| amadeus-mvp | 非ステージ | pass | pass | pass | pass | – |
| amadeus-security-patch | 非ステージ | pass | pass | pass | pass | – |
| amadeus-replay | 非ステージ | pass | pass | pass | pass | – |
| amadeus-session-cost | 非ステージ | pass | pass | pass | pass | – |
| amadeus-outcomes-pack | 非ステージ | pass | pass | pass | pass | – |
| amadeus-init | ステージ | pass | pass | pass | fail→**deferred**（`dist/` 記述、下記） | 詳細は下記 |
| amadeus-intent-capture | ステージ | pass | pass | pass | pass（WF3 で grilling 参照を追加、下記） | 詳細は下記 |
| 単一ステージ runner 28 個（上記 2 個を除く） | ステージ | pass（テンプレート判定） | pass（テンプレート判定） | pass（テンプレート判定） | pass（テンプレート判定） | – |

### 単一ステージ runner のテンプレート判定（28 個共通）

対象: `amadeus-application-design`、`amadeus-approval-handoff`、`amadeus-build-and-test`、`amadeus-ci-pipeline`、`amadeus-code-generation`、`amadeus-delivery-planning`、`amadeus-deployment-execution`、`amadeus-deployment-pipeline`、`amadeus-environment-provisioning`、`amadeus-feasibility`、`amadeus-feedback-optimization`、`amadeus-functional-design`、`amadeus-incident-response`、`amadeus-infrastructure-design`、`amadeus-market-research`、`amadeus-nfr-design`、`amadeus-nfr-requirements`、`amadeus-observability-setup`、`amadeus-performance-validation`、`amadeus-practices-discovery`、`amadeus-refined-mockups`、`amadeus-requirements-analysis`、`amadeus-reverse-engineering`、`amadeus-rough-mockups`、`amadeus-scope-definition`、`amadeus-team-formation`、`amadeus-units-generation`、`amadeus-user-stories`。

- **description/trigger**: pass。各 SKILL.md の description が対象ステージ名とパッケージ対象（`/aidlc --stage <slug> --single`）を明示し、`user-invocable: true` を持つ。
- **構造分割**: pass。本文 44〜49 行で起動時に必要な手順（directive 取得 → 実行 → report）に絞られ、補足が不要な分量である。
- **言語 policy**: pass。日本語混入なし（後述の grep 検査で確認）。
- **実行可能性**: pass。各 SKILL.md が参照する `--stage <slug>` は `skills/amadeus/references/stage-catalog.md` の対応 slug と一致し、`.agents/amadeus/amadeus-common/stages/<phase>/<slug>.md` に実体が存在する。`bun .agents/amadeus/tools/amadeus-orchestrate.ts` の `--stage`／`--single`／`--result` 引数はエンジン側で解釈される。`../amadeus-grilling/references/engine-bridge.md` への相対参照は全 skill で解決する。

### 言語 policy 判定の根拠（残日本語 3 skill、WF5 対応）

`skills/amadeus*/SKILL.md` を全文 grep した結果、日本語を含むのは次の 3 skill だけである（#341 が指す対象と一致）。

| Skill | 該当箇所 | 判定根拠 |
|---|---|---|
| `amadeus-domain-modeling` | L82-84、L97-99、L112-113、L141-143 | ドメイン用語をすり合わせる対話例（英語の説明文の中の引用例）。Skill Language Policy の「ユーザー向け gate 文言」に準じる、生成される対話出力の例示であり、翻訳漏れではない。 |
| `amadeus-grilling` | L141-170 相当 | `grillings.md`／session ファイルの必須列・必須フィールド名（`概要`、`確定判断`、`質問記録`、`確認したいこと` 等）と、生成物の例示行。これらは `aidlc/**/*.md` として生成される成果物の日本語フィールド名そのものであり、Skill Language Policy の「生成成果物の例示」に該当する。 |
| `amadeus-validator` | L131、L148-149、L222-258 相当 | 同上（validator が検査する grilling 必須フィールド名の列挙）と、`Amadeus Validator 結果` の出力テンプレート（ユーザー向け検査結果は日本語のまま維持する契約）。 |

いずれも Skill Language Policy の「日本語を維持する対象」（ユーザー向け gate 文言、生成成果物の例示）に該当し、SKILL.md 本文の英語化義務への違反ではない。判定: 3 skill とも言語 policy 適合（pass）。

## Finding 一覧（3 分類）

| # | Skill | 観点 | 内容 | 分類 | 対応 |
|---|---|---|---|---|---|
| F1 | `amadeus` | 実行可能性 | `docs/reference/12-state-machine.md` への参照が、このリポジトリに存在しないローカルパスとして書かれていた（上流 `awslabs/aidlc-workflows` 由来の記述で、ローカルには対応ファイルがない）。 | `repairable` | 修正済み。`docs/amadeus/lifecycle/state.md`（このリポジトリの state 契約）と `knowledge/amadeus-shared/audit-format.md`（vendored copy: `references/aidlc-v2/audit-format.md`）への参照に置き換えた。 |
| F2 | `amadeus` | 実行可能性（R005 未実装） | GitHub Issue の短縮参照（`#nnn`）を Issue 入力として扱う契約が、Intake 経路のどこにも記載されていなかった。`skills/amadeus*/` 全体を検索しても GitHub Issue を入力に取る skill は `amadeus`（Intake 経路）だけである。 | `repairable` | 修正済み。「GitHub Issue references as input」節を追加し、等価規則・`owner/repo#nnn` 受理・文脈曖昧時の停止確認を明記した。決定論的検査 `dev-scripts/issue-ref-contract.ts`（`npm run issue-ref-contract:check`）を追加し、`references/issue-ref-contract.md` に検証手順を記載した。 |
| F3 | `amadeus-grilling`、`amadeus-validator` | 構造分割（R004） | Grilling Decision Trail の生成形式（`grillings.md` の列、session ファイルの必須フィールド）が `amadeus-grilling/SKILL.md` 本文と `amadeus-validator/SKILL.md` 本文の 2 箇所に重複して記述されていた。単一の正がなく、コピー用テンプレートも存在しなかった。 | `repairable` | 修正済み。`skills/amadeus-grilling/references/grilling-trail-contract.md` を単一の正として新設（`AmadeusValidator.ts` の `checkGrillings` 系検査コードから必須項目を抽出）。`amadeus-grilling/SKILL.md` と `amadeus-validator/SKILL.md` は同ファイルを参照する記述に置き換えた。少なくとも `amadeus-intent-capture`（ステージ skill、grilling 結線の範囲内）から同契約への参照を追加した。 |
| F4 | `amadeus-init` | 実行可能性 | 「The workspace shell ships in `dist/` (no setup command)」という記述があるが、このリポジトリに `dist/` は存在しない（上流 `awslabs/aidlc-workflows` の配布構造に基づく記述と見られる）。 | `deferred` | ステージ skill であり、修正は改名・grilling 結線の範囲に限定される。この記述の是非を確定するには内容判断（parity 逸脱の可否を含む）が必要なため、後続 Issue 候補として記録し、本 Bolt では修正しない。 |
| F5 | `amadeus`（と engine 本体） | 実行可能性 | `amadeus/SKILL.md` の「Scope-to-Stage Mapping」節が案内する再生成コマンド `bun .agents/amadeus/tools/amadeus-utility.ts scope-table`（`--check` も同様）を素の引数で実行すると、`.agents/amadeus/tools/amadeus-utility.ts` 内の `skillMdPath()` のデフォルト値が `.agents/amadeus/skills/aidlc/SKILL.md`（B002 の `amadeus` 改名前の旧パス）のままで ENOENT になる。`AIDLC_SKILL_MD_PATH` 環境変数で上書きすれば動作し、その経路では `skills/amadeus/SKILL.md` の scope-table 領域は最新であることを確認した。 | `deferred` | 原因は `skills/amadeus*/` ではなく engine tool（`.agents/amadeus/tools/amadeus-utility.ts`）のデフォルトパスにある。本 Bolt の PR 粒度制約（skill 変更だけで構成）により engine tool 修正は対象外。後続 Issue 候補として記録する。 |

`repairable` 3 件はすべて `repaired`（修正・promote 済み）で終端した。`deferred` 2 件は `recorded`（本記録に後続 Issue 候補として記録）で終端した。未処理の finding はない。

## #341 disposition（WF5、R006）

判定: **消化済み。close を提案する。**

根拠:

- R001 の言語 policy 観点で残日本語が確認された 3 skill（`amadeus-domain-modeling`、`amadeus-grilling`、`amadeus-validator`）を全件確認した。上表のとおり、いずれも Skill Language Policy が明示的に日本語維持を認める「ユーザー向け gate 文言・生成成果物の例示」に該当し、SKILL.md 本文の英語化義務への違反ではない。
- #341（SKILL.md 全面英語化）が対象とする英語化そのものは、完了済み Intent `amadeus-skill-english-rollout-plan`（#399 系、requirements.md 前提節に記載）でほぼ実施済みであり、本監査でも残る違反を検出しなかった。
- SKILL.md 全面英語化の実施作業そのものは requirements.md の対象外（本 Bolt では扱わない）であり、判定はあくまで「残作業の有無」に限定した。
- 個別の言語 policy 違反が本監査で見つかった場合は R002 に従い `repairable` として WF2 で扱う契約だが、該当する違反自体が存在しなかった。

## #340 向け要約コメント案

> Amadeus skill 品質監査（41 skill）を完了しました。
>
> - ステージ skill 30 個・非ステージ skill 11 個を `stage-catalog.md` を正として分類し、4 観点（description/trigger、構造分割、言語 policy、実行可能性）で判定しました。
> - Finding 5 件のうち 3 件（`amadeus` の壊れた doc 参照、GitHub Issue 短縮参照契約の欠落、Grilling Decision Trail 形式の重複）を `repairable` として本 Bolt で修正・promote しました。
> - 残り 2 件（`amadeus-init` の `dist/` 記述、`amadeus-utility.ts scope-table` のデフォルトパス）は parity 境界または engine tool 修正が必要なため `deferred` とし、後続 Issue 候補として記録しました。
> - #341（SKILL.md 全面英語化）は残作業なしと判定し、close を提案します（詳細は本監査記録の「#341 disposition」節を参照）。
> - 検証: `npm run test:all`、`npm run parity:check`、`npm run test:it:promote-skill`、`AmadeusValidator`（対象 Intent 含む）すべて pass。
>
> 詳細: `aidlc/spaces/default/intents/260703-skill-quality-repair/construction/skill-quality-repair/audit-report.md`

## 後続 Issue 候補（deferred の記録）

- F4: `amadeus-init` の `dist/` 記述の是非確認（parity 契約の範囲内で許容されるか、上流との差分整理が必要か）。
- F5: `.agents/amadeus/tools/amadeus-utility.ts` の `skillMdPath()` デフォルト値を `skills/amadeus/SKILL.md` に合わせて更新する engine tool 修正（B002 の `amadeus` 改名時に見落とされた箇所）。
