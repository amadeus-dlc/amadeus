# Code Summary — fix-2112-cast-guard

上流入力(consumes 全数): requirements.md（FR-6）, code-generation-plan.md

- Bolt branch: `bolt-fix-2112-cast-guard`、base `1043b7e67` から3コミット:
  - `9543dcc2f` fix(cast-guard): count only the outermost link of an `as` chain
  - `bfc28e7c3` fix(cast-guard): detect the angle-bracket and `satisfies` spellings
  - `3400f6e11` docs(cast-guard): state the chain rule, the spellings, and drop a stale count

## 検証（builder 報告値の転記、各コマンド自身の exit code）

| コマンド | exit |
|---|---|
| `bun run typecheck` | 0 |
| `bun run lint` | 0（既存 warning のみ、変更ファイル該当 0） |
| `bun test tests/unit/t420-… tests/integration/t420-…` | 0（38 pass / 0 fail / 111 expects） |
| size-purity ratchet（t-test-size-drift / t-test-size-dynamic） | 0（42 pass） |
| `bun run build` → `git status --porcelain` | 0 / 出力なし |
| `bun tests/unchecked-cast-guard.ts --check` | 0（`OK — 0 new casts, 35 remaining`） |

## TDD スライス（RED→GREEN、全4スライス）

1. 多段連鎖=1: RED（2サイト受領）→ 最外判定実装 → GREEN 16 pass
2. `as A as unknown as B`=1: 対角実測（fix 後に base のテストのみ checkout → 2サイトで fail）→ 復元・17 pass
3. 角括弧: RED（`Received: []`）→ union 化 → 18 pass
4. satisfies: RED → SatisfiesExpression 追加 → 19 pass

## 落ちる実証（両側）

- 赤側: scripts/metrics-snapshot.ts へ角括弧+satisfies を注入 → `NEW_CAST … allowlist 1, measured 3` の実赤
- 復元: `git checkout bfc28e7c3 -- …` → porcelain 空・probe grep 0・guard 再実行 `OK — 35 remaining`（不可分1セット）
- 緑側: 実コーパス全数 `--check` exit 0（偽赤ゼロ）

## 台帳再ベース（FR-6c）

最終 base（`1043b7e67` = origin/main）で修正後検出器により census 再計測 → **35サイト/19ファイルで修正前と同一**。
コーパスに連鎖・角括弧・satisfies の実例0件のため台帳は byte-identical（integration の再生成一致テストで機械確認）。
`--update` 書き換えなし・手編集なし・shrink-only 不変。

## 逸脱・申告事項（conductor 裁定）

- **FR-6e は builder 契約（GitHub 非接触）によりスコープ移管** — conductor が PR 発行時に実施。
  訂正実測値: Issue 本文「33/18」は台帳と一度も一致せず（導入時 total 36 → `07446ef8b` 以降 **35/19**、修正後も不変）。
  「33」の出所は ci.yml コメントで導入時から stale（本 Bolt で count-free 化済み）。
- **新綴り2種は別 kind を切らず単一 kind に収容**（申告済み設計裁量 — 台帳キーの churn 回避、
  `as`/`<T>`/`satisfies` は同一主張の構文異形。conductor 受理: FR-6b は kind 分割を要求しておらず、
  裁定 Q6=B の趣旨（同一変更で穴を塞ぐ）に整合）。
- 過去 intent record（260802-record-roundtrip-pbt の BR 表）は履歴として不変更 — 意味の明文化は正本
  （ガードのヘッダコメント）側に置いた（conductor 受理: 確定済み record の遡及編集は不可）。
- 予約番号 t452 は未使用（既存 t420 の拡張で充足）。
