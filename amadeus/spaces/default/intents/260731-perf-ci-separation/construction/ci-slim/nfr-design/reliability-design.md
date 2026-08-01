# Reliability Design — U3 ci-slim

上流入力(consumes 全数): business-logic-model.md(U3 FD)。nfr-requirements 5成果物は本 scope で同ステージ SKIP のため設計上不存在(consumes_absent expected:true)— requirements.md の FR-3/AC-3 と FD の照合ロジックを一次根拠に具体化する。

測定 ref = observed `da51af375`。

## 検証無音喪失の防止(P2 — 本 Unit の核心リスク)

- business-logic-model.md ロジック2 の FR-3d 対照(V-1〜V-6 写像)を PR 本文で機械照合 — 削除される検証の行き先が全数証明されてからマージ
- 着地順序: U2(受け皿)が main 実在を確認してから(BR-U3-3)— commit 窓の無検証状態を構造排除

## 回復経路

- revert はスカッシュ1コミットの逆適用で完結(benchmark 群が ci.yml へ戻る — perf.yml と一時二重実行になるが安全側)
