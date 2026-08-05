# NFR Design 質問記録 — `semi-policy-carrier`(#2253)

上流入力(consumes 全数): business-logic-model.md(present)。nfr-requirements 系 consumes(security-requirements.md / tech-stack-decisions.md ほか)は本 scope(self-feature)が nfr-requirements を SKIP するため設計上不在(engine directive の `consumes_absent` に `expected: true` — 不在成果物の内容は発明しない)。

- **様式**: **0 問様式**(既習形)。`[Answer]` タグを持つ質問行は 0 件である。
- **E-OC1 判定**: **選挙不要**。根拠種別は「既決規範の機械的執行」— FD(business-logic-model.md)が C8〜C10/C15 の逐語契約・Q1 照合設計・検証面(t454/t455)まで確定済みであり、NFR 設計分岐は requirements.md §Non-functional requirements の逐条照合と `cid:nfr-design:c1` から一意に導出できる。
- ユーザー承認: 2026-08-05T04:52:54Z(Intent autonomy `full` の設定トランザクション — 監査シャード `INTENT_AUTONOMY_TRANSACTION_COMMITTED` の timestamp からの転記。本 Unit 固有の追加裁定事項は 0 件)

---

## 機械導出の記録(設計分岐と一次根拠)

| # | 設計分岐 | 導出した答え | 一次根拠 |
| --- | --- | --- | --- |
| D1 | NFR カテゴリの適用範囲 | 適用は **NFR-1(FR-POL-3 の面)/ NFR-2(replay 復元 — story-map §NFR の割当で本 Unit 配分)/ NFR-4(TDD)/ NFR-5(ドリフトゼロ)/ NFR-7(ゲート集合)** の 5 件。非適用は **NFR-3**(parser 実行コスト — `launch-autonomy-flag` 所有。C10 の `--policies-file` は既存フラグで新規 parse 分岐を持たない)と **NFR-6**(provenance 偽装不能 — mode 適用の HUMAN_TURN 要求は既存 `applyProductionAutonomyMode` 経路が担い本 Unit は変更しない。`--autonomy` 面・advisory 面は他 Unit 所有)の 2 件 | requirements.md NFR 全 7 件の逐条照合 × FD 処理シーケンス・story-map §NFR の割当 |
| D2 | resilience / scaling / caching の採否 | **全面不採用**。単発 CLI の設定適用+表示経路であり常駐負荷が存在しない。信頼性は (a) loud ガード(mode none ∧ policies-file — 不正ファイル読取より先)(b) Q1 の digest 等値照合(方針すり替えの fail-closed)(c) 既存 `INVALID_COMMAND` 様式の再利用(新エラーコードを作らない)で完結する | `cid:nfr-design:c1` / FD アルゴリズム 2・3 |
| D3 | security 設計の焦点 | 事前裁定方針(policy)は**無人裁定の入力**であるため、焦点は (a) 確認 digest の方針込み拡張(人間が確認した方針集合と適用される集合の同一性 — FR-POL-2)(b) 非空 policies の digest 照合必須化(Q1 — 確認せず方針を積む経路の封鎖)(c) 無音破棄経路の根絶(FR-POL-3 loud 化)(d) 正規化の単一呼び出し(digest 入力の安定性 — FD FOLLOW-UP の転記)の 4 点 | FD アルゴリズム 2 / requirements.md FR-POL-1〜3 |
| D4 | logical-components の粒度 | 3 コンポーネント(C10 CLI ガード / C8 書き側+C9 digest / C15 表示供給式)+障害ドメイン 1(engine プロセス)+共有資源 2(autonomy projection・監査 journal) | FD 処理シーケンス / データフロー表 |

---

## 完全性確認

- 空の `[Answer]` タグ: **なし**(0 問様式)
- 未解決の設計判断: **なし**(D1〜D4 一意導出)
- 後続へ委ねる判断: FD §12a FOLLOW-UP(処理シーケンス図の変数名 — 正規化単一呼び出しの明示)は FD 側で注記済み(business-logic-model.md :19-20 の追記)を実装が踏襲する
- 上流との矛盾: **なし**
