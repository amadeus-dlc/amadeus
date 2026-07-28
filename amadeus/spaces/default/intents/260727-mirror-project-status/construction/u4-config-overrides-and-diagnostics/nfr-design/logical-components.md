# Logical Components — u4-config-overrides-and-diagnostics

上流入力(consumes 全数): performance-requirements, security-requirements, scalability-requirements, reliability-requirements, tech-stack-decisions, business-logic-model

U4 スライスの論理コンポーネント目録。すべて既存モジュールの closed-schema 拡張と additive 拡張(tech-stack-decisions の新規依存ゼロ)で、新しいサービス境界・永続面を作らない。

## コンポーネント目録(U4 スライス)

| 論理コンポーネント | U4 での責務 | 適用される NFR 設計 |
|---|---|---|
| config 完全形(parse・層解決) | mirror-projects の4面一般化+キー単位全置換の層解決(business-logic-model) | fail-closed 検証(security-design)、オフライン線形 parse(performance-design) |
| 診断手順(repair status 拡張) | 台帳+config 読取 → 照会 → per-Project の drift 比較+resolution 4値分類(business-logic-model の手順) | mutation 0・台帳 write 0(security-design)、劣化状態の正常系化(reliability-design) |
| 期待 Status 導出の共有消費 | 同期側 canonical 定義の共有(business-logic-model 手順3 — 複製導出禁止) | canonical 共有(tech-stack-decisions の決定) |
| 診断出力整形 | 識別子・ラベル・availableOptions のみの出力(business-logic-model 手順3/4) | 秘匿(security-design)、線形出力(scalability-design) |

## 障害ドメインと blast radius

- U4 は新しい障害ドメインを追加しない — 外部境界は既存 gh サブプロセス境界のまま(performance-requirements の既存 profile 消費)。診断の障害の blast radius はゼロ(reliability-requirements の副作用ゼロ構造 — 状態を持たないため失敗しても何も壊れない)。
- 設定障害の blast radius は当該層のみ(security-requirements の無効層遮断)— 他層の有効値で動作継続。

## 共有リソース

- **config 3層(読み取り)**: parse 結果を同期・診断が共有(performance-requirements — 診断専用 parse なし)。
- **台帳(U2 所有、読み取りのみ)**: 部分成功検出の入力(reliability-requirements — write 0)。
- **期待 Status の canonical 定義**: 同期側と共有消費(tech-stack-decisions)。

## 分離戦略

- 追加の分離は N/A — 診断は副作用ゼロの読み取り経路であり、分離すべき障害面が存在しない(scalability-requirements の線形・無状態構造)。
