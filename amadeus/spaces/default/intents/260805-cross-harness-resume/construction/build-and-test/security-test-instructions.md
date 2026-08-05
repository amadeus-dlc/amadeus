# Security Test Instructions — 260805-cross-harness-resume

上流入力(consumes 全数): code-generation-plan.md、code-summary.md

## 対象: 認可境界そのものが本 intent のセキュリティ面

本 intent は認可・監査 seam(caller-authorization / session carrier / takeover)を変更するため、セキュリティ検査は「認可の既定を緩めていないこと」(NFR-2)と「takeover の人間確認契約」(FR-4(a)(c))の2面へ trace する(`cid:build-and-test:bt-proportional-selection`)。

| 検査 | 手段(フルパス) | 契約 |
|---|---|---|
| 認可既定の不変 | `tests/integration/t365-kimi-reviewer-boundary.integration.test.ts`(拒否側4 assert+許可側2 assert 無改訂 green) | 復旧 verb 以外の拒否挙動は不変。subagent 詐称・reviewer 越境の既存封鎖を維持 |
| 確認なし takeover の fail-closed | `tests/integration/t450-session-takeover.integration.test.ts:237/:253/:264` | `--confirm` 欠落 / HUMAN_TURN 非接地 / 1承認2回目 → すべて拒否、carrier・state 不変 |
| role 残存時の奪取防止 | 同 `:311/:324` | 残存 role の明示なし・不一致 acknowledgement → 拒否 |
| audit の実行結果由来性 | 同 `:354` + `tests/integration/t48-audit-event-emitters.test.ts`(単一 emitter 逆検査) | RECOVERY_COMPLETED は実行成功時のみ append(検証劇場 Forbidden) |
| 認可バイパスの非案内 | grep 実測(code-summary 記載): エラーメッセージ 0 hit、手順書は escape hatch と明記 | NFR-1 / CON-4 |

## 依存監査

外部依存の追加なし(RE 実測: 区間内も本実装も依存変更ゼロ)。repository 全体の既存 advisory は対象変更と別判定(`cid:build-and-test:c1-doctor-seam`)であり、本 intent では新規に導入した依存がないため N/A。

## 合否

上表の全テストが green(実測は build-test-results.md に記録)。
