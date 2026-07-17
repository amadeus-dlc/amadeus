# Component Methods — codekb diff3 cleanup(Issue #1129)

上流入力(consumes全数): `requirements.md`、`architecture.md`、`component-inventory.md`、`team-practices.md`。

## Public Method Surface

`requirements.md` がapplication / framework source、API、schema、dependencyの変更を禁止しているため、新規の実装methodとpublic API surfaceはない。以下はコード化するmethod signatureではなく、既存git / 全数走査を用いる検証手順の入出力契約である。`architecture.md` と `component-inventory.md` の既存実行コンポーネントにmethodを追加しない。

## Verification Operation Contracts

| Operation | Input | Output | Error handling |
|---|---|---|---|
| `recordMeasurementRef` | explicit git ref | resolved commit SHA | refが解決できなければ停止 |
| `scanMarkerVocabulary` | SHA、対象2 path、`<<<<<<<` / `|||||||` / `=======` / `>>>>>>>` | path×語彙ごとの行頭一致件数 | 1件以上はclean拒否、該当file:lineを保持 |
| `countHeadings` | SHA、対象2 path | 最新H2件数、`260715-opencode-cursor-harness`履歴H2件数 | どちらかが1件でなければ停止 |
| `checkFixAncestry` | 測定SHA、`5e92d1516ba44856f1ec039e7b1eadebbfb4c8c0` | ancestor / non-ancestor | content判定と分離し、単独でcleanとしない |
| `evaluatePreLandingEvidence` | 上記3結果、CI verdict、review / sensor / gate / push SHA | gate-ready / stop + reason | CI verdictがmissing / non-greenまたは他の証拠が不足なら、目視補完せずfail-closed |
| `verifyLandedMain` | human landing後の明示main ref | 同じmarker / H2件数とclose-eligible / stop | branch結果の流用を禁止 |

## Type and Result Semantics

- `MeasurementRef` = `{ ref: string, sha: fullCommitSha }`。`ref` の文字列だけを証拠にしない。
- `MarkerCounts` = 対象pathと4語彙ごとの非負整数。合計値に畳まない。
- `HeadingCounts` = 対象pathごとの `{ latest: 1, history260715: 1 }` を唯一のpass形とする。
- `Ancestry` = `ancestor | non-ancestor`。どちらでもcontent scanを必須とする。
- `PreLandingVerdict` = `gate-ready | stop`。`gate-ready` はpre-landing文脈の `pass`、`stop`は理由と測定SHAを必ず伴う。
- `PostLandingVerdict` = `close-eligible | stop`。`close-eligible` はpost-landing文脈の `pass`、`stop`は理由とlanded main SHAを必ず伴う。

## Non-interfaces

`team-practices.md` のno-AI-merge境界により、`mergePullRequest`、`closeIssue`、`publishRelease`、AWS provision、UI renderに相当するmethodは本設計に定義しない。
