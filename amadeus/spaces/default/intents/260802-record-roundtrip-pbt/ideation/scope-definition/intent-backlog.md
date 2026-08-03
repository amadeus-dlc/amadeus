# Intent Backlog — record-roundtrip-pbt（proto-Units、MoSCoW）

上流入力(consumes 全数): intent-statement.md（Success Metrics / Initial Scope Signal の裁定3件を優先度根拠として使用。feasibility-assessment / constraint-register は不存在の任意 consume）

## 優先順位付き proto-Unit 一覧

| # | proto-Unit | MoSCoW | 順序根拠 | 対応 AC |
|---|---|---|---|---|
| P1 | election 読み戻しの fail-closed 一本化＋最小プロパティ（walking skeleton） | Must | リスク先行（Q1=A）— 実害最大の現行露出。コア→dist→テストの全配線を最初に実証 | AC-1(election)・AC-2(#1459) |
| P2 | election round-trip プロパティ＋ledger/registry arbitrary 整備 | Must | P1 の直後 — 同境界の残り半分（符号化全単射） | AC-1(election)・AC-4 |
| P3 | state 境界の round-trip + fail-closed プロパティ | Must | P1/P2 と独立 — seam ペア既存で交差なし | AC-1(state)・AC-4 |
| P4 | バリデータ非経由経路の静的ガード（allowlist ratchet） | Must | P1-P3 の後 — 一本化完了後に「逆行防止」を張る（先に張ると既存経路で赤） | AC-3 |
| P5 | 深掘り workflow_dispatch ジョブ（失敗 seed ログ化） | Must | 独立 — テスト資産が1本でもあれば価値が出る | AC-4 |
| P6 | 軽量台帳（根拠9件＋射程判定）の record 化 | Must | RE/RA 段の成果物として先行（実装 Bolt とは独立） | 検証可能性の担保（Q1=C） |
| P7 | mirror render→parse property 化＋snapshot arbitrary | Could | 余力枠（Q2=B）— t274 既存被覆の「外側」 | AC-1 但し書き |

## 依存関係

依存: P1→P2（同一境界の直列）、P1-P3→P4（一本化完了が前提）。P3・P5・P6 は相互独立。P7 は独立の余力枠。
