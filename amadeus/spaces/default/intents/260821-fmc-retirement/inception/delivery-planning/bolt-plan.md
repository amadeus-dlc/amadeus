# Bolt Plan — 260821-fmc-retirement

上流入力: `units-generation/unit-of-work.md`(U1 単一 unit、kind: packaging、XL)・`unit-of-work-dependency.md`(依存なし)・`application-design/decisions.md`(ADR-6 = 単一 Bolt)・`requirements.md`(NFR-1 green-throughout)。

## Bolt 1

- **Units:** `fmc-retirement`
- **目的**: FMC プラグイン完全退役の全量配送(単一 PR)
- **ゲート**: walking-skeleton gate(self-feature Mandated)。gate の要否と形は engine の walking-skeleton 判定(practices 由来の stance 分類)に従い、ゲート実体は「合成 fixture + 差し替え後スイートの end-to-end green」を含む Bolt 全体の検証とする
- **作業順序**: `application-design/component-dependency.md` の直列 8 段を正とする
- **検証**: ローカル = typecheck / lint / targeted(t341・B1・A2 温存・O-5 代替)。正本 = リモート CI(push-first)

## 構成の根拠(単一 Bolt)

単一 Bolt は ADR-6 の裁定(削除の相互依存により分割は中間赤を構造的に生む)。バッチは 1 つ、並行実装なし。着地後アクション(FR-NORM-1 ノルム PR / FR-ISS-1 Issue クローズ)は Bolt 外で conductor が実行する。
