# NFR Design 質問記録 — `stop-question-carveout`(#2253)

上流入力(consumes 全数): business-logic-model.md(present)。nfr-requirements 系 consumes(security-requirements.md / tech-stack-decisions.md ほか)は本 scope(self-feature)が nfr-requirements を SKIP するため設計上不在(engine directive の `consumes_absent` に `expected: true` — 不在成果物の内容は発明しない)。

- **様式**: **0 問様式**(既習形)。`[Answer]` タグを持つ質問行は 0 件である。
- **E-OC1 判定**: **選挙不要**。根拠種別は「既決規範の機械的執行」— FD(business-logic-model.md)が述語 2 本の契約・呼び出し点割当(`:422` のみ開放)・検証面(t456 + FR-PIN-2)まで確定済みであり、NFR 設計分岐は requirements.md §Non-functional requirements の逐条照合と `cid:nfr-design:c1` から一意に導出できる。
- ユーザー承認: 2026-08-05T04:52:54Z(Intent autonomy `full` の設定トランザクション — 監査シャード `INTENT_AUTONOMY_TRANSACTION_COMMITTED` の timestamp からの転記。本 Unit 固有の追加裁定事項は 0 件)

---

## 機械導出の記録(設計分岐と一次根拠)

| # | 設計分岐 | 導出した答え | 一次根拠 |
| --- | --- | --- | --- |
| D1 | NFR カテゴリの適用範囲 | 適用は **NFR-1(FR-STOP-1 維持側の面 — 要件が名指す 5 ゲートの 1 つ)/ NFR-4(TDD)/ NFR-5(ドリフトゼロ)/ NFR-7(ゲート集合)** の 4 件。非適用は **NFR-2**(AUTO_DECIDED 生成なし — stop hook は projection を読むだけ)/ **NFR-3**(parser — `launch-autonomy-flag` 所有)/ **NFR-6**(provenance 受理境界を持たない — 述語は state/projection の読取のみ)の 3 件 | requirements.md NFR 全 7 件の逐条照合 × FD データフロー(書き手はいない) |
| D2 | resilience / scaling / caching の採否 | **全面不採用**。stop hook は毎ターン起動の読み取り判定であり常駐負荷が存在しない。信頼性は (a) 述語 2 本の閉じた判定表(catch → false = carve-out を与えない保守側)(b) `:457` / `:716` の full 限定維持(diff 非出現)(c) cap / budget 不変(FR-STOP-2)で完結する | `cid:nfr-design:c1` / FD 述語契約・D3 |
| D3 | security 設計の焦点 | stop hook の carve-out は「エージェントが人間確認なしで走行を継続できる範囲」を広げる操作であるため、焦点は (a) 開放点の限定(`:422` のみ — `:457` compose / `:716` conversational は full 限定維持)(b) semi 側の human-command 由来性要求(`modeProvenance.kind === "human-command"`)(c) catch → false の保守側縮退(この文脈では false = carve-out を与えない = 安全側)(d) cap / budget mode の不変(FR-STOP-2)の 4 点 | FD 述語契約・呼び出し点割当表 / requirements.md FR-STOP-1/2 |
| D4 | logical-components の粒度 | 2 コンポーネント(述語 2 本(full 限定 `isFullyAutonomousIntent` 保存+新設 `isQuestionCarveoutIntent`)/ `:422` の 1 行差し替え)+障害ドメイン 1(stop hook プロセス)。t121 反転(FR-PIN-2)は検証面であり component ではない | FD 述語の分割・呼び出し点の割当 |

---

## 完全性確認

- 空の `[Answer]` タグ: **なし**(0 問様式)
- 未解決の設計判断: **なし**(D1〜D4 一意導出)
- 後続へ委ねる判断: なし(実装は FD の t456 / FR-PIN-2 設計に従う)
- 上流との矛盾: **なし**
