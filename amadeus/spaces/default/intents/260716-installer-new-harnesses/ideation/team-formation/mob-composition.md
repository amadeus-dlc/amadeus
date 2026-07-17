# Mob Composition — installer-new-harnesses(Issue #1048)

> 上流入力(consumes 全数): `../scope-definition/scope-document.md`(In/Out・単一 Bolt 見込み)、`../scope-definition/intent-backlog.md`(B-1〜B-4)、`../feasibility/feasibility-assessment.md`(GO・S 規模見積もり)。

## 構成判断

**mob/swarm 不採用 — 直列1 builder**。根拠: B-1〜B-4 は同一ファイル群(packages/setup 5+README+テスト)+同一検証列で、並列分割は交差(c6)を生むだけ。S 規模の単一 Bolt には builder subagent 1名+conductor 検分+レビュー1名が比例構成(parallel-bolts ノルムの「相互依存が真に必要な箇所のみ直列」の逆適用 — 全面依存ゆえ直列)。

## 役割の帽子

- conduct: e3 / build: subagent / review: PR 1名(L3 先行指名)+stage reviewer(§12a、engine 指名があるステージ)
- 自己実装の自己レビュー禁止(role-model)を維持 — builder 成果は conductor 裏取り+独立レビューの二重
