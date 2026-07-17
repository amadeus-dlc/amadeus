# Security Design — standing-grant(U1)

上流入力(consumes 全数): `../nfr-requirements/performance-requirements.md`(P-1/P-2)、`../nfr-requirements/security-requirements.md`(S-1〜S-4)、`../nfr-requirements/scalability-requirements.md`(N/A 反証条件付き)、`../nfr-requirements/reliability-requirements.md`(RL-1〜RL-3)、`../nfr-requirements/tech-stack-decisions.md`、`../functional-design/business-logic-model.md`(純関数構成)

## 設計(保証機構をモジュール別に層別 — 一枚岩の断定を避ける)

- S-1 実現: **taxonomy 層** = PRESENCE_PROTECTED_EVENTS への GRANT_* 追加(CLI mint 拒否)/ **検証層** = 発行行+根拠 HUMAN_TURN の実在照合(verifyDelegatedProvenance 同族)。書き手は verb の in-process 経路のみ
- S-2 実現: **verb 層** = 接地ゲート(:1975 同型)+scope 列挙検証+TTL parse / **定数層** = 除外集合・TTL とも定数列挙(env/設定の緩和面なし — ADR-4 意図的相違の明文)
- S-3 実現: **分岐先頭層** = AMADEUS_OPERATING_MODE 判定を「**grant 関連判定の先頭**」に置く(不一致は grant 系の後続判定に到達しない)。受理側 = AcceptanceSeam のグラント分岐先頭。発行側 = 接地ゲート(human-presence)の**後**・scope/TTL 検証の**前**(AD component-methods C-1 の実行順: 接地 → モード → scope → TTL parse → emit と一致 — verb 全体の先頭ではない)
- S-4 実現: **挿入位置層** = humanActedSinceGate false 後のフォールバック(ADR-7)— fail-open 分岐(lib:2484)とは呼び出し経路が交わらない構造

## 検証対応

系列別(NR security-requirements の3系列+白側)を C-6 テスト目録に転記して実装(build-and-test の実測表が閉包を判定)。
