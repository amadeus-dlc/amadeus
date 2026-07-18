# Code Summary — harness-wiring(swarm-dispatch-enum / Issue #1157)

上流入力(consumes 全数): `requirements.md`(FR-1 prose 面/FR-3/FR-5/FR-8 へ trace)、`business-logic-model.md`(dispatch フロー・精密化表の実装正)、`business-rules.md`(BR-W1〜W6 受け入れ)、`logical-components.md`(部品表)、`reliability-design.md`(RD-W1 retry slug 基準・RD-W2 証拠限界文)、`security-design.md`(SD-W3 c2 固定文)、`domain-entities.md`(unit slug⇔child の概念モデル — retry 手順文の正)、`performance-design.md`(PD-W2 resolve バッチ1回の手順順序)、`unit-of-work.md`(U2 受け入れ — t181 一致・headless 記述 0・旧 1 記述 0 へ trace)。

## 実装結果(bolt branch `bolt-harness-wiring`、amend 後 commit)

- claude SKILL: invoke-swarm 節を三値化(resolve 前置・exit 1 停止・claude-ultra=Workflow/不在 degrade・codex-ultra=degrade 表示3要素+--degraded-from)
- codex SKILL(:57/:171): headless swarm floor 撤去 → 同一セッション native fan-out(c2 固定文 verbatim 前置・codex-ultra=effort ultra+証拠限界定型文・retry=unit slug 基準・wave 条件文)。conductor 是正1件: 否定形の「codex exec」残存を「headless per-unit worker floor is retired」へ言い換え(BR-W3 受け入れの字義充足 — swarm 節 grep 0)
- codex onboarding:55: native fan-out へ置換(:42/emit.ts:81 は FD 精密化表どおり不変更)
- kiro/kiro-ide: 三値 degrade/fail-closed、旧 =1 記述 0
- t181: REQUIRED_TOKENS へ共通3語追加+codex 専用 c2 assertion(builder 申告の符号化確定 — RD-W1 の明示委任範囲、conductor 追認: 共有トークンに c2 文を入れると SNR-W3 の codex 限定と矛盾するため専用 assertion が両立解)
- dist 7+self-install 3 を再生成(手編集ゼロ)

## 検証(builder 実測+conductor 裏取り)

| 検証 | builder | conductor |
|---|---|---|
| typecheck/lint/dist:check/promote:self:check | 全0 | dist:check 0(是正後再実行込み) |
| --ci フル | 0(5329 assertions / 0 fail) | — |
| t181 | 4 pass | 4 pass(是正後) |
| 落ちる実証 | 2面(共有トークン破壊/c2 文破壊)→ 各 exit 1 → revert green | — |
| 禁止6句 diff grep | 0 | 0 |
| journey テスト | swarm floor 依存アサート 0 → 変更不要(grep 実測) | — |
| referee check | — | converged / untampered |

## 逸脱

builder 申告1件(t181 トークン符号化)は RD-W1 の明示委任(code-generation で確定)の範囲内と conductor 追認 — 実装前停止を要する設計逸脱には該当しない(deviation-applicability-not-solo: 単独判断でなく conductor 追認を記録)。テストによる record 変異は builder が検知し revert 済み(成果物へ非混入)。
