# Scalability Design — opencode-plugin-adapter(Issue #1049)

> 上流入力(consumes 全数): `../nfr-requirements/scalability-requirements.md`(根拠付き N/A)、`../nfr-requirements/performance-requirements.md`(P-2 単発構造)、`../nfr-requirements/security-requirements.md`(単一信頼域)、`../nfr-requirements/reliability-requirements.md`(常駐なし)、`../nfr-requirements/tech-stack-decisions.md`(spawn 契約)、`../functional-design/business-logic-model.md`(1 イベント = 1 写像+1 spawn)。2026-07-17。

## 設計判断: スケーリング機構を導入しない(上流 N/A の設計面確定)

scalability-requirements が全4軸(負荷成長・スケーリング戦略・データ成長・同時実行)を反証可能根拠付き N/A と確定済み — 設計段でも以下を明示的に**不導入**とする:

| 機構 | 判断 | 根拠 |
|---|---|---|
| 負荷分散・auto-scaling | 不導入 | スケール対象の常駐プロセスが存在しない(P-2) |
| データパーティショニング | 不導入 | plugin 保有の永続データなし(domain-entities: 全型が単発処理内の値) |
| 容量閾値・キュー | 不導入 | 1 イベント = 1 写像+1 spawn の線形構造 — バックプレッシャの発生主体なし |
| 並行制御 | 不導入 | 共有可変状態なし(frozen リテラルのみ)。opencode のフック呼び出し粒度に従属し plugin 側で多重化しない |

## スケール特性の保存条件

将来 opencode 側でフック種別・イベント頻度が増えても、「1 イベント = 1 純関数写像+1 spawn」の線形構造を保つ限り本 N/A 判定は不変。この構造を壊す変更(バッチング・常駐化・キューイング)を入れる場合のみスケーラビリティ設計の再訪が必要 — その判断は将来 intent の requirements で行う(本 unit では禁止事項として business-rules R-1/P-2 に従属)。
