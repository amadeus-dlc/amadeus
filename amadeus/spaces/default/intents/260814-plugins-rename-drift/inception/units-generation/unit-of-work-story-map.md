# Unit of Work Story Map — 260814-plugins-rename-drift

user-stories ステージは self-feature グリッドで SKIP のため stories.md は不在(expected)。本 intent の要求単位は `requirements-analysis/requirements.md` の FR 群であり、ストーリーの代わりに **FR → Unit の写像**で被覆を検証する(`unit-of-work.md` の境界定義、`application-design` 設計要素経由)。

## FR → Unit 写像

| FR | Unit | 備考 |
|---|---|---|
| FR-REN-1〜6 | U1 | 改名本体・消費者同期・残存参照検査 |
| FR-REN-7 | U1 | scope-grid 検証テスト(ADR-2)。設計裁定は完了済み |
| FR-REN-8 | U1 | フィクスチャ決定(ADR-1)の実装反映(t445 定数・除外リスト) |
| FR-SET-1 | U2 + U3 | 宣言形式は U2、git-drift の実宣言は U3 |
| FR-SET-2〜4 | U2 | config キー・fail-closed 両面 |
| FR-SET-5 | U2 | 機密キー名拒否は U2。env 宣言は先送り(ADR-3 Decision 4 — 実装対象外の記録のみ) |
| FR-DRIFT-1 | U3 | 合成形状 + conformance ケース |
| FR-DRIFT-2 | U3(消費)+ U2(解決) | スロットル設定の実消費 |
| FR-DRIFT-3〜5 | U3 | 検知・警告・fail-open と落ちる実証 |
| FR-DRIFT-6 | U3 | opt-in 配布の実装反映(ADR-4 で裁定済み) |
| FR-X-1〜3 | U1/U2/U3 各自 | build 再現・lint/型・TDD は各 Unit の完了条件 |
| FR-X-4 | 横断(conductor) | Bolt ごと PR・人間承認マージ — Unit 内実装物ではなく工程規律 |

## 被覆検証

- 全 FR(REN 8 + SET 5 + DRIFT 6 + X 4 = 23 件)が少なくとも 1 Unit(または工程規律)に割当済み — 上表からの転記で漏れ 0 件。
- 全 Unit に FR が割当済み(U1: 8 件 / U2: 5 件 / U3: 7 件 + 横断)。
- Unit 内の実装順序: 各 Unit とも TDD の vertical slice 順(受け入れ基準の依存順 — U2 は宣言 parse → config キー → 解決の順、U3 は骨格(plugin.json+conformance)→ 検知 → 警告文言の順を目安とし、確定は functional-design / code-generation 段)。

## 横断関心事

- `amadeus/config.json`: U1 と U3 が別キーを編集(共有ファイル — 2.8 で直列化判断)
- 落ちる実証 (iii)「設定値の実消費」: U2 の機構と U3 の消費者を結合して初めて検証可能(U3 の完了条件に置く)
