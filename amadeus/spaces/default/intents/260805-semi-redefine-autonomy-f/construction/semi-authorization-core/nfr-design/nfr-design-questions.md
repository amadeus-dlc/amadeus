# NFR Design 質問記録 — `semi-authorization-core`(#2253)

上流入力(consumes 全数): business-logic-model.md(present)。nfr-requirements 系 consumes(security-requirements.md / tech-stack-decisions.md ほか)は本 scope(self-feature)が nfr-requirements を SKIP するため設計上不在(engine directive の `consumes_absent` に `expected: true` — 不在成果物の内容は発明しない)。

- **様式**: **0 問様式**(既習形)。`[Answer]` タグを持つ質問行は 0 件である。
- **E-OC1 判定**: **選挙不要**。根拠種別は「既決規範の機械的執行」— FD(business-logic-model.md)が 3 層置換・判定表・結線 3 点・検証面(t440〜t442)まで確定済みであり、NFR 設計分岐は requirements.md §Non-functional requirements の逐条照合と `cid:nfr-design:c1` から一意に導出できる。
- ユーザー承認: 2026-08-05T04:52:54Z(Intent autonomy `full` の設定トランザクション — 監査シャード `INTENT_AUTONOMY_TRANSACTION_COMMITTED` の timestamp からの転記。本 Unit 固有の追加裁定事項は 0 件)

---

## 機械導出の記録(設計分岐と一次根拠)

| # | 設計分岐 | 導出した答え | 一次根拠 |
| --- | --- | --- | --- |
| D1 | NFR カテゴリの適用範囲 | 適用は **NFR-1(FR-AUTH-1 の面)/ NFR-2(監査追跡性 — 本 Unit が主所有)/ NFR-4(TDD)/ NFR-5(ドリフトゼロ)/ NFR-7(ゲート集合)** の 5 件。非適用は **NFR-3**(parser 実行コスト — `launch-autonomy-flag` 所有)と **NFR-6**(provenance 偽装不能 — `--autonomy` は `launch-autonomy-flag`、advisory 第2 receipt は `advisory-auto-resolution` の所有。本 Unit の認可基体は provenance の受け手でなく判定の基体)の 2 件 | requirements.md NFR 全 7 件の逐条照合 × FD 3 層置換の所有範囲 |
| D2 | resilience / scaling / caching の採否 | **全面不採用**。純関数層(S1)+単発 CLI 実行の判定経路であり常駐負荷が存在しない。信頼性は (a) fail-closed 判定表(scope 未供給 → human-required)(b) 3 つの throw ガード不変(FR-LAD-3)(c) 片方向不変条件+replay 拒否(FR-AUTH-1 (3))の決定的機構で完結する | `cid:nfr-design:c1` / FD 判定表・C5/C8 節 |
| D3 | security 設計の焦点 | 認可の**基体そのもの**を新設する Unit のため、焦点は (a) SemiAuthority の 3 責務限定(4 つ目の責務 = TTL/revoke/儀式を持たせない — 型直読で検査可能)(b) 節目の human-required 保存(walking-skeleton / phase-gate → SCOPE_OUT)(c) 効果安全弁(workflow-reversible のみ — authorizeEffect)(d) 不正 projection の fail-closed 拒否(replay 込み)の 4 点 | FD 判定表 / requirements.md FR-AUTH-1・FR-LAD-3/5 |
| D4 | logical-components の粒度 | 4 コンポーネント(C1/C2 純関数層 / 第1関門 C3 / 第2関門+梯子 C4-C6 / 効果適用 C7+読み側 C8)+障害ドメイン 1(engine プロセス)。監査 journal は共有資源(書式・イベント列は無改変 — NFR-2) | FD 3 層置換の全体像 / データフロー表 |

---

## 完全性確認

- 空の `[Answer]` タグ: **なし**(0 問様式)
- 未解決の設計判断: **なし**(D1〜D4 一意導出)
- 後続へ委ねる判断: なし(実装は FD の t440〜t442 設計に従う)
- 上流との矛盾: **なし**
