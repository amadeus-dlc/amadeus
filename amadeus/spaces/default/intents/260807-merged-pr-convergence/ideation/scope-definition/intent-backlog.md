# Intent Backlog — 260807-merged-pr-convergence

上流入力(consumes 全数): `intent-statement`(`ideation/intent-capture/intent-statement.md` — Success Metrics を受け入れ観点の導出元として消費)。優先度は MoSCoW で表記(WSJF/RICE は単一機能 intent につき序列化の対象母数がなく不使用)。

## Proto-Units(MoSCoW)

| # | Proto-Unit | MoSCoW | 依存 | 受け入れ観点(intent-statement の Success Metrics より) |
|---|---|---|---|---|
| P1 | MERGED 検出 + landed report(cli / predicate / gh-runner) | Must | なし | 実マージ済み PR で report が landed report を書き guard を通過。status が retry なしで応答 |
| P2 | sensor kind 語彙拡張(`landed`)+ 整合検査改修 | Must | P1(report 様式が先) | landed report が sensor PASS。converged/override の既存検査は無変更 green |
| P3 | plugin stage 文書 + 参照 docs 更新 | Must | P1/P2(確定した挙動を記載) | landed と converged の語彙区別が report・docs・sensor の3面で一貫 |
| P4 | テスト(TDD Red→Green・落ちる実証・回帰) | Must | P1〜P3 と並行(TDD につき各実装に先行) | 未マージ PR で landed 不発火(負方向)+ 既存テスト green |

nice-to-have(Should/Could/Won't)なし — 縮小案は intent-capture Q2/Q3 で棄却済み、拡大案(実績導出)は Q1 で棄却済み。

## シーケンス

単一 Bolt(walking-skeleton 兼務)で P1→P4 を凝集実装する前提。最終編成は units-generation / delivery-planning で確定する。
