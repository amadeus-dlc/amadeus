# Business Rules — reviewer-protocol

> 上流入力(consumes 全数): `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`。

## Review record invariants

正準public seamは次の2 signatureだけである。

```ts
function reviewerReadScope(unit: UnitRef, consumes: readonly ArtifactRef[]): ReadScope;
function runtimeReviewIdentity(persona: ReviewerPersona, utcDate: string): ReviewHeader;
```

| ID | ルール | 失敗時 |
|---|---|---|
| BR-U08-01 | ReviewのDateは書込直前にshellで実行した`date -u +%Y-%m-%dT%H:%M:%SZ`の実出力である。 | 推定/固定日付を拒否 |
| BR-U08-02 | Reviewerはproducerでなく実際のchecker personaを記録する。 | maker-checker誤帰属 |
| BR-U08-03 | Review recordはVerdict、Reviewer、Date、Iterationを全て持つ。 | incomplete reviewとしてREADY不可 |
| BR-U08-04 | architecture/productの各reviewing templateは対応するreviewer persona名を一意に持つ。 | content test失敗 |
| BR-U08-05 | reviewer resultの先頭でidentityを機械抽出可能にする。 | audit identity不明として差戻し |

## Read-scope invariants

| ID | ルール | 失敗時 |
|---|---|---|
| BR-U08-06 | §12aが宣言する既定read scopeは`stage_file`、current Unitの実在`produces`、present `directive.consumes`だけであり、Q&Aは`directive.consumes`に明示された場合だけ含める。このdeclared pass-listをauthoritative scopeとする。 | pass-list外requestを拒否 |
| BR-U08-07 | missing optional、`memory.md`、`plan.md`、reasoning、record rootを渡さない。 | builder reasoning漏出/無駄read |
| BR-U08-08 | sibling Unitを対象とするfile open、grep、glob、shell patternのrequestはdeclared transcriptで全て拒否する。 | Review/READY証拠不受理、finding化 |
| BR-U08-09 | system-wide shared contractの他Unit entryをcurrent Unitのunreferenced findingにしない。 | false NOT-READYを拒否 |
| BR-U08-10 | spot-checkはcurrent designが明示したintegration IDをshared contractでowner解決できる場合の単一fileだけ。 | browse/search/sweepを禁止 |
| BR-U08-11 | shared contractで解決不能ならdesign/contract findingとし、read scope拡大に使わない。 | scope bypassを拒否 |
| BR-U08-12 | reviewerはprimary artifactへのReview append以外を変更しない。 | independent read-only境界違反 |
| BR-U08-13 | public seamは`reviewerReadScope(unit, consumes)`と`runtimeReviewIdentity(persona, utcDate)`の正準signatureだけ。 | 未承認public APIを拒否 |
| BR-U08-14 | spot-check承認は具体的ID、passed contractの単一owner path、非空reason、非browse/searchの単一file pathの4条件ANDだけ。 | 一条件でも欠ければ自動拒否・accepted request 0 |
| BR-U08-15 | `check-read`をspot-check requestの唯一の受理経路とし、decision、path、reason、integration ID、owner evidenceをrequest前に固定する。approved pathだけを当該invocation限定pass-listへ追加する。 | bypass・事後承認・暗黙継承を拒否 |
| BR-U08-16 | `complete-review`はrun-stage directive、current artifacts、passed consumesからdeclared Scope decision transcriptを全件再検証する。`check-read`を通らない、改竄された、rejected、approved path外、2 file目のrequestを含むresultはReview/READY証拠として受理しない。 | 独立review完了証拠に不算入 |
| BR-U08-17 | scope decision transcriptはsubagent prompt/result間だけのtransient carrierとし、最終Reviewには`complete-review`が再検証したScope decision projectionを永続記録する。既存auditはinvocation identity/completionを保持する。新audit event、read ledger、storeを追加せず、再実行はprojectionを増殖させない。 | provenance/idempotency failure |

## Pass-list construction rules

- required成果物は全て実在必須。optional成果物は実在するものだけを追加し、未生成候補pathをreviewerへ渡さない。
- per-unitでないstageは`directive.consumes`追加規則を機械適用しない。engine directiveが明示したcontextだけを使う。
- path集合はnormalized absolute/record-relative ownershipを検証し、current Unitのslug境界を保つ。文字列prefixだけでsiblingをcurrent扱いしない。
- validation commandはstage定義由来に限定し、scope拡大を伴うad-hoc recursive scanを追加しない。

## Spot-check decision table

| 条件 | 許可 |
|---|---|
| current artifactが具体的integration pointを明示しない | sibling request 0 |
| IDはあるがpassed contractでowner不明 | readせずfinding |
| passed contractがowner fileを一意に解決 | そのfile 1件だけopen可 |
| owner候補が複数 | readせずambiguous contract finding |
| `construction/*/` grep/globでowner探索 | 常に禁止 |
| owner file確認後に同directoryを追加探索 | 常に禁止 |
| path/reason/ID/evidence/decisionがrequest前に未記録 | request拒否、Review/READY不受理 |
| rejected、approved path外、2 file目のrequestをresultが宣言 | Review/READY不受理 |
| `check-read` receiptなし、またはprompt/result間でtranscriptを改竄 | Review/READY不受理 |

## Projection and compatibility rules

- authored core persona/protocol/knowledgeと、独立authoringされる6 harness skill surfaceを同じcommitで更新する。
- `dist/`とself-install treeは生成物であり手編集しない。6 package面と4 self-install面を混同しない。
- reviewerを持たないstage、non-per-unit stage、existing verdict semanticsは変更しない。
- runtime dependency、network、new service/UI/database entityを追加しない。

## Verification rules

- t200相当testで2 reviewer templateのDate command、guess禁止、checker personaを固定する。
- t217相当testでprotocol、architecture persona、reviewing knowledge、6 harness skillの`directive.consumes`とtool-agnostic sibling banを固定する。
- positive spot-checkは4条件、request前decision、`check-read`受理、invocation限定single path、prompt/result transcriptとReviewの再検証済みprojectionの一致をassertする。
- negative controlsはIDなし、owner 0/複数、reason空、path不一致、directory/file 2件目、grep/glob/shell、browse/search、事後記録、rejected/outside request、`check-read` bypass、transcript改竄を全数持つ。実tool/syscallによる不可視readの完全捕捉は本Unitの要件・合格条件にしない。
- `bun run typecheck`、`bun run lint:check`、targeted content tests、`bun run dist:check`、`bun run promote:self:check`をBolt gateへ渡す。
