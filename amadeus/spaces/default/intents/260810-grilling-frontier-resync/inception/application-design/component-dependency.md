# Component Dependency — grilling frontier 再同期

**Intent**: 260810-grilling-frontier-resync / **Stage**: application-design (2.6)

上流入力(consumes 全数): `requirements.md`(scope-document 経由の4層依存裁定を FR 粒度で具体化 — 本書の依存行列の正本)、codekb `architecture.md`(センサー/テスト/プロトコルの既存依存方向)、codekb `component-inventory.md`(t199 が dist を読む・t415 が正本を読む等の読取方向のベースライン)。

## 依存行列

行 = 依存元、列 = 依存先。`◀` = 文言/契約を参照(読み)、`⇐` = 改訂順序の前提。

| | C1 正本 | C2 stage-protocol | C3 センサー | C4 テスト | C5 スキル | C6 prose/docs |
|---|---|---|---|---|---|---|
| C1 | — | | | | | |
| C2 | ◀⇐(要約・§8 接続は C1 文言確定後) | — | | | | |
| C3 | ◀⇐(超過記録行・列挙節の様式は C1 が正本) | | — | | | |
| C4 | ◀⇐(逐語 pin) | ◀⇐(§8 段落・semi 除外の pin) | ◀⇐(3態テスト) | — | | |
| C5 | ◀⇐(規律は C1 参照) | | | | — | |
| C6 | ◀⇐(語彙) | ◀(Step 3d 表現) | | | | — |

- 循環なし。C1 が唯一の根 — scope-definition Q1 裁定(正本先行4層)と一致: 裁定パック(要件で確定済み)→ C1 → {C2, C3, C5} → C4(C1/C2/C3 の確定文言を pin)→ C6(語彙 sweep)→ build/検証。
- C4 は C3 の実装完了に依存(3態テスト)するため、実装順は C1 → C2/C3/C5(並行可 — ファイル非交差)→ C4 → C6 → FR-PROJ-4 検証。

## データフロー(実行時)

```text
conductor/main agent ──(1問1行追記: blank [Answer] + grilling マーカー)──▶ *-questions.md
        │                                                        │
        ├──(annex 提示/回答)◀──▶ 人間                              │
        ├──(超過時: 記録行を追記)────────────────────────────────▶│
        └──(合意サマリ: 刈りノード列挙)─────────────────────────▶ 成果物/端末
                                                                 │
question-budget センサー(C3)──(fire: マーカー検知→justification 検査)◀┘
        └──(SENSOR_PASSED/FAILED + finding)──▶ audit シャード
```

テキストフォールバック: questions ファイルは conductor が書き、人間が回答し、C3 センサーが事後検査して audit へ verdict を残す。C1 は全書式の正本。

## 共有資源

- `*-questions.md`(共有台帳): 書き手 = conductor のみ、読み手 = 人間・C3・answer-evidence センサー。grilling マーカー行は既存 answer-evidence 述語([Answer] 行走査)と非交差の行に置く(語彙衝突なし — vocabulary-collision-vacuity-guard を C4 の vacuity guard テストで固定)。
- `stage-protocol.md`(共有正本): 本 intent の変更(:277 / :349 / §8 / §3)は他 intent と衝突しうる — PR 発行直前・マージ直前に origin/main 実測で再確認(shared-ledger-insert-collision)。
