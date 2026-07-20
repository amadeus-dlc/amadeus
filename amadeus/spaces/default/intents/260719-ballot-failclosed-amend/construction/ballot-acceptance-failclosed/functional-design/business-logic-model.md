# Business Logic Model — U1 ballot-acceptance-failclosed

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md、component-dependency.md、decisions.md

## 処理フロー(受理 → 保存 → 集計)

```mermaid
flowchart TD
  IN["ballot.json 入力"] --> P["Ballot.parse(6分類 BR-1/BR-2/BR-3 parse 段)"]
  P -- err --> E1["vote: 分類名 exit 1(loud)"]
  P -- ok --> N["normalizeAt(恒等 — ADR-1 注記)"]
  N --> S["Store.appendBallot(dup 判定 → BR-3 unknown-ref 照合)"]
  S -- err --> E2["appendBallot: StoreError 値 exit 1"]
  S -- ok --> PT{"post-tally?(classifyLate BR-4b)"}
  PT -- no --> L["ledger 共存記録(ADR-5)+timeline"]
  PT -- yes --> LT["late lane 記録(store.ts:138-158)— fixed set 非影響・非解決"]
  L --> T["tally = resolveBallots 内部適用(BR-4 #1)"]
  L --> V["verify: resolved を :447/:448/:450/:456 へ(BR-4 #2/#5)"]
  L --> Rn["render: resolved を :386 へ(BR-4 #3)"]
```

テキストフォールバック: 入力 → parse(6分類)→ normalizeAt(恒等)→ appendBallot(dup→unknown-ref)→ post-tally なら late lane(BR-4b、fixed set 非影響・非解決)/ 通常は ledger 共存 → {tally, verify, render} は resolveBallots 済み母集団を消費(materialize のみ blind lift)。

## 関数配置(AD components.md の見積りを継承)

| 関数 | 所在 | 変更種別 |
| --- | --- | --- |
| SUBMITTED_AT_RE / isValidSubmittedAt(内部) | model.ts | 新設(module スコープ) |
| parseBallotShape | model.ts:160-178 | kind/ref 読取追加 |
| Ballot.parse | model.ts:184-204 | invalid-timestamp 分岐+AmendBallot 生成 |
| resolveBallots | model.ts(export) | 新設(純関数) |
| tally | model.ts:321 | 先頭で resolveBallots 適用 |
| appendBallot | store.ts | unknown-ref 照合(dup 判定直後) |
| handleVerify / handleRender | election.ts | resolved 導出+消費点置換(各1行+引数置換) |
