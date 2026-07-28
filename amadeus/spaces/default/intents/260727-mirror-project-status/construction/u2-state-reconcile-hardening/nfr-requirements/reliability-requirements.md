# Reliability Requirements — u2-state-reconcile-hardening

上流入力(consumes 全数): business-logic-model, business-rules, requirements, technology-stack

信頼性は U2 の中核責務(unit-of-work: 失敗・再試行セマンティクスの完全化)。requirements FR-7 全補と NFR-1 を、business-logic-model の reconcile ループと business-rules BR-U2-1〜8 で規定する。

## 障害分類と収束保証(requirements FR-7a/7b)

- 部分成功前提: Issue 本文更新と Project 更新は別 mutation。一時的な Project 更新失敗は `pending` として永続化し(FR-7a — 受入条件11)、次の eligible boundary / manual sync で**冪等に reconcile** する(FR-7b — 重複追加・重複 mutation ゼロ)。
- 失敗分類の写像(business-logic-model の表): retryable(rate-limit / network / api)→ pending / 解決不能(フィールド・選択肢未解決、permission)→ safety-blocked / 成功・既一致 → synced。
- body 層の失敗検出(requirements FR-7d): GraphQL 応答は HTTP 200 でも `errors` を持ちうるため、body 層で失敗を検出し既存 `MirrorFailureClass` の値集合(14種 — requirements の実装直読)へ写像する。写像表は実装時に実 gh 応答で実測確定する条件付き要件(external-seam-vocab-measurement 準拠 — 本書で確約しない)。
- 状態遷移は現在状態に依存しない一律再分類(u2 FD domain-entities の 9セル全数定義)— どの状態からも当該回の結果のみで次状態が決まり、デッドエンド状態が存在しない。

## 冪等性(requirements NFR-1)

- 同一 boundary の二重実行で mutation 総数不変(business-rules BR-U2-4)。synced かつ期待一致の Project へは mutation を発行しない。
- 検証: failure injection(部分成功 → pending → 次回 boundary で収束)と二重実行テスト(business-logic-model の検証面)。

## 恒久停止の構造回避(business-rules BR-U2-5 — U3 層分離と同一規約)

- pending / safety-blocked が残る間、操作 receipt は `pending`(IN_PROGRESS 分類)に留め、`safety-blocked` を operation receipt に書かない — 既存 policy の terminal-block 分類(amadeus-mirror-policy.ts:61-65 — business-rules の実装直読)による completion 恒久停止を避け、FR-7b の再試行可能性を保つ。
- gh 不在・未認証・API 障害は loud fail+workflow 継続(requirements FR-7e — unsynchronized 警告+retry state の既存 Mandated)。

## データ耐久性

- 台帳書込は audit 確定 → state write の既存順序(business-rules BR-U2-6)。永続状態は git 管理の record/state のみで、独自データストアを導入しない(technology-stack 断面: 依存・機構の追加ゼロ)。
- SLA/SLO・バックアップ目標は N/A(根拠: requirements FR-1b — daemon・polling・GitHub Actions を導入しないチェーン内実行のみ。cid:observability-setup:c3 の N/A 規律)。
