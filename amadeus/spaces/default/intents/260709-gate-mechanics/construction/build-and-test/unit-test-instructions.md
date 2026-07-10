# Unit Test Instructions — gate-mechanics-batch(Minimal 戦略)

> 要件駆動(1 要件 = 1 回帰面)。上流: requirements.md FR-1/FR-2、`code-summary.md` × 2 unit。テストは両 Bolt の PR(#727 / #729)で実装済みで、本書はその実行・維持手順を固定する。

## フレームワークと構成

- ランナー: `bun test`(自作4層ランナー `tests/run-tests.sh` が smoke / unit / integration / e2e を統括)
- 設定ファイル追加なし(既存ランナー再利用 — reuse inventory)

## 要件 → テスト対応(回帰面)

### FR-1(#685 delegate-rejection)→ `tests/unit/t112-delegated-approval.test.ts`

- AC-1a: grounded な DELEGATED_REJECTION で reject の presence 判定が真
- AC-1b: 偽造(シャード不在 / timestamp 不一致 / HUMAN_TURN 無し / パストラバーサル)→ fail-closed
- AC-1c(両方向): 承認委任のみ → reject 不成立、却下委任のみ → approve 不成立(verb 混用遮断)
- FR-1.2: 発行元に HUMAN_TURN 無し → delegate-rejection コマンド拒否
- レビュー是正で追加: 一般 audit CLI の presence/provenance 鋳造遮断(append 3型 + append-raw の heading / Event 行 / dash-prefix 変種 — canonical parser 共有)
- 関連: `tests/unit/t188-human-presence-gate.test.ts`(presence gate 本体)、t28/t81/t111(イベントレジストリ 72 同期)

### FR-2(#670 sibling-worktree-guard)→ `tests/e2e/t06.test.ts`

- AC-2a: sibling worktree から create → main checkout アンカーで成功(T1)
- AC-2b: main checkout から create → 回帰なし(T2)
- AC-2c: 真ネスト(Bolt worktree 内)から create → pre-audit 拒否維持(T3)
- AC-2e/2f: sibling から merge / discard → 成功(T4/T5)
- AC-2g + レビュー是正: sibling / main 双方の list が同一 slug/path/branch を返す内容 assert(T6)、Bolt worktree 内からの list 成功(T7)

## 実行方法

| スコープ | コマンド |
|---|---|
| FR-1 回帰面のみ | `bun test tests/unit/t112-delegated-approval.test.ts tests/unit/t188-human-presence-gate.test.ts` |
| FR-2 回帰面のみ | `bun test tests/e2e/t06.test.ts` |
| 全層(CI 同等) | `bash tests/run-tests.sh --ci` |

## カバレッジ目標(Minimal)

- 新規回帰面: 各 AC に最低1テスト(t112 = 24 tests、t06 = 7 tests — 実装済み)
- 既存スイートのグリーン維持(bugfix スコープの org 既定)
- codecov/patch(target 100%)は PR 時点で green 済み

## テストデータ / 環境

- すべて一時ディレクトリ fixture(`mkdtempSync` / `setupWorktreeFixture`)で自己完結。片付けは afterAll で自動
- HUMAN_TURN のシードはテスト側シャード直書き fixture(本番経路の CLI mint は遮断済みのため使用不可 — 意図どおり)
