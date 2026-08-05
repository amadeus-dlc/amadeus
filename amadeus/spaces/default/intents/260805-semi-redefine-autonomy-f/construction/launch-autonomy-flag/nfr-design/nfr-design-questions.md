# NFR Design 質問記録 — `launch-autonomy-flag`(#2253)

上流入力(consumes 全数): business-logic-model.md(present)。nfr-requirements 系 consumes(security-requirements.md / tech-stack-decisions.md ほか)は本 scope(self-feature)が nfr-requirements を SKIP するため設計上不在(engine directive の `consumes_absent` に `expected: true` — 不在成果物の内容は発明しない)。

- **様式**: **0 問様式**(既習形)。`[Answer]` タグを持つ質問行は 0 件である。
- **E-OC1 判定**: **選挙不要**。根拠種別は「既決規範の機械的執行」— FD(business-logic-model.md)が C12/C13 の逐語契約・判定表・fail-closed 方針(ADR-12)まで確定済みであり、NFR 設計分岐は requirements.md §Non-functional requirements の逐条照合と `cid:nfr-design:c1` から一意に導出できる。
- ユーザー承認: 2026-08-05T04:52:54Z(Intent autonomy `full` の設定トランザクション — 監査シャード `INTENT_AUTONOMY_TRANSACTION_COMMITTED` の timestamp からの転記。本 Unit 固有の追加裁定事項は 0 件)

---

## 機械導出の記録(設計分岐と一次根拠)

| # | 設計分岐 | 導出した答え | 一次根拠 |
| --- | --- | --- | --- |
| D1 | NFR カテゴリの適用範囲 | 適用は **NFR-3(parser 実行コスト)/ NFR-4(TDD)/ NFR-5(ドリフトゼロ)/ NFR-6(provenance 偽装不能 — 片面)/ NFR-7(ゲート集合)** の 5 件。NFR-6 は「`--autonomy` が実 HUMAN_TURN 由来でない provenance で認可境界を通過できない」の面が本 Unit 所有(FR-CLI-5 = `PROVENANCE_REQUIRED` relay)。NFR-1 は本 Unit の該当ゲート(FR-CLI-4 fail-closed)が名指しされており**適用**…と読めるが、NFR-1 の列挙(FR-AUTH-1 / FR-ADV-2 / FR-CLI-4 / FR-POL-3 / FR-STOP-1)のうち本 Unit 所有は FR-CLI-4 の 1 件 — その落ちる実証は FD 検証シーケンス t447 に確定済み。よって NFR-1 も**適用(FR-CLI-4 の面に限る)**。非適用は NFR-2(AUTO_DECIDED 記録・replay は semi-authorization-core / advisory-auto-resolution の所有 — 本 Unit は裁定を生成しない) | requirements.md NFR 全 7 件の逐条照合 × FD データフロー表 |
| D2 | resilience / scaling / caching の採否 | **全面不採用**。CLI flag parser + 単発適用ハンドラであり常駐性・並行負荷が存在しない。信頼性は fail-closed 判定表(判定 0〜8)と「projection 1 read」の決定的 I/O で完結する | `cid:nfr-design:c1` / FD アルゴリズム 3 |
| D3 | security 設計の焦点 | 認可境界そのもの(mode 昇格・grant 取消・provenance)を扱う Unit のため、security-design の中心は (a) 昇格経路の封鎖(full は grant 儀式必須 — 判定 7)(b) 取消の側面効果化の禁止(判定 6)(c) provenance 要求の維持(判定 8 = `PROVENANCE_REQUIRED` relay)(d) unreadable → 拒否側縮退(ADR-12 — `catch → false` の緩和側反転を採らない FD 転記)の 4 点 | FD 判定表 / requirements.md FR-CLI-2〜5・NFR-6 |
| D4 | logical-components の粒度 | 3 コンポーネント(C12 parser 分岐 / C13 適用ハンドラ+context reader / 既存 `applyProductionAutonomyMode` への委譲境界)+障害ドメイン 1(engine プロセス)。第 2 の書込経路を作らない(ADR-8)ことが分離の要 | FD 処理シーケンス / データフロー表 |

---

## 完全性確認

- 空の `[Answer]` タグ: **なし**(0 問様式)
- 未解決の設計判断: **なし**(D1〜D4 一意導出)
- 後続へ委ねる判断: なし(実装は FD の t446/t447 設計に従う)
- 上流との矛盾: **なし**
