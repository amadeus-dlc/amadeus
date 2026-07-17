# Design System Mapping — eoc1-gate-check

## 上流入力(consumes 全数)

mockups.md、`../../ideation/rough-mockups/wireframes.md`、`../../ideation/rough-mockups/user-flow.md`、`../user-stories/stories.md`、`../requirements-analysis/requirements.md`(FR-2 出力契約)。

## 様式対応(N/A に近い最小 — CLI ガード)

| 面 | 既習様式 |
|----|---------|
| エラー JSON | amadeus-state.ts の既存 error()(`{"error":"Refusing to ..."}` 形)— 新規発明なし |
| 成功 JSON | 既存 gate-start 出力を不変維持 |
| 文言トーン | 「Refusing to <verb>: <reason>. <fix>, then retry.」— 既存 fail-closed 文言(phase-boundary ガード等)と同調 |
