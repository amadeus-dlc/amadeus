# Reliability Design — u7-mirror-model

上流入力(consumes 全数 — requirements は宣言5件の consumes_absent fallback 先、business-rules/domain-entities は同 unit FD の随伴成果物): requirements, business-logic-model, business-rules, domain-entities

## 障害モードと回復(FD の I1〜I5 を表内で全数カバー)

| 障害 | 挙動 | 根拠 |
|---|---|---|
| TLC が完走しない(状態爆発/timeout) | HARNESS_ERROR 扱い — 成功にも不検出にも丸めない。縮約強化+消える性質明記で再試行 | business-logic-model.md I1 / finite-exploration-not-detected-proof |
| AsImplemented が反例を出さない(落ちる実証の失敗) | AC (ii) 未達として u7 未完了 — #1838 の実測バグが反例の題材(出ないなら モデル化の誤り) | I2 / T3 |
| u6 未着地(SOURCE_DRIFT 復旧経路なし) | edge block depends_on が構造的に順序保証 | I3 |
| FormalElection の回帰(v2 移行の等価性破れ) | 機械移行の等価性テスト+既存 CI green が検出 | I4 / テスト設計 (2) |
| mirror 実装の並行変更(モデル前提のずれ) | 本 unit は実装無変更(I5)+SHA ピンが乖離を SOURCE_DRIFT で fail-closed 検出(RAID R-7) | I5 / E3 |

## 回復経路

モデル・スキーマの誤りは PR revert が回復経路。SOURCE_DRIFT 赤は u6 の --impl-only(実装のみ変更時)またはモデル改訂(意味論変更時)で正規復旧(domain-entities.md E3 の運用ループ)。
