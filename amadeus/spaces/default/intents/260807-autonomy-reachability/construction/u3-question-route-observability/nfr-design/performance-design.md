# Performance Design — u3-question-route-observability

上流入力(consumes 全数): business-logic-model.md(導出属性フロー)。nfr-requirements 系5成果物は self-feature スコープで nfr-requirements SKIP のため未生成(設計どおりの不在)— NFR の親は requirements.md NFR-1〜5 を直接参照。

## 性能設計

- 追加処理は `QUESTION_ANSWERED` emit 時の属性2つの付与と、`--decision-id` 渡し時の形式検査(正規表現1回)のみ — 既存 emit 経路のコストに埋没する
- 集計(迂回述語)は u5 のオフライン処理であり、記録経路に集計コストを載せない
- 常駐サービス機構は適用外(cid:nfr-design:c1)

## 予算の非対象

負荷試験・数値目標なし(承認済み NFR に性能目標が存在しない — bt-proportional-selection)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-07T21:50:32Z
- **Iteration:** 1
- **Scope decision:** none

修正後 FD(導出属性設計)との整合・拒否経路残存なし・失敗様式3行の1:1・反自己申告設計の妥当性を確認。指摘なし

### Findings

- None
