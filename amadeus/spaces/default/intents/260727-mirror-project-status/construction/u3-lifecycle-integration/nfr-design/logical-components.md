# Logical Components — u3-lifecycle-integration

上流入力(consumes 全数): performance-requirements, security-requirements, scalability-requirements, reliability-requirements, tech-stack-decisions, business-logic-model

U3 スライスの論理コンポーネント目録。すべて既存チェーンへの配線(tech-stack-decisions の新規依存ゼロ・boundary 新設禁止)で、新しいサービス境界・永続面を作らない。

## コンポーネント目録(U3 スライス)

| 論理コンポーネント | U3 での責務 | 適用される NFR 設計 |
|---|---|---|
| boundary 配線 | 既存5種 boundary への同期挙動の割付(business-logic-model の表) | 呼び出し予算維持(performance-design)、boundary 新設禁止(security-design) |
| 期待 Status 導出の消費 | keep / done / フェーズ名の3分岐を boundary 文脈で消費(canonical 共有 — tech-stack-decisions) | parked mutation 0(reliability-design) |
| completion ゲート | 台帳のみ入力の決定的評価 → ready のみ close(business-logic-model 手順1〜3) | オフライン評価(performance-design)、gate バイパス不能(security-design)、恒久停止回避(reliability-design) |
| 層分離(receipt 留置) | operation receipt を pending 留置し safety-blocked を台帳のみに置く(business-logic-model の層分離) | terminal-block 構造回避(reliability-design — reliability-requirements の実装直読) |
| ask 文言(prompt モード) | 既存操作 ask への Project 面要約の内包(business-logic-model の FR-10a 節) | 同意境界の内包・秘匿(security-design) |

## 障害ドメインと blast radius

- U3 は新しい障害ドメインを追加しない — 外部境界は U1/U2 の gh サブプロセス境界のまま。gate 評価はオフラインで障害面ゼロ(reliability-requirements)。
- close 保留の blast radius は「Issue が開いたまま残る」ことのみ — 台帳・警告で可視化され(security-requirements の秘匿契約内 — 設計は security-design)、次 boundary の reconcile で収束する(scalability-requirements の boundary 駆動)。

## 共有リソース

- **台帳(U2 所有)**: U3 は読み取り消費のみ(gate 入力)— 書込面を追加しない。
- **期待 Status の canonical 定義**: 同期側と共有消費(tech-stack-decisions — 複製禁止)。
- **ask 機構(既存)**: 文言追記のみで機構は不変(performance-requirements の非目標どおり性能面の設計対象外)。

## 分離戦略

- 追加の分離は N/A — U3 の全コンポーネントは既存モジュール内の配線であり、失敗の封じ込めは U1/U2 の per-Project skip・loud fail 構造をそのまま継承する(scalability-requirements の固定 boundary 集合)。
