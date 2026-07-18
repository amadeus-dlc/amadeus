# Reliability Design — harness-wiring(swarm-dispatch-enum / Issue #1157)

上流入力(consumes 全数): `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## 設計

- RD-W1(RNR-W1): retry 手順は「失敗 unit の slug を保持 → 同 slug の新 child を spawn → worktree 状態で帰属確認」の3手で SKILL に記述。帰属キーは unit slug のみとし、child の session-local 識別子を帰属根拠として言及しない(受け入れ = retry 手順文が帰属キーを unit slug と明記していることのレビュー確認 — 「id」の単語 grep は canonical 語彙 identity と部分一致衝突するため検査手段にしない(vocabulary-collision 回避)。機械検査は無理に置かず正直にレビュー観点とする)
- RD-W2(RNR-W2): ultra 併記文は「reasoning effort=ultra は API 受理と child 完了までを確認できる(実適用の telemetry はない)」の定型1文 — 禁止フレーズは canonical 6 句(CU-1 → RD-4)への grep で検査
- RD-W3(RNR-W3): degraded 表示文は「requested 値・降格先・SWARM_DEGRADED 記録」の3要素を含む定型 — audit fixture(tests/e2e/t134-swarm-referee.test.ts の Requested driver)と同値検査
- RD-W4(RNR-W4): 失敗 unit の attribution は既存 finalize の --reasons へ写像(SKILL 手順に「未収束 unit は reason を明示して finalize」を明文)

## 保証機構(層別)

- prose 層: 定型文の存在検査(t181)
- 監査層: 既存 t134 fixture の三値追随(U1 帰属)
