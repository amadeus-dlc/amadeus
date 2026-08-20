# Component Dependency — 260820-fmc-drift-batch

上流入力: `requirements.md`(Constraints の依存1本 = ファイル所有権由来。コンパイル時 import 由来の辺は本書「Unit 実装順序との対応」節で追加宣言する — RA §12a FOLLOW-UP MAJOR-1「依存辺追加の要否」の解決)、`components.md` C1〜C4。既存依存の現行形は codekb `architecture.md`(260820 節)と `component-inventory.md`(model-map 全数表)から採る。`stories` / `team-practices` は不在(設計どおり)。

## 依存マトリクス(変更後)

| from \ to | C2 RegistrationCommitter | C3 ModelBoundary(model-map モジュール) | issue-evidence.md | model-map.json |
|---|---|---|---|---|
| C1 ApplicabilityJudge | —(ADR-1 改訂: 両者とも leaf モジュールを import。C1→C2 の直接 import はしない) | 読取(vocabulary — 既存依存方向) | 読取(新、FR-ARM-2) | 読取(既存) |
| C2 RegistrationCommitter | — | 既存依存(validator 呼出)不変 | — | 読み書き(既存) |
| C3 loader / sensor | — | **import IMPLEMENTATION_PATHS + containment(新、AD Q2=A)** | — | 読取(既存) |
| C4(撤去) | — | — | — | — |

すべて同期・in-process(import / 関数呼出 / ファイル読取)。イベント・非同期通信なし。循環依存なし — ADR-1 改訂後の import グラフ(import 方向): registration → applicability(既在、実測 `tla-registration.ts:18-19`)、registration → leaf(新)、applicability → leaf(新)。leaf は import を持たない終端。

## データフロー(閉ループ)

```
issue-evidence.md ──┐
model-map.json ─────┼─> C1 判定 pipeline(armCheck + coverageCheck)─┬─> route: revise-model(強制評価)─> C2 commit(置換)─> model-map.json 更新
実装現行形 ─────────┘                                              └─> receipt(#3262 契約)
model-map.json(entries 拡大 ← C3)─> loader/TLC/sensor が plugin 実装の SOURCE_DRIFT を検知
```

<!-- Text fallback: issue-evidence と model-map と実装現行形が C1 の判定 pipeline に入り、drift/再発検出時は revise-model 強制評価として C2 の置換 commit に流れ model-map が更新される。C3 の境界拡大により loader/sensor が plugin 実装の drift を検知できる。 -->

## Unit 実装順序との対応(所有権)

- 並列可: revise-model-commit(C2)/ boundary-three-face(C3)/ advisory-retirement(C4)— ファイル所有権の交差なし。反証2件: (1) C2×C3 — C2 は `amadeus-formal-verif-model-map.ts` の validator を呼ぶだけで編集しない(C3 が編集、C2 は `tla-registration.ts` のみ編集)。(2') OQ-AD-2 の帰結義務: defectRecurrence の入力パス解決が core import 方向(plugin→core)へ倒れた場合、FD は本マトリクスへ C1 → core(amadeus-lib)の構造依存辺を追加しなければならない。(2) C2×C4 — `tla-authoring.ts:830/838` は RegistrationCommitter の呼出面だが、C2 の route 伝搬は `commit` の既存引数(candidate.applicability.route)から compose へ渡す内部変更で完結し `commit` の呼出シグネチャを変えないため、C2 は `tla-authoring.ts` を編集しない(シグネチャ変更が必要と判明した場合は並列可の前提が崩れるため functional-design で halt し依存辺を追加する)
- 直列: applicability-arms(C1)への依存辺は**2本を明示宣言**する: (1) C4 → C1(`tla-authoring.ts` / `stages/tla-authoring.md` / `docs/reference/22-formal-model-supply.{md,ja.md}` 共有 — requirements.md Constraints の既存宣言1本)、(2) **C2 → C1(新規宣言)** — `AUTHORING_ROUTES` leaf モジュールは C2 が新設するため、C1 の import 切替は C2 着地後(ADR-1)。requirements の「1本」はファイル所有権由来の辺のみを数えており、本書はそこへ import 由来の1本を追加する(RA §12a FOLLOW-UP MAJOR-1 の解決 — 無申告の変更ではない)。C1 の着手は C4 と C2 の両方の着地後。delivery-planning はこの2辺を実行可能性制約として読む

## 共有リソース

- `model-map.json` — 書き分け: C2 の「書込」は**ランタイム書込**(登録 CLI の実行結果であり、C2 unit が model-map.json をソースとして編集することはない)。C3 の entries 追加は FR-BND-4 の登録作業で、使用経路は OQ-AD-1(登録経路 / updateModelMap — 手動ソース編集は禁止)。ソース編集面としての所有交差は存在しない。FR-BND-4 の追加登録に使う経路(既存の登録経路 / updateModelMap 経路)は functional-design で確定する(OQ-AD-1。手動編集は tla-authoring.md:149-151 が禁止)。並行実装時も各 unit は自 worktree 内で map を書き、統合は PR の直列着地(registry-merge 再構成規律)で解決する — Bolt への割当は delivery-planning が確定する
