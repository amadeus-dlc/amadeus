# Business Rules — election-canonical-schema

## Sources and ownership

[unit-of-work](../../../inception/units-generation/unit-of-work.md)、[unit-of-work-story-map](../../../inception/units-generation/unit-of-work-story-map.md)、[requirements](../../../inception/requirements-analysis/requirements.md)、[components](../../../inception/application-design/components.md)、[component-methods](../../../inception/application-design/component-methods.md)、[services](../../../inception/application-design/services.md) からU1のvalidation/canonicalization ruleを抽出する。違反時はwrite前にtyped errorを返す。

## Schema rules

| Rule | Contract | Violation |
|---|---|---|
| BR-S1 | v2は`schemaVersion`がexact integer `2` | unsupported-version / invalid-value |
| BR-S2 | version absentの入力はstrict legacy scalar shapeだけ受理 | ambiguous-schema |
| BR-S3 | v2/legacy fieldのhybridを拒否 | ambiguous-schema |
| BR-S4 | versionごとのwhitelist外fieldを拒否 | unknown-field with JSON path |
| BR-S5 | decode失敗時に別versionへfallbackしない | original errorを返す |
| BR-S6 | new encodeはv2だけ | legacy encoderを公開しない |

## Definition rules

| Rule | Contract | Violation |
|---|---|---|
| BR-D1 | electionIdはnon-empty string | invalid-value |
| BR-D2 | questionsは1件以上 | invalid-value |
| BR-D3 | questionIdはnon-empty、whitespace-only不可、exact-match一意 | duplicate-id / invalid-value |
| BR-D4 | questionIdは受理後にtrim/lowercase/hash/index変換しない | encoder/round-trip test failure |
| BR-D5 | question textはnon-empty string | invalid-value |
| BR-D6 | choicesはquestionごと1件以上 | invalid-value |
| BR-D7 | internalNoはintegerかつ同一question内一意 | invalid-value / duplicate-id |
| BR-D8 | 同じinternalNoは別questionで再利用可 | rejectしてはならない |
| BR-D9 | votersは1件以上のnon-empty stringでexact-match一意 | invalid-value / duplicate-id |
| BR-D10 | legacy questionIdは常にliteral `legacy-question` | 他の導出値を拒否 |
| BR-D11 | v2 authoringで予約ID `legacy-question`を使用しない | invalid-value |

## Ballot and response rules

| Rule | Contract | Violation |
|---|---|---|
| BR-B1 | responsesはnon-empty、questionId一意 | invalid-value / duplicate-id |
| BR-B2 | response questionIdはdefinition内に存在 | missing-reference |
| BR-B3 | choiceInternalNoは参照questionのchoicesに存在 | missing-reference |
| BR-B4 | GoAは1〜8のinteger | invalid-value |
| BR-B5 | GoA 2/3/6はnon-empty reservation必須 | invalid-value |
| BR-B6 | originalのresponse IDsはtarget IDsと集合一致 | coverage-mismatch |
| BR-B7 | amend responsesはtarget IDsのnon-empty subset | coverage-mismatch |
| BR-B8 | amendはtarget外/established questionを含めない | coverage-mismatch |
| BR-B9 | electionId/voter/ref/timestamp shapeは既存identity contractを維持 | invalid-value / missing-reference |
| BR-B10 | legacy scalar ballotは`legacy-question` response 1件になる | canonical equivalence failure |

## Tally rules

| Rule | Contract | Violation |
|---|---|---|
| BR-T1 | resultsはdefinitionの全question IDをちょうど1件ずつ覆い、unknown IDなし | duplicate-id / coverage-mismatch / missing-reference |
| BR-T2 | established winnerは当該question choice | missing-reference |
| BR-T3 | choiceCountsは全choicesを重複なく覆い、count≥0 integer | coverage-mismatch / invalid-value |
| BR-T4 | GoaCounts各値は≥0 integer | invalid-value |
| BR-T5 | hold reasonはclosed vocabulary | invalid-value |
| BR-T6 | targetQuestionIdsは一意なdefinition subset | duplicate-id / missing-reference |
| BR-T7 | legacy runIdはcanonical scalar payloadのdomain-separated identity | nondeterminism test failure |
| BR-T8 | legacy holdはcanonical partialへ正規化 | canonical equivalence failure |

## Determinism and complexity rules

- BR-C1: canonical serializationはschema field順とdefinition順を使用する。
- BR-C2: absent optional fieldとexplicit nullを混同しない。
- BR-C3: established digestはestablished resultsだけをdefinition順で含める。
- BR-C4: digestにtimestamp/path/record proseを含めない。
- BR-C5: parse/validationはQ+C+V+Rに対してO(n)またはO(n log n)。nested全組合せ探索を禁止する。
- BR-C6: read-only decode/verifyは入力byteを変更しない。

## Rule precedence

1. object/version/field shape
2. identity uniqueness
3. reference existence
4. scalar content (GoA/reservation/count)
5. coverage/cross-field invariants
6. canonicalization/digest

同一入力のerrorを安定させるためこの順序で最初の違反を返す。複数finding列挙はverification unitの責務で、constructorはinvalid valueを構築しないことを優先する。

## Traceability

- FR-DEF-1〜3 → BR-D1〜D11
- FR-BAL-1〜3 → BR-B1〜B10
- FR-COMP-1/2/4 → BR-S1〜S6、BR-T7/T8、BR-C1〜C6
- NFR-1/3/4 → BR-C1〜C6、rule precedence
