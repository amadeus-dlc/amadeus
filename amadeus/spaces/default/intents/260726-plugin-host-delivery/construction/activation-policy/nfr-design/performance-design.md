# 性能設計 — U6 activation-policy

> 上流入力(consumes 全数): performance-requirements、security-requirements、scalability-requirements、reliability-requirements、business-logic-model、tech-stack-decisions
> 技術前提(Bun 単独・runtime dependency 追加ゼロ・新規外部依存なし)は同 unit の tech-stack-decisions の決定を継承する。

## spec-hash 計算の設計(小規模固定・単発実行)

performance-requirements「spec-hash 計算の対象規模」の実測(spec 3 ファイル・24K、測定 ref `7bce53dc6`)を前提に、`computeSpecHash` は次の最小構成とする:

- glob 展開 → ファイル列の辞書順ソート → 各ファイルの直読+`node:crypto` sha256 の 1 パス計算(reliability-design が決定性の詳細を規定)。中間キャッシュ・mtime 短絡・監視デーモンを持たない — 数十 KB オーダーの単発計算に最適化機構は過剰であり、キャッシュは決定性(reliability-requirements の中心要件)に対する不整合リスクだけを持ち込む
- 呼出点は engine の指令発行時(business-logic-model フロー 2)と verdict 記録時(フロー 4)の 2 点のみで、繰り返しのホットパスに置かない

## 0-plugin ゼロ影響の分岐設計(下限コストの構造化)

performance-requirements の合否(体感退行なしの構造的担保)を、フロー 2 の分岐順で実装する:

1. **最初の分岐 = composition record の formal-model-check 存在確認**(record 読取 1 回のみ)。不在 → 即 return(hash 計算・state 読取に一切入らない)。これが 0-plugin 時の追加コストをほぼゼロに固定する(BR-U6-4 — scalability-requirements の下限境界と同一分岐)
2. 存在時のみフロー 1(computeSpecHash → readActivationState → 比較)へ進む
3. current 判定は無音(出力・書込ゼロ — security-requirements の状態単方向とも整合)

## 数値予算(非固定 — 推定を基準化しない)

performance-requirements「数値予算の扱い」のとおり、計算時間は「24K 規模の sha256 は体感不能な水準」という推定(算出根拠: 実測規模)に留め、**ms 予算を受け入れ基準にしない**。必要なら build-and-test の実測で確定する。数百 KB 超級への線形性実測は対象外(scalability-requirements の少数前提)。常駐 service 向けパターン(cache / circuit breaker)は performance-requirements の **N/A を継承** する。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-26T17:27:07Z
- **Iteration:** 1
- **Scope decision:** none

決定性・file 境界・stdout 純度・0-plugin ゼロ影響・撤廃順序が要件と file:line 整合。Minor 2(tech-stack 名指しの薄さ、読取不能の 3 値マップ未確定)は指摘直後に是正済み(node:crypto 選定への名指し紐付け+never-run マップの一意確定)。

### Findings

- [Minor] tech-stack-decisions の名指し紐付け — 是正済み
- [Minor] 読取不能の ActivationJudgment マップ — never-run 相当へ一意確定済み
