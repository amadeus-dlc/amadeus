# Build and Test Summary — 260802-scope-grid-face-sync

上流入力(consumes 全数): code-generation-plan.md、code-summary.md

## 実行サマリ

対象 = bolt ブランチ `fix/2033-self-scope-grid-face-sync`(3コミット、PR #2041)+conductor ツリーへの mirror merge 断面。code-generation-plan.md Step 9 の検証一式と code-summary.md の AC 表を、conductor ツリーで再実行して確定した(build-test-results.md が実測値の正本)。

- ビルド/ドリフト: typecheck / lint / dist:check / promote:self:check すべて exit 0
- テスト: 宣言5ファイル(t413 / センサー / t89 / t93 / t370)55 pass / 0 fail
- フルスイート: bolt ブランチで coverage:ci PASS(9962 assertions / 0 failed)、patch 107/107、project 89.72%
- 落ちる実証: FR-6 Red(7 pass/2 fail)→ FR-4 実装後 Green(9 pass/0 fail)、t413 は止血前 Red 実測済み
- 閉包実証: pre-fix 断面で新センサー findings 28 / 旧センサー 0

## 検証した面と未検証の面(verdict-names-unverified-facets)

- 検証済み: 面間乖離の検出(fixture 注入+pre-fix 断面)、止血の完全性(t413 green)、投影同期、既存回帰
- 未検証: 非 claude ハーネスでの実 intent birth が SKIP を反映すること(実 kimi セッションでの E2E は本 intent スコープ外 — grid 読取経路はコード実読で確定済みのため残余リスクは低)

## 判定

READY(条件なし)。PR #2041 の CI green 確認とマージ承認は別途(no-AI-merge)。
