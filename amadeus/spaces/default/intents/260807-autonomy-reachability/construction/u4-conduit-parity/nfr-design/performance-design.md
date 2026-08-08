# Performance Design — u4-conduit-parity

上流入力(consumes 全数): business-logic-model.md(面ごとの Red→Green フローとパリティ検査ロジック)。nfr-requirements 系5成果物は self-feature スコープで nfr-requirements SKIP のため未生成(設計どおりの不在)。

## 性能設計

- 本 unit の実行時成果物はパリティテスト1本のみ — 検査は十数ファイルの read+grep で、CI 予算(per-test 30s)に対し無視できる
- 文書追記は実行時コストゼロ
- 常駐サービス機構は適用外(cid:nfr-design:c1)

## 予算の非対象

負荷試験・数値目標なし(bt-proportional-selection)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-07T21:58:48Z
- **Iteration:** 1
- **Scope decision:** none

doc+test unit の軽量 NFR フレーミング妥当・FD NIT 2件の CG 持ち越し明示・glob 自動拡張整合・失敗様式3行の被覆を確認。指摘なし

### Findings

- None
