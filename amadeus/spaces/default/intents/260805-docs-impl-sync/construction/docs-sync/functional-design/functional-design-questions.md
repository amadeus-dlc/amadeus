# Functional Design — 設計質問(unit: docs-sync)

上流入力(consumes 全数): requirements.md(FR-3 / FR-5 の未解決事項を本質問で確定する)。unit-of-work / components / component-methods / services は scope `self-document` の SKIP により設計上不在(consumes_absent expected: true)。

> 裁定方式: requirements-analysis と同一 — Intent 自律モード full(grant `intent-grant-d7bbea44ff43fae65262e848d5c4d0fc`)の `decide-question` AUTO_DECIDED 経路。

## FD-Q1: F-2〜F-7(ツール系欠落文書 6 件)の配置粒度

docs/reference の現行章は 00〜23(実測: `ls docs/reference/` — 23-telemetry-schema まで)。F-2〜F-7 をどう配置するか。

- A. ツールごとに専用新章を切る(最大 6 新章)
- B. 既存章への節追加を既定とし、規模の大きい Intent autonomy 系(F-4 autonomy-review + F-5 intent-completion)のみ新章 1 本(reference 24 番台、番号は PR 直前に origin/main 実測で確定)へ統合する。F-2 は 22-formal-model-supply、F-3 は 19-plugins(guide)+ 11-contributing、F-6 は新章内の 1 節、F-7 は 12-state-machine の advisory 節へ
- C. 全 6 件を新章 1 本「internal tools reference」へ統合する
- D. 全件を既存章への節追加のみで済ませる(新章なし)
- X. Other (please specify)

[Answer]: B — 既存章既定+autonomy 系のみ新章(根拠: F-2/F-3/F-7 には意味的に所属する既存章が実在し(22 章 = 形式モデル供給、19 章 = plugin、12 章 = 状態機械・イベント)、節追加が既存構造の流儀に一致。F-4/F-5 は合計 3,157 行の新機構で既存章に収まる規模でなく、12-state-machine への肥大化挿入は章の責務(状態機械の正準)を侵食する。cid:requirements-analysis:c5 の既存流儀優先)
自動裁定承認: 2026-08-05T09:55:00Z（AUTO_DECIDED、grant intent-grant-d7bbea44ff43fae65262e848d5c4d0fc）

## FD-Q2: self-* 4 スコープ解説(F-1、RA Q2=B「専用節または専用章」)の配置形

- A. `docs/guide/05-scopes-and-depth.md` 内の専用 H2 節「自己開発スコープ(self-*)」として追加(新規ファイルなし)
- B. 新規 guide 章(24 番台)として独立させ、05 章からリンクする
- C. `docs/guide/harnesses/` 同様のサブディレクトリ `docs/guide/self-development/` を新設する
- X. Other (please specify)

[Answer]: A — 05 章内の専用節(根拠: RA Q2=B の要件は「一般と自己開発の分離」であり、同一ファイル内の節分離で充足できる。FR-3 受け入れ基準の到達可能性判定(05 章からのリンク/包含)が最も単純に成立し、guide 章番号台帳への挿入衝突(cid:code-generation:shared-ledger-insert-collision)も回避できる。4 スコープの解説は各数段落で章規模に達しない — 規模の正当化なき新章は inception.md の reuse inventory 原則に反する)
自動裁定承認: 2026-08-05T09:55:00Z（AUTO_DECIDED、grant intent-grant-d7bbea44ff43fae65262e848d5c4d0fc）

## 裁定の記録

decide-question 実行結果は下表(実出力 JSON からの転記)。

| 問 | 採用 | decisionId |
|---|---|---|
| FD-Q1 | B | `auto-decision-71b4003229ff2d79afaf7b036fa24392` |
| FD-Q2 | A | `auto-decision-cf46504b102a58c448799e311d4af43e` |
