# Application Design — 明確化質問

上流入力(consumes 全数): requirements.md(Open questions 3件 — 本ファイルの質問はその送付事項)、architecture.md(CI ジョブ構成・source-only 境界 — Q1 選択肢の実行コスト根拠)、component-inventory.md(走査系ゲート群の既存コンポーネント一覧 — Q2 の先例確認)

autonomy full 下のため、3問すべて `amadeus-bolt decide-question`(5段梯子)で裁定した(AUTO_DECIDED・reviewState: unreviewed)。

## Q1. CI 起動形態(FR-CBG-8 の実現手段)

- A. **independent-job**: ci.yml に常時実行の独立ジョブを新設(checkout + bun setup + `bun tests/control-byte-gate.ts --check`、専用 timeout、needs.changes 条件なし)— docs-only PR で lint job 全体(build+lizard)を走らせず、分類器と結合しない【推奨】
- B. detect-ci-changes-branch: docs/**・amadeus/** で full=true を立て既存 lint job を起動 — docs-only PR に lint job 全コストを課す
- C. lint-job-only: 既存 lint job への step 追加のみ — docs-only PR で構造的空文化(要件が受け入れ不可と明記)
- X. Other

[Answer]: A — AUTO_DECIDED(questionId: ad-q1-ci-trigger-form)

## Q2. allowlist の保持形(FR-CBG-5)

- A. **in-script**: ゲートスクリプト内の型付き定数配列(`{path, reason}`、現時点 PDF 1件)— stale 検査は ls-files 照合で自明、共有台帳競合の見込みなし【推奨】
- B. ledger-file: no-silent-drop 型の別ファイル台帳 — 1件クラスには過剰設計
- X. Other

[Answer]: A — AUTO_DECIDED(questionId: ad-q2-allowlist-form)

## Q3. バイト集合の canonical との意図的相違(FR-CBG-3 / 0x0C 帰属)

- A. **cr-excluded**: 検出集合 = C0 − {TAB 0x09, LF 0x0A, CR 0x0D} + DEL 0x7F。canonical `CONTROL_CHARS`(amadeus-lib.ts:4298)は CR を strip するが、ゲートは CR を除外(CRLF 行末は正当なファイル内容 — 監査表示文字列とはドメインが違う)。この意図的相違を ADR とコードコメントに明文化。0x0C(FF)は 0x0B-0x1F 範囲内で相違なし(検出対象)【推奨】
- B. cr-detected: CONTROL_CHARS と完全一致(CR も検出)— CRLF ファイルを誤検出
- X. Other

[Answer]: A — AUTO_DECIDED(questionId: ad-q3-byte-set-cr)

## 裁定の記録

- 3問とも decide-question 梯子で確定(グラント intent-grant-a62c587cfa45e9316dc381840bdf7745)。
- ユーザー承認: 2026-08-10T08:32:03Z(autonomy full 起動指示の実 HUMAN_TURN、audit seq 19)
