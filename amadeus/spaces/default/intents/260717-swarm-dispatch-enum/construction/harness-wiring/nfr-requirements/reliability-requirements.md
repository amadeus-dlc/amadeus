# Reliability Requirements — harness-wiring(swarm-dispatch-enum / Issue #1157)

上流入力(consumes 全数): `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。

## 要件

- RNR-W1(NFR-4 / C-18): retry identity = unit slug、真実源 = worktree 状態(`business-logic-model.md` の契約)。child id を契約にしない(受け入れ = SKILL の retry 手順が unit slug 基準で記述され、id 参照が現れない)
- RNR-W2(NFR-2 / C-15): `codex-ultra` の ultra 指定は「API 受理+child 完了」を証拠限界として SKILL に併記 — 実適用を確約する文言を書かない(受け入れ = 該当併記の grep 実在+禁止フレーズ 0 — 確定語彙集合(RD-4 の canonical 6句 verbatim): 「実適用を確認」「必ず ultra で実行」「実適用を保証」「安全性を保証」「sandbox で保護」「restricted でも動作」。起草時候補の単語「保証」はフレーズ単位へ精密化して吸収(vocabulary-collision 回避 — RD-4 記録)(canonical = U1 driver-contract-core ND の RD-4。参照経路 = unit-of-work-dependency.md の Cross-unit 決定欄 CU-1))
- RNR-W3(NFR-1 の表示面): degraded 表示の requested 値は `SWARM_DEGRADED` の Requested driver と同値(BR-W2。受け入れ = 表示文と audit fixture の同値検査)
- RNR-W4(失敗の可視性): child 失敗・未収束はサイレントに落とさず、referee の typed attribution(unsatisfiable/budget-exhausted/cap-exhausted)へ faithfully 写像(既存 finalize 契約の維持 — FR-7。受け入れ = t134 green)

## 検証

- 可用性 SLO 非該当(常駐サービスなし)— 根拠付き N/A
- NFR-6 は適用対象 — U2 のテスト(t181 拡張・journey 棚卸し)も既存 CI gate green を維持(受け入れ = --ci green)
