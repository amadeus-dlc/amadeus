# Business Logic Model — amadeus-mirror-cli

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md

## コマンド別ロジックフロー

### create(FR-2)

```
parseArgs → buildSnapshot(3ソース合成)
  → outcome.kind == "error" → stderr 透過 → exit 1
  → snapshot.mirrorIssue != null → [重複ガード] 既存番号を stderr 表示 → exit 1   (FR-2.2)
  → ensureGhReady 失敗 → stderr 透過 → exit 1                                   (FR-1.3)
  → renderTitle/renderBody → gh issue create --label intent-mirror --label enhancement
  → 出力 URL から Issue 番号を parse → state.md へ Mirror Issue フィールド書き込み  (FR-2.3)
  → exit 0
```

### sync(FR-3)

```
parseArgs → buildSnapshot
  → outcome.kind == "error" → stderr 透過 → exit 1
  → snapshot.mirrorIssue == null → exit 1                                        (FR-3.3)
  → ensureGhReady 失敗 → exit 1
  → renderBody(決定的素材のみ)→ gh issue edit <n> --body <body>
  → exit 0(冪等: 素材不変なら本文同一 — FR-3.2)
```

### close(FR-4)

```
parseArgs → buildSnapshot
  → outcome.kind == "error" → stderr 透過 → exit 1
  → snapshot.mirrorIssue == null → exit 1
  → ensureGhReady 失敗 → stderr 透過 → exit 1                                   (FR-1.3、AND 検査の前 — 環境不備を先に落とす)
  → [着地機械検査] snapshot.intentStatus == "complete" AND snapshot.workflowStatus == "Completed"
      不成立 → 不足シグナルを明示して exit 1                                       (FR-4.1、fail-closed)
  → 最終 sync(renderBody → gh issue edit)                                        (FR-4.2)
  → gh issue close <n> → exit 0
```

## エラー分類(error-classification 準拠)

| 状態 | 分類 | 対処 |
|---|---|---|
| usage 誤り | error(呼び出し側) | USAGE + exit 2 |
| gh 不在/未認証/失敗、フィールド不在、検査不成立 | fault(環境/前提) | loud stderr + exit 1(フェイルファスト、リトライしない) |
| 状態ファイル parse 不能 | fault | SnapshotOutcome error 経路 → exit 1 |

## Review History

- iteration 1(architecture-reviewer): NOT-READY — Critical(business-rules H2 不足)/ Major(close の ensureGhReady 欠落)/ Minor(buildSnapshot error 分岐の図中省略)。全件是正済み。

## Review(iteration 2)

**Verdict:** READY
**Reviewer:** amadeus-architecture-reviewer-agent
**Date:** 2026-07-17T00:00:00Z(review pass)
**Iteration:** 2

### Findings

| # | Severity | Location | Finding | Status |
|---|---|---|---|---|
| 1 (旧Critical) | — | business-rules.md | H2 セクション不足の指摘。`grep -c "^## "` で実測 2 件(「## ルール一覧」「## 網羅性確認」)。「## 網羅性確認」節が新設され、R1〜R8 と requirements.md の FR-2.2/FR-3.2-3.3/FR-4.1-4.2/FR-1.3-1.5/FR-5.1/C-R2-C-R3/NFR-2/Q4 との対応が明記された | Resolved |
| 2 (旧Major) | — | business-logic-model.md close フロー | ensureGhReady 欠落の指摘。close フロー(`business-logic-model.md:30-41`)を実測すると、`ensureGhReady 失敗 → stderr 透過 → exit 1`(FR-1.3)が `[着地機械検査] AND 検査` より前の行に明示され、コメントで「AND 検査の前 — 環境不備を先に落とす」と意図も記載されている | Resolved |
| 3 (旧Minor) | — | business-logic-model.md 3フロー | buildSnapshot error 分岐の図中省略の指摘。`grep -n 'outcome.kind == "error"'` で実測すると create/sync/close の3フローすべての先頭付近(11/23/34行目)に `outcome.kind == "error" → stderr 透過 → exit 1` が存在する | Resolved |

新規指摘なし。是正対象の3ファイル(business-logic-model.md、business-rules.md、domain-entities.md)全体を再読し、FR トレース(business-rules.md の R1〜R8 引用 FR/NFR/C-R 番号)を requirements.md に対して個別 grep で裏取りしたが(FR-1.3/1.5/2.1/2.2/2.3/3.2/3.3/4.1/4.2/5.1、NFR-2、C-R2、C-R3 の全13件が requirements.md 中に実在)、不整合・欠落は検出されなかった。domain-entities.md は iteration 1 の指摘対象外であり、is 変更なし(重複定義排除・parse-don't-validate の記述は妥当)。

### Validation Tool Results

本ステージ定義に検証ツールの指定はなし(手動実測のみ)。

| 確認項目 | コマンド | 結果 |
|---|---|---|
| business-rules.md H2 数 | `grep -c "^## " business-rules.md` | 2(旧 Critical 相当の欠落が解消) |
| 3フロー error 分岐の存在 | `grep -n 'outcome.kind == "error"' business-logic-model.md` | 11/23/34 行目に存在(3件) |
| close フローの ensureGhReady 順序 | 目視+行番号確認(`business-logic-model.md:30-41`) | AND 検査より前に配置済み |
| R1〜R8 引用 FR/NFR/C-R の実在 | `grep -c "<id>" requirements.md`(13 個体別実行) | 全13件が1件以上ヒット、参照切れなし |

### Summary

iteration 1 の Critical 1件・Major 1件・Minor 1件はすべて実測で閉包を確認した(business-rules.md の網羅性確認節新設、close フローの ensureGhReady 先行順序化、3フロー全てへの error 分岐明記)。是正 diff によるトレース・FR順序のリグレッションも見られない。新規指摘なし。READY。

