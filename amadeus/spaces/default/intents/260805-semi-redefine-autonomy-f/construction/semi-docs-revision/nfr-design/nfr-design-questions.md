# NFR Design 質問記録 — `semi-docs-revision`(#2253)

上流入力(consumes 全数): **空**(engine directive の解決済み `consumes` は空集合 — 本 Unit は kind: spec で business-logic-model.md を持たず、nfr-requirements 系 consumes は scope の SKIP により `consumes_absent`(`expected: true`))。設計文脈は本 Unit 自身の functional-design 成果物(business-rules.md / domain-entities.md — 同一 Unit 内参照であり consumes 宣言外)と requirements.md の逐条照合から導出した。不在成果物の内容は発明しない。

- **様式**: **0 問様式**(既習形)。`[Answer]` タグを持つ質問行は 0 件である。
- **E-OC1 判定**: **選挙不要**。根拠種別は「既決規範の機械的執行」— 本 Unit は非コード(docs 22 ファイル+正本知識 9 行の改訂)であり、NFR 設計分岐は requirements.md §Non-functional requirements の逐条照合・FD business-rules.md の BR-1〜BR-10・`cid:nfr-design:c1` から一意に導出できる。
- ユーザー承認: 2026-08-05T04:52:54Z(Intent autonomy `full` の設定トランザクション — 監査シャード `INTENT_AUTONOMY_TRANSACTION_COMMITTED` の timestamp からの転記。本 Unit 固有の追加裁定事項は 0 件)

---

## 機械導出の記録(設計分岐と一次根拠)

| # | 設計分岐 | 導出した答え | 一次根拠 |
| --- | --- | --- | --- |
| D1 | NFR カテゴリの適用範囲 | 適用は **NFR-5(ドリフトゼロ — canonical 1 本編集+`bun run build` 不変が本 Unit の中心契約)/ NFR-7(ゲート集合)** の 2 件。**NFR-4 は適用外**(実行時の振る舞いを持たない文書・書式のみの変更 — team.md §Testing Posture の TDD 適用外 (1)。ただし適用外でも無検証にせず、FD BR-10 の V1〜V6 機械検査+レビュー実読を検証手段とする)。非適用は **NFR-1/2/3/6**(認可ゲート・監査・parser・provenance のいずれも持たない非コード Unit) | requirements.md NFR 全 7 件の逐条照合 × FD business-rules.md BR-3/BR-10 / team.md TDD 適用外条項 |
| D2 | resilience / scaling / caching の採否 | **全面不採用**。実行可能な成果物を持たない文書改訂であり、該当する動的性質が存在しない | `cid:nfr-design:c1` |
| D3 | security 設計の焦点 | 文書は**認可意味論の正本記述**であるため、焦点は (a) 保存対象(節目の人間裁定の記述 — :105/:808 と docs P 12 行)の diff 非出現(b) 禁止語彙(FR-LAD-6 / FR-ADV-5 / FR-LAD-5 裏面)の非混入(c) 新意味論の内容契約(BR-8 の 8 要素)への適合 — 「文書が実態より緩い認可を主張しない」ことの保証の 3 点 | FD business-rules.md BR-4/BR-5/BR-8 |
| D4 | logical-components の要否 | **成果物なし**(engine directive の produces は security-design.md 1 点のみ — kind: spec は `produces_kinds` により logical-components の適用外)。N/A placeholder は作らない | engine directive / `cid:nfr-design:c1-engine-produces-all-five`(kind 別絞り込み) |

---

## 完全性確認

- 空の `[Answer]` タグ: **なし**(0 問様式)
- 未解決の設計判断: **なし**(D1〜D4 一意導出)
- 後続へ委ねる判断: なし(実装は FD BR-1〜BR-10 に従う)
- 上流との矛盾: **なし**
