# Code Summary — fix-t258-p95-flake(Issue #1511)

上流入力(consumes 全数): requirements.md(改訂裁定 Q1改=C 反映版 — FR-1〜5/NFR-1〜3 の導出元)。code-generation-plan.md の Steps は改訂裁定に伴い読み替え(noop 相対項の廃止 — 下記逸脱記録)。

- ブランチ: `fix/1511-t258-p95-relative-gate`(worktree `.claude/worktrees/t258-p95-flake`)
- base: rebase 後 origin/main = `f8fe817c5`(#1554 プラグイン walking skeleton 着地後)
- 規模: **4 files changed, 255 insertions(+), 8 deletions(-)**(tests/ のみ — dist/self-install 非対象。測定 ref: `git diff --stat f8fe817c5..HEAD`(rebase 後 base)出力の転記 — reviewer Minor 指摘で fork base 表記から是正)
- コミット: `ff12ce0f9` test(lib) 述語追加 / `c6c1a80fe` fix(test) t258/t257 median 化

## 逸脱裁定の記録(implementation-deviation の宣言)

builder が FR-1 前提節の要求どおり **noop 系列の相関を実装前に実測**し、当初裁定 Q1=A(noop 相対+絶対 AND)の中核前提を反証(noop は空計測ウィンドウ ≈40ns・I/O なし。高負荷スイープ実測: archive p95 38.19→86.90ms(2.3倍)の間 noop は 0.0008ms で平坦 = 相関ゼロ)→ 二段 AND は旧絶対 ceiling と同一挙動に退化するため**実装前に逸脱停止** → ユーザー再裁定 **Q1改=C(median 基準の絶対予算、p95→median の契約変更を正準リスト(4)で承認、2026-07-26T22:05Z 頃)**。requirements.md FR-1 に承認系譜を明記済み。反証データと棄却理由は述語モジュールのコメントに provenance として焼き込み。

## FR 対応表

| FR | 実装 |
|---|---|
| FR-1 median 基準化 | `tests/lib/latency-median-budget-gate.ts` — `exceedsMedianLatencyBudget(samples, budget)` = median > budget。予算値不変(t258: 500/750、t257: 100/250)。長さ非依存 median(固定 index 禁止)。fail-closed(空列・非有限は fail)。provenance へ `archiveMedianMs`/`recoveryMedianMs`(t258:465-466)等を追加、p95 既存フィールドは維持 |
| FR-2 述語分離+unit | `tests/unit/latency-median-budget-gate.test.ts`(19 tests)— 旧判定(nearest-rank p95 ceiling)を対照用に再現し、#1511 実在集計値(886.793806/767.446207ms — 転記)をスパイク振幅に使った**合成ラベル付き**サンプル列で「6〜49 spikes: 旧赤・新緑」+全シフト退行で新赤+エッジ(空列・非有限・境界) |
| FR-3 t257 同方式 | t257:240 相当を同一述語 import へ(canonical 1定義、独立再定義なし) |
| FR-4 統合配線 | t258 内で退行合成列に対する述語 fail 伝播 1ケース(:491)。**t257 側の独立配線ケースは置かない**(t257/t258 は同一 canonical 述語を import しており配線契約は1回の実証で両者に敷衍、値レベルの独立性は FR-2 unit の budget 別ケースでカバー — reviewer 指摘を受けた解釈の明記) |
| FR-5 クローズ | PR 着地後に実施(残作業) |

## 検証(conductor 再実測、rebase 後 base f8fe817c5)

| コマンド | exit |
|---|---|
| bun run typecheck | 0 |
| bun run lint | 0 |
| 述語 unit + t257 + t258(57 tests) | 0(57 pass 0 fail — `Ran 57 tests across 3 files` 転記) |
| bash tests/run-tests.sh --ci | 0(RESULT: PASS) |
| bun run coverage:ci | 0 |
| patch gate(AMADEUS_PATCH_BASE_REF=origin/main) | PASS — measured added 13 / covered 13 / uncovered 0 |
| bun run dist:check / promote:self:check | 0 / 0(無風確認) |

落ちる実証: 旧判定の赤は unit の対照テスト(6〜49 spikes で `oldP95CeilingVerdict` true = 旧なら fail)として恒久固定。新判定の赤(全シフト退行)も unit+統合の両面で固定。既知フレーク: wall-clock drift 1件(t-codex-hooks-migration — 並行負荷起因・自変更外)。

## プロセス記録

- builder の相関反証 → 逸脱停止 → 再裁定 C は cid:code-generation:deviation-stop-before-implement / ruling-premise-closure-verification の実践
- base 前進(19fc33b5a → f8fe817c5、#1553/#1554 ほか着地)に対し conductor が rebase(衝突ゼロ)+全ゲート再実測(上表)
