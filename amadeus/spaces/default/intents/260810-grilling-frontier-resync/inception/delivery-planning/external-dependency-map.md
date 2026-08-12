# External Dependency Map — grilling frontier 再同期

**Intent**: 260810-grilling-frontier-resync / **Stage**: delivery-planning (2.8)

上流入力(consumes 全数): `requirements.md`(Constraints の MIT 帰属・source-only 境界)、`unit-of-work.md`(U3 の検証コマンド群)、`components.md`(変更面が core 中立層に閉じること)、`unit-of-work-dependency.md`(外部依存が依存グラフに現れないことの確認)、`unit-of-work-story-map.md`(スライス4の dogfood が外部サービス非依存であること)。

## 外部依存の棚卸し

| 依存先 | 用途 | 可用性リスク | 対応 |
|---|---|---|---|
| GitHub(gh CLI) | PR 発行・converge・#2785/#2683/#2792 の Issue 操作 | rate limit / 認証 | 既存 credential store。失敗は loud、リトライ可(gh-scripts-boundary) |
| GitHub Actions CI | PR の blocking gate 群 | queue 遅延 | merge-approval-latency の運用どおり承認待ちを ブロッカー扱いしない |
| 上流 mattpocock/skills | 骨格の出典 | **依存なし(実装時)** — ピン原文は #2785 本文に固定済み、再取得しない | 帰属ヘッダに SHA 記録のみ |
| npm / bun レジストリ | bun install(worktree ブートストラップ) | 低 | lockfile 固定(--frozen-lockfile) |
| Codecov | coverage gate(U2 の ts 変更で patch gate 対象) | 時点変動 | external-status-triage / pulls API 権威の既存運用 |

外部サービスの新規契約・credential 追加は無し。formal-model-check advisory は延期裁定済み(2026-08-10、defer-with-risk 記録済み)。

## 内部の共有面(並行 intent との境界)

- `stage-protocol.md` / `docs/reference/04-stage-protocol.{md,ja.md}`: 共有正本 — 再接地時の実 diff 判定で交差を再評価。
- coverage 台帳(ratchet/allowlist/registry): U2 の ts 変更が触れる可能性 — 行ピンの機械 remap+直読照合(c1-allowlist-mechanical-remap 系)を Bolt 2 の手順に含める。
