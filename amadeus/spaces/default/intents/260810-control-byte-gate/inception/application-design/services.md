# Services — 制御バイト検出ゲート(Issue #2814)

上流入力(consumes 全数): requirements.md(常駐サービス不在という NFR 前提 — NFR-1/4)、architecture.md(CI = GitHub Actions、デプロイ基盤なしという運用形)、component-inventory.md(既存ゲート群がサービスでなく standalone スクリプトである先例)

## サービス定義

本 intent に常駐サービスは存在しない(CLI/ゲート系 — cid:nfr-design:c1 の「常駐 service 向けパターンを機械適用しない」に従い、cache・scaling・circuit breaker は導入しない)。実行単位は次の2つのみ:

| 実行単位 | ライフサイクル | 通信 |
|---|---|---|
| `bun tests/control-byte-gate.ts --check`(ローカル/CI 同一コマンド — FR-CBG-15) | 単発プロセス(起動→走査→exit) | stdout/stderr(人間可読診断)+ exit code(機械判定) |
| CI 独立ジョブ control-byte-gate | PR/push イベントごとに1回 | GitHub Actions の job status(blocking) |

## オーケストレーション

- choreography/orchestration の別なし — 単一プロセスの直列走査(列挙 → 読取 → 判定 → 集計 → 出力)。
- 並行化はしない: RE 実測 16,124 files のバイト走査は単純直列で timeout 先例(30s)内に収まる見込みで、並行 I/O の複雑さ(順序非決定な出力)が NFR-1/NFR-2 に反する。実測が 30s を超えた場合のみ設計を再訪(YAGNI)。

## 通信契約

- exit code 契約: 0 = clean / 非 0 = 違反・stale allowlist・読取エラーのいずれか(FR-CBG-1、NFR-3)。
- 出力契約: 違反 1 件 = 1 行の名指し(component-methods.md の書式)。正常時は走査件数の1行サマリ(FR-CBG-2 の受け入れに使う件数転記元)。
