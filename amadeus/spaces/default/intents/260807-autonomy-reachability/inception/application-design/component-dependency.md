# Component Dependency — autonomy-reachability(#2378)

上流入力(consumes 全数): requirements.md(FR-5e の順序制約を依存として固定)、architecture.md / component-inventory.md(既存依存の現在断面 — 患部詳細は re-scan record 正本)。

## 依存マトリクス

| 依存元 → 依存先 | C1 Launch | C2 Production | C3 CLI | C4 Log | C5 Stop | C6 Conduit | C7 Parity |
|---|---|---|---|---|---|---|---|
| C1 Launch | — | 呼出(適用委譲) | — | — | — | — | — |
| C2 Production | — | — | — | — | — | — | — |
| C3 CLI | — | 呼出(縮約後) | — | — | — | — | — |
| C4 Log | — | 参照(mode 読取は既存) | — | — | — | — | — |
| C5 Stop | — | 読取(projection、既存) | — | — | — | — | — |
| C6 Conduit | 記述対象 | 記述対象 | 記述対象 | — | — | — | — |
| C7 Parity | — | — | — | — | — | 検査対象 | — |

- C2 が依存の根: C1/C3 の適用経路が C2 の canonical 関数へ収束する(FR-2c)。C5 は変更なしで C2 の state 書込の恩恵を受ける(state-first 読みが正しくなる)
- C7 → C6 のみ(コード非依存の文書検査)

## 通信パターン

- 同期関数呼出し(C1→C2、C3→C2)— 同一プロセス
- append-only イベント(C2→audit、C4→audit)— ロック下の同期書込
- read-only 検査(C7→C6)

## データフロー

打鍵(HUMAN_TURN)→ C1 argv 抽出 → birth print directive(宣言搬送)→ intent-birth → C2 適用(audit transaction + state 3フィールド)→ 以降の directive が `intent_autonomy_mode` を搬送 → C5/C4 が state/projection から一貫した mode を読む。拒否経路: C2 認可判定 → `autoApprove=false` → refusal イベント(新設)→ presence guard(既存、不変)。

## 共有資源

- audit shard(append-only、mkdir ロック)— C2/C4 が書き手。ロック契約は既存を変更しない
- `amadeus-state.md` — 書き手を C2 の1箇所へ集約(現状の C3 直書きを廃止 — write⇔read 対称性の是正)

## FR-2d: state autonomy フィールドの読み手6系統の全数帰属(finding 5 の完全転記)

| # | 読み手 | file:line | 帰属 | 変更 |
|---|---|---|---|---|
| 1 | statusline セグメント `autonomySegment` | `amadeus-lib.ts:4942` | C2 の消費側(表示面) | 無変更 — C2 の state 書込 canonical 化で C13 経由宣言後も表示される(FR-2c 受け入れ基準 (iii) が検証) |
| 2 | engine swarm スケジューリング `readAutonomyMode` | `amadeus-orchestrate.ts:1894-1899` | C1 の同居読み手 | 無変更 — 同上の恩恵(宣言が見える) |
| 3 | Stop hook 継続キャップ `stopContinuationDefaultCap` | `amadeus-stop.ts:150-154` | C5 | 無変更 — 同上(8→2 退行の解消) |
| 4 | Stop hook budget mode `stopBudgetMode` | `amadeus-stop.ts:160-162` | C5 | 無変更 — 同上 |
| 5 | Stop hook question carve-out `isQuestionCarveoutIntent` | `amadeus-stop.ts:196-198` | C5 | 無変更 — FR-2c 受け入れ基準 (ii) が検証 |
| 6 | 回答チェックポイント guard 免除 `isAutonomousMode` | `amadeus-log.ts:180` | C4 | 無変更(legacy `Construction Autonomy Mode` 読み — C2 が同フィールドも書くため一貫) |

**棚卸しテストの所有者は C2**: FR-2d のテストは「C2 の canonical 書込 → 6読み手それぞれが宣言後の mode を観測できる」ことを固定する integration テストとして C2 の変更と同一 Bolt で実装する(読み手1・2 は表示/directive 出力の assert、3〜6 は関数直呼びの assert)。

## Bolt 順序への含意(FR-5e / D2 dependency-first)

C2(canonical 化+可視化)→ C1(birth 同時)→ C6/C7(導線+パリティ)→ 計測 — の順で依存が解消する。ただし C6 のうち FR-6(plugin 文書)は独立で任意時点。確定は delivery-planning。
