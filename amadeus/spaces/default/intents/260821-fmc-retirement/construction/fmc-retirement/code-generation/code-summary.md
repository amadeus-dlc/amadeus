# Code Summary — U1 fmc-retirement

上流入力: `code-generation-plan.md` / FD 4 成果物(`business-logic-model.md`・`business-rules.md`・`domain-entities.md`・`frontend-components.md`)/ `../nfr-design/security-design.md` / `inception/units-generation/unit-of-work.md` / `inception/requirements-analysis/requirements.md`。数値は builder 完了報告と worktree 実測からの転記(測定 ref = worktree bolt-fmc-retirement、rebase 後 head 002b34542 系列、base = origin/main 5117c57b8)。

## 実装実測

- **規模**: `git diff --shortstat origin/main..HEAD`(rebase 前実測)= **271 files / +1,090 / −44,899**。コミット 6 件(fixture 新設 / B1 差し替え / A2 再配線 / O-5 代替 / 本体削除+CI+docs / allowlist 是正)
- **削除照合**: plugin 43 / specs 21(rfc 4 残置確認)/ tests 97(A1 92 + A2 再分類 4 + 改名旧 1)/ docs 全面 4 — census と一致
- **166 パス reconciliation 確定**(上流 §12a FOLLOW-UP 閉包): 多軸 grep 母集団 164 + boundary テスト + sha256 fixture = 166。A1 92 / A2 8 / B1 16 / B2 45 / 台帳 5
- **FR-DEL-1 落ちる実証**: 削除前 **1122 hits / 192 files**(現状赤)→ 削除後 **0 hits**(緑)、対照 `pr-convergence` 69 files 非ゼロ(述語健全)
- **TDD 実測**: t2415 は literal-pin 型と実読確定 → 正本先行更新で Red 1 fail(逐語 `Expected to contain: "model-map.json"`)→ Green 17 pass。O-5 代替 2 本とも Red 実測(2 fail / 1 fail)→ Green(5 pass / 4 pass)。B1/A2/B2 は characterization(前後 green)
- **B1 assertion 保全**: expect 静的件数 442 → 444(減少ゼロ、機械照合)
- **O-5 被覆**: regen 後 registry で 3 unit すべて covered(`amadeus-log advisory-decision` は UNDER-MECHANISM → covered へ改善、ratchet 87→88)
- **CI 面**: ci.yml job 106 行 + needs + require_result 除去、`grep -c formal-model-check ci.yml` = 0、risk arm の `require_result "e2e"` 維持(赤が止まる面の非空を実読確認)。detect-ci-changes 3→1 パターン。mise JDK 除去
- **検証(worktree、rebase 前)**: typecheck 0 / lint 0(warnings は全て pre-existing、接触ファイル diff 空で実証)/ **フルスイート `bun run test:ci -- -P 4` exit 0(1009 files / 0 failed / 13,563 assertions)** / source-only 0 / graph invariants 0 / registry --check 0 / complexity 0 / distribution 0
- **検証(rebase 後 5117c57b8 起点)**: build 0 / registry --check 0 / typecheck 0 / targeted 8 ファイル 46 pass / 0 fail。rebase 競合は #3399 の 3 ファイル(modify/delete)のみ — 削除側採用、マーカー残ゼロ機械確認
- **初回フルスイートの帰属**: t535/t537 = allowlist 欠落パス(是正 c8044bc46)、t435 = 並行実行 flake(単独 14 pass・2 回目再現せず — cross-job 帰属手順の適用)

## 逸脱(全て conductor 裁定済み — code-generation-plan.md の裁定表参照)

A2 のファイル内一部削除(2 件)/ fixture 形状 2 点 / INSTALL seam 変更 / census 未収載 2 件の回収 / **measured GraphQL fixture 2 件のリテラル置換(実測記録の改変 — FR-DEL-1 の 3 キーのみ、構造同一を機械検証。§12a レビュー対象として明示)** / B2 側 assertion 2 件の削除(subject 消滅)。

## swarm 収束・配送

referee converged:true(tamper 判定の経緯は plan 参照)。settle-release succeeded、pool terminal。配送 = 本 Bolt PR(単一 unit・単一 PR — multi-member 暫定禁止ノルムに整合)。FR-NORM-1 / FR-ISS-1 は着地後 conductor 実行。
