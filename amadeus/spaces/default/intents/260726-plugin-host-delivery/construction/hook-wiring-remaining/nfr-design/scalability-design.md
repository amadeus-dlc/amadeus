# スケーラビリティ設計 — U4 hook-wiring-remaining

> 上流入力(consumes 全数): performance-requirements、security-requirements、scalability-requirements、reliability-requirements、business-logic-model、tech-stack-decisions
> 技術前提(Bun 単独・runtime dependency 追加ゼロ・新規外部依存なし)は同 unit の tech-stack-decisions の決定を継承する。

## SCALE-U4-1 への設計: マトリクス駆動の面別独立配線

`scalability-requirements.md` SCALE-U4-1 のとおり、配線対象は `business-logic-model.md` フロー 1 の `HookWiring[]`(U1 マトリクス BR-U1-7 の機械可読列挙から構成)で決まり、面ごとに独立した HookInvocation 1 点追加(`security-requirements.md` SEC-U4-1 の形状固定)である:

- 面の追加 = マトリクスの composeTrigger セルが measured へ昇格 → `HookWiring[]` へ 1 要素追加 → 該当面のアダプタへ 1 点配線。他面のコード・挙動へ影響しない(面ごと独立コミット — `business-logic-model.md` 実行順)
- 配線面リストとマトリクス列挙の機械照合(SCALE-U4-1 第 2 合否)は、`HookWiring[]` をマトリクスの機械可読列挙**からの導出**(手書き複製でなく)にすることで構造的に一致させる — 照合テストは導出の退行検知として置く

## SCALE-U4-2 への設計: XOR 全数閉包のスケール

`scalability-requirements.md` SCALE-U4-2 のとおり、全面 XOR assert(配線 XOR DegradeContract — `reliability-requirements.md` REL-U4-1 の設計を参照)は全面列挙をマトリクスから導出するため、面数が増えても assert の網羅性が自動で追従する。1 面追加ごとに「配線か degrade のどちらか一方」への割当てが assert により強制され、沈黙欠落がスケールしても混入しない。

## 非該当カテゴリ

N/A — `scalability-requirements.md` 非該当カテゴリ(水平スケーリング / 負荷分散)の N/A を参照継承(セッションごと単発起動 — `performance-requirements.md` の性能モデルと同一前提)。
