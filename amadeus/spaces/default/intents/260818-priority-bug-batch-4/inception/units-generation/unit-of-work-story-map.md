# Units of Work — Story Map

Intent: 260818-priority-bug-batch-4(user-stories は SKIP — ストーリーの代わりに承認済み requirements.md の FR を写像単位とする。同型の degrade 前例: 260817-inception-cost-batch)

上流: `../requirements-analysis/requirements.md`(FR の正本)、`unit-of-work.md`(unit 定義)。

## FR → Unit 写像(全数)

| FR | Unit | unit 内の実装順(目安) |
|---|---|---|
| FR-2837-1(batch/pool identity 搬送) | issue-2837-invoke-swarm-context | 1(Red: batch 導出検証 → 契約 → emit 配線) |
| FR-2837-4(回帰テスト) | issue-2837-invoke-swarm-context | 1 と一体(Red 先行 — failed-terminal 再提示) |
| FR-2837-3(engine + 7 conductor 面の `--batch` 同期 — claude/codex/kimi/kiro/kiro-ide/cursor/opencode) | issue-2837-invoke-swarm-context | 2(契約確定後に面同期) |
| FR-2837-2(check_cmd 供給契約の明記 — こちらは pi 含む全 8 面へ正規取得元、ADR-1 契約6) | issue-2837-invoke-swarm-context | 2 と同一変更 |
| FR-2837-5(stale SKILL.md 参照 2 箇所) | issue-2837-invoke-swarm-context | 3(挙動不変のコメント修正、:306-311 訂正と同時) |
| FR-3106-2(落ちる実証 Red) | issue-3106-per-unit-outcome | 1(cancelled の Red、failed は到達可能性実証) |
| FR-3106-1(cancelled/failed の terminal 記録) | issue-3106-per-unit-outcome | 2(語彙拡張 + emit arm + supersession) |
| FR-3106-3(pool 対称性) | issue-3106-per-unit-outcome | 2 と一体(テストで固定) |
| FR-3106-4(docs 英日更新) | issue-3106-per-unit-outcome | 3(実挙動確定後) |

## 横断事項(unit を跨ぐ関心)

- 台帳 resync(NFR)— 両 unit がそれぞれ同梱(どちらの unit にも属する反復作業であり、写像は「各 unit の最終手順」)
- record checkpoint / per-unit PR 配送(NFR)— delivery-planning の Bolt 計画へ

## カバレッジ検証

- FR 全 9 件がいずれかの unit に割当済み(未割当 0)— 上表の全数列挙で確認
- 両 unit とも割当 FR を持つ(空 unit なし): U1 = 5 件、U2 = 4 件
