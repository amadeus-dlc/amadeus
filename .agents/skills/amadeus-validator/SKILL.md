---
name: amadeus-validator
description: >-
  配布先ユーザー環境で Amadeus の実行時構造を検証する。Amadeus 成果物、Intent、
  Event Storming、任意の Grilling Decision Trail、Domain Map、Context Map、Upstream/Downstream、組織パターン、
  統合パターン、Construction 成果物を、
  repo root の開発用 scripts に依存せず確認したいとき、または `aidlc/` 配下の成果物を作成、更新した後に使う。
---

# amadeus-validator

## 目的

配布先ユーザー環境で、Amadeus 成果物が実行時に参照できる最低限の構造条件を満たしているか確認する。

この skill は Amadeus Validator の入口である。
Development Validator としての repo root の package scripts や `scripts/**` ではない。

## 起動契約

この skill は、`aidlc/` 配下のファイル更新を検知して自動起動する仕組みを持たない。
ファイル監視、Git hook、エディタ拡張、外部 automation などを前提にしない。

エージェントが `aidlc/` 配下の成果物を作成または更新した場合は、作業後にこの skill を明示的に使って検証する。
対象 Intent ディレクトリ名が分かる場合は、対象 Intent も指定して検証する。

## 内部参照

Validator の成果物契約とドメインモデルは次を参照する。

- [artifacts validation](references/artifacts.md)
- [Domain Map and Context Map validation](references/domain-map.md)
- [Validator Domain Model](references/domain-model.md)

## 実行時依存

- Bun。
- TypeScript 実行は Bun に任せる。

Bun が使えない場合は `blocked` として報告する。
検証のために依存パッケージをインストールしない。

## 同梱スクリプト

共有インデックス `intents.md` を配下モジュールから再生成するスクリプトを同梱する。
`aidlc/spaces/<space>/intents/intents.md` は生成物であり、手書きせずこのスクリプトで再生成する。

```sh
bun run .agents/skills/amadeus-validator/scripts/IndexGenerate.ts <workspace>
```

`--check` を付けると、生成される期待内容と実ファイルの完全一致を確認し、不一致なら exit 1 にする。
validator の「Index 生成整合」検査は、この生成ロジックを再利用して判定する。

## 入力

- 検証対象の作業ディレクトリ。
- 必要に応じて、対象 Intent ディレクトリ名。

対象 Intent ディレクトリ名が指定されない場合は、全体成果物を検証する。
対象 Intent ディレクトリ名が指定された場合は、全体成果物に加えて `aidlc/spaces/<space>/intents/<dirName>/`（record）を検証する。

## 読む参照元

次の順で読む。

1. `CONTEXT.md`
2. `aidlc/spaces/<space>/memory/org.md`
3. `aidlc/spaces/<space>/memory/team.md`
4. `aidlc/spaces/<space>/memory/project.md`
5. `aidlc/spaces/<space>/knowledge/*.md`（`glossary.md`、`actors.md`、`external-systems.md`、`background.md` など）
6. `aidlc/spaces/<space>/intents/intents.json`
7. `aidlc/spaces/<space>/intents/intents.md`
8. `aidlc/spaces/<space>/intents/active-intent`。存在する場合だけ読む。
9. `aidlc/spaces/<space>/knowledge/event-storming/*.md` と `aidlc/spaces/<space>/knowledge/event-storming/*/state.json`。存在する場合だけ読む。
10. `aidlc/spaces/<space>/knowledge/event-storming/*/grillings.md` と `aidlc/spaces/<space>/knowledge/event-storming/*/grillings/*.md`。存在する場合だけ読む。
11. `aidlc/spaces/<space>/knowledge/domain-map.md`
12. `aidlc/spaces/<space>/knowledge/context-map.md`
13. `aidlc/spaces/<space>/intents/<dirName>.md`。対象 Intent ディレクトリ名が指定された場合だけ読む。
14. `aidlc/spaces/<space>/intents/<dirName>/aidlc-state.md`。対象 Intent ディレクトリ名が指定された場合だけ読む。
15. `aidlc/spaces/<space>/intents/<dirName>/audit/audit.md`。存在する場合だけ読む。
16. `aidlc/spaces/<space>/intents/<dirName>/{ideation,inception,construction}/grillings.md` と `aidlc/spaces/<space>/intents/<dirName>/{ideation,inception,construction}/grillings/*.md`。存在する場合だけ読む。
17. `aidlc/spaces/<space>/intents/<dirName>/event-storming/*/grillings.md` と `aidlc/spaces/<space>/intents/<dirName>/event-storming/*/grillings/*.md`。存在する場合だけ読む。
18. 対象 Intent の `aidlc-state.md` の Stage Progress が要求する phase ディレクトリ配下の必須成果物。存在する場合だけ読む。

存在しない参照元がある場合は、存在しない事実を結果に含める。
存在しない参照元を推測で補完しない。

## 検証範囲

少なくとも次を確認する。

- Amadeus の成果物ルートが `aidlc/` であり、`aidlc/spaces/` の下に対象 Space が存在する。
- `aidlc/spaces/<space>/memory/org.md`、`aidlc/spaces/<space>/memory/team.md`、`aidlc/spaces/<space>/memory/project.md` が存在する。
- `aidlc/spaces/<space>/knowledge/` が存在する。
- `aidlc/spaces/<space>/intents/` が存在する。
- `aidlc/spaces/<space>/intents/intents.json` が存在し、Intent registry として解釈できる。
- `aidlc/spaces/<space>/intents/intents.md` が存在し、[artifacts validation](references/artifacts.md) の条件と Index 生成整合（IndexGenerate の導出内容との完全一致）を満たす。
- `aidlc/spaces/<space>/intents/active-intent` が存在する場合、registry 上の record を指す。
- `aidlc/spaces/<space>/knowledge/domain-map.md` が存在し、Subdomain と Bounded Context の `adopted`、`retired`、根拠リンクを検証できる。
- `aidlc/spaces/<space>/knowledge/context-map.md` が存在し、Upstream Context、Downstream Context、Organization Pattern、Integration Pattern、`adopted`、`retired`、根拠リンクを検証できる。
- Context Map の `Downstream` と `Upstream` は、Domain Map の Bounded Context を参照する。
- 対象 Intent のモジュールファイルが存在し、`概要`、`依存`、`目標プロファイル` の見出しと目標プロファイル表を持つ。
- 対象 Intent の record 直下に、退役済みの旧配置成果物（`state.json` など、phase ディレクトリ配下へ置くべき成果物）がない。
- 対象 Intent の `aidlc-state.md` が存在し、Project Information、Scope Configuration、Phase Progress、Stage Progress、Current Status の内容を、scope の実行対象との一致、ステージの checkbox 状態、`audit/audit.md` のイベント整合、Bolt の記録、completed ステージの必須成果物とあわせて、v2 互換ライフサイクルの契約として検証する。
- Event Storming の成果物、level、`nextRecommendedSkill`（`amadeus` または `amadeus-domain-modeling`）を検証する。
- Event Storming、Intent の phase ディレクトリに `grillings.md` または `grillings/` が存在する場合、両方が揃っている。
- Event Storming、Intent の phase ディレクトリに Grilling Decision Trail が存在する場合、`grillings.md` の一覧、session ファイル名、session の質問記録、`確認したいこと`、`確認が必要な理由`、`推奨回答`、`推奨理由`、`ユーザー回答`、確定判断、反映先、反映先が対象 root 内に収まること、active の置き換え先なし、superseded の置き換え先を検証する。

## 検証手順

次の順で検証する。

1. Bun が使えるか確認する。
2. 対象 Intent ディレクトリ名を確定する。
   - ユーザーが Intent ディレクトリ名を指定した場合は、そのディレクトリ名だけを対象 Intent にする。
   - Intent ディレクトリ名が指定されていない場合は、全体成果物だけを検証する。
   - `aidlc/spaces/<space>/intents/intents.md` から勝手に全 Intent を検証対象に増やさない。
3. skill 同梱の `validator/AmadeusValidator.ts` を実行する。

全体成果物だけを検証する場合:

```sh
bun run <skill-dir>/validator/AmadeusValidator.ts <workdir>
```

対象 Intent ディレクトリ名も検証する場合:

```sh
bun run <skill-dir>/validator/AmadeusValidator.ts <workdir> <dirName>
```

`AmadeusValidator.ts` は、内部で検査台帳を作り、`pass`、`fail`、`blocked` の判定と不足内容を日本語 Markdown で出力する。
この出力を最終報告の基準にする。

## 判定

判定は `pass`、`fail`、`blocked` のいずれかで出す。

`pass` は、検証対象が実行時に参照できる最低限の構造条件を満たしていることを示す。
`fail` は、成果物の矛盾または必須項目の欠落を示す。
`blocked` は、検証対象や判断材料が不足していることを示す。

`pass` だけで gate を通過した扱いにしない。
`waived` を検証結果にしない。

## 検証結果と学習候補

validator の結果は構造検出である。
`pass`、`fail`、`blocked` は、実行時に参照できる成果物構造、必須項目、不足、矛盾を検出した結果として扱う。
validator の `pass` は内容承認ではない。
decision review の質問要否や採用判断は、validator の結果だけで決めない。

evaluator の結果は品質評価であり、validator の判定とは分ける。
validator または evaluator の結果が複数 Intent で再利用できる知見を示す場合でも、自動的に Steering knowledge、Domain Map、Context Map へ昇格しない。
phase skill または人間判断で、`current_phase_update_required`、`upstream_feedback_required`、`steering_knowledge_candidate`、`domain_map_candidate`、`context_map_candidate`、`follow_up_issue_candidate`、`follow_up_intent_candidate`、`no_learning_action` のいずれかに分類する。

## 出力

日本語で次の形にまとめる。

```md
# Amadeus Validator 結果

## 判定

pass | fail | blocked

## 検査サマリ

| 検査カテゴリ | pass | fail | blocked |
|---|---:|---:|---:|
| <カテゴリ> | <件数> | <件数> | <件数> |

## 確認対象

| 対象カテゴリ | 件数 |
|---|---:|
| <カテゴリ> | <件数> |

### <対象カテゴリ>

- <確認したファイル>

## 満たしている条件

- <条件>

## 検査対象外

- <機械検査の対象外にした項目。なければ「なし」>

## 不足または矛盾

- <不足または矛盾。なければ「なし」>

## 次に使う Amadeus skill

- <推奨する次の skill。なければ「なし」>
```

## 禁止事項

- repo root の `scripts/**` を Amadeus Validator の格納先や実行入口として扱わない。
- repo root の package scripts を配布先ユーザー環境の検証入口として扱わない。
- skill 同梱の `validator/AmadeusValidator.ts` 以外を実行時検証入口にしない。
- 検証のために依存パッケージをインストールしない。
- Installer の接続、配布単位、インストール後の実行順序を決めない。
- Intent 状態や成果物状態を変更しない。
- 親参照や欠落ファイルを推測で補完しない。
