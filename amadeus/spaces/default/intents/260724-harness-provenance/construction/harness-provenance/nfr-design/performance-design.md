# Performance Design — harness-provenance

上流入力(consumes 全数): performance-requirements.md, security-requirements.md, scalability-requirements.md, reliability-requirements.md, tech-stack-decisions.md, business-logic-model.md

## 設計

performance-requirements.mdのO(1)・最大5probe・判定1回を、business-logic-model.mdの固定priority ladderで実現する。security-requirements.mdのraw値非記録、scalability-requirements.mdの定数容量、reliability-requirements.mdのgraceful degradationを同じ分岐で保つ。tech-stack-decisions.mdどおり標準TypeScript/Bun以外を使わない。

## 最適化境界

- `handleIntentBirthStateBuild()`は`detectHarnessType()`を1回だけ呼び、local値をtemplateへ埋め込む
- type overrideと`CLAUDECODE=1`成立時はresolverを呼ばない
- non-env resolutionだけを`HarnessDirResolution`単位でprocess cacheする
- mappingは固定objectのown-key lookupとし、scanしない
- CWD probeは既存5候補で打ち切る

外部cache、pool、async化、worker、lazy loadingは処理量に対して過剰なため導入しない。

## 検証

call count、最大probe数、envのcache bypassをunit testで固定する。wall-clock比較は診断用で合否に使わず、既存runner timeoutと構造上限だけをgateとする。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-24T22:51:31Z
- **Iteration:** 1
- **Scope decision:** none

必須セクションと上流参照は構造検証を通過し、性能・scale・主要なfailure handling・依存方向・Infrastructure非該当判断は概ね整合しています。ただし、既存公開契約の設計への引き継ぎと、memory観測面の安全性検証が欠落しており、全NFRを実装・検証できる設計には未到達です。

### Findings

- [Major] reliability-design.md:5-25 と logical-components.md:9-28 は、reliability-requirements.md が互換性対象とする既存公開 `harnessDir(): string` を設計要素として扱っていません。privateな `Harness Dir Resolver` は示されていますが、既存public facadeが `resolveHarnessDir().dir` を返し、envのcall-time優先、非env resolution cache、string戻り値を維持する責務と回帰検証がありません。このままでは実装者がresolver置換時に既存呼出側のAPIまたはcache意味論を壊しても、NFR Design上は検出できません。Logical inventoryとReliability verificationへ、この互換adapterのowner・依存方向・保存契約・回帰テストを明示してください。
- [Major] security-design.md:11-21 はstate/memoryへ正規化値のみを保存すると規定する一方、negative verificationのraw marker探索対象からmemoryを落としています。reliability-design.md:19-25 もmemory template回帰だけで、reliability-requirements.mdが要求する実在観測entryの `Harness=<type>` 確認をrelease gateへ含めていません。FR-4の補助観測面がraw overrideを漏らさず正規化済みstate値を使うことを実証できないため、実観測entryで正規化値の存在とraw markerの不存在を検証し、synthetic entryを作らないtemplate回帰と併せてgate化してください。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-24T22:53:06Z
- **Iteration:** 2
- **Scope decision:** none

Iteration 1の2件のMajorは解消済みです。`harnessDir(): string`はpublic compatibility facadeとしてowner、依存方向、call-time env優先、非env resolution cache、fallback文字列および回帰テストが明記されました。memory観測面も、実観測entryでの正規化値存在とraw marker不存在、ならびに観測なしでsynthetic entryを生成しないtemplate回帰がsecurity/reliabilityの共通release gateへ追加されています。性能合否、Observability境界、failure handling、blast radius、Infrastructure非該当判断を含む成果物間の整合性も維持され、必須セクションと全上流参照の構造検証も通過しています。

### Findings

- None
