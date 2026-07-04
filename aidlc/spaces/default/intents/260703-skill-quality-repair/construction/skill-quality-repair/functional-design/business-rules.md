# 業務ルール — unit: skill-quality-repair

requirements.md の制約節と functional-design-questions.md の確定回答を、判定可能なルールに落とす。
上流の unit-of-work と application-design 系成果物は scope refactor により不在（設計どおり）である。

## 監査判定ルール（WF1）

| 観点 | pass 基準 | fail の扱い |
|---|---|---|
| description/trigger 品質 | description が起動条件を具体的に示し、Claude Code と Codex の両方で意図どおり起動判定できる語彙を含む | finding として記録し、非ステージなら修正 |
| 構造分割 | SKILL.md は本文が起動時に必要な内容に絞られ、詳細は references に分割されている | finding として記録し、非ステージなら修正 |
| 言語 policy 適合 | SKILL.md と TS が英語で書かれ、日本語はユーザー向け gate 文言・生成成果物の例示に限られる | 違反は修正、許容日本語は「適合」と判定して根拠を記録 |
| コマンド・パスの実行可能性 | 記載されたコマンド・パスが現在の repo 構造で実行・解決できる | finding として記録し、非ステージなら修正 |

- 判定は 3 値で記録する: `pass` / `fail` / `n-a`（観点が該当しない場合）。
- 不明な値は空欄にせず `未確認` と記録する。

## parity 境界ルール（WF2）

- ステージ skill への変更は、`amadeus-*` への改名と grilling 結線に該当する場合だけ許可する。
- 上記に該当しない修正が必要な finding は、修正せず監査記録に「parity 逸脱・後続 Issue 候補」と分類して記録する。
- 変更後は `npm run parity:check` の pass を必須とする（N002）。

## 昇格と PR 粒度ルール

- source skill の修正は、必ず `dev-scripts/promote-skill.ts <skill> --replace` で昇格し、`npm run test:it:promote-skill` を実行する（N003）。
- `.agents/skills/amadeus-*` を直接編集しない。
- 本 Bolt の PR は 1 個とし、skill 変更（source と昇格先の同期を含む）だけで構成する（Q4=A、team.md の粒度制約）。

## Grilling Decision Trail 規約ルール（WF3）

- 規約の正は `skills/amadeus-grilling/references/` の 1 箇所だけとする。他の場所に形式定義を複製しない。
- 規約は、テンプレート（コピーして埋める形式）と必須項目の生成規約記述の両方を含む（Q3=A）。
- 必須項目は `AmadeusValidator` の検査コードが要求する形式から抽出し、validator と規約が矛盾しないことを受け入れ条件とする。
- 受け入れ判定: 規約に従って生成した新規 Grilling Decision Trail が、既存成果物への目視追従なしに validator を pass する（R004）。

## 入力参照解決ルール（WF4）

GitHub Issue を入力に取る公開 skill は、次の解決規則を契約として持つ。

1. 同じ repository 文脈が解決できる場合、`#nnn` を GitHub Issue URL と等価な Issue 入力として扱う。
2. `owner/repo#nnn` の明示形式を受理する。
3. repository 文脈が曖昧な場合（複数 remote、fork、repo 外での起動など）は、処理を進めずに停止して人間に確認する。
4. `#nnn` が Issue と PR のどちらにも解決できる場合は、Issue として扱う前に人間に確認する。

- 契約の適用範囲は Issue を入力に取る公開 skill に限定する（requirements.md Q4=A の確定）。
- 契約記載の存在は決定論的検査で確認する（Q2=A）。

## #341 disposition ルール（WF5）

- 残日本語の判定は、Skill Language Policy の許容範囲（ユーザー向け gate 文言、生成成果物の日本語維持）を基準にする。
- close 提案には、対象 3 skill の判定結果と根拠を含める。
- 判定・提案は監査記録（audit-report.md）に記録し、検証経路は N004（validator pass）と PR 記録で追跡する。

## 検証ルール（全 WF 共通）

| 対象 | 検証 |
|---|---|
| repo 全体 | `npm run test:all`（N001） |
| ステージ skill パリティ | `npm run parity:check`（N002） |
| 昇格同期 | `npm run test:it:promote-skill`（N003） |
| Intent 成果物構造 | `AmadeusValidator . 260703-skill-quality-repair`（N004） |
