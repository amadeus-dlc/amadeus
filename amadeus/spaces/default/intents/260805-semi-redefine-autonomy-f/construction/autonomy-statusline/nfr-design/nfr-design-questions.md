# NFR Design 質問記録 — `autonomy-statusline`(#2253)

上流入力(consumes 全数): business-logic-model.md(present)。nfr-requirements 系 consumes(security-requirements.md / tech-stack-decisions.md ほか)は本 scope(self-feature)が nfr-requirements を SKIP するため設計上不在(engine directive の `consumes_absent` に `expected: true` で列挙 — 不在成果物の内容は発明しない)。

- **様式**: **0 問様式**(既習形)。`[Answer]` タグを持つ質問行は 0 件である。
- **E-OC1 判定**: **選挙不要**。根拠種別は「既決規範の機械的執行」— 本 Unit は読み・表示のみの純関数 1 本+配線 1 行(FD business-logic-model.md の確定済み設計)であり、NFR 設計分岐は requirements.md §Non-functional requirements の該当 NFR と `cid:nfr-design:c1`(CLI/library に常駐サービス向けパターンを機械適用しない)から一意に導出できる。
- ユーザー承認: 2026-08-05T04:52:54Z(Intent autonomy `full` の設定トランザクション — 監査シャード `INTENT_AUTONOMY_TRANSACTION_COMMITTED`(projection.mode=full、events=afterMode|grant)の timestamp からの転記。本 Unit 固有の追加裁定事項は 0 件)

---

## 機械導出の記録(設計分岐と一次根拠)

| # | 設計分岐 | 導出した答え | 一次根拠 |
| --- | --- | --- | --- |
| D1 | NFR カテゴリの適用範囲 | 本 Unit に適用される NFR は **NFR-4(TDD)/ NFR-5(生成物ドリフトゼロ)/ NFR-7(ゲート集合維持)** の 3 件。NFR-1/2/6(認可・監査・provenance)は本 Unit が認可境界・監査書込・provenance を一切持たない(business-logic-model.md「書き手はいない — 読み・表示のみ」)ため非適用、NFR-3 は `--autonomy` parser(launch-autonomy-flag 所有)の要件で本 Unit 外 | requirements.md §NFR 全 7 件の逐条照合 × business-logic-model.md データフロー表 |
| D2 | resilience / scaling / caching パターンの採否 | **全面不採用**。statusline hook は毎プロンプト起動・non-blocking の読み取り専用表示であり、circuit breaker・cache・pooling は導入根拠となる NFR が存在しない。信頼性は「不正入力 → 空文字縮退」の fail-closed 決定表(FD 決定表の第 4 行)で完結する | `cid:nfr-design:c1` / business-logic-model.md 決定表 |
| D3 | security 設計の範囲 | 新規攻撃面ゼロを設計目標とする: 追加 I/O なし(既存 read の再利用 — ADR-10)、書込なし、外部入力は state ファイルの 1 フィールドのみで値域外は空文字へ縮退(parse-don't-validate の縮退形)。秘密情報・認証・暗号は扱わない | business-logic-model.md 処理シーケンス / requirements.md NFR-3 の類推(表示側も追加 FS I/O ゼロ) |
| D4 | logical-components の粒度 | 3 コンポーネント(純関数 `autonomySegment` / 配線 1 行 / canonical 型 import)+障害ドメイン 1(statusline hook プロセス)で全数。それ以上の分割・共有資源は存在しない | business-logic-model.md 経路の決定木 |

---

## 完全性確認

- 空の `[Answer]` タグ: **なし**(0 問様式)
- 未解決の設計判断: **なし**(D1〜D4 一意導出)
- 後続へ委ねる判断: なし(実装は FD の t448 設計に従う)
- 上流との矛盾: **なし**
