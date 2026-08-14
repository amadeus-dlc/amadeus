# Code Summary — election-canonical-schema

## 結果

commit `93cfb99916` で統合済みの U1 codec と tests を指定設計へ追跡した。v2/legacy の単一判別、unknown field rejection、question/choice/voter identity、ballot reference/coverage、tally completeness、definition 順 canonical encode、established-only digest は既存実装と tests で確認できた。

legacy definition の scalar `question` は、承認済み BR-D5 の `non-empty string` と FR-COMP-1 の後方読み取り互換性に従い、empty string だけを拒否する。Reviewer Iteration 1 の指摘を受け、whitespace-only 値を拒否する `nonBlank` 判定を撤回し、非 string は `shape`、empty string は `invalid-value`、whitespace-only string は入力値を変えず受理する境界を regression test で固定した。

## 変更ファイル

| Path | 変更 |
|---|---|
| `packages/framework/core/tools/amadeus-election-codec.ts` | legacy scalar `question` の型と empty string を分けて検査し、whitespace-only 互換性を維持 |
| `tests/unit/t547-election-codec.test.ts` | empty string rejection と whitespace-only exact preservation の regression assertion を追加 |
| `amadeus/spaces/default/intents/260813-election-multiq/construction/election-canonical-schema/code-generation/code-generation-plan.md` | Standard-depth plan、要件追跡、完了 checkbox を記録 |
| `amadeus/spaces/default/intents/260813-election-multiq/construction/election-canonical-schema/code-generation/code-summary.md` | 本実装・検証結果を記録 |
| `amadeus/spaces/default/intents/260813-election-multiq/construction/election-canonical-schema/code-generation/pr-convergence-report.md` | local convergence evidence と未実施面を記録 |

## 要件トレーサビリティ

| Requirement / rule | 実装・検証 |
|---|---|
| FR-DEF-1〜4、BR-D1〜D11 | U1 は multi-question canonical schema、stable question ID、question-owned choices、definition 順を所有。FR-DEF-4 の distribution view/transport 実装は U4 が所有 |
| FR-BAL-1/2、BR-B1〜B10 | response identity/reference、GoA/reservation、original exact coverage、amend subset/established rejection |
| FR-COMP-1/2、BR-S1〜S6 | strict legacy normalization、hybrid/unknown version rejection、new encode の v2 固定 |
| BR-T1〜T8、BR-C1〜C4 | result complete coverage、choice count completeness、definition-order encode、stable legacy runId と established digest |
| NFR-3 | typed `ElectionCodecResult` による fail-closed rejection。legacy question は empty string のみ拒否し、承認済み互換性を狭めない |
| NFR-4 | round-trip PBT、canonical ordering、runId/timestamp 非依存 established digest test |

FR-DEF-4 は分割 ownership である。U1 は全 question ID、質問文、choices とその決定的な定義順を運べる canonical model/schema を所有し、U4 はその値から blind distribution view を構成・配送する実装を所有する。tally policy は U2、store は U3、CLI は U5、migration は U6、formal model は U7、横断 distribution/verification は U8 の責務であり、本 unit では変更していない。

## テストカバレッジ概要

- Unit test: strict legacy/v2 definition、hybrid/unknown/unknown-field、duplicate ID、ballot reference/coverage、tally coverage/choice reference、canonical ordering/digest。
- Property test: generated v2 definition/ballot/tally の encode/decode round-trip、duplicate question ID、ballot/tally coverage deletion の fail-closed rejection。
- Regression test: legacy scalar `question` の `""` は `invalid-value` として拒否し、`"  "` は exact value のまま受理。

## 計画からの逸脱

Reviewer Iteration 1 で、初回実装判断の whitespace-only rejection が承認済み契約を狭めると判明したため、empty-only rejection へ是正した。設計入力は変更せず、source/test の最小差分と ownership 記述だけを修正した。API/endpoint、repository、database、configuration、deployment artifact は U1 に適用されないため生成していない。test configuration は既存の Bun/TypeScript/Biome 配線を再利用し、新規設定ファイルを追加していない。

## Blocker

未解決 `BLOCKER` はない。repository 全体の lint は exit code 0 だが U1 変更対象外の path に 473 warnings / 17 infos を報告した。U1 対象3 files の個別 Biome check は diagnostic なしである。
