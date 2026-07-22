# 欠陥台帳(FR-1/FR-2)— D-COUNT = 7(2026-07-22 確定)

上流入力(consumes 全数): final-fd-gate-ruling.md, live-toolchain-probe-receipt.md

## 確定条件

- **baseline**: `b0fa344a02fb3573bbc0fd850bd549c3bcfebf80`(origin/main、修正3PR着地済み)。baseline上で
  対象4テストファイル(t234 / t235 / t236 / t238)**59テスト全緑**を実測(2026-07-22)
- **注入方式**: crafted 注入(型保存の最小差替)— ユーザー裁定(2026-07-22)。生 git-revert では
  4 predicate が型結合でコンパイル赤(=実行時検出でない)となり verdict を汚染するため。
  全 fixture で `tsc --noEmit -p tsconfig.json` **exit 0** を実測(型保存の機械証明)
- **1欠陥1branch**: `fv-fixture/d<N>-<slug>`、いずれも baseline から1コミット。origin へ push 済み
- **帰属訂正**(ledger-map 分析、`git log -S` 実測): unknown-choice は #1273 でなく **#1268 が新設**。
  対応: #1268={D1,D2} / #1277={D3} / #1273={D4,D5,D6,D7}

## 台帳(7行)

| # | predicate | 由来PR | 注入点(baseline file:line) | 注入内容(型保存) | branch / injectionSha | pinned red test | 実測赤集合 |
|---|---|---|---|---|---|---|---|
| D1 | choice winner | #1268 | amadeus-election-model.ts:454-455 | 勝者選定を count 無視(`choiceCounts.slice(0,1)`)へ | `fv-fixture/d1-choice-winner` / `e083d8a87` | t234:373 "tally: winner is the choice with the most votes" | t234:373, t234 tie, t236:409(波及) |
| D2 | unknown-choice | #1268 | amadeus-election-model.ts:250-252 | choice 実在チェックを除去 | `fv-fixture/d2-unknown-choice` / `e163eed52` | t234:424 "rejects a choiceInternalNo not in the election" | t234:424 のみ |
| D3 | receivedAt | #1277 | amadeus-election-record.ts:210-211 | timeline 単調性を `receivedAt ?? at` → `at` 軸へ戻す | `fv-fixture/d3-received-at` / `27503bf78` | t238:275 "relay-delayed ballot set verifies green on the receipt axis" | t238:275 のみ |
| D4 | invalid-timestamp | #1273 | amadeus-election-model.ts:253 | `isValidSubmittedAt` チェック行を除去 | `fv-fixture/d4-invalid-timestamp` / `6678a5dfe` | t234:239 "invalid-timestamp: mint-form regex + real-date" | t234:239, t234:260(順序 — 同族) |
| D5 | amend submission | #1273 | amadeus-election-model.ts:202 | well-formed amend の返却を `null`(parse-failure)へ | `fv-fixture/d5-amend-submission` / `06ab18602` | t234:279 "amend requires a well-formed ref" | t234:279, t234:316/:341(amend構築系), t236:409(波及) |
| D6 | unknown-ref | #1273 | amadeus-election-store.ts:150-158 | amend の referent 実在チェックブロックを除去 | `fv-fixture/d6-unknown-ref` / `402268be5` | t235:244 "rejects an amend whose ref matches no accepted ballot" | t235:244 のみ |
| D7 | per-voter resolution | #1273 | amadeus-election-model.ts:431 | tally 前の `resolveBallots` を素通し(`= ballots`)へ | `fv-fixture/d7-per-voter-resolution` / `f5fb9bf4d` | t236:409 "amend supersedes … per-voter tally" | t236:409 のみ |

## 独立性の注記(実測どおりに記録)

- 各 fixture は**単一欠陥のみ**を含む(1コミット・注入点非重複)— FR-2 の単独再注入は全行成立
- 赤集合の重なり: t236:409(amend flow 統合テスト)は D1/D5/D7 の3 fixtureで赤化する共有観測面。
  FR-1 は「fixture が自 predicate で赤・baseline で緑」を要求しており、観測面の共有は要件違反ではない。
  ただし判別面として D1=t234:373・D5=t234:279 の固有赤を第一証拠とし、D7 のみ t236:409 を第一証拠とする
- D7 で t234:316(resolveBallots 純関数テスト)が緑のままなのは、注入が tally 呼出し面(:431)であり
  純関数自体は無傷のため — 「設計は正しいが配線で使わない」クラスの欠陥再現として意図どおり

## 合否(FR-1)

全7行について「baseline 緑(59/59)・fixture 赤(pinned test 実行時 fail)・型保存(tsc exit 0)」を実測。
行の和 = D-COUNT = 7。✅
