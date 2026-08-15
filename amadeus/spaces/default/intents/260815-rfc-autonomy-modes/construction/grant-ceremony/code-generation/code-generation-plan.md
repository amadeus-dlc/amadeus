# Code Generation Plan — unit grant-ceremony(C12 / ADR-7)

## 拘束
- ADR-7(Q15=B): preview → set-autonomy の 2 段維持。印字改善のみ(挙動不変)。相互必須不変量(preview なし発効拒否・digest 不一致拒否)の落ちる実証を追加
- FD R-2(貼り付け可能な完全形コマンド印字)/ R-3(相互必須不変量の適用範囲は full 限定 — :617 実測に基づく)/ R-4(未被覆は confirmedDisplayDigest 省略ケースのみ — 誤 digest は t435:348-354 既存 pin)/ R-5(挙動不変)

## TDD 順序(実施済み — swarm batch 1)
1. Red(R-2): t3120 新設 — preview stdout 2 行期待が 1 行で fail(逐語 Expected: 2 / Received: 1、exit 1)
2. Green: preview-autonomy へ貼り付け可能な `set-autonomy --mode full --confirmed-display-digest <digest>` 行を印字 + `bun run build`(テストは投影 .claude/tools を spawn)
3. R-4 pin: 省略 digest → CONFIRMATION_REQUIRED を t435 既存テストへ追加(実装変更なしで初回 green = 挙動不変の裏付け。不在 baseline: 追加前の grep で該当 pin 1 件のみ = 誤 digest ケース)

## 検証・配送
- swarm batch 1、referee check/finalize converged。配送は直列 PR(code-generation 段)
