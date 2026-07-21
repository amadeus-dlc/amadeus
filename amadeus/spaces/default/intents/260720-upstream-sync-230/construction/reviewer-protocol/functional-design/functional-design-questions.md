# Functional Design Questions — reviewer-protocol

> 上流入力(consumes 全数): `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`。
>
> 一次同期根拠: upstream commits `220f52b`（runtime UTC date / reviewer persona）と`7fa5479`（per-unit reviewer read scope）。
>
> E-OC1 判定: **質問0問**。leader承認 `2026-07-20T10:24:19Z`。

## 質問不要の根拠

U08の設計判断は承認済みRequirements Analysis、ADR-7/C6、Units Generationとupstream一次差分で閉じている。

- Reviewの日付はreviewer実行時の`date -u +%Y-%m-%dT%H:%M:%SZ`出力から取得し、モデル推定値や固定日付を使わない。
- reviewer persona/identityをReviewの先頭行に明示し、producer自身のreviewと誤認させない。
- per-unit reviewerの既定allow-listは、対象Unitの実在成果物、stage definition、Q&A、engineが渡した`directive.consumes`だけとする。
- omitted optional artifact、他Unit成果物、builderの`memory.md` / `plan.md`、record全体の再帰読取は禁止する。
- 追加readが不可避な場合は、読む前にpathと理由を明示し、対象findingに必要な最小範囲へ限定する。
- persona、stage protocol、orchestrator skill、reviewing knowledgeの正本を更新し、generatorで6 harnessへ投影する。`dist/`は手編集しない。

これらは新規仕様選択ではなく、FR-5 items 16–17の既決contractを既存reviewer invocation境界へ適用する作業である。現行配置のdiff-refreshでpathが変わっていても、意味を変えず正本へ再マップする。contract衝突が見つかった場合だけ停止し、選挙へ付議する。

## [Answer]

[Answer]: 質問0問で可。E-OC1でleader承認済み（`2026-07-20T10:24:19Z`）。既決6論点からの機械導出であり、新規仕様判断はない。

## Q1: spot-check追加readの事前開示・承認/拒否・監査をどう閉じるか

E-OC1分類（`2026-07-20T14:55:47Z`）により、本問は未決design judgmentとして選挙へ付議する。upstream `7fa5479`は、current Unitが具体的integration pointを明示し、passed shared contractからownerを一意解決できる場合だけ、単一owner fileのspot-checkを許す。browse/search/sweepは許さない。一方、Amadeusの既決Q&Aは追加read前のpath/reason明示も要求するため、その承認主体と監査面を確定する必要がある。

### 候補

- A: 人間承認gateを都度挟む。reviewerはreadせず`SpotCheckRequest { integrationId, path, reason, ownerEvidence }`を返し、orchestratorがpath/reasonを番号付きgateで提示する。明示承認後だけ、その単一pathを次のreview invocationのpass-listへ追加する。拒否・無回答・owner不明/複数は追加read 0で、current design/shared contract findingへ閉じる。`HUMAN_TURN`と最終Reviewのscope-decision記録を監査証拠にする。
- B（推奨）: closed predicateによる決定的自動承認とする。orchestratorがread前に、(1) current designの具体的integration ID、(2) passed contractによる単一owner path、(3) shape確認に必要な理由、(4) pathが単一fileでbrowse/search由来でないこと、を全て検証した時だけ一時pass-listへ追加する。いずれか欠落なら自動拒否し追加read 0。承認/拒否、path、reason、owner evidenceをreviewer promptと最終Reviewの`Scope decision`へ残し、既存subagent/audit記録から追跡可能にする。新しい人間gate・audit eventは追加しない。
- C: spot-check carve-outを廃止する。pass-list外readは常に拒否し、shared contractだけで検証不能ならcurrent design/shared contract findingとする。権限境界は最も単純だが、upstreamが明示的に許す単一file確認を失い、実在するcross-unit integrationにfalse NOT-READYを増やす。

### failure / compatibility tradeoff

- Aは人間統制と監査の反証可能性が最大だが、reviewごとに追加round-tripが発生し、既存stage gateとは別の新しいpermission gateになる。
- Bはupstreamのone-file carve-outとAmadeusの事前path/reason開示を両立し、通常reviewを止めない。predicate実装やscope-decision記録が欠けるとsilent scope expansionになるため、fail-closed fixtureが必須。
- Cはscope逸脱を構造的に排除するが、upstream互換性とintegration実在確認能力を下げる。

### 必要test

- positive: current designが具体的IDを明示し、passed contractが単一owner fileを解決し、path/reasonをread前に記録した場合だけ1 fileを読める。
- negative: ID未記載、owner 0/複数、reason空、path不一致、directory/glob/grep/shell wildcard、2 file目、事後記録、拒否後readを全てscope violationとしてreview無効化する。
- 承認/拒否の再実行でpass-listと監査記録が増殖せず、拒否時はsibling bytes・Review本文・auditに未承認read成功証拠が残らないことを検証する。

[Answer]: B。E-USSU08FD1で3–0、GoA favor 3、留保なし。orchestratorはread前に、(1) current designの具体的integration ID、(2) passed contractから一意解決したsingle owner path、(3) claimed shape確認に必要な非空reason、(4) directory/glob/grep/shell wildcardやbrowse/search由来でない単一file path、の4条件ANDを評価する。全成立時だけapproved pathを当該invocation限定pass-listへ追加し、欠落・owner 0/複数・path不一致ならrejectedで追加read 0とする。decision/path/reason/ID/owner evidenceはread前にreviewer promptへ固定し、最終Reviewと既存subagent/auditで追跡する。新eventは追加しない。拒否後・decision前・approved path外のreadはreview全体を無効にする。根拠: `leader/amadeus/spaces/default/elections/E-USSU08FD1/record.md`。
