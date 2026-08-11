# Logical Components — control-byte-gate(Issue #2814)

上流入力(consumes 全数): business-logic-model.md(処理フロー7段と in-process seam — 本設計の対象面)。条件解決で除外された consumes: nfr-requirements 系5成果物(performance/security/scalability/reliability/tech-stack)— self-feature スコープで nfr-requirements ステージが SKIP のため不在(設計上の期待どおり)。NFR の正本は requirements.md の NFR-1〜4 を用いる。

## 論理コンポーネントと NFR 割付

| 論理コンポーネント | 物理所在 | 担う NFR 設計 |
|---|---|---|
| 述語(検出判定) | tests/lib/control-byte.ts | 決定性(reliability)・線形走査(performance/scalability) |
| 走査エンジン(列挙・読取・集計) | tests/control-byte-gate.ts `runControlByteGate` | fail-closed 3面(reliability)・単一パス(performance) |
| CLI shell(--check) | tests/control-byte-gate.ts main | exit 契約・診断出力(reliability の可視性) |
| allowlist | 同上(in-script 定数) | 悪用耐性(security)・stale fail-closed(reliability) |
| CI ジョブ | .github/workflows/ci.yml | timeout 上限(performance)・最小権限(security)・常時実行(本 intent の価値面) |

## 層の保証機構(モジュール別)

- 述語層: 純関数性がテスト容易性と決定性を構造保証。
- エンジン層: port 注入(listFiles)が in-process 検証を保証 — テストダブル分岐を本番経路に置かない。
- CLI 層: GateResult からの exit 導出のみ(状態を持たない)。
- CI 層: 起動条件レス(常時実行)が空文化リスクをゼロ化(ADR-1)。
