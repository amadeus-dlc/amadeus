# Frontend Components — U1 ballot-acceptance-failclosed

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md、component-dependency.md、decisions.md

## 該当なし(N/A 根拠)

本 Unit は UI を持たない CLI 契約のみ(ui-less-mockups-as-output-contract の適用範囲外 — mockups 系ステージは scope=amadeus で SKIP)。ユーザー可視面は CLI の verb 出力文言+exit code であり、その契約は services.md(AD)と business-rules.md の BR-2/BR-3 が定義する:

| 出力 | exit | 条件 |
| --- | --- | --- |
| `{"accepted":"<voter>"}` | 0 | 受理(original/amend とも) |
| `vote: invalid-timestamp` | 1 | BR-2 違反 |
| `vote: parse-failure` | 1 | kind 不正・ref 欠落等 |
| `appendBallot: unknown-ref` | 1 | BR-3 store 段違反 |

## AD との表記整合(iteration 1 Major #1 の是正)

`appendBallot: unknown-ref` の表記は storeFail 実装様式(`${op}: ${e}` — election.ts:84-86)に一致する正表記。AD services.md 初稿の `appendBallot failed:` は誤記であり、同 Major の是正で AD 側を本表記へ修正済み(両成果物一致 — citation-semantics-check の明文照合)。

## 契約の検証先

上表の出力・exit code は t236(vote verb 疎通)と t234(分類決定性)の assertion 文言として固定される — 出力契約の変更はテスト変更を伴う(ユーザー可視契約)。
