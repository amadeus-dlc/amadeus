# Unit of Work Story Map — live E2E Phase 2

## 入力とマッピング単位

User Storiesステージは本IntentでSKIPされ、`stories.md`は存在しない。そのため、[requirements.md](../requirements-analysis/requirements.md) の検証可能なFR/NFRをstory proxyとして、[components.md](../application-design/components.md)、[component-methods.md](../application-design/component-methods.md)、[services.md](../application-design/services.md)、[component-dependency.md](../application-design/component-dependency.md)、[decisions.md](../application-design/decisions.md) のUnitへ対応付ける。新しいstoryは発明しない。

## Requirement-to-Unit map

| Requirement | Primary Unit | Cross-cutting Unit | 実装価値 |
|---|---|---|---|
| FR-02〜FR-08 | `kimi-print-live-e2e` | `phase2-live-e2e-evidence` | Kimiの安全な共通接続と実live証拠 |
| FR-09〜FR-15（ACP面） | `kiro-acp-live-e2e` | `phase2-live-e2e-evidence` | ACPのconnected/follow-up二択完了 |
| FR-09〜FR-15（TUI面） | `kiro-tui-live-e2e` | `phase2-live-e2e-evidence` | TUIのconnected/follow-up二択完了 |
| FR-16〜FR-20 | U1/U2/U3各々 | `phase2-live-e2e-evidence` | 全live pathの共通安全contract |
| FR-01、FR-21、FR-22 | U1/U2/U3各行 | `phase2-live-e2e-evidence` | capability正本、ledger、運用cycle |
| NFR-01〜NFR-04、NFR-06 | U1/U2/U3各々 | — | security、cleanup、deterministic test、adapter cohesion、cost |
| NFR-05、NFR-07、NFR-08 | U1/U2/U3各々 | `phase2-live-e2e-evidence` | regression、bounded evidence、provenance |

## Unit内の検証シナリオ

### `kimi-print-live-e2e`

1. fakeでpreflight、opt-in、GHA deny、env leak、failure、timeout、cleanupを検証する。
2. Kimi mechanicsをadapterへ接続し、旧journeyを単一common lifecycleへ移す。
3. local opt-inでKimi自身のgreen receiptを得る。
4. capability rowと投影testを更新する。

### `kiro-acp-live-e2e`

1. auth/config binding、structured anchor、abort/cancel/descendant reapをprobeする。
2. 成立時はadapter/contract/integration/local liveを閉じる。
3. 不成立時はsanitized evidenceからqualified follow-up Issueを作り、registry/matrixをlinkする。
4. いずれのbranchでもmeasured-onlyを残さない。

### `kiro-tui-live-e2e`

1. scratch home/env、private tmux、disk/state anchor、pane上限、timeout killをprobeする。
2. 成立時はadapter/contract/integration/local liveを閉じる。
3. 不成立時はsanitized evidenceからqualified follow-up Issueを作り、registry/matrixをlinkする。
4. いずれのbranchでもmeasured-onlyを残さない。

### `phase2-live-e2e-evidence`

1. 3 transportのcapability rowとreceipt/Issue linkをschema検証する。
2. final matrixと最終green SHAを決定的に投影する。
3. 実行契機、opt-in、auth前提、skip診断、retry/二重失敗申し送りをrunbookへ反映する。
4. Codex/Claude/Pi回帰、source-only、build/test結果をPhase 2完了証拠へ束ねる。

## Coverage verification

- FR-01〜FR-22: すべてPrimaryまたはCross-cutting Unitへ割当済み。
- NFR-01〜NFR-08: すべて各transportまたは統合evidence Unitへ割当済み。
- Unit without requirement: 0。
- Requirement without Unit: 0。
- User Stories未生成のため、story orderは定義しない。上記シナリオ番号は各Unit内の検証構造であり、Unit間の経済的実装順序ではない。

