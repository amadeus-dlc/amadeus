# Decision Log — 260727-plugin-verb-skills(ideation)

上流入力(consumes 全数): intent-statement.md、scope-document.md、intent-backlog.md、feasibility-assessment.md、constraint-register.md

## 決定一覧

| # | 決定 | 裁定者 | 根拠 | 記録 |
|---|---|---|---|---|
| D1 | スコープ = #1597 提案1〜4 フル + #1598 同乗(最大スコープ) | ユーザー直接裁定 2026-07-27T14:58:20Z | 初回2問提示への「スコープを削ろうとしていますか?」確認を受け、増減方向を明示した再提示で確定 | intent-capture-questions.md 裁定の記録 |
| D2 | feasibility 判定 GO、質問0問 | conductor(既決照合) | 全シーム実測済み・外部依存なし(feasibility-assessment.md) | feasibility-questions.md |
| D3 | #1598 の方式選定(compose 時ホスト側生成 vs runner-gen 拡張)は application-design の ADR へ委譲 | conductor | 両案とも実装可能性成立、早期断定を避ける(nfr-design:c7) | raid-log.md R1 |
| D4 | MoSCoW 全 Must・Won't 厳格除外、シーケンスは dependency + risk-first | conductor(前例適用) | scope-definition:c2/c3 前例 + D1 のフルスコープ裁定 | scope-document.md / intent-backlog.md |
| D5 | walking skeleton = `/amadeus plugin status` end-to-end 薄スライス | conductor(delivery-planning で最終確定) | 最大リスクでなく最小配線を先に実証し、書込系 verb はゲート後に拡張 | intent-backlog.md |
| D6 | mirror Issue は作成しない(Issue-first intent) | conductor | #1597/#1598 が既存の共有ビュー — 重複起票禁止(pre-filing-dup) | 監査シャード(mirror create skipped) |
| D7 | §13 学習: intent-capture で1件 persist(cid:intent-capture:c1-option-direction)、feasibility/scope-definition は0件 | ユーザー裁定(各ゲート) | 新規性基準 | 各ステージゲート記録 |

## 未決事項の委譲先

- #1598 方式選定 → application-design の ADR(D3)
- walking skeleton スライスの最終確定 → delivery-planning(D5)
- install verb の失敗時状態契約 → requirements-analysis(raid-log R3)
