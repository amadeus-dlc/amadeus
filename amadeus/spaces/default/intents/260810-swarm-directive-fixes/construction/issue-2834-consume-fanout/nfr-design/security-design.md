# Security Design — issue-2834-consume-fanout

入力: [`business-logic-model.md`](../functional-design/business-logic-model.md)。NFR Requirementsはself-feature scopeでexpected skipのため、宣言済みSEC identifierは存在しない。

## Path Trust Boundary

stage graphのartifact template、宣言Unit slug、outcome projectionはいずれも構造入力として検証する。fan-out前にtemplateのproducer identityとrequired属性、declared/outcomeの1対1対応を確認する（`business-logic-model.md:5-15`）。曖昧・unknown・blocking・0 Unitではpathを生成しない。

path配置と正規化は既存producer resolver契約を維持し、今回の限定経路では置換後に未解決`{unit-name}`が残る場合だけfail-closedする。汎用path sanitationや正当なskeleton / `--single` placeholderを扱う別経路へ検証を拡張しない（`business-logic-model.md:17-29`）。

## Filesystem and Reviewer Authority

pure fan-out componentはfilesystemを読まず、templateと公開outcome入力からconcrete path値だけを返す。presence adapterはrecord root内の存在判定だけを行い、file作成・修復・削除をしない。disk read failure時はpartial directiveを破棄する。

reviewer guardはdirectiveの`expected:false` required gapをreview開始前に拒否し、present `consumes`だけをread scopeへ保持する（`business-logic-model.md:48-52`）。guardはscopeを拡張して任意pathを読まず、directiveを書換えず、`expected:true`の既存contractを変更しない。

## Integrity and Information Disclosure

- stable Unit order × artifact orderとfirst-occurrence dedupeで同一snapshotの再現性を保つ。
- inventory drift errorにはexpected / actual consumer slugと`consumer:artifact` edgeだけを載せ、file内容や環境変数を含めない。
- required artifactの存在をfile内容の妥当性と誤認せず、後続reviewerが許可scope内で内容を検証する。
- path validation error、presence read error、inventory mismatchはいずれも`kind:"error"` / cursor unchangedへ写像する。

## Verification

TDDでunresolved placeholder、ambiguous Unit、inventory drift、presence read failureを故障注入し、partial `consumes`が返らないことを確認する。reviewer guardには`expected:false` gapを注入してreview開始前に拒否されることを検証する。`t116` / `t186`の正当なplaceholderとupstream-coverage sensorは回帰greenを維持する。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-10T14:50:30Z
- **Iteration:** 1
- **Scope decision:** none

U2のNFR設計は、graph metadata・declared Unit・公開outcome入力の検証、blocking/ambiguous/zero populationと未解決placeholderのfail-closed、read-only presence判定、partial result禁止、reviewer scopeの非拡張を具体化しています。論理構成もpure resolver/fanout、presence adapter、orchestrator adapter、reviewer guardの責務を分離し、U1 projection・failure領域・Stop hookへの逆依存や変更を排除しています。限定経路だけを変更するscope、既存path normalization、expected:true互換、短命Bun CLIの実行モデルとも整合しており、実装可能です。

### Findings

- None
