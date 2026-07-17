# Security Design — answer-evidence-sensor

上流入力(consumes 全数): `../nfr-requirements/performance-requirements.md`(P-1/P-2)、`../nfr-requirements/security-requirements.md`(S-1〜3)、`../nfr-requirements/scalability-requirements.md`(SC-1/2)、`../nfr-requirements/reliability-requirements.md`(R-1〜3)、`../nfr-requirements/tech-stack-decisions.md`、`../functional-design/business-logic-model.md`(純関数2段パイプライン)。

## 設計

- S-1 実現: script は readFileSync のみ(述語内)— fs 書込み API を import しない。finding 書出しは dispatcher 側の既存実装(wx-flag+rename アトミック)に委譲。
- S-2/S-3 実現: 環境変数の新規読取なし(cutoff は定数 import)、ネットワーク API なし、child spawn なし — 攻撃面増加ゼロを import 面(node:fs/node:path/amadeus-lib のみ)で構造保証。

## 検証対応

lint(Biome)+ typecheck が import 面を機械検査。レビューで import 一覧を確認(C-5 テストの検証対象外 — 構造面)。
