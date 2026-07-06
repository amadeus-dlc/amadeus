# Requirements：amadeus skill 品質一括補修

Intent: 260703-skill-quality-repair
対象 Issue: [#340](https://github.com/amadeus-dlc/amadeus/issues/340)、[#405](https://github.com/amadeus-dlc/amadeus/issues/405)、[#252](https://github.com/amadeus-dlc/amadeus/issues/252)
確定判断の記録: `requirements-analysis-questions.md`（Q1〜Q4）

## Intent 分析

3 個のオープン Issue を 1 Intent に束ね、amadeus skill 群の品質を暗黙知ではなく契約として固定する。

達成したいのは次の 3 点である。

1. 全 `amadeus-*` skill の品質状態を、skill-forge の観点で監査し、追跡できる記録にする（#340）。
2. Grilling Decision Trail の生成形式を共通規約にし、生成直後に validator が pass する状態にする（#405）。
3. GitHub Issue の短縮参照（`#nnn`）を、Issue を入力に取る skill の明示的な入力契約にする（#252）。

上流入力について、scope refactor は Ideation をスキップするため、intent-statement と scope-document は存在しない（設計どおりの不在）。Intent の目的は audit shard の Workflow Start 記録と本書が正とする。チームの働き方（team-practices 相当）は `aidlc/spaces/default/memory/team.md` を参照した。

## 機能要求

### R001-skill-audit（#340）

全 `amadeus-*` skill（source: `skills/amadeus*/`）を、次の 4 観点で監査し、skill ごとの確認結果を追跡できる監査記録として成果物化する。

1. description と trigger の品質（Claude Code と Codex の両方での起動を考慮する）
2. SKILL.md と references の構造分割の妥当性
3. Skill Language Policy 適合（残日本語がある 3 skill の判定を含む）
4. 記載コマンド・パスの実行可能性

### R002-nonstage-repair（#340）

監査で問題が見つかった非ステージ skill（公開入口 `amadeus`、補助入口 `amadeus-grilling`、`amadeus-domain-modeling`、`amadeus-validator`、その他非ステージ skill）を修正し、`dev-scripts/promote-skill.ts` で昇格する。

### R003-stage-skill-findings（#340）

ステージ skill（38 個の上流適応コピー）の問題は監査記録に記録する。修正は parity 契約の範囲内（改名と grilling 結線）に限定し、parity 逸脱が必要な問題は後続 Issue 候補として記録する。

### R004-grilling-trail-contract（#405）

Grilling Decision Trail の生成規約（`grillings.md` の一覧に必要な列、session ファイルの `概要`、`確定判断`、`質問記録` の必須項目）を、`amadeus-grilling` の references または templates に 1 箇所だけ定義する。Grilling Decision Trail を生成する skill は、その規約を参照して生成する。新規に生成した Grilling Decision Trail は、既存成果物への目視追従なしに、生成直後の `AmadeusValidator` が pass する。

### R005-issue-ref-contract（#252）

GitHub Issue を入力に取る公開 skill の入力契約に、次を追記する。

1. 同じ repository 文脈が解決できる場合、`#nnn` と GitHub Issue URL を等価な Issue 入力として扱う。
2. `owner/repo#nnn` の明示形式も受理する。
3. repository 文脈が曖昧な場合は、処理を進めずに停止して人間に確認する。

URL 指定と `#nnn` 指定が同じ入力として扱われることを、eval または検証手順で確認できるようにする。

### R006-341-disposition（#341 の後始末）

R001 の言語 policy 観点の判定結果に基づき、[#341](https://github.com/amadeus-dlc/amadeus/issues/341) の残作業有無を記録する。消化済みと判定した場合は、判定根拠とともに #341 の close を提案する。

## 非機能要求

| ID | 要求 | 検証方法 |
|---|---|---|
| N001-standard-verification | 変更後に repo 標準検証が pass する。 | `npm run test:all` |
| N002-parity-preserved | ステージ skill の上流パリティが維持される。 | `npm run parity:check` |
| N003-promote-sync | source skill と昇格先の同期が promote 手順で行われる。 | `bun run dev-scripts/promote-skill.ts <skill> --replace` と `npm run test:it:promote-skill` |
| N004-artifact-validity | Intent 成果物が構造検証を pass する。 | `bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 260703-skill-quality-repair` |

## 制約

- ステージ skill の適応点は「`amadeus-*` への改名」と「grilling 結線」に限定する（上流 parity 契約）。
- Skill Language Policy に従う。SKILL.md と TS スクリプトは英語必須、ユーザー向け gate 文言と生成成果物は日本語を維持する。
- skill 変更 PR は skill 変更だけで構成することを既定とする（team.md の粒度制約）。source と昇格先の同期は同一 PR に含める。
- `.agents/skills/amadeus-*` の直接編集は行わず、必ず promote 手順を経由する。

## 前提

- #341（SKILL.md 英語化）は、完了済み Intent `amadeus-skill-english-rollout-plan`（#399 系）でほぼ実施済みであるため、本 Intent の受け入れ条件から除外する（Intake 判断）。
- 各 Issue に記載された受け入れ条件を、本 Intent の受け入れ条件の基礎として採用する。

## 対象外

- ステージ skill 本文の parity 逸脱を伴う修正、および上流 parity 契約そのものの変更。
- SKILL.md 全面英語化の実施作業そのもの（#341 の残件判定と close 提案だけを扱う）。
- GitHub Issue 以外の tracker 連携、Issue 本文の構造化、PR コメント処理の標準化（#252 の対象外事項）。
- amadeus-evaluator の追加（#240）などの検証・評価機構の新設。

## 未確定事項

- 監査記録の成果物形式と置き場所（Intent record 配下か、恒久文書か）。設計段階で確定する。
- #252 の「eval または検証手順」の具体形式（決定論的スクリプトか、手順書か）。設計段階で確定する。
- Grilling Decision Trail 規約の表現形式（テンプレートか、生成規約の記述か、その両方か）。設計段階で確定する。

## Review
**Verdict**: READY
**Findings**:
- R006-341-disposition に対応する検証方法が非機能要求の表（N001〜N004）に対応付けられていない。他の R00X は監査記録・promote 手順・validator pass などで検証経路が明示されるのに対し、R006 だけは「判定根拠とともに close を提案する」という記述のみで独立して読める。ブロッキングではないが、設計段階で検証方法（例: disposition record の必須項目）を明記すると後戻りを防げる。
- 監査記録（R001）の成果物形式・置き場所、#252 の eval／検証手順の具体形式、Grilling Decision Trail 規約の表現形式の 3 点が「未確定事項」に委ねられている。Q&A では触れられていない論点であり、Minimal 深度の要求分析としては設計段階への先送りが妥当だが、設計段階で確実に確定させること。
- 上記以外は Q1〜Q4 の確定回答と一致し、矛盾や曖昧語（「たぶん」「депends」等）もなく、各要求が Issue（#340／#405／#252／#341）へ追跡可能である。ステージ skill の parity 契約保護（Q2=A）も R002/R003 の切り分けに正しく反映されている。
