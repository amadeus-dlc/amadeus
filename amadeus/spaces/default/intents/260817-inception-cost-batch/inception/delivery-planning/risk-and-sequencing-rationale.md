# Risk and Sequencing Rationale — インセプション固定費バッチ(#3181 + #2415)

## 採用ヒューリスティック

**walking-skeleton-first(Cockburn)+トポロジ順** — 経済順序とトポロジ順序が一致するため逸脱なし(`unit-of-work-dependency.md` の DAG は U1→U2 の一意順序)。WSJF 級のスコアリングは2 Bolt 直鎖では判別情報を生まないため実施しない(順序の自由度がゼロ)。

## 順序の根拠

1. **義務**: self-feature スコープは Bolt 1 を walking skeleton として単独・ゲート付きで実行する(org.md § Walking Skeleton、project.md Mandated)。U1 は取り込み経路の全層(gateway → verb → artifact → 契約 consume → sensor)を貫通する最小スライスであり skeleton の定義に合致。U2(契約宣言+テスト)は層貫通性がなく skeleton になり得ない — 割当は一意。
2. **内容依存**: U2 の契約文が U1 の issue-evidence 機構を正規代替経路として名指す(ADR-3)— U2 先行は dangling reference。
3. **共有ファイル**: 両 Bolt が `reverse-engineering.md` を編集する。直列+着地後 rebase が競合コスト最小(`cid:pr-convergence:serial-landing-rebase-shape` の実測運用)。

## リスクと緩和

| リスク | 影響 Bolt | 緩和 |
|---|---|---|
| gh 認証・GitHub API 障害(本セッションで 503 を複数実測)| Bolt 1(demo・E2E 面)| FR-EVD-5 の fail-open 設計自体が対象仕様 — readiness 失敗 fixture でテスト可能、live 疎通は demo 時に限定 |
| walking-skeleton ゲートで人間承認が遅延 | Bolt 2 開始 | ゲート提示を Bolt 1 PR 作成と同時に行い、待ち時間を CI 並走に重ねる |
| 共有ファイル rebase 競合 | Bolt 2 | U1 面/U2 面は別節(components.md C5)— 節分離により競合は局所。発生時は3ステージ blob 再構成(`cid:code-generation:cg-ledger-blob-reconstruction`)|
| coverage universe 膨張(大型 tools ファイルへのテスト import)| 両 Bolt | `cid:build-and-test:bt-coverage-universe-inflation` — 被検関数の小モジュール切出しを既定(C3 は独立関数、C1/C2 は既存 import 済みファイルへの追加で新規母集団流入は限定的) |

## 参照

- 上流: `bolt-plan.md`(順序の実体)、`unit-of-work-dependency.md`(DAG)、`requirements.md` 制約節(直列化義務)
