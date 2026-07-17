# Intent Backlog — 260717-state-mirror-fixes

上流入力(consumes 全数): intent-statement.md, feasibility-assessment.md, constraint-register.md

## 優先順位付きバックログ(proto-Units、MoSCoW)

順序は scope-document.md の方針(priority-vs-dependency: P2 先頭・P3 同乗、依存は実行可能性制約)に従う。

| # | proto-Unit | 対象 Issue | MoSCoW | 優先度/重大度 | 依存 | 概要 |
|---|---|---|---|---|---|---|
| B1 | state-regression-guard | #1170 | Must | P2/S3 | なし(並行可) | sync-statusline 経由 set-status の後退書き込み抑止ガード+リグレッションテスト(前進系非抑止の両側実測込み)。正本 `packages/framework/core/` 編集+dist×6/self-install 再生成。ガード位置(handleSetStatus/setCheckbox)は設計段確定 |
| B2 | mirror-skip-denominator | #1172 | Must | P3/S4 | 検証のみ B3 に依存(D3) | `countStageProgress` へ `— SKIP` サフィックス行の分母除外を追加+unit テスト(両様式 fixture: `[S]`+`— EXECUTE` / `[ ]`+`— SKIP`) |
| B3 | mirror-issue-tool-state-repair | #1170 付随(raid-log I1) | Must | — | なし | 260717-mirror-issue-tool record の巻き戻り修復(5a0cd1e6e 固定分の復元)。実施単位は設計段確定(raid-log R4) |

スコープ外(Won't — 本 intent では実施しない): state 書き込み単調性の一般機構化(必要が顕在化したら別 Issue 起票)、amadeus-mirror の機能拡張、他 Issue の同乗。

## 検収条件の対応(トレーサビリティ)

- B1 → intent-statement.md Success Metrics「後退方向へ書き戻されない+リグレッションテスト green」
- B2 → 同「in-scope 分母(18/18)表示+unit テスト green」(実測は B3 完了後 — feasibility raid-log D3)
- B3 → feasibility raid-log I1 のクローズ(mirror #1179 の状態行正常化 = I2 解消の前提)
- 共通 → constraint-register T2(dist:check / promote:self:check green)・T6(落ちる実証)

## Value Stream Map(テキスト表現)

```
[並行セッション運用] → (B1: 後退抑止) → [state 信頼性回復] → 手動修復ゼロ・learnings gate 誤拒否解消
[mirror sync] → (B2: 分母修正) + (B3: state 修復) → [進捗表示正常化] → external 共有面の誤認解消(#1179 の 3/32 → 正値)
```

(Mermaid 不使用 — 単線フローのためテキストで充足。Conventions の text fallback 要件に準拠)
