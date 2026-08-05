<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-08-04T18:15:00Z — U1: evidence store の list/head 解決 owner を C4 に確定(application-design レビュー iteration 2 FOLLOW-UP の受け皿)。C9(U2)は list 出力を evidenceIndex として消費し store レイアウト知識を再実装しない
- 2026-08-04T18:15:00Z — U1: 見出し駆動文法(Q2 裁定 A)で見出し行自身は ID のみ採用 — 見出し表題の言い換えは digest に現れない。表題を意味に含める必要が出たら文法改訂として扱うと明記
- 2026-08-04T18:15:00Z — U1: predecessor 検証は build 時 1 段 + verify 時 1 段の帰納的健全性とし、全系列の再帰検証は行わない(各世代が build 時に検証済みのため)

- 2026-08-04T19:12:00Z — U3: vacuity proof の判定機構を witness 到達性(manifest 宣言 witness の ¬witness 注入 → DETECTED 実測)として確定、identity 結束を manifest declaredIdentity との compareIdentity 照合として確定(reviewer iteration 1 BLOCKER の解)。CoverageFailure へ unresolvedRows 第 4 リストを申告付き追加
- 2026-08-04T19:12:00Z — U4: ADR-3 明示タスクの実読確定 — validator は exactObject + MODEL_KEY_SETS 4 集合で未知 key を必ず拒否、schemaVersion 2 固定。人間裁定(19:08:57Z)= v2 据え置き + optional evidenceBundle key 追加(既存 2 モデルはバイト不変で有効)

- 2026-08-04T19:30:00Z — U4: reviewer 予算 2 回消費後の残余 3 件(BR-U4-10 文言整合・到達不能判別子除去・commit 入力セマンティクス)に対し、人間裁定(19:26:46Z)で閉包確認限定の iteration 3 を許可 → 是正後 READY(findings 0)。ReviewReceipt.modelAuthor 新設と PreconditionFailure 2 層集約は iteration 1-2 の BLOCKER 解

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-08-04T18:24:00Z — U1: component-methods §C4 の承認済み契約から 2 点を申告付きで詳細化 — build の第3引数 meta(NFR-002 フィールドの供給経路が他にないため)と BundleFailure への io-failure 追加(実 I/O 境界の typed 表現)。reviewer iteration 1 の指摘を受け、両成果物に拡張申告を明記

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-08-04T18:33:00Z — U2: 冒頭必須の実読確認で ADR-6 前提の一部否定を検出((1) §11a fail-closed 機械強制 = 肯定 (2) plugin 宣言だけの結線 = 否定 — advisory code 語彙と formal_checks コマンドが engine 側ハードコード)。unit-of-work.md の指示どおり halt して人間へ ADR-6 再裁定を返し、案 A(宣言駆動化 — engine の advisory 供給面を plugin.json 宣言読取へ一般化)で承認(18:29:01Z)。decisions.md ADR-6 へ申告付き改訂注記を追記
- 2026-08-04T18:33:00Z — U2: 既存 spec-hash advisory 経路との関係は「併存(宣言経路の追加、既存ハードコードは不変)」を FD 既定とし、移行の要否は code-generation の実測後に別判断(FR-013 保護境界優先)

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-08-04T18:55:00Z — U2 READY 後の申し送り: (1) SubjectSeriesKey 導入(reviewer iteration 1 BLOCKER-2 の解)に伴う component-dependency.md への波及(checkpoint 起動時の --series/--identity 確定責務 = advisory evaluator wrapper)は U2 code-generation 着手前に反映する (2) 既存 spec-hash advisory 経路との併存/移行は code-generation の実測後に確定
