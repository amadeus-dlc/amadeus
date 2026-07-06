# Code Generation Plan：260705-persist-cid-metamain

unit: persist-cid-metamain（bugfix scope により units-generation は SKIP。Intent 全体を単一 unit として扱う。前例: 260705-docs-codekb-guards）

Bolt 2 本を直列で実行する。各 Bolt は TDD（先に失敗する eval → 失敗確認 → 最小修正 → GREEN 確認）で進める（NFR-1）。eval は隔離 workspace での実 CLI 駆動とする（NFR-2、Corrections c5/c7）。

## B001（#504）: learnings persist の cid 衝突解消と明示報告 — FR-1

- [x] Step 1: eval `dev-scripts/evals/persist-cid-metamain/check.ts` に B001 検査を追加する（RED を確認）。隔離 workspace で実 CLI（amadeus-utility.ts intent-birth、amadeus-learnings.ts persist）を駆動する。検査: (a) 別 Intent の同名 candidate_id が無言 no-op にならず追記される（FR-1.1）(b) 同一 selections の 2 回目 persist が rule_learned を増やさない = 戻り値の appended / already-present 分離（FR-1.4/1.5、leader 条件の先行 RED）(c) 旧形式 marker 共存時に新形式で追記され appended 側でカウントされる（FR-1.3 の pin）。
- [x] Step 2: `.agents/amadeus/tools/amadeus-learnings.ts` を最小修正する。cidMarker を新形式 `cid:<dirName>:<stage>:<cN>`（dirName = active intent の record dir 名）へ拡張し、照合は新形式 marker のみを対象にする（FR-1.2）。戻り値は appended / already-present を分離し、already-present を rule_learned に数えない（フィールド名はここで確定 = O-1）。
- [x] Step 3: eval GREEN を確認する。
- [x] Step 4: parity-map.json の exceptions に #504 の理由を追記する（`tools/aidlc-learnings.ts` は engineFileExceptions 宣言済み）。

## B002（#507）: エンジン tools 5 ファイルの import.meta.main ガード — FR-2

- [x] Step 5: eval に B002 検査を追加する（RED を確認）。検査: (a) 5 ファイルとも import で副作用（usage エラー exit）が起きない（FR-2.2。現状 FAIL）(b) CLI 挙動不変 = 引数なし実行の usage エラーと exit code が修正前後で同一（FR-2.3）(c) 全 tools 走査で無条件 main() 呼び出しが 0 件になる回帰検査（FR-2.5）。
- [x] Step 6: 5 ファイル（amadeus-sensor.ts、amadeus-sensor-required-sections.ts、amadeus-sensor-upstream-coverage.ts、amadeus-swarm.ts、amadeus-validate.ts）の無条件 `main()` を `if (import.meta.main)` ガードで包む最小修正。
- [x] Step 7: eval GREEN を確認する。npm run test:it:engine-e2e で CLI 挙動の退行なしを確認する。
- [x] Step 8: parity-map.json の engineFileExceptions へ 5 ファイルを追加し、exceptions に #507 の理由を追記する（skills/ 正準反映は複製不在のため対象外 = NFR-3）。

## 仕上げ

- [x] Step 9: package.json に `test:it:persist-cid-metamain` を追加し、`test:it:all` の連鎖に組み込む。
- [x] Step 10: typecheck / parity / 関連 eval を実行する。aidlc-state.md の Per unit を実 unit 名（persist-cid-metamain）へ手動更新する（Corrections build-and-test:c2）。
- [x] Step 11: code-summary.md を書く。

## トレーサビリティ

| Plan step | Bolt | 要求 | Issue |
|---|---|---|---|
| Step 1〜4 | B001 | FR-1.1〜FR-1.5、NFR-1〜NFR-3 | #504 |
| Step 5〜8 | B002 | FR-2.1〜FR-2.5、NFR-1〜NFR-3 | #507 |
| Step 9〜11 | 共通 | C-2（PR 前検証の入口整備）、record 整合 | — |
