# Build & Test Results — docs-impl-sync

上流入力(consumes 全数): code-generation-plan.md, code-summary.md

依拠箇所: 検査項目は unit/integration-test-instructions.md、対象 PR と閉包状態は code-summary.md・drift-ledger.md に従う。すべての数値・verdict はコマンド出力からの転記(実行 2026-07-27、各コマンド当時の実測)。

## 実行結果

| 検査 | コマンド | 結果 |
|---|---|---|
| docs ゲート(PR-1) | `bun test tests/unit/t174-docs-legacy-refs-gate.test.ts` @ wt-pr1 | 5 pass / 0 fail、exit 0 |
| docs ゲート(PR-2) | 同 @ wt-pr2(amend 後再実行含む) | 5 pass / 0 fail、exit 0 |
| docs ゲート(PR-3) | 同 @ wt-pr3 | 5 pass / 0 fail、exit 0 |
| FR-1 受け入れ | `grep -ci kimi README{,.ja}.md` @ PR-1 | EN=5 / JA=5(基準 ≥1)、「six coding-agent harnesses」残存 0、表 7 行(EN/JA 同順、conductor 検分) |
| FR-2 受け入れ | (対象は #1568 で main 充足済み — 監査で確定) | N/A(先行解消) |
| FR-3 受け入れ | `grep -cE '11個\|11 個'` 対象 4 JA ファイル @ PR-2/PR-3 | 残存 0(D-099/D-100 是正後。01-architecture.ja.md:60 の「11個のドメインエキスパート」は限定表現として正当・非乖離)。`grep -c plugin-compose` = 06-hooks JA 2 / 15-troubleshooting JA 1(基準 ≥1) |
| FR-5 受け入れ | `grep -c '^## '` 対訳新規 2 件 | team-messaging 4/4、publishing-setup 7/7(EN/JA 一致)。18-workspace-layout.md かな残存 0 |
| 乖離目録閉包 | ledger D-行の未処置 grep | 100/100 行処置済み(未処置 0 — 機械検査) |
| PR CI | `gh pr checks` ×3 | #1576 / #1577 / #1578 すべて「CI Success = pass」、mergeable=MERGEABLE / state=CLEAN(PR-1 は #1574 衝突の rebase 解消後、PR-2 は D-099/D-100 amend 後の再実測) |
| NFR-2(実装コード変更 0) | `git diff --name-only` ×3 ブランチ | docs/ と README*.md のみ(実装・dist 変更 0) |

## verdict

**条件付き READY** — 検証済み面: 3 PR の CI green・受け入れ基準 grep・目録 100/100 閉包・docs ゲート green。**未検証面(明示引き継ぎ)**: (1) PR マージは人間承認待ち(no-AI-merge)で、マージ後の main 断面での受け入れ基準再実測は未実施 (2) 3 PR のマージ順序交差は各マージ後の update-branch + CI 再 green で吸収する運用(integration-test-instructions.md §統合検証 2-3)。無条件 READY への昇格はマージ完了後の main 実測をもって行う(cid:build-and-test:verdict-names-unverified-facets / c4-conditional-ready)。
