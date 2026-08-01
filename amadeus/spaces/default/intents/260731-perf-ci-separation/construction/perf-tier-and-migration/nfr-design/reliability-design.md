# Reliability Design — U1 perf-tier-and-migration

上流入力(consumes 全数): business-logic-model.md(U1 FD)。nfr-requirements 5成果物は本 scope(self-feature)で同ステージ SKIP のため設計上不存在(engine の consumes_absent expected:true)— fallback として requirements.md の NFR 節と #1830/#1835 実測を一次根拠に具体化する。

測定 ref = observed `da51af375`。

## 偽赤の構造的排除(本 Unit の主目的)

- business-logic-model.md ロジック3: timeout 250_000 で予算線を観測分布(22断面)の外へ — PR blocking 面からは移設により完全排除
- coverage 3 gate は fail-closed を維持(FR-5): registry --check / project-gate --check / patch-gate --check の全てが移設後も実行結果由来の verdict を出す(検証劇場禁止)

## 回復経路

- 移設は git 履歴上の rename+分割 — revert 可能(スカッシュ1コミット)
- registry/baseline/allowlist の再生成は決定的コマンドで再現可能(手作業データなし)

## Git 管理資産の一貫性

embedded fallback を作らない(cid:nfr-design:c3)— 移設で正本は tests/perf/ の1箇所のみ、旧位置に stub を残さない。
