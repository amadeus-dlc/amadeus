# Code Summary — election-question-tally

## 結果

commit `63a8b317ee` で統合済みの U2 pure policy と tests を指定設計へ追跡した。voter × question resolution、receipt/append tie-break、early/late の question isolation、2-voter/3+ GoA policy、GoA4 の winner 除外、target/preserved partition、established digest、copy-on-write、mixed lifecycle は既存実装と tests で確認できた。

一方、BR-R6 が要求する resolved response の「definition voter 順 × question 順」に対し、既存実装は最初に観測した key の Map 挿入順を返していた。定義と逆順の ballot/response を与える regression test で Red を実測し、`resolveResponses` が canonical definition を受け、voter/question の定義 index で stable sort するよう最小修正した。未知 ID は並べ替え時に削除せず末尾に保持されるため、後段の `response-coverage` fail-closed 検査を迂回しない。

## 変更ファイル

| Path | 変更 |
|---|---|
| `packages/framework/core/tools/amadeus-election-question-tally.ts` | `resolveResponses` へ definition 入力を追加し、resolved response を定義 voter/question 順へ正規化 |
| `packages/framework/core/tools/amadeus-election-v2-cli.ts` | 既存 U2 call site から snapshot の canonical definition を渡す1行を追随変更 |
| `tests/unit/t549-election-question-tally.test.ts` | 逆順入力でも定義順出力になる regression test を追加し、既存 call を新 seam へ追随 |
| `tests/unit/t550-election-question-tally.pbt.test.ts` | 既存 property tests の call を新 seam へ追随 |
| `amadeus/spaces/default/intents/260813-election-multiq/construction/election-question-tally/code-generation/code-generation-plan.md` | Standard-depth plan、requirement traceability、完了 checkbox を記録 |
| `amadeus/spaces/default/intents/260813-election-multiq/construction/election-question-tally/code-generation/code-summary.md` | 実装判断、検証結果、逸脱を記録 |
| `amadeus/spaces/default/intents/260813-election-multiq/construction/election-question-tally/code-generation/pr-convergence-report.md` | local convergence evidence と未実施面を記録 |

stage diary の `memory.md` は protocol の標準4見出しで作成したが、共有 memory へ昇格させる新しい恒久学習はなかった。

## 要件トレーサビリティ

| Requirement / rule | 実装・検証 |
|---|---|
| FR-BAL-3、BR-R1〜R6 | `(voter, questionId)` key、receivedAt 後勝ち、receipt 同値 append 後勝ち、legacy unstamped 先行、submittedAt 非使用、definition 順 output。BR-R6 は新 regression test で固定 |
| FR-BAL-4、BR-L1〜L4 | question boundary ごとの onTime/late 分離と late GoA8 の `reexamRequired` を既存 unit test で確認 |
| FR-TAL-1〜5、BR-T1〜T9、BR-E1〜E3 | mixed established/hold、同じ internalNo の question isolation、GoA policy、GoA4 除外、question-keyed early map、cross-question PBT を確認 |
| FR-RER-1〜3、BR-P1〜P7、BR-S1〜S5 | hold-only target、overlap/coverage/digest mismatch rejection、preserved object identity/bytes 不変、full result assembly、partial/tallied lifecycle を確認 |
| NFR-1 | response resolution は Map 構築 O(R) と stable sort O(R log R)。tally/assembly は Map/Set と definition/response/choice の線形走査で、不要な question × choice 全組合せを生成しない |
| NFR-3/4、security controls | typed `TallyPolicyResult`、namespaced key、未知 response の保持後 rejection、deterministic ordering/digest、partial output を返さない failure を確認 |

## テストカバレッジ概要

- Unit: receipt order、append tie-break、legacy unstamped、definition ordering、mixed result、preservation、late classification、early tally、GoA holds、GoA4 exclusion、invalid partition/response。
- Property: 同一 receipt の later append が対象 voter-question pair だけを置換すること、question B の変更が question A の tally を変えないこと。
- Integration: mixed lifecycle の malformed state rejection、partial next の held reason/digest/store bytes、held-only rerun と stale/established-target ballot rejection。
- Test configuration: 既存の Bun test、TypeScript、Biome 設定を再利用した。新規設定ファイルは不要だった。

## 計画からの逸脱

計画作成時の非対象表では CLI を実装対象外としていたが、`resolveResponses` が definition を受ける契約へ変わったため、既存 production call site 1箇所の引数だけを追随変更した。CLI の分岐、state transition、永続化契約は変更していない。この追随を省くと typecheck が失敗し、本番経路が新しい ordering contract を利用できないため必要な統合差分である。

API/endpoint、repository、database migration、UI、configuration、deployment artifact は embedded pure library の U2 に適用されないため生成していない。NFR-2 の baseline/treatment 性能測定、full CI、coverage、formal verification は unit code-generation の focused verification を超えるため、後続 Build and Test / U7 / U8 へ残した。

## Blocker

未解決 `BLOCKER` はない。repository-wide lint は exit code 0 だが、既存範囲に 473 warnings / 17 infos を報告した。変更した U2 source/test 3 files の個別 Biome check は diagnostic なしで、追随変更した CLI file の警告3件は変更行ではなく既存関数 `reportElectionV2`、`parseDirective`、`main` の complexity warning である。
