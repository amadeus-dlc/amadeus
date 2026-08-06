# NFR Design 質問記録 — `advisory-auto-resolution`(#2253)

上流入力(consumes 全数): business-logic-model.md(present)。nfr-requirements 系 consumes(security-requirements.md / tech-stack-decisions.md ほか)は本 scope(self-feature)が nfr-requirements を SKIP するため設計上不在(engine directive の `consumes_absent` に `expected: true` — 不在成果物の内容は発明しない)。

- **様式**: **0 問様式**(既習形)。`[Answer]` タグを持つ質問行は 0 件である。
- **E-OC1 判定**: **選挙不要**。根拠種別は「既決規範の機械的執行」— FD(business-logic-model.md)が C16/C17 の処理順・受理 3 点表・schema 契約・ロック直列性の設計前提まで確定済みであり、NFR 設計分岐は requirements.md §Non-functional requirements の逐条照合と `cid:nfr-design:c1` から一意に導出できる。U-2(梯子 3 段縮退の許容可否)は delivery-planning が Bolt 1 ゲートへ回付済み — 本ステージも観測限定を厳守し、新たな裁定を作らない。
- ユーザー承認: 2026-08-05T04:52:54Z(Intent autonomy `full` の設定トランザクション — 監査シャード `INTENT_AUTONOMY_TRANSACTION_COMMITTED` の timestamp からの転記。本 Unit 固有の追加裁定事項は 0 件)

---

## 機械導出の記録(設計分岐と一次根拠)

| # | 設計分岐 | 導出した答え | 一次根拠 |
| --- | --- | --- | --- |
| D1 | NFR カテゴリの適用範囲 | 適用は **NFR-1(FR-ADV-2 の面)/ NFR-2(AUTO_DECIDED 記録の advisory 面)/ NFR-4(TDD)/ NFR-5(ドリフトゼロ)/ NFR-6(advisory 第2 receipt の面)/ NFR-7(ゲート集合)** の 6 件。非適用は **NFR-3**(parser 実行コスト — `launch-autonomy-flag` 所有)の 1 件 | requirements.md NFR 全 7 件の逐条照合 × FD 処理シーケンスの所有範囲 |
| D2 | resilience / scaling / caching の採否 | **全面不採用**。単発 CLI の guard→解決→受理経路であり常駐負荷が存在しない。信頼性は (a) 2 分岐構造(resolved / それ以外すべて await — FR-ADV-2 の構造的保証)(b) schema 1 store の fail-closed hold(ADR-9)(c) withAuditLock の直列性(FD D4 実測)で完結する | `cid:nfr-design:c1` / FD 処理シーケンス・schema 節 |
| D3 | security 設計の焦点 | 人間経路と**等価な強度**の無人受理境界を作る Unit のため、焦点は (a) grounding の等価置換(humanTurn 照合 ⇔ AUTO_DECIDED journal 実在照会)(b) 重複排除の provenance 跨ぎ閉包(c) 提示照合の維持(d) `run_required: true` の強制実行(defer-with-risk を選択肢空間から除去 — FR-ADV-4)(e) 認可不成立の全経路が人間経路へ戻る fail-closed(FR-ADV-2)の 5 点 | FD 受理 3 点表 / requirements.md FR-ADV-1〜4・NFR-6 |
| D4 | logical-components の粒度 | 3 コンポーネント(C16 解決関数 / C17 受理関数(置換)/ 既存裁定経路への委譲境界)+障害ドメイン 1(engine プロセス)+共有資源 2(advisory store・監査 journal) | FD 処理シーケンス / データフロー表 |

---

## 完全性確認

- 空の `[Answer]` タグ: **なし**(0 問様式)
- 未解決の設計判断: **なし**(D1〜D4 一意導出。U-2 は回付済み・観測限定、U-3 は実装時実測義務として保存)
- 後続へ委ねる判断: FD §12a FOLLOW-UP 2 件(FR-ADV-5 の機械検証手段の明示、旧測定 ref 併記の注記)は code-generation 着手前の対応として引き継ぐ
- 上流との矛盾: **なし**
