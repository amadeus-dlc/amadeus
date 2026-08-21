# Build and Test Summary — 260821-fmc-retirement

上流入力: `build-instructions.md`、`unit-test-instructions.md`、`integration-test-instructions.md`、`performance-test-instructions.md`(N/A 判定)、`security-test-instructions.md`(N/A 判定)、`build-test-results.md`。

## ステータス

| 面 | 状態 |
|---|---|
| Build | **green**(build/typecheck/lint/source-only/graph/runner/distribution/registry 全 exit 0 — build-test-results.md) |
| Unit / Integration | **green**(ローカルフル 1009 files / 0 failed、新規 195 pass、リモート CI round 4 全必須 green) |
| Performance / Security 専用検査 | **N/A 判定**(数値 NFR 不在 — 各 instruction に根拠と反転条件を記録) |
| Coverage | **green**(絶対 AND 相対(retained basis、ADR-7)、Patch gate、ratchet 保持) |
| 配送 | **landed** — PR #3401 squash `596602519`(2026-08-21T08:09:28Z)、祖先証明・着地面 ls-tree 実測済み |

## テスト種別インベントリ(Comprehensive)

- 生成: unit / integration の実体 + build 検証コマンド群。performance / security は N/A 判定文書(no-test-theatre — 目標なき検査を発明しない)
- 検証の二層: 日常 CI(unit/integration/PBT 既存スイート)は維持。形式検証面は FMC 退役により**消滅**(意図された仕様変更 — 再設計まで。ノルム側の失効整理は FR-NORM-1)

## Readiness 評価

- **build-ready / test-ready: 達成**。deployment-ready: 本プロジェクトはデプロイ基盤を持たず npm/Release 配布 — 本 intent はリリース非対象(record とフレームワーク面の変更のみ)
- 検証済みの面: 退役の完全性(FR-DEL-1〜4 の述語実測)、テスト面の保全(B1/A2/O-5+回復 182 行)、CI 配線(FR-CI-1〜3)、docs(FR-DOC-1〜3、t3028)、ゲート意味論(ADR-7、落ちる実証 3 点)
- 未検証の面(受け入れ基準外、申し送り): 着地後 main push CI(run 進行中 — 完了時に conclusion を確認する。FMC 面は PR CI で実測済みのため、赤の場合は帰属を先に引く)

## 申し送り(§12a FOLLOW-UP 集約 + 残タスク)

1. **FR-NORM-1**(着地後アクション、conductor 所有): 失効 cid 整理の単独ノルム PR — team.md 二層検証の形式面 + project.md の fmc/tla 系(着手時に re-scan §O-7 述語で再実測)。ADR-7 のゲート意味論変更の docs 反映は実施済み(09-testing 対訳)だが、ノルム面の言及(coverage 関連 cid)の整合も同 PR で棚卸しする
2. **FR-ISS-1**(着地後アクション): FMC 系 open Issue のクローズ(#3246 含む、着地実読検証後・理由コメント付き)
3. §12a iteration 2 FOLLOW-UP: (a) code-generation-plan.md:5 の cid 誤記(`cid:build-and-test:c5-260809-followup-routing` が正)を次回接触時に訂正 (b) unit-of-work 追補行の tests/run-tests.ts / t112 の個別裏取り一行を code-summary へ追補
4. Issue 起票候補: (a) lefthook `related-unit-tests` のテスト漏出(t209 が実 repo の git config/HEAD を汚染 — 一次記録は build-test-results.md §失敗と帰属 6)(b) engine の stale spec-hash advisory(退役済み formal-model-check への `--stage` 案内が next の stderr に残置)(c) reviewer-runtime repair 経路の記録欠陥(functional-design §13 で学習済み — framework Issue 未起票)
5. code-generation-plan.md への §12a Review 追記 2 件(iteration 1/2)は record checkpoint で本線へ流す
