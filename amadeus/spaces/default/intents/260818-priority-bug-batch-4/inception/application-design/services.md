# Application Design — Services

Intent: 260818-priority-bug-batch-4(depth Minimal)

## 適用判定

本プロジェクトはデプロイされるサービスを持たない CLI フレームワーク(Bun + TypeScript、codekb `architecture.md` が記す engine/tools 構成)であり、本 intent の 2 unit はいずれも既存 CLI ツール内の契約修正で**新しいサービス・常駐プロセス・通信境界を導入しない**。したがって本成果物はサービス定義を持たず、変更が触る CLI 面の一覧のみを記録する(体裁のための実体を作らない — cid:build-and-test:c2-no-test-theatre-for-absent-nfr と同じ規律)。

## 変更が触る CLI 面(orchestration surface)

| CLI 面 | Unit | 変更の種類 |
|---|---|---|
| `amadeus-orchestrate.ts next`(invoke-swarm directive の emit) | U1 | directive payload 拡張(batch/pool identity) |
| `amadeus-swarm.ts prepare` | U1 | `--batch` 受理形の整合(identity 形が変わる場合のみ) |
| `amadeus-orchestrate.ts next`(per-unit settle → producer-outcome 診断) | U2 | settle 台帳の語彙拡張(受け口の CLI シグネチャ不変) |
| conductor 面 7 面(skills/commands prose) | U1 | 手順の転記化 + 正規取得元の明記(実行面ではなく契約文書) |

通信パターン・スケーリング特性・オーケストレーション方式(choreography/orchestration)の選定は本 intent に該当なし — 既存の「engine が directive を emit し conductor が実行する」単方向指令ループを不変のまま使う。
