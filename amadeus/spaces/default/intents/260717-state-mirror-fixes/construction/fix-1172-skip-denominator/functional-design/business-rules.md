# Business Rules — fix-1172-skip-denominator(functional-design)

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md、decisions.md

## ルール一覧(テスト可能形)

| # | ルール | 由来 | テスト |
|---|---|---|---|
| BR-1 | 行末 `— SKIP` サフィックス行は分母(total)に数えない | FR-2a | unit: `[ ] X — SKIP` 行が total へ不算入 |
| BR-2 | checkbox `[S]` 行の分母除外は維持する(両条件併用) | FR-2a | unit: `[S] X — EXECUTE` 行が total へ不算入 |
| BR-3 | mirror-issue-tool 相当(EXECUTE 18 全 [x]+SKIP 14)fixture で {approved:18, total:18} | FR-2b | unit: 18/18 assert |
| BR-4 | fixture は実様式 — 「`[S]`+`— EXECUTE`」と「`[ ]`+`— SKIP`」の両形を含み、t232 の捏造 `[S]`+`— SKIP` 形は実様式へ是正 | FR-2c | fixture 差分レビュー+実 state 由来行の verbatim 採用 |
| BR-5 | `— EXECUTE` 行の集計挙動(x→approved、他→total のみ)は不変 | FR-2a(既存維持) | 既存 t232 ケースの green 維持 |

## 落ちる実証(FR-4c)

追加する除外条件の実行行へ注入(条件を恒偽化)し BR-1/BR-3 の unit テストが赤くなることを実証(inject-runtime-consumed-lines、注入→赤→revert の1セット)。
