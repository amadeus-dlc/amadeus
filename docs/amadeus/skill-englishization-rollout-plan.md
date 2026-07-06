# Skill Englishization Rollout Plan

この文書は、Issue #402 の判断として、残り Amadeus skill の段階的英語化単位、優先順位、検証コマンドを定義する。

Issue #402 は展開単位の確定で完了するが、親 Issue #399 はこの文書で定義した RU002〜RU006 の実行完了まで閉じない。

Issue #395 の [Skill Language Policy](skill-language-policy.md)、Issue #400 の代表 skill 英語化、Issue #401 の [AI-DLC v2 Difference Response Plan](aidlc-v2-difference-response-plan.md) を前提にする。

## 方針

残り skill は一括で英語化しない。

phase または skill family 単位で PR を分ける。

各 PR は、翻訳変更、意味変更、昇格フロー、検証結果の境界を PR 説明に明記する。

templates、generated Amadeus DLC artifacts、`amadeus/**/*.md`、ユーザー向け gate text は日本語維持対象である。

## 現在の基準

| 区分 | skill |
|---|---|
| 英語化済みの代表 skill | `amadeus-construction-functional-design` |
| 残り source skill | `skills/amadeus*/SKILL.md` のうち `amadeus-construction-functional-design` を除く 31 件 |
| 昇格先 | `.agents/skills/amadeus*/SKILL.md` |

## 優先順位

| 優先 | Rollout Unit | 対象 skill | 先に扱う理由 | 事前条件 |
|---:|---|---|---|---|
| 0 | Representative foundation | `amadeus-construction-functional-design` | 小さい土台 PR で英語化、昇格フロー、検証方法を確認済み。 | 完了済み。 |
| 1 | AI-DLC v2 difference PRs | #391、#393、#392、#394 で触る skill | reviewer、sensor、Learn、Build and Test、Operation phase の判断が、後続英語化の語彙と意味保存に影響するため。 | #401 の順序に従う。 |
| 2 | Core entrypoints and verification | `amadeus`、`amadeus-steering`、`amadeus-validator` | 以後の stage skill が参照する単一公開入口、Space 初期化、検証の語彙を先にそろえるため。 | #394 の Operation phase 境界判断を反映済みであること。 |
| 3 | Construction stage skills | `amadeus-construction-nfr-requirements`、`amadeus-construction-nfr-design`、`amadeus-construction-infrastructure-design`、`amadeus-construction-code-generation`、`amadeus-construction-build-and-test`、`amadeus-construction-ci-pipeline` | 代表 skill と同じ phase であり、B001 から B004 の知見を最も直接再利用できるため。 | #391、#393、#392 の判断を反映済みであること。 |
| 4 | Inception stage skills | `amadeus-inception-reverse-engineering`、`amadeus-inception-practices-discovery`、`amadeus-inception-requirements-analysis`、`amadeus-inception-user-stories`、`amadeus-inception-refined-mockups`、`amadeus-inception-application-design`、`amadeus-inception-units-generation`、`amadeus-inception-delivery-planning` | Construction の入力成果物を作る phase であり、stage 間の用語をまとめてそろえる必要があるため。 | #391 と #393 の判断を反映済みであること。 |
| 5 | Ideation stage skills | `amadeus-ideation-intent-capture`、`amadeus-ideation-market-research`、`amadeus-ideation-feasibility`、`amadeus-ideation-scope-definition`、`amadeus-ideation-team-formation`、`amadeus-ideation-rough-mockups`、`amadeus-ideation-approval-handoff` | Intent の入口から Inception へ渡す語彙を、Inception との接続後にそろえるため。 | #391 と #393 の判断を反映済みであること。 |
| 6 | Supporting analysis and review skills | `amadeus-grilling`、`amadeus-domain-grilling`、`amadeus-domain-modeling`、`amadeus-event-storming`、`amadeus-decision-review`、`amadeus-history-review`、`amadeus-learning-review` | phase skill の語彙を固めた後、補助分析と review 系の語彙をそろえるため。 | Core entrypoints and verification の英語化完了。 |

## PR 分割

| PR Unit | 変更範囲 | 分割基準 |
|---|---|---|
| RU001 | AI-DLC v2 difference PRs | #391、#393、#392、#394 の各 Issue で別 PR にする。英語化だけの PR に混ぜない。 |
| RU002 | Core entrypoints and verification | `amadeus`、`amadeus-steering`、`amadeus-validator` を 1 PR にまとめる。差分が大きい場合は `amadeus` を単独 PR に分ける。 |
| RU003 | Construction stage skills | Construction stage skills を 1 PR にまとめる。`amadeus-construction-build-and-test` は #392 の判断後に含める。 |
| RU004 | Inception stage skills | Inception stage skills を 1 PR にまとめる。#391 と #393 の対象になった skill は、それらの PR で更新済みなら差分確認だけにする。 |
| RU005 | Ideation stage skills | Ideation stage skills を 1 PR にまとめる。`amadeus-ideation-rough-mockups` は #391 と #393 の判断を確認してから含める。 |
| RU006 | Supporting analysis and review skills | 補助分析と review 系 skill を 1 PR にまとめる。差分が大きい場合は domain 系と review 系に分ける。 |

2026-07-03 の人間指示（Issue #399 リカバリ）により、RU002〜RU006 は単一リカバリ PR（[PR #417](https://github.com/amadeus-dlc/amadeus/pull/417)）で統合実行した。この判断は対象 Intent の `construction/decisions.md`（CD007）に記録した。RU002〜RU006 の事前条件だった #391〜#394 の判断は未完了のままだが、統合 PR は翻訳だけを行い意味を変えないため衝突しない。#391〜#394 は英語化後の本文に対して継続する。

## 検証コマンド

各英語化 PR は、少なくとも次を実行する。

```sh
bun run dev-scripts/promote-skill.ts <skill-name> --replace
npm run test:it:promote-skill
npm run test:all
bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 260703-amadeus-skill-english-rollout-plan
git diff --check
```

複数 skill を変更する PR では、変更した全 source skill に対して `promote-skill.ts` を実行する。

`SKILL.md` の frontmatter description を変更した場合は、同じ skill の `agents/openai.yaml` の更新要否を確認する。

source skill と昇格先 skill の同期確認は、変更した skill ごとに行う。

## Preservation Pass

各英語化 PR は、変更した skill ごとに次を確認する。

| 区分 | 確認内容 |
|---|---|
| Trigger boundary | skill を起動すべき条件と起動してはいけない条件が変わっていない。 |
| Stage procedure | checkbox、audit event、gate、skip、resume、halt-and-ask の扱いが変わっていない。 |
| Artifact contract | 作成または更新できるファイルの一覧と日本語維持対象が変わっていない。 |
| Knowledge flow | `memory.md`、`decisions.md`、`traceability.md`、`grillings`、Domain Map、Context Map の役割が変わっていない。 |
| Promotion flow | `.agents/skills/**` は source skill から昇格フローで同期している。 |
| Metadata | `agents/openai.yaml` の更新要否を確認している。 |

## #391 から #394 との衝突回避

#391、#393、#392、#394 は、英語化単位の PR に混ぜない。

ただし、それらの PR で対象 skill を変更する場合、触った `SKILL.md` だけを英語文体へ寄せてもよい。

その場合は PR 説明で、AI-DLC v2 差分対応と英語化部分を分けて説明する。

RU002 から RU006 は、該当する #391、#393、#392、#394 の判断が merge 済みであること、または対象外であることを PR 説明に書く。

## Issue #402 の完了条件

Issue #402 は、この文書を含む PR が merge され、残り skill の英語化単位、優先順位、検証コマンド、#391 から #394 との衝突回避を追跡できる状態になった時点で完了とする。

残り skill の実際の英語化完了は、Issue #402 の完了条件に含めない。

ただし、残り skill の実際の英語化完了は、Issue #399 の完了条件に含める。
