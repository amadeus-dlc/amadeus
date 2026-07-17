# Reliability Requirements — opencode-plugin-adapter(Issue #1049)

> 上流入力(consumes 全数): `../functional-design/business-logic-model.md`(決定木 — 全終端 advisory)、`../functional-design/business-rules.md`(R-1/R-3/R-5/R-8)、`../../../inception/requirements-analysis/requirements.md`(AC-2c/AC-3c)、codekb `technology-stack.md`(実行環境)。2026-07-17。

## 最上位の信頼性契約

**「plugin 全損でも opencode と core hooks の正しさは不変」(C-2 保存)** — ゲート強制はツール所有 emit が正であり、plugin は補助的な配線に過ぎない。この非対称が本 unit の信頼性設計の根本で、可用性の追求ではなく**無害性の保証**が契約である。

## 障害許容(既決契約の転記)

| # | 契約 | 由来 |
|---|---|---|
| RL-1 | 全失敗経路(未配線・語彙未登録・payload 欠落・spawn 失敗・hook 非0 exit)で stderr 記録+継続 — サイレント失敗禁止 | R-8 / AC-2c |
| RL-2 | いかなる失敗も opencode をブロックしない(advisory)— 例外は catch、返り値でキャンセル・変更しない | R-1 / ADR-3 |
| RL-3 | 不確実な状態では配線しない(fail-closed): payload 欠落 → error、mint 条件不成立 → 見送り | R-3 / R-5 / AC-3c |
| RL-4 | 劣化モード: plugin 不在・無効・全損時は「hooks なしの opencode 運用」(現状)へ自然縮退 — 縮退に検知・切替機構を要しない(構造的 graceful degradation) | ADR-5 Consequences |

## 対象実体なしの軸(根拠付き N/A)

- **可用性 SLA/SLO**: 対象サービスなし(単発イベント処理・常駐なし)— observability-setup:c3 に従い、単発 run 成功を SLO へ昇格させない
- **バックアップ/リカバリ・データ耐久性**: plugin 保有の永続データなし。audit 追記の耐久性は core hooks 側の既存契約(append-only シャード)で、本 unit の変更面外(AC-2b)
- **災害復旧**: N/A(ローカルツール — 復旧対象のデプロイ実体なし)
