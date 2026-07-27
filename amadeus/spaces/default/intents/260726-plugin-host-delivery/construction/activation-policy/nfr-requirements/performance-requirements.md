# 性能要件 — U6 activation-policy

> 上流入力(consumes 全数): business-logic-model、business-rules、requirements、technology-stack

## spec-hash 計算の対象規模(現行実測)

business-logic-model のフロー 1(判定)は `computeSpecHash(ActivationWatch.globs)` で対象ファイルのハッシュを計算し、SpecHashState と比較して changed | current | never-run を返す。business-rules の BR-U6-1(決定性)がこれを固定する。計算対象は formal-model-check プラグインの spec ファイル群であり、その現行規模は小さい。requirements の FR-7(c)(policy は決定的で発動条件が文書化される)は正確性の要件で性能予算を課さず、NFR-2(起動レイテンシ非退行)の数値予算は build-and-test の実測固定に委譲されている。

- 実測(測定 ref: HEAD `7bce53dc6`、`specs/tla/` を `ls -la` / `wc` / `du` で計測): spec ファイルは 3 点 — `FormalElection.tla`(310 行 / 12,662 bytes)、`FormalElection.cfg`(16 行 / 294 bytes)、`model-map.json`(1,196 bytes)。`du -sh specs/tla` = 24K
- 合否(性能): 対象規模が上記実測水準(数十 KB オーダー)である限り、spec-hash 計算(ファイル直読 + ハッシュ)は engine の指令発行 1 回あたりの微小コストに収まる。数百 KB を超える異常規模への線形性は本 Unit の対象外(A-3 の少数前提)

## 数値予算の扱い(build-and-test で実測固定)

spec-hash 計算は engine の指令発行時・verdict 記録時の単発実行(business-logic-model「services.md どおり常駐なし」)であり、繰り返しのホットパスではない。具体的な計算時間の数値予算は未実測である。

- 推定(算出根拠: 上記実測規模 24K に対する `node:crypto` sha256 のファイルハッシュ): 計算コストは体感不能な水準と見込むが、ms 予算は未実測につき、必要なら build-and-test の実測で確定する(推定値を受け入れ基準に用いない)
- 合否: engine の起動レイテンシへ体感退行を加えないことは、フロー 2 の 0-plugin ゼロ影響(未 compose 時は何もしない)と current 判定時の無音(状態書込なし)で構造的に担保する

## 常駐 service 向けパターンの非適用(N/A)

technology-stack のとおり本フレームワークは常駐 service を持たない。spec-hash 判定はスループット・同時実行の対象ではないため、cache / 水平スケール / circuit breaker などの常駐向けパターンは **N/A** とする。BR-U6-4(0-plugin ゼロ影響)のとおり、plugin 未 compose 時は engine の挙動・出力が現行と byte 同一であり、追加コストの下限がゼロであることを決定的に固定する。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-26T16:53:20Z
- **Iteration:** 1
- **Scope decision:** none

BR-U6-1〜9 逐語一致、spec-hash 規模は実ファイル一致の実測転記、ms 予算は B&T へ委譲。findings 0。

### Findings

- None
