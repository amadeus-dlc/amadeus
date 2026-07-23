# Performance Requirements — U2 plugin-skeleton

上流入力: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。

## Compile 予算

- plugin 0件時のcompile出力は拡張前とbyte-identicalで、走査追加による意味的変更を持たない。
- plugin discoveryはplugin/stageファイル数に対してO(n)とし、同一ファイルを重複parseしない。
- 100 plugin・各1 stage・各stage 4KiBの固定fixtureを使用する。同一processでwarm-up 2回後、0-plugin baselineと100-plugin treatmentを交互に10回測定し、中央値の追加時間20%以内かつ各回10秒未満とする。

## 計測

- OS、CPU、Bun版、fixture hash、実行順、compile時間、発見件数、出力hashを同一benchmark reportへ記録する。
- formal model実行時間はU3の責務であり、plugin discoveryの指標へ混在させない。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T15:15:32Z
- **Iteration:** 1
- **Scope decision:** none

NFRカテゴリの網羅性、再現可能な性能判定、plugin実行時の信頼境界が未定義です。

### Findings

- Major: NFRカテゴリの定量要件または理由付きN/Aとplugin trust modelが不足。
- Major: benchmark fixtureと測定条件が未固定。
- Major: symlink/TOCTOUを含むcanonical path手順が未定義。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T15:20:55Z
- **Iteration:** 2
- **Scope decision:** none

前回指摘は概ね閉包。安全なファイル読取とtrust grantにMajor 2件が残るものの、判定規則上READYです。

### Findings

- Major — open時のsymlink非追跡、open済みfdのfstat、同一fd read、およびunsupported platformのfail-closed契約が不足しています。
- Major — composeを人間レビューによるtrust grantとするか、署名/provenance検証・永続化・失効ownerを定義する必要があります。
- Minor — CLI-onlyのmemory/CPU ceilingおよびmonitoring/alerting/tracingについて数値化または理由付きN/Aが不足しています。
- Minor — 読取不能・schema不正・未知sensor idの固定code、stderr schema、exit対応表が不足しています。
- Resolved — benchmark条件と代替案の指摘は閉包しました。
