# Security Requirements — convergence-budgets

上流入力（consumes 全数）: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`

## Retry Authorization と Effect Safety

`requirements.md` FR-03、`business-logic-model.md` のv1 allowlist、`business-rules.md` BR-CB-07〜12C、`technology-stack.md` の既存local executionモデルを適用する。retryは利便性ではなくeffect安全性の共有core判定であり、adapterやLLMが昇格してはならない。

| ID | Requirement | Blocking verification |
|---|---|---|
| SR-CB-01 | `retryClass`／`effectStatus`／`causeCode`／`sourceSurface`の4 field完全一致だけを許可 | v1 4 allow行のpositiveとcross-product全negative fixture |
| SR-CB-02 | `effectStatus=no-effect-confirmed`以外の自動retry 0件 | effect-possible／unknown／missingの全variantがsafe-stop |
| SR-CB-03 | auth、authorization、permission、config、validation、canonical writeの自動retry 0件 | 各error classでattempt／counter増分0 |
| SR-CB-04 | approval、gate、GitHub mutation、release、publish、任意toolの新規retry 0件 | source-surface registryに未登録であることをschema snapshot化 |
| SR-CB-05 | unknown allowlist versionをfail-closed | raw versionをreasonへ保持し、native dispatch 0件 |
| SR-CB-06 | adapterによるcap／rule上書き0件 | forged adapter cap／rule IDをcoreが拒否 |
| SR-CB-07 | retry notificationにsecret／raw error本文を含めない |表示はrule ID、ordinal、remaining、typed reasonだけでsentinel 0 hit |

## Abuse Resistance と Audit

- session ID、worker ID、adapter名をBudgetSubject identityへ含めず、値を変えてcapを回避できないようにする。
- configは初回reserveでversion／digest／effective capを固定し、途中のenv変更で延長しない。hard cap超過設定はstage開始前に拒否する。
- allowlist変更はversion、rule ID、positive／negative conformance、影響adapter mappingを同一Pull Requestで更新する。
- canonical write failureは同じjournalへretry記録を試みず、`persisted:false` refusalでnative開始を止める。
- termination recordにはprompt、回答、stack trace全文を保存せず、closed reason code、budget fact、last durable progress、推奨行動だけを保持する。

## Compliance と Harness Neutrality

- 本Unitは新しいcredential、network egress、個人情報を扱わない。data classificationはoperational metadataのまま維持する。
- Codexで長時間化が顕著でも、Stop budget、retry allowlist、termination reasonは全supported harness共通とする。
- native surfaceがeffect queryを提供できない場合は`unknown`が正しいcapability結果であり、retryableへ推測しない。
- security conformance未実装のadapterはpackage可能でもUnit受入をblockingする。
