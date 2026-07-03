---
name: amadeus-validator
description: >-
  配布先ユーザー環境で Amadeus の実行時構造を検証する。`.amadeus/` 成果物、Intent、
  Event Storming、任意の Grilling Decision Trail、Domain Map、Context Map、Upstream/Downstream、組織パターン、
  統合パターン、Construction 成果物を、
  repo root の開発用 scripts に依存せず確認したいとき、または `.amadeus/` 成果物を作成、更新した後に使う。
---

# amadeus-validator

## 目的

配布先ユーザー環境で、Amadeus 成果物が実行時に参照できる最低限の構造条件を満たしているか確認する。

この skill は Amadeus Validator の入口である。
Development Validator としての repo root の package scripts や `scripts/**` ではない。

## 起動契約

この skill は、`.amadeus/` 配下のファイル更新を検知して自動起動する仕組みを持たない。
ファイル監視、Git hook、エディタ拡張、外部 automation などを前提にしない。

エージェントが `.amadeus/` 配下の成果物を作成または更新した場合は、作業後にこの skill を明示的に使って検証する。
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
`.amadeus/intents.md` は生成物であり、手書きせずこのスクリプトで再生成する。

```sh
bun run .agents/skills/amadeus-validator/scripts/IndexGenerate.ts <workspace>
```

`--check` を付けると、生成される期待内容と実ファイルの完全一致を確認し、不一致なら exit 1 にする。
validator の「Index 生成整合」検査は、この生成ロジックを再利用して判定する。

## 入力

- 検証対象の作業ディレクトリ。
- 必要に応じて、対象 Intent ディレクトリ名。

対象 Intent ディレクトリ名が指定されない場合は、全体成果物を検証する。
対象 Intent ディレクトリ名が指定された場合は、全体成果物に加えて `.amadeus/intents/<intent-id>-<slug>/` を検証する。

## 読む参照元

次の順で読む。

1. `CONTEXT.md`
2. `.amadeus/README.md`
3. `.amadeus/steering.md`
4. `.amadeus/steering/*.md`
5. `.amadeus/steering/knowledge/README.md`
6. `.amadeus/steering/policies/README.md`
7. `.amadeus/intents.md`
8. `.amadeus/event-storming/*.md` と `.amadeus/event-storming/*/state.json`。存在する場合だけ読む。
9. `.amadeus/event-storming/*/grillings.md` と `.amadeus/event-storming/*/grillings/*.md`。存在する場合だけ読む。
10. `.amadeus/domain-map.md`
11. `.amadeus/context-map.md`
12. `.amadeus/intents/<intent-id>-<slug>.md`。対象 Intent ディレクトリ名が指定された場合だけ読む。
13. `.amadeus/intents/<intent-id>-<slug>/state.json`。対象 Intent ディレクトリ名が指定された場合だけ読む。
14. `.amadeus/intents/<intent-id>-<slug>/{ideation,inception,construction}/grillings.md` と `.amadeus/intents/<intent-id>-<slug>/{ideation,inception,construction}/grillings/*.md`。存在する場合だけ読む。
15. `.amadeus/intents/<intent-id>-<slug>/event-storming/*/grillings.md` と `.amadeus/intents/<intent-id>-<slug>/event-storming/*/grillings/*.md`。存在する場合だけ読む。
16. `state.json.schemaVersion` が `2` の Intent では、`state.json.stages` と `state.json.bolts` が要求する phase ディレクトリ配下の必須成果物。存在する場合だけ読む。

存在しない参照元がある場合は、存在しない事実を結果に含める。
存在しない参照元を推測で補完しない。

## 検証範囲

少なくとも次を確認する。

- Amadeus の成果物ルートが `.amadeus/` である。
- `.amadeus/README.md` が存在する。
- `.amadeus/steering.md` が存在する。
- `.amadeus/steering/objective.md`、`.amadeus/steering/product.md`、`.amadeus/steering/tech.md`、`.amadeus/steering/structure.md` が存在する。
- `.amadeus/steering/actors.md`、`.amadeus/steering/external-systems.md` が存在する。
- `.amadeus/steering/knowledge.md` と `.amadeus/steering/knowledge/README.md` が存在する。
- `.amadeus/steering/policies.md` と `.amadeus/steering/policies/README.md` が存在する。
- `.amadeus/intents.md` が存在し、[artifacts validation](references/artifacts.md) の条件と Index 生成整合（IndexGenerate の導出内容との完全一致）を満たす。
- `.amadeus/domain-map.md` が存在し、Subdomain と Bounded Context の `adopted`、`retired`、根拠リンクを検証できる。
- `.amadeus/context-map.md` が存在し、Upstream Context、Downstream Context、Organization Pattern、Integration Pattern、`adopted`、`retired`、根拠リンクを検証できる。
- Context Map の `Downstream` と `Upstream` は、Domain Map の Bounded Context を参照する。
- 対象 Intent のモジュールファイルが存在し、`目標プロファイル`、`目的`、`成功条件`、`範囲` の見出しと目標プロファイル表を持つ。
- 対象 Intent の `state.json.schemaVersion` が `2` である。旧契約（schemaVersion 1）は #381 で退役したため、2 以外は fail にする。
- 対象 Intent の scope、depth、status、phase、`stages` のキー集合と scope の実行対象の一致、ステージ状態、approval evidence、`phaseGates`、`bolts`、completed ステージの必須成果物を、v2 互換ライフサイクルの契約として検証する。
- Event Storming の成果物、level、`nextRecommendedSkill`（`amadeus` または `amadeus-domain-modeling`）を検証する。
- Event Storming、Intent の phase ディレクトリに `grillings.md` または `grillings/` が存在する場合、両方が揃っている。
- Event Storming、Intent の phase ディレクトリに Grilling Decision Trail が存在する場合、`grillings.md` の一覧、session ファイル名、session の質問記録、`確認したいこと`、`確認が必要な理由`、`推奨回答`、`推奨理由`、`ユーザー回答`、確定判断、反映先、反映先が対象 root 内に収まること、active の置き換え先なし、superseded の置き換え先を検証する。

## 検証手順

次の順で検証する。

1. Bun が使えるか確認する。
2. 対象 Intent ディレクトリ名を確定する。
   - ユーザーが Intent ディレクトリ名を指定した場合は、そのディレクトリ名だけを対象 Intent にする。
   - Intent ディレクトリ名が指定されていない場合は、全体成果物だけを検証する。
   - `.amadeus/intents.md` から勝手に全 Intent を検証対象に増やさない。
3. skill 同梱の `validator/AmadeusValidator.ts` を実行する。

全体成果物だけを検証する場合:

```sh
bun run <skill-dir>/validator/AmadeusValidator.ts <workdir>
```

対象 Intent ディレクトリ名も検証する場合:

```sh
bun run <skill-dir>/validator/AmadeusValidator.ts <workdir> <intent-id>-<slug>
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
