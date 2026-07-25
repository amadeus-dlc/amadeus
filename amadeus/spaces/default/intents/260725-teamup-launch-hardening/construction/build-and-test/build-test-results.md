# ビルド・テスト結果 — 260725-teamup-launch-hardening

上流入力（consumes 全数）: `construction/u1-watcher-actas-guard/code-generation/code-generation-plan.md`、`construction/u1-watcher-actas-guard/code-generation/code-summary.md`、`construction/u2-worktree-parallel/code-generation/code-generation-plan.md`、`construction/u2-worktree-parallel/code-generation/code-summary.md`

（両ユニットの `code-summary.md` が申告した検証結果を、conductor が全数再実行して裏取りした記録である。）

測定 ref: `afe344eea`（本 intent のブランチ HEAD）。数値はすべてコマンド出力からの転記。

## 検証コマンド

| コマンド | exit code |
|---|---|
| `bun run typecheck` | **0** |
| `bun run lint` | **0** |
| `bun run dist:check` | **0** |
| `bun run promote:self:check` | **0** |
| `bash tests/run-tests.sh --ci` | **0**（`RESULT: PASS`） |

初回実行時に4種が exit 127 を返したが、原因は `bun` が PATH 上に無かったことでコマンド自体が起動していない。実装の失敗ではないため検証失敗として扱わず、PATH を通して再実行した値を上記に載せている。

## 本 intent のテスト

| テスト | 結果 |
|---|---|
| `t295-team-up-worktree-parallel.test.ts`（新規 273行） | **PASS** |
| `t294-team-up-watcher-applicability.test.ts`（書き換え 113行） | **PASS** |
| `t-team-up-watcher-arming.test.ts`（既存 268行） | **PASS** |

full CI の FAIL 件数は **0**（`grep -c "FAIL:" = 0`）。

## 既存の警告（本 intent 由来ではない）

```
wall-clock drift: 1 file(s)
  tests/integration/t-codex-hooks-migration.test.ts: declared=medium measured=large (36.450853s)
```

このファイルの最終変更は `bf84cdfaf fix(codex): separate canonical and active hooks (#1212)` であり、本 intent は触っていない。`RESULT: PASS` を妨げていないため、`project.md` Forbidden（既存の赤を無視しない）に従い**ここに明示的にフラグしたうえで**スコープ外とする。

## 配布面の同期

正本 `packages/framework/core/tools/team-up.sh` は **11 コピー**へ同期済み。

- 正本 1
- `dist/` 6ハーネス（claude / codex / cursor / kiro / kiro-ide / opencode）
- セルフインストール 4（`.claude/` `.codex/` `.cursor/` `.opencode/`）

`dist:check` と `promote:self:check` がともに exit 0 であることで機械確認した。

## 実測（実 launch）

| 構成 | アタッチ到達 | 終了コード | sentinel |
|---|---|---|---|
| 3人（U1 のみ、instance `bench4`） | 6.02秒 | 0 | 3/3 |
| 7人（U1+U2、instance `bench5`） | **11.80秒** | **0** | **7/7** |

`git worktree add` の並列度別（7人構成、隔離インスタンス）:

| 並列度 | 所要 |
|---|---|
| 直列 | 7.77秒 |
| 4（採用値） | **3.60秒 / 3.55秒** |
| 無制限（7） | 7.55秒 |

無制限が直列とほぼ同じなのは git がオブジェクトストアで直列化するため。**上限を置くこと自体が効果の源**である。

計測環境はすべて隔離インスタンスで実施し撤去した。`git worktree list` は計測前後とも 32件で一致。

## RAID 由来の未検証事項の解消

### resume（`-c`）での actas ロック残存 — **解消（実起動で実測）**

NFR-3 の受け入れ基準は「異常終了後の再起動(`-c`)でロック残存が起動を塞がないことを**実測で確認**する」である。当初 `actas_lock_gc_stale` の単体実行(`reclaimed=4`)で代替したが、これは関数単体の挙動であって受け入れ基準が要求する実起動ではない。以下は是正後の実測。

#### 手順(隔離インスタンス `bench6`)

1. 3メンバーを起動(exit 0 / sentinel 3/3 / actas ロック 3/3)
2. **ロック所有プロセス3件を SIGKILL** — ロックファイルは残したまま異常終了を作る
3. 残留ロックの所有 PID が全て DEAD であることを確認(e1 52205 / e2 52340 / leader 52207)
4. herdr セッションを stop → delete(残っていると attach するだけで再起動経路を通らない)
5. **残留ロック3件のまま `-c` で再起動**

#### 結果

| 項目 | 結果 |
|---|---|
| 終了コード | **0** |
| sentinel | **3/3** |
| actas ロック | **3/3、所有者は全て新 PID**(e1 65769 / e2 66632 / leader 66001、いずれも ALIVE) |

**残存ロックは起動を塞がず、stale 再取得が実起動経路で機能する。** `_actas_lock_try_claim`(`lib/actas-lock.sh:106-133`)が所有 sid の生存を確認して再取得を許す設計どおりであることを、関数単体でなく実起動で確認した。

なお撤去後に `git worktree list` は基準33件へ復帰し、bench6 の残留(team 登録・sentinel・ロック)は 0 件。

### R-3（actas の受信範囲制限が配送を壊さないか） — **解消（実測）**

当初これを「起動経路がスコープであり配送は #1476 の実運用投入時」として先送りしたが、**これは誤り**である。RAID(`raid-log.md:15`)は R-3 を「実装時に実測確認」と明記しており、#1476 はこの intent そのものである。スコープ内の検証を実装段で落としていた。以下は是正後の実測。

#### 機序

actas モードの watcher は購読集合を自ロール宛のみに絞る(`watch.sh:162-163`、`ACTIVE_NAME` で `identities.sh` の出力を awk フィルタ)。monitor モードは全ロールを受ける。この差が配送を壊さないかが争点だった。

#### 実測（隔離インスタンス `bench6`、3メンバー、U1+U2 適用）

起動: exit 0 / sentinel 3/3 / actas ロック 3/3。3セッションが各自のロールのロックのみを保持し相互侵食なし。

| 手順 | 結果 |
|---|---|
| leader → e1 へ送信 | **e1 のみ受信**。e2・leader の inbox は空 |
| e1 のエージェントが応答 | **leader へ ack を自発返信**(`ack R3PROBE-… 受信しました(e1、配送正常)`) |
| その ack の着信 | **leader の inbox に着信** |

**双方向の配送が actas 受信範囲制限の下で成立し、かつ宛先分離も正しく効いている。** 「1 worktree に1ロールのため実質同等」という RAID の見込みは実測で裏付けられた。

#### 残る限界

観測の都合上、`inbox.sh` を conductor が読んだ時点でメッセージが既読化され watcher から横取りされる。よって「watcher がペインへ注入する」経路そのものは、e1 のエージェントが自発的に ack を返した事実(=何らかの経路でメッセージが届いた)を証拠としている。ペイン注入の直接観測はしていない。

### R-6（Linux CI 上の並列度特性） — **未検証**

並列度4は macOS の実測から決めた値であり、Linux での特性は測っていない。上限を置く設計自体がハードウェア差を吸収する想定だが、その想定の根拠は移植していない。
