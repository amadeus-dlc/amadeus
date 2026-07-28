# Logical Components — u2-state-reconcile-hardening

上流入力(consumes 全数): performance-requirements, security-requirements, scalability-requirements, reliability-requirements, tech-stack-decisions, business-logic-model

U2 スライスの論理コンポーネント目録と障害ドメイン写像。全て既存モジュールの拡張(tech-stack-decisions の新規依存ゼロ)で、新しいサービス境界・永続面を作らない。

## コンポーネント目録(U2 スライス)

| 論理コンポーネント | U2 での責務 | 適用される NFR 設計 |
|---|---|---|
| executor(reconcile ループ) | 対象集合構成 → per-Project 独立処理 → 台帳3状態化 → 冪等 reconcile → 操作 outcome 集約(business-logic-model 手順1〜5) | 独立 try 境界(scalability-design)、早期 skip(performance-design)、一律再分類(reliability-design) |
| reducer(状態遷移) | transition 3種による台帳書込の一本化(business-logic-model 手順3) | 書込一本化・fail-closed(security-design) |
| 台帳 codec(永続化) | 3状態 entry の validate/render — unknown key 拒否 | fail-closed codec(security-design)、audit → state 順序(reliability-requirements) |
| 失敗分類(解釈層) | 失敗 → retryable / 解決不能の写像(business-logic-model の分類表) | 分類してから記録(security-requirements の秘匿契約 — 設計は security-design)、写像は実装時実測確定(reliability-design) |
| 操作 outcome 集約 | 未完残存時は receipt を pending 留置(business-logic-model 手順5 の層分離) | 恒久停止回避(reliability-design — terminal-block 分類の構造回避) |

## 障害ドメインと blast radius

- **per-Project try 境界**が U2 の分離単位 — 1 Project の失敗の blast radius は当該 Project の台帳 entry 1件(scalability-requirements の独立性)。boundary 全体の中断は gh サブプロセス境界の障害(所属照会失敗)のみで、その場合も loud fail+継続(reliability-requirements)。
- 呼び出し予算(performance-requirements)は per-Project 上限として障害時の再試行コストも封じ込める — 失敗しても照会1+mutation≤2 を超えない。

## 共有リソース

- **state file(git 管理)**: 3状態台帳の唯一の永続面 — reducer 経由のみの一方向書込(security-design)。
- **失敗分類語彙**: services 由来の既存分類(business-logic-model の表)を全コンポーネントが共有 — U2 独自の分類語彙を発明しない(tech-stack-decisions の既存様式決定)。

## 分離戦略

- 追加のプロセス・サービス分離は N/A — per-Project try 境界+reducer 一本化で、単発 CLI 内の障害封じ込め(scalability-requirements のステートレス構造)が完結する。
