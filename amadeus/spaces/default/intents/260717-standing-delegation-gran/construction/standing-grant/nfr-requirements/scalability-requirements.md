# Scalability Requirements — standing-grant(U1)

上流入力(consumes 全数): `../functional-design/business-logic-model.md`(純関数構成・エラー処理方針)、`../functional-design/business-rules.md`(R-1〜R-8)、`../../../inception/requirements-analysis/requirements.md`(FR-1〜8)、codekb `technology-stack.md`(Bun/TS/Biome — 本日 RE 現況)

## 判定: 根拠付き N/A

スケーラビリティ要件の対象実体が存在しない(environment-provisioning:c3 の N/A 様式 — 反証可能な不存在根拠を併記):

| 検討軸 | 不存在根拠 |
|--------|-----------|
| 同時利用者数 | 単一リポジトリのローカル CLI — サービス実体なし(codekb technology-stack: Bun ローカル実行) |
| データ増加 | グラント行は発行1回につき数行の append-only 監査行 — TTL 4h 運用で日あたり高々数件(#1125 の3波実測基準) |
| 水平分散 | 検証は各 worktree ローカルで完結(結果整合 — ADR-2)— 分散協調機構なし |

## 再評価条件

グラント発行頻度が想定(日数件)を大きく超える運用実測が出た場合、または walkthrough 対象の intent 数が走査コストを可視に悪化させた場合に限り再評価する(N/A は省略の免罪符でなく反証条件付き — environment-provisioning:c3)。
