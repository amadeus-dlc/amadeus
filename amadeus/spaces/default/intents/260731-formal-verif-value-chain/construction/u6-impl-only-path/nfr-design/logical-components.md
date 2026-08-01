# Logical Components — u6-impl-only-path

上流入力(consumes 全数 — requirements は宣言5件の consumes_absent fallback 先、business-rules/domain-entities は同 unit FD の随伴成果物): requirements, business-logic-model, business-rules, domain-entities

## コンポーネント表

| 論理コンポーネント | 実体 | NFR 関与 |
|---|---|---|
| 受理判定 | P1(identity 比較+evaluateEntries/diffModelMap 再配線) | fail-closed(security/reliability) |
| 監査記録2層 | P2(stdout 構造化+git) | 独立性維持(security) |
| 成功コード | P5(第3 union メンバー — domain-entities.md E1) | 後方互換+検証劇場回避 |
| 案内文面2面 | P4(MODEL_UNCHANGED detail+sensor manifest) | 発見可能性(FR-D2) |

## 下流消費(domain-entities.md E4)

u7(mirror model)は本 unit の --impl-only を SOURCE_DRIFT 正規復旧経路として前提にし、利用者は案内文面2面から正規手順へ到達する(E4 の消費契約)。

## 依存方向

CLI 分岐 → 受理判定 → 更新+監査記録。案内文面は判定の拒否枝のみが参照。逆方向依存なし。

## NFR 対応の全数表

| NFR | 本 unit での扱い |
|---|---|
| NFR-1(検証二層) | t380 は日常 CI 層(TLC 面非接触) |
| NFR-2(TDD) | 挙動追加につき TDD 必須(business-rules.md BR-U6-1 — テスト設計 (1)〜(5)) |
| NFR-3(配布同期) | core 変更につき dist 7 ハーネス+self-install 同一 PR+sensor manifest 文書同期(BR-U6-4) |
| NFR-4(台帳整合) | 新テストの registry 追従のみ |
| NFR-5(ゲート実効) | **N/A** — 新設ガードなし(FR-A6 は u3)。既存ゲート(MODEL_UNCHANGED/SOURCE_DRIFT)の挙動保存はテスト設計 (4) の後方互換で担保 |
