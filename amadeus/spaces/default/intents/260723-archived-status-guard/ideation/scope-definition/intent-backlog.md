# Intent Backlog — 260723-archived-status-guard(proto-Units)

上流入力(consumes 全数): intent-statement、feasibility-assessment、constraint-register。

## proto-Unit 一覧

scope-document の S1〜S5 を units-generation 入力の proto-Unit へ分解した。分解根拠は feasibility-assessment の seam 実測(updateIntentStatus 単一 chokepoint・ガード3経路)と intent-statement の達成基準4点。各 Unit は constraint-register の C1〜C8(裁定・Mandated・整合条件)を横断制約として負う — 特に C6(正本+dist/self-install 同期)は全 Unit、C7(#1309 語彙一致の機械確認)は U1 の完成条件。

| proto-Unit | 要旨 | 依存 | 概算規模(行) |
|---|---|---|---|
| U1 status-enum | enum 型+updateIntentStatus 検証+`closed` 消費側棚卸し | — | 〜80(lib+state) |
| U2 resume-guard | cursor 書込/読出・next・unpark の archived loud 拒否 | U1 | 〜120(utility+orchestrate+state) |
| U3 archive-verbs | archive/unarchive verb+human-presence+監査イベント対 | U1 | 〜150(state verb+audit) |
| U4 migration-and-proof | 260713 移行(provenance 引用)+falling proof+回帰テスト | U1〜U3 | 〜60+テスト |

規模は units-generation で精緻化する見積り枠(数値必須 — inception 規範)。全 Unit が正本 packages/framework/core/tools/ 面+dist/self-install 同期(C6)を伴う。

## 順序の含意

U1 が単一 chokepoint のため最初。U2/U3 は U1 着地後に並行可(ファイル交差は units-generation で非交差判定)。U4 は verb 実在(U3)を前提とする終端。
