# Logical Components — u5-advisories-channel

上流入力(consumes 全数): requirements, business-logic-model, business-rules, domain-entities

## コンポーネント表

| 論理コンポーネント | 実体 | NFR 関与 |
|---|---|---|
| Advisory 生成(構造化) | activationAdvisoriesForHost(business-logic-model.md L2) | 検証劇場回避(security-design) |
| 発火点集合+2経路 emit | ACTIVATION_ADVISORY_STAGES+emitForSlug/emitSingleRunStage(L3) | 性能 O(1) 増分(performance-design) |
| run 単位ラッチ | machine-local マーカー(L4、domain-entities.md E3) | fail-open(reliability-design) |
| stage-protocol 追記 | conductor 提示規範(L5) | — 文書面 |

## 依存方向

Advisory 生成 ← emit 2経路(消費)。ラッチは emit 経路のみが読む。逆方向依存なし。

## NFR 対応の全数表

| NFR | 本 unit での扱い |
|---|---|
| NFR-1(検証二層) | t378/t381 は日常 CI 層のみ — TLC 面は触れない(performance-design) |
| NFR-2(TDD) | 挙動追加につき TDD 必須(business-rules.md BR-U5-4 の vertical slice 5面) |
| NFR-3(配布同期) | core 変更につき dist 7 ハーネス+self-install 同一 PR(BR-U5-6) |
| NFR-4(台帳整合) | 台帳へ触れる場合のみ remap — 本 unit は新規テスト追加のみで原則非接触 |
| NFR-5(ゲート実効) | **N/A** — 新設「ガード」ではなく通知機構(落ちる実証は BR-U5-5 のテスト実効注入で担保 — ゲート新設の corpus sweep 要件は対象外) |
