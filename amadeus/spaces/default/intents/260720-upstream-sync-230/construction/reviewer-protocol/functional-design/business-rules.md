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
| BR-U08-06 | 既定read scopeはstage definition、Q&A、current Unitの実在成果物、per-unit時の`directive.consumes`だけ。 | pass-list外readを拒否 |
| BR-U08-07 | missing optional、`memory.md`、`plan.md`、reasoning、record rootを渡さない。 | builder reasoning漏出/無駄read |
| BR-U08-08 | sibling Unitはfile open、grep、glob、shell patternの全手段で横断禁止。 | review無効、finding化 |
| BR-U08-09 | system-wide shared contractの他Unit entryをcurrent Unitのunreferenced findingにしない。 | false NOT-READYを拒否 |
| BR-U08-10 | spot-checkはcurrent designが明示したintegration IDをshared contractでowner解決できる場合の単一fileだけ。 | browse/search/sweepを禁止 |
| BR-U08-11 | shared contractで解決不能ならdesign/contract findingとし、read scope拡大に使わない。 | scope bypassを拒否 |
| BR-U08-12 | reviewerはprimary artifactへのReview append以外を変更しない。 | independent read-only境界違反 |
| BR-U08-13 | public seamは`reviewerReadScope(unit, consumes)`と`runtimeReviewIdentity(persona, utcDate)`の正準signatureだけ。 | 未承認public APIを拒否 |
| BR-U08-14 | spot-check承認は具体的ID、passed contractの単一owner path、非空reason、非browse/searchの単一file pathの4条件ANDだけ。 | 一条件でも欠ければ自動拒否・read 0 |
| BR-U08-15 | decision、path、reason、integration ID、owner evidenceをread前に固定し、approved pathだけを当該invocation限定pass-listへ追加する。 | 事後承認・暗黙継承を拒否 |
| BR-U08-16 | rejected後、decision前、approved path外、2 file目のreadはreview全体を無効にする。 | 独立review完了証拠に不算入 |
| BR-U08-17 | scope decisionは最終Reviewと既存subagent/audit記録で追跡し、新audit eventを追加しない。再実行は増殖させない。 | provenance/idempotency failure |

## Pass-list construction rules

- required成果物は全て実在必須。optional成果物は実在するものだけを追加し、未生成候補pathをreviewerへ渡さない。
- per-unitでないstageは`directive.consumes`追加規則を機械適用しない。engine directiveが明示したcontextだけを使う。
- path集合はnormalized absolute/record-relative ownershipを検証し、current Unitのslug境界を保つ。文字列prefixだけでsiblingをcurrent扱いしない。
- validation commandはstage定義由来に限定し、scope拡大を伴うad-hoc recursive scanを追加しない。

## Spot-check decision table

| 条件 | 許可 |
|---|---|
| current artifactが具体的integration pointを明示しない | sibling read 0 |
| IDはあるがpassed contractでowner不明 | readせずfinding |
| passed contractがowner fileを一意に解決 | そのfile 1件だけopen可 |
| owner候補が複数 | readせずambiguous contract finding |
| `construction/*/` grep/globでowner探索 | 常に禁止 |
| owner file確認後に同directoryを追加探索 | 常に禁止 |
| path/reason/ID/evidence/decisionがread前に未記録 | read 0、review無効 |
| rejected後またはapproved path以外をread | review無効 |

## Projection and compatibility rules

- authored core persona/protocol/knowledgeと、独立authoringされる6 harness skill surfaceを同じcommitで更新する。
- `dist/`とself-install treeは生成物であり手編集しない。6 package面と4 self-install面を混同しない。
- reviewerを持たないstage、non-per-unit stage、existing verdict semanticsは変更しない。
- runtime dependency、network、new service/UI/database entityを追加しない。

## Verification rules

- t200相当testで2 reviewer templateのDate command、guess禁止、checker personaを固定する。
- t217相当testでprotocol、architecture persona、reviewing knowledge、6 harness skillの`directive.consumes`とtool-agnostic sibling banを固定する。
- positive spot-checkは4条件、read前decision、invocation限定single path、既存Review/subagent/audit追跡をassertする。
- negative controlsはIDなし、owner 0/複数、reason空、path不一致、directory/file 2件目、grep/glob/shell、browse/search、事後記録、拒否後readを全数持つ。
- `bun run typecheck`、`bun run lint:check`、targeted content tests、`bun run dist:check`、`bun run promote:self:check`をBolt gateへ渡す。
