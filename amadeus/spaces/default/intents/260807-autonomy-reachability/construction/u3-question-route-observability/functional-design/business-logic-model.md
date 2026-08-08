# Business Logic Model — u3-question-route-observability

上流入力(consumes 全数): requirements.md(FR-3a/3b 受け入れ基準)、components.md(C4)、component-methods.md(入力拡張)、unit-of-work.md(境界)、unit-of-work-story-map.md(集計物語)、services.md(同期 emit・ロック契約)。

## フロー: 質問回答の経路刻印

```
conductor(questions 記録手順)
  → amadeus-log.ts answer 記録経路(:180-187 QUESTION_ANSWERED 発行点)
      入力拡張: [--decision-id <auto-decision-…>](optional のみ — 新必須入力なし)
      1. Resolution Route は入力でなく導出属性:
         decision-id あり → Route = ladder / なし → Route = human
      2. 既存呼び出し元(stage-protocol.md:18,:351,:484 / practices-discovery.md:95,121)は
         無変更で Route = human として記録される(移行ゼロ)
      3. 既存の checkpoint guard・emit は挙動不変 — 新しい拒否経路を一切作らない
```

テキストfallback: 経路は decision-id の有無から導出する(ladder iff decision-id)。入力拒否規則は存在しない — 回答の受理判定・既存呼び出し面は一切変えない(Review iteration 1 BLOCKER 是正: 必須フラグ+loud 拒否 → 推論属性へ置換。AD component-methods.md の「optional decisionId」仕様どおり)。

注記: ladder 裁定で conductor が decision-id を渡し忘れた場合は Route = human 側へ倒れ、迂回検出の**偽陽性**(過剰検出)になる — 検出述語は loud 側に誤る安全な非対称であり、FR-3c(拒否しない)と両立する。

## 集計(FR-3b — 検出可能性)

- 述語: `Resolution Route = human` × その時点 mode ∈ {semi, full} → 迂回質問
- 検証 fixture: 本 intent で実測済みの違反(intent-capture の §13 直接提示)を再現した shard fixture に対し、集計述語が当該行を1件検出することを integration テストで固定(落ちる実証: fixture の Route を ladder に書き換えると検出 0 件になる対照)

## エラー分類

- `--decision-id` の値不正(`auto-decision-` 形でない等)= 呼び出し側の欠陥 → loud error(唯一の新規検査 — optional 引数を**渡した場合**のみの形式検査で、省略は常に妥当)
- 属性付与後の emit 失敗 = 既存の emit 失敗様式に従う(新設の失敗様式を作らない)

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-07T15:26:32Z
- **Iteration:** 1
- **Scope decision:** none

BLOCKER 1: Resolution Route の必須フラグ化が全既存呼び出し元(stage-protocol :18 ほか)を壊し FR-3c(拒否しない)と ADR-4・AD の optional decisionId 仕様に矛盾。BR-U3-3 との内部矛盾も発生。是正 = decisionId 有無からの推論属性化

### Findings

- BLOCKER | business-rules.md:7-9, business-logic-model.md:11-14,24-27 — 必須 --resolution-route + loud 拒否は FR-3c・ADR-4 に矛盾し、u3 境界外の全呼び出し面(stage-protocol.md:18,:351,:484 / practices-discovery.md:95,121)を壊す。Route は decisionId 有無からの推論属性(ladder iff decisionId)へ変更し、入力拒否規則を属性導出規則に置換する

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-07T15:28:38Z
- **Iteration:** 2
- **Scope decision:** none

BLOCKER クローズ確認: 3成果物とも導出属性設計に統一・拒否経路残存なし・BR-U3-3 の内部整合回復・FR-3a/3b 充足(偽陽性方向の非対称を許容として文書化)・AD optional decisionId 仕様に適合

### Findings

- None
