# Performance Design — control-byte-gate(Issue #2814)

上流入力(consumes 全数): business-logic-model.md(処理フロー7段と in-process seam — 本設計の対象面)。条件解決で除外された consumes: nfr-requirements 系5成果物(performance/security/scalability/reliability/tech-stack)— self-feature スコープで nfr-requirements ステージが SKIP のため不在(設計上の期待どおり)。NFR の正本は requirements.md の NFR-1〜4 を用いる。

## 性能目標と設計(NFR-1 決定性を保存する範囲で最適化)

- 目標: full-tree 走査(16,124 files、RE 実測時点)を CI step timeout 30s 未満で完了(FR-CBG-14)。
- 設計: 直列同期走査(business-logic-model.md 段 1〜5)。並行 I/O は導入しない — 出力順の決定性(BR-8)を優先し、バイト走査は CPU/IO とも軽量(コーパス総量は数百 MB 未満、判定は単一パスの線形走査)。
- 実測条項: 実装時にローカル実行時間と**コーパス総バイト数**を記録(FR-CBG-14 受け入れ — 「数百 MB 未満」の規模前提もこの実測で裏取りする)。30s 超過時のみ並行化を再訪(YAGNI — services.md の宣言どおり)。
- 退行観測: CI step の timeout 自体が性能退行の検出器(超過 = ジョブ赤 = loud)。

## 非適用の明示

cache・warm-up・インデックスは持たない(単発プロセス・決定性優先 — cid:nfr-design:c1 の CLI 系適用)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-10T10:12:49Z
- **Iteration:** 1
- **Scope decision:** none

NFR-1〜4 は CLI 不適合パターンなしで realize され、FD の BR 番号・7段フロー・seam 意味論と整合。層別保証機構で普遍断定を回避。BLOCKER なし — FOLLOW-UP 3件(NFR id 逐語引用の薄さ・コーパス規模前提の実測条項化・ADR-1 のスコープ外引用)のうち前2件は conductor が是正済み、ADR-1 実在は conductor が application-design/decisions.md で確認済み。

### Findings

- FOLLOW-UP | performance/scalability/reliability-design.md — NFR-1〜3 の id 逐語引用が薄い(是正済み: 各節見出しへ NFR id を明記)。
- FOLLOW-UP | performance-design.md — 「数百 MB 未満」の規模前提が未実測(是正済み: 実装時実測項目にコーパス総バイト数を追加)。
- FOLLOW-UP | logical-components.md — ADR-1 参照はレビュースコープ外(conductor 確認: application-design/decisions.md に ADR-1 実在・意味論一致)。
