# Code Summary — fix-2147-invocation-store

上流入力(consumes 全数): requirements.md（FR-1）, code-generation-plan.md

- Bolt branch: `bolt-fix-2147-invocation-store`、base `1043b7e67` から2コミット:
  - `5274d25fe` fix(reviewer): persist issued invocations and verify them on every path
  - `51ca2f5ef` test(reviewer): cover the invocation-store fail-closed refusals
- 実装: `runScope` が invocation store（record 配下、gitignore 済み dot-prefix runtime）へ発行 id を永続化。
  `checkRead` / `completeReview` は store 照合必須、未発行 id・store 破損・record root 未解決はすべて fail-closed。
  発行 invocation は最初に消費した iteration に束縛され、別 iteration を名乗る carrier は replay 拒否。

## 検証（builder 報告値の転記、各コマンド自身の exit code）

| コマンド | exit |
|---|---|
| `bun run typecheck` | 0 |
| `bun run lint` | 0 |
| `bun test tests/integration/t245-…` | 0（34 pass / 0 fail / 514 assertions） |
| `bun test tests/integration/t367-…` | 0（16 pass） |
| `bun tests/unchecked-cast-guard.ts --check` | 0 |
| `bun run build` → `git status --porcelain` | 0 / 空（dist と正本の byte 一致を cmp 確認） |
| `bash tests/run-tests.sh --ci` | **0**（835 files / 11013 assertions / 0 failed） |

## TDD（対角実測 — 新テスト × 修正前実装 = RED を実装前に測定）

- 捏造 invocation ID の check-read / complete-review 拒否: RED（`Received: 0` — 捏造 UUID が通っていた）→ GREEN
- 空 transcript 経路の id 再利用拒否: RED（exit 0 で Iteration 2 Review まで追記されていた）→ GREEN
- 発行 invocation の iteration 束縛: RED → GREEN

## 落ちる実証（2セット、注入 → 赤 → 復元 → 残渣ゼロを不可分実施）

1. `checkRead` の `bindInvocation` 呼び出しを削除 → 捏造 UUID テスト赤 → 復元・`git diff --stat` 空
2. store 破損 catch と record root 未解決 throw を fail-open 化 → fail-closed テスト赤 → 復元・残渣ゼロ

## テスト契約の改訂 vs 新規（§12a reviewer FOLLOW-UP 対応の区別）

- **改訂**: 旧挙動（scope なし通過）を暗黙固定していた t245 の既存アサーション群
  （spawn 経路 11 件・in-process 経路 4 ヘルパ）を「fixture が先に `scope` を呼ぶ」形へ、Q1=A 引用コメント付きで改訂。
  exit 1 期待で緑のままだったものも改訂 — 未発行 id 拒否で先に落ちると本来のガードに到達せず
  `cid:code-generation:c7-failclosed-inverts-to-misattribution` の誤帰属になるため。
- **新規**: 4件（捏造 id 拒否、空 transcript 再利用拒否、iteration 束縛、malformed store / unanchored path 拒否）。
- 予約番号 t450 は未使用（既存 t245 の拡張で充足）。

## 逸脱・申し送り

- 停止した逸脱: **なし**。
- `bun run no-silent-drop` は base 既存の `BASELINE_INVALID`（本 diff は `tests/no-silent-drop/**` 非接触）。
  rebind は `cid:code-generation:c3-nsd-rebind` により conductor の PR 時作業へ引き渡し。
- 初回 full CI の t92 2 assertion 赤は単独実行 46 pass・以後2回の full CI 0 fail で負荷起因の偽赤と判定
  （`cid:code-generation:fanout-load-settle-before-integration`）。
- 実 intent record 非接触（全 fixture は mkdtemp temp dir）。SKILL.md / knowledge は既に「scope が返した
  invocationId + iteration をそのまま運ぶ」規定のため文書変更不要（builder 判断、conductor 追認）。
