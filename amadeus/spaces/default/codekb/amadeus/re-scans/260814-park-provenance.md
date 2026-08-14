# RE スキャン記録: 260814-park-provenance

**観測 ref**: observed = `1d08374cd7e4ef89637b4a8000bab3fcf1a0f780`（`origin/main`、PR #3037 着地コミット）。差分 base = `cd64486a68c6a1144db50fbe3fde8273f5e18455`。

| 項目 | 値 |
| --- | --- |
| Date | `2026-08-14` |
| Intent | `260814-park-provenance`（scope `self-fix`、Brownfield、単一 repo `amadeus`、depth `Minimal`、build `bun`） |
| Base commit | `cd64486a68c6a1144db50fbe3fde8273f5e18455` |
| Observed commit | `1d08374cd7e4ef89637b4a8000bab3fcf1a0f780` |
| Scan mode | **通常の差分リフレッシュ**（xrev differential scan 不採用 — 理由は §1） |
| Focus | [Issue #3016](https://github.com/amadeus-dlc/amadeus/issues/3016)（`Construction Autonomy Mode: autonomous` 下で実ユーザーの明示 park が一律拒否される） |

## 0. Base 選定の実測根拠

`reverse-engineering-timestamp.md` と `re-scans/*.md` に現れる 40-hex トークンを全数抽出し、**observed の祖先**であるものだけを距離昇順に並べた。

述語（worktree ルート、再実行可能）:

```sh
grep -rhoE '\b[0-9a-f]{40}\b' \
  amadeus/spaces/default/codekb/amadeus/re-scans/*.md \
  amadeus/spaces/default/codekb/amadeus/reverse-engineering-timestamp.md \
  | sort -u > /tmp/shas.txt        # 162 件（`wc -l < /tmp/shas.txt` 転記）
OBS=1d08374cd7e4ef89637b4a8000bab3fcf1a0f780
while read s; do
  git cat-file -e "$s^{commit}" 2>/dev/null || continue
  git merge-base --is-ancestor "$s" "$OBS" || continue
  echo "$(git rev-list --count "$s..$OBS") $s"
done < /tmp/shas.txt | sort -n | head -6
```

出力（上位、逐語）:

| 距離 | commit | 出所 |
| --- | --- | --- |
| **6** | `cd64486a68c6a1144db50fbe3fde8273f5e18455` | `re-scans/260814-autonomy-stop-fixes.md:10` の Observed（かつ #3016 クロスレビュー2名の凍結 SHA） |
| 8 | `f60b3f4c868f3b7608a06f08393b8e2f10287fad` | 旧 Observed |
| 10 | `d7ffaa5442266508d8e67babc3e0b947fb4c1637` | 旧 Observed |
| 11 | `5b12d96e99cbf46711acd3dc2b8c103be1b0f801` | 旧 Observed |
| 17 | `6e94189dec9e8e2bd0aaeb53bcff7cf9cba27440` | 旧 Observed |
| 20 | `5f6b5bf97068f59dee53dcd4a2f6564967c3d164` | 旧 Observed |

→ **base = `cd64486a6`**（observed の祖先で距離最小、`cid:reverse-engineering:rescan-base-ancestry`）。`git merge-base --is-ancestor cd64486a6 $OBS` = exit 0。

**本 worktree HEAD と observed の関係**: HEAD = `c2aaf88631b7a620079a0e4547dbe87b16ac5861`（`merge: origin/main (PR #3037 landed) into conductor tree`）。`git merge-base --is-ancestor 1d08374cd HEAD` = **exit 0**。`git diff --name-only 1d08374cd HEAD` = **3 件**（`wc -l` 転記）で、`git diff --stat 1d08374cd HEAD -- ':!amadeus/'` は**空**（exit 0）。すなわち**非 `amadeus/` ツリーは HEAD = observed でバイト等価**であり、以下の file:line はすべて worktree 実読で採取して差し支えない。

**base..observed の非 `amadeus/` 変更は 24 ファイル**（`git diff --stat cd64486a6 1d08374cd -- ':!amadeus/'` の footer 逐語: `24 files changed, 1044 insertions(+), 35 deletions(-)`）。区間のコミットは 6 件（`git log --oneline cd64486a6..1d08374cd`）:

- `a92c3c2b3` [#3011] in-process ハンドラ呼出の ambient projectDir 解決を fail-closed に拒否
- `d554cc7c5` TAKT project configuration（`.takt/`）
- `57c6a6996` [#3030] TUI fixtures の copyTreeWithRetry guard 境界
- `1d08374cd` [#3037] `error` directive 受領条項の正典化 + remote-write 承認境界の定義
- 残り 2 件は metrics snapshot

**焦点面の変化（重要）**:

| 焦点ファイル | base..observed | 帰結 |
| --- | --- | --- |
| `packages/framework/core/tools/amadeus-state.ts` | **無変更**（`git diff --name-only` に不出現） | 患部の行番号は前 intent のスキャンから**不変** |
| `packages/framework/core/hooks/amadeus-stop.ts` | 無変更 | 同上 |
| `packages/framework/core/tools/amadeus-intent-autonomy-production.ts` | 無変更 | 同上 |
| `packages/framework/core/tools/amadeus-bolt.ts` | 無変更 | 同上 |
| `tests/unit/t17.test.ts` / `tests/e2e/t122-stop-hook-e2e.test.ts` | 無変更 | 同上 |
| `packages/framework/core/tools/amadeus-orchestrate.ts` | **+57/-8**（#3011） | **行番号が drift**。全参照を observed で再解決（§3） |
| `packages/framework/core/amadeus-common/protocols/stage-protocol.md` | **+36**（#3037、§11b/§11c 新設） | 新契約。#3016 との関係は §5 |
| `docs/reference/24-intent-autonomy(.ja).md` | **+22 / +21**（#3037） | 承認境界の定義が着地 |
| `packages/framework/harness/*`（8 表層） | 各 ±1〜2 行（#3037） | `error` 受領条項が 8 面同期済み（§5） |
| `tests/.coverage-patch-allowlist.json` | **±2 行**（`handlePark` の fingerprint 2 件） | §6 |

## 1. Scan mode の選択根拠（xrev differential 不採用）

#3016 はクロスレビュー2名 `CONFIRMED_WITH_REFINEMENTS`、収束 `ESTABLISHED_WITH_REFINEMENTS` で、xrev の形式要件は満たす。それでも通常の差分リフレッシュを採る理由:

1. **凍結 SHA `cd64486a6` は本スキャンの base そのもの**であり、`review..observed` は 6 コミット・24 ファイル。うち **`amadeus-orchestrate.ts` が患部隣接面として変更されている**ため、verdict が引く orchestrate の行ピン（`:6566-6575`、`:6563`、`:3082`、`:3253`、`:4050`、`:5969`）は現行断面に写らない（実測は §3 表）。currency 免除条件（`review..observed` の diff と被引用パス集合の交わりが空）が**不成立**。
2. したがって verdict の R1〜R5 / A1〜A5 は**背景としてのみ**扱い、全主張を observed 断面で取り直した（§4 に再実測結果）。結論は 1 件を除き verdict と一致し、1 件（docs 不在主張）を訂正した（§4 の A-doc）。

## 2. 患部の現行 file:line（observed 実読）

### P1. 拒否点は 1 箇所のみ、行番号は base から不変

`packages/framework/core/tools/amadeus-state.ts:1579` `function handlePark(_args: string[]): void`。ガードは `:1583-1587`:

```ts
if (getField(content, "Construction Autonomy Mode")?.trim() === "autonomous") {
  error(
    "Refusing to park: Construction Autonomy Mode is autonomous. An unattended " +
      "autonomous run has no human to resume it and must keep moving - do not park it.",
  );
}
```

述語 `git grep -n "Refusing to park" -- ':!dist/' ':!amadeus/'` → **1 hit**（`amadeus-state.ts:1585`、exit 0）。`grep -rl "Refusing to park" dist/` → 8 投影（claude / codex / cursor / kimi / kiro / kiro-ide / opencode / pi、`amadeus-state.ts` のみ）。**ハーネス非依存の単一正本**。

`handlePark` は `resolveProjectDir(projectDir)` → `readStateFile(pd)` のみを読み、`--intent` / `--space` セレクタを取らない（**アクティブ record 専用**）。park 要求の起点（人間 / hook / スクリプト）を示す入力は引数にも state にも存在しない。

### P2. 「Stop hook との二層防御」コメントは observed でも虚偽

`amadeus-state.ts:1573` 逐語:

```
// defence-in-depth beside the Stop hook's identical guard: the hook protects
```

反証:

- `git grep -n "Construction Autonomy Mode" -- packages/framework/core/hooks/` → **0 hit、exit 1**（grep のエラーは exit 2 なので「エラーなく不一致」）。
- `packages/framework/core/hooks/amadeus-stop.ts:947` は逆に `if (kind === "parked") {` で**全モード allow**（`amadeus-stop.ts` は全 1048 行、`git grep -c ""` 転記）。

→ 防御は state tool の **1 層のみ**。是正対象はコメント自体を含む。

### P3. park を案内する文言はモード非依存（内部契約の自己矛盾）

`packages/framework/core/hooks/amadeus-stop.ts:823` 逐語:

```
`session), run \`bun ${harnessDir()}/tools/amadeus-orchestrate.ts park\` to park it ` +
```

この文字列を含む `continuationReason()` は `:806` に定義され、呼出は `:1047` の**唯一のブロック経路のみ**（`git grep -n "continuationReason" -- packages/framework/core/hooks/amadeus-stop.ts` → 定義 `:806` / 説明コメント `:552` / 呼出 `:1047`、exit 0）。autonomy 条件は掛かっていない。すなわち **hook が案内する正規操作を state tool が拒否する**。

### P4. `Construction Autonomy Mode` は認可の正本ではない（規範側の逐語）

- `packages/framework/core/amadeus-common/protocols/stage-protocol.md:126` 逐語: `- The canonical authorization is the Intent audit. \`Construction Autonomy Mode\` is only an internal scheduling projection; legacy values never authorize a gate.`
- `packages/framework/core/memory/org.md:44` 逐語（行頭）: `authorisation source. \`Construction Autonomy Mode\` is a derived scheduling`

  （前 intent の記録は「`derived scheduling projection` で 1 hit」と読める書き方だったが、observed で `git grep -n "derived scheduling projection" -- packages/framework/core/memory/ amadeus/spaces/default/memory/` は **0 hit / exit 1** — 語が行境界で分割されているため。`git grep -n "Construction Autonomy Mode" -- packages/framework/core/memory/` → `org.md:44` の 1 hit、exit 0 が正しい述語。）
- 書込点: `packages/framework/core/tools/amadeus-intent-autonomy-production.ts:713`（`mode === "full" ? "autonomous" : "gated"` の派生投影）

## 3. `amadeus-orchestrate.ts` の行 drift 再解決（#3011 起因）

| 面 | base `cd64486a6` | observed `1d08374cd` | 備考 |
| --- | --- | --- | --- |
| `parkedDirective` 定義 | `:1100` | `:1100` | 不変 |
| REPAIR_STALLED park | `:3082` | **`:3108`** | |
| 既 park の再掲（Branch 2.5） | `:3253` | **`:3279`** | |
| Abort 後の Construction suspend | `:4050` | **`:4076`** | |
| `stageFailureDirective` の parked 返却 | `:5969` | **`:5995`** | |
| Abort ruling 後の park | `:6563` | **`:6591`** | |
| engine の `handlePark` 定義 | `:6566` | **`:6597`** | |
| `errorDirective("Cannot park the workflow…")` | `:6573` | **`:6604`** | |
| `handlePark` 成功時の parked 発行 | `:6587` | **`:6618`** | |
| 「generic manual park は autonomous 下で拒否される」コメント | `:6171-6182` 付近 | **`:6199`** | 逐語 `// forward transitions only and the generic manual park is refused under an` |

**A3 の件数訂正**: reviewer-2 は `parkedDirective` 発行点を 5 か所（`:3082 :3253 :4050 :5969 :6563`）と列挙したが、`git grep -n "parkedDirective" -- packages/framework/core/tools/amadeus-orchestrate.ts` は base・observed とも **7 hit**（定義 1 + 発行/返却 6）。verdict の 5 件は **park verb 自身の成功発行（`:6587` / observed `:6618`）を除いた集合**であり、その意味では正しい。全数は「定義 1 + park verb 自身 1 + 他経路 5」と記録する。

**#3011 が変えた `handlePark` の型契約（新規所見）**: base では `function handlePark(_args: string[], projectDir: string | undefined)`、observed では **`projectDir: string`（非 optional）** かつ非 export、直上コメント（`:6594-6596`）逐語 `// Not exported, so main() is its only caller and the project is always named`。`main()` が `case "park":` の直前で `resolveProjectDir(projectDir)` を済ませる形へ変わった。**`_args` は依然として未使用**であり、engine 層で provenance フラグを受けるには subArgs の parse と `spawnState(pd, ["park", …])` への転送を新設する必要がある（§7 候補 A の実装コスト）。

## 4. クロスレビュー R/A 系の observed 再実測

| ID | verdict の主張 | 本スキャンの再実測 | 判定 |
| --- | --- | --- | --- |
| R1 | 「Stop hook の同一ガード」コメントは不成立、`amadeus-stop.ts:947-949` は全モード allow | §P2 のとおり再現（hooks に `Construction Autonomy Mode` 0 hit / exit 1、`:947` で allow） | **維持** |
| R2 | engine 層（exit 0 + `kind:error`）の拒否を固定するテストは全域に不在 | `git grep -ln "Cannot park the workflow" -- tests plugins` → **0 行 / exit 1**。実装側は `amadeus-orchestrate.ts:6604` の 1 hit のみ | **維持** |
| R3 | 実装コメントの `#365`/`#367` は Issue ではなく PR | `amadeus-state.ts:1564`（`issue #367`）/ `:1570`（`AUTONOMY GUARD (issue #365, salvaged from the suspend branch)`）を確認。番号実体の履歴照合は本スキャンでは未再実行（verdict の主張を背景として引き継ぐ） | **未再検証（背景）** |
| R4 | 回避策の正式表記は `amadeus-bolt set-autonomy --mode none\|semi\|full` | `amadeus-bolt.ts` は base..observed 無変更のため verdict の行ピン有効。本スキャンでは再実測せず | **未再検証（背景）** |
| R5 | #2985 / PR #2999 との関連は時間的近接のみ | GitHub 側主張。本スキャンの結論に不使用 | **未再検証（背景）** |
| A1 | 判定入力が正本でなく派生投影 | §P4 で逐語再現。ただし **org.md の述語は verdict のものと違う**（上記訂正） | **維持（述語を訂正）** |
| A2 | 同一フィールドの逆極性利用 | `amadeus-state.ts:3676` 逐語末尾 `(autonomous Construction is exempt)` を確認。同フィールドが gate では**免除**、park では**全面禁止**に使われる | **維持** |
| A3 | `parkedDirective` 発行点 5 か所 | 全数は 7 hit（定義 1 + 発行 6）。verdict の 5 件は park verb 自身を除いた集合 | **維持（全数を明記）** |
| A4 | `isAutonomousMode` の open-coded サイト | `amadeus-lib.ts:5167` に定義、`:5160-5164` 逐語で「既存 open-coded サイトの寄せは tracked follow-up」。`git grep -n '=== "autonomous"' -- packages/ plugins/ ':!dist/'` → **6 hit**（うち実判定は `amadeus-lib.ts:565` / `:5168`、`amadeus-orchestrate.ts:2041`、`amadeus-state.ts:1583`、`amadeus-utility.ts:5798`。残り 1 は `amadeus-lib.ts:5162` のコメント）。**`amadeus-state.ts:1583` はまさにその open-coded サイト** | **維持** |
| A5 | #2912 / #2833 / #1241 と同根 | GitHub 側主張。本スキャンでは未検証 | **未再検証（背景）** |
| A-doc | reviewer-1「この拒否契約は docs に一切書かれていない」 | **訂正**。文字列 `Refusing to park` は `git grep -rn "Refusing to park" -- docs/` → 0 hit / exit 1 で確かに不在だが、**契約自体は 4 面に明文化されている**（下記） | **訂正** |

**A-doc の実測（新規所見・修正時の同期対象）**:

| ファイル:行 | 逐語（該当部） |
| --- | --- |
| `docs/reference/12-state-machine.md:139` | `**Park (issue #365/#367).** Outside an unattended \`full\` run, \`amadeus-orchestrate park\` writes a \`Parked\` / \`Parked At Stage\` runtime marker …` |
| `docs/reference/12-state-machine.ja.md:139` | `**Park (issue #365/#367).** 無人の\`full\`実行以外では、\`amadeus-orchestrate park\`がstageを進めずに…` |
| `docs/reference/06-hooks-and-tools.md:260` | `… the generic manual park command remains guarded against casually interrupting an unattended run.` |
| `docs/reference/06-hooks-and-tools.ja.md:258` | `…汎用manual park commandは無人実行を安易に中断しないようguardを維持する。` |

加えて `docs/reference/06-hooks-and-tools.md:262` / `.ja.md:260` は「注入される `reason` はクリーンな一時停止の代替として `amadeus-orchestrate park` を名指しする」と記す（§P3 の自己矛盾のドキュメント面）。**修正は最低 4 ファイル（英日 2 ドキュメント × 2 言語）の同期を伴う**。

## 5. PR #3037（§11b / §11c）と #3016 の関係

PR #3037 は base..observed で着地した唯一の規範変更であり、#3016 に 2 つの効果を持つ。

### C1. §11b「Error Directive Receipt」は park 拒否の受け方を正典化した（拘束が強まった側）

`packages/framework/core/amadeus-common/protocols/stage-protocol.md:1041` に新設。`:1047` 逐語:

```
Print `directive.message` verbatim and STOP. Do not recover, retry, or smooth it over, and do not invent a new question or a new gate — the message is the user-facing error.
```

同文は 8 ハーネス表層すべてに同期済み（`git grep -n "do not invent a new question" -- packages/framework/harness/ packages/framework/core/` → **9 hit / exit 0** = core 正本 1 + harness 8）。

→ **#3016 の拒否は `kind:error` として返る**（`amadeus-orchestrate.ts:6604`）。§11b 施行後、conductor は「autonomy を下げてから park し直す」といった回復を**行ってはならず**、逐語出力して停止する。つまり **PR #3037 は #3016 の UX 劣化を悪化させる方向に固定した**（回避策の自動適用も禁止された）。これは修正の緊急度に効く事実であり、実装時の背景として記録する。

### C2. §11c「Approval boundary for remote writes」は park には直接適用されない（範囲の切り分け）

`stage-protocol.md:1057` 新設、正本は `docs/reference/24-intent-autonomy.md:122`。対象は逐語で `a push, opening a PR, replying to or resolving a review thread, and filing an Issue`。**park はローカル state への書込であり remote write ではない**ため §11c の直接適用外。

ただし構造は流用可能: §11c は「semi/full では人間へ直接問わず `decide-question` の梯子へ流し、`human-required` のときだけ人間へ」という形を取る。#3016 は逆向き（人間が既に指示している）なので梯子ではなく **provenance 検証**が対応物になる。混同しないよう明示する。

なお `docs/reference/24-intent-autonomy.md:137` 逐語 `classifications a grant can never authorize still apply` — grant が拡張できない 5 分類の制約は park の設計にも及ぶ（park 受理を grant 根拠にしてはならない）。

## 6. 「fresh な HUMAN_TURN」を判定する既成部品（observed 実読・優先順位付き）

#3016 の完了条件 2・3 に必要な部品は既存で揃う。**ただし fail-open/fail-closed の性質が部品ごとに異なる**ため、選択を誤ると完了条件 1（unattended は依然拒否）が構造的に破れる。

| 部品 | 位置 | 空 ledger 時 | consume-once | #3016 適合 |
| --- | --- | --- | --- | --- |
| `humanActedSinceGate(pd)` | `amadeus-lib.ts:3858` | **fail OPEN**（`return intent === undefined`、`:3864` 逐語コメント `fail open (active/legacy) / fail closed (named record)`） | 暗黙（resolution が境界） | **不適**。park は active record 専用（§P1）なので必ず fail-open 側に落ち、ledger 無しの無人 run が park 可能になる |
| `outstandingHumanTurns(...)` | `amadeus-lib.ts:3904` | **fail CLOSED**（`:3901` 逐語 `No ledger at all yields [] rather than humanActedSinceGate's fail-OPEN \`true\``） | 未消費のみ列挙 | **適** |
| `selectLifecycleHumanTurn(...)` | `amadeus-lib.ts:2954` | fail closed（`:2974` `throw new Error("archive/unarchive requires an unconsumed HUMAN_TURN")`） | **有**（`INTENT_ARCHIVED` / `INTENT_UNARCHIVED` の `Human Turn Timestamp` を `collectLifecycleConsumption` `:2907-2915` が消費印として読む） | **最適形**。ただし消費イベント集合が archive/unarchive 固定なので `WORKFLOW_PARKED` を加える一般化が要る |
| `humanTurnGroundsTakeover(pd)` | `amadeus-state.ts:5067` | **fail CLOSED**（`catch { return false }`） | 位置比較（`humanTurnAt > lastTakeoverAt`） | **適**。同一ファイル内の最小先例。append-only shard の**位置**で判定し timestamp に依存しない |
| `latestHumanTurnAfter(...)` | `amadeus-goal.ts:100` | `null`（fail closed） | 呼出側が `Human Turn Timestamp` を audit に刻む | **適**。基準時刻 `T` を要求する形 |
| `freshHumanRetryTurn(...)` | `amadeus-intent-autonomy-production.ts:1167` | — | REPAIR_STALLED 以後のみ fresh | 参考（「基準時刻より後」の先例） |
| `latestHumanTurnId(...)` | `amadeus-intent-autonomy-production.ts:320` | `humanActedSinceGate` に依存 → **fail open を継承** | — | 単独使用は不適 |

**偽造耐性**（`amadeus-lib.ts:3930-3932` 逐語要旨）: `HUMAN_TURN` 行は UserPromptSubmit フックのみが書き、audit CLI は `HUMAN_TURN` の mint を拒否する。ゆえに provenance の土台としては健全。ただし `packages/framework/core/hooks/amadeus-mint-presence.ts:28-30` は **mint 自体が FAIL-OPEN**（stdin 読取失敗時も mint する）と明記しており、「HUMAN_TURN の存在 ⇒ 人間が居た」は完全ではない点は設計裁定の前提として記録する。

**テスト off-switch の穴**: `humanPresenceGuardDisabled()`（`amadeus-lib.ts:5342-5343`、`AMADEUS_SKIP_HUMAN_PRESENCE_GUARD === "1"`）は現在 `amadeus-state.ts:3663 / :4517 / :4606`、`amadeus-log.ts:280`、kiro/kiro-ide adapter で使われる。park に presence 判定を入れるなら、この off-switch を park にも通すか否かが**明示的な設計判断**になる（通すとテストからは常時 park 可能、通さないと park のテストが全て HUMAN_TURN の seed を要する）。

## 7. 修正候補と裁定申し送り

| 候補 | 内容 | 実装面の実測コスト | 留意 |
| --- | --- | --- | --- |
| **A** | `handlePark` に provenance 引数（`--human-turn <shard>:<timestamp>` 等）を追加し、参照先の実在・未消費を state tool 側で再検証 | engine 側の `handlePark`（`amadeus-orchestrate.ts:6597`）は `_args` 未使用・非 export のため、subArgs parse と `spawnState(pd, ["park", …])` 転送の新設が要る。CLI 契約追加なので `docs/reference/06` `12`（英日 4 面）と 8 ハーネス表層の同期要否を確認 | 明示的・fail-closed。verdict C15 が「単なる `--human` フラグでは条件3を満たさない」と指摘した点は、参照先検証で閉じる |
| **B** | 引数を増やさず `outstandingHumanTurns` / `humanTurnGroundsTakeover` 型の暗黙判定へ置換 | 変更は `amadeus-state.ts:1583-1587` に閉じる。engine 層の変更ゼロ | 呼出面不変で最小。ただし「hook 起因の park」を turn の鮮度だけで弁別できることの実証が要る。`humanActedSinceGate` を使うと fail-open で条件1が破れる（§6） |
| **C** | 判定入力を `Construction Autonomy Mode` から Intent 監査（正本）へ付け替えたうえで A または B を重ねる | `amadeus-orchestrate.ts:2041` の投影解決経路と `AUTONOMY_PROJECTION_SKEW` 検出（A1 が引く面）に接続 | A1 の規範不整合も閉じる。影響面は最大。`isAutonomousMode`（A4）への寄せもここで同時に行える |

**いずれの候補でも必要な裁定事項（ユーザー / 選挙へ）**:

1. **基準時刻 `T` の定義** — 「fresh」の起点。候補: 直近の `WORKFLOW_PARKED` / 直近のゲート解決（`GATE_APPROVED` 等）/ grant 発行時刻 / 直近 `AUTO_DECIDED`。`latestHumanTurnAfter` 型を採るなら必須。
2. **grant の保持 / 失効** — reviewer-2 の未解決事項。`amadeus-stop.ts:943-946` のコメントは「parked は grant を revoke しない」と述べ、`docs/reference/12-state-machine.md:139` も「active な `full` grant は revoke/complete まで独立して active」と記す。**現行実装の意味論は「保持」**であり、これに揃えるのが整合的だが、明示裁定を要する。
3. **`AMADEUS_SKIP_HUMAN_PRESENCE_GUARD` を park にも適用するか**（§6）。
4. **directive 由来の park（`:3108` `:4076` `:5995` `:6591`）が `Parked` マーカーを残さない非対称を揃えるか**（A3 が提起）。揃えないなら「揃えない」ことを明記する。

## 8. 実装時の台帳・レジストリ resync 申し送り（全数）

`amadeus-state.ts` または `amadeus-orchestrate.ts` を変更した瞬間に**機械的に赤くなる**面。

### 8-1. TLA model-map の実装ハッシュピン（`cid:build-and-test:bt-ledger-resync`）

`amadeus/spaces/default/specs/tla/model-map.json` は 2 モデル × 2 ファイルの計 **4 エントリ**で両ファイルを pin する:

| 行 | implPath | pinned sha256 | 現行実測 |
| --- | --- | --- | --- |
| `:16-17` / `:178-179` | `packages/framework/core/tools/amadeus-orchestrate.ts` | `f751635b6b47785a10a062649aee2cce0e0e522289dafa16f629b69951c7bee5` | `shasum -a 256` = **一致** |
| `:20-21` / `:182-183` | `packages/framework/core/tools/amadeus-state.ts` | `cb3c7e63181a1def5d62ab121d92d75a2f3e9f9e21fc877f869011074f8d2b6c` | `shasum -a 256` = **一致** |

モデルは `BoltPrAttestationGate`（`:5`）と `PrConvergenceGate`（`:169` 付近）。**park verb / autonomy guard を模型化した .tla は存在しない**（`grep -rn "park\|Park" amadeus/spaces/default/specs/tla/*.tla` → 4 hit、すべて `MirrorLifecycleCore.tla` の mirror 文脈。exit 0）。したがって分類は `impl-only` になる見込みだが、**分類自体は `tla-authoring` ステージの責務**であり（`plugins/formal-model-check/stages/tla-authoring.md:51-52` 逐語 `never infer \`impl-only\` merely because a model already exists`）、ここで先取りしない。

resync 経路（`docs/reference/21-formal-model-following.md:79` 逐語）:

```
bun .claude/tools/amadeus-sensor-model-completeness.ts updateModelMap --impl-only
```

**手編集は禁止**（同 doc `:82` が「hand edit ではなく記録の残る経路」と明記）。

### 8-2. OTel event registry と audit-format（`WORKFLOW_PARKED` に項目を足す場合）

`Human Turn Timestamp` を `WORKFLOW_PARKED` に刻む設計（§6 の consume-once 先例に倣う形）を採ると、以下が**同一変更で必須**:

| 面 | 位置 | 現行 |
| --- | --- | --- |
| OTel registry | `packages/framework/core/otel/event-registry.ts:118-125` | `requiredAttributes: ["Stage"]` / `optionalAttributes: ["Timestamp"]` |
| audit-format 正本 | `packages/framework/core/knowledge/amadeus-shared/audit-format.md:40` | `| ✓ \`WORKFLOW_PARKED\` | … | Stage | Timestamp | tools/amadeus-state.ts park |` |
| docs（英日） | `docs/reference/12-state-machine.md:224` / `.ja.md:224` | イベント表 |

**強制力の実測**: `tests/integration/t385-emitter-registry-admission.test.ts:87` は許容キー集合を `requiredAttributes ∪ optionalAttributes` で構成し、`packages/framework/core/otel/redaction.ts:66-72` は同じ union から safeKeys を導出する（`:64-65` 逐語 `Derived, never hand-listed, so a registry entry cannot add a key the policy then silently eats`）。**未宣言のキーは redaction で無音に落ち、admission テストが赤くなる。** 先例の `INTENT_ARCHIVED` / `INTENT_UNARCHIVED` は `event-registry.ts:178` / `:187` で `Human Turn Timestamp` を required に宣言済み。

### 8-3. coverage patch allowlist（意味的セレクタ）

`tests/.coverage-patch-allowlist.json` は全 **430 エントリ**（`grep -c '"file":'` 転記）、うち `amadeus-state.ts` が **45 件**、`"function": "handlePark"`（すべて `amadeus-orchestrate.ts` 側）が **4 件**（`:922` `:933` `:944` `:955`）。base..observed で **2 件の fingerprint が更新済み**（`:933`、`:944` — #3011 の署名変更由来）。

→ **`amadeus-orchestrate.ts` の `handlePark` に行を足す修正は、この 4 件のセレクタ（`fingerprint` / `anchorLines` / `targetLines`）の再解決を伴う。** `amadeus-state.ts` の `handlePark` に対する免除エントリは**存在しない**（`grep -n "handlePark" tests/.coverage-patch-allowlist.json` の 4 hit はすべて orchestrate）ので、候補 B（state 側のみ変更）は allowlist を触らずに済む可能性がある。

### 8-4. coverage registry

`tests/.coverage-registry.json:897-905`: `unitClass: "audit"` / `unitId: "WORKFLOW_PARKED"` / `coveredBy: [{file: "tests/unit/t17.test.ts", mechanism: "cli"}]` / `status: "covered"`。park のテスト面を移す場合はここも同期する。

## 9. テスト面の全数（修正時に同時更新が要る面）

述語 `git grep -lni "park" -- 'tests/**/*.ts'` → **69 ファイル**（`wc -l` 転記）。うち #3016 の契約を直接固定するのは以下:

| # | ファイル:行 | 固定している契約 | 修正時の扱い |
| --- | --- | --- | --- |
| 1 | `tests/unit/t17.test.ts:1222-1235` | `test("park REFUSES under Construction Autonomy Mode=autonomous")` — `rc !== 0`、stderr に `autonomous`、`- **Parked**:` 未書込 | **書き換え必須**。削除ではなく「unattended/hook 起因は依然拒否」へ**分割**するのが完了条件 1 に整合 |
| 2 | `tests/e2e/t122-stop-hook-e2e.test.ts:504-546` | 実 CLI での park 拒否（`:521-529` の `expect(park.status).not.toBe(0)` / `expect(stderr.toLowerCase()).toContain("autonomous")`）+ 手注入 parked マーカーを実 hook が allow（`:534-545`） | **書き換え必須**。なお `:496` / `:519` のコメントが引く `amadeus-state.ts:420-424` は observed では `:1579-1587`（**コメント側の行ピン drift、同時是正対象**） |
| 3 | （engine 層） | **不在**（R2 実測: `git grep -ln "Cannot park the workflow" -- tests plugins` → 0 行 / exit 1） | **新設必須**（完了条件 5） |
| 4 | `tests/unit/t17.test.ts:1194-1213` | 正常 park / unpark / unpark 冪等 | 回帰確認面 |
| 5 | `tests/unit/t213-orchestrate-parked-new-intent.test.ts` / `tests/unit/t114-orchestrate-next.test.ts` / `tests/integration/t462-session-takeover.integration.test.ts` / `tests/integration/t365-kimi-reviewer-boundary.integration.test.ts` | park → resume / 新 intent 経路 | 非回帰面 |
| 6 | `tests/integration/t187-park-conversational.sdk.test.ts:111-125` | 会話ターン由来の park シグナル（Bash park 呼出 / parked directive / `WORKFLOW_PARKED` 監査行のいずれか） | **#3016 と最も近い意味論**。人間ターン由来の park を扱う既存 SDK テストなので、修正後の受理経路の検証にも使える |

**完了条件 4（park 後の `--resume` 再開）** は `amadeus-orchestrate.ts:3279` 付近の Branch 2.5/2.6 が既に持つ（A3 が「resume 側は既に対称的に開いている」と指摘したとおり）。追加実装ではなく**テストによる固定**が残作業。

## 10. 述語一覧（再実行可能。すべて worktree ルート、非 `amadeus/` ツリー = observed `1d08374cd`）

| ID | 述語 | 結果 |
| --- | --- | --- |
| Q0 | `git merge-base --is-ancestor 1d08374cd HEAD` | exit 0 |
| Q1 | `git diff --stat 1d08374cd HEAD -- ':!amadeus/'` | 空出力 / exit 0（非 amadeus は observed と等価） |
| Q2 | `git diff --stat cd64486a6 1d08374cd -- ':!amadeus/'` | `24 files changed, 1044 insertions(+), 35 deletions(-)` |
| Q3 | `git grep -n "Refusing to park" -- ':!dist/' ':!amadeus/'` | **1 hit**（`amadeus-state.ts:1585`）/ exit 0 |
| Q4 | `grep -rl "Refusing to park" dist/` | 8 投影 / exit 0 |
| Q5 | `git grep -n "Construction Autonomy Mode" -- packages/framework/core/hooks/` | **0 hit / exit 1**（エラーなし不一致） |
| Q6 | `git grep -ln "Cannot park the workflow" -- tests plugins` | **0 行 / exit 1** |
| Q7 | `git grep -rn "Refusing to park" -- docs/` | **0 hit / exit 1** |
| Q8 | `git grep -n "parkedDirective" -- packages/framework/core/tools/amadeus-orchestrate.ts` | **7 hit**（base も 7）/ exit 0 |
| Q9 | `git grep -n '=== "autonomous"' -- packages/ plugins/ ':!dist/'` | **6 hit** / exit 0 |
| Q10 | `git grep -n "do not invent a new question" -- packages/framework/harness/ packages/framework/core/` | **9 hit**（core 1 + harness 8）/ exit 0 |
| Q11 | `git grep -lni "park" -- 'tests/**/*.ts' \| wc -l` | **69** |
| Q12 | `grep -c '"file":' tests/.coverage-patch-allowlist.json` | **430** |
| Q13 | `grep -c '"function": "handlePark"' tests/.coverage-patch-allowlist.json` | **4** |
| Q14 | `shasum -a 256 packages/framework/core/tools/amadeus-{state,orchestrate}.ts` vs `model-map.json` の pin | 4 エントリすべて**一致** |
| Q15 | `grep -rn "park\|Park" amadeus/spaces/default/specs/tla/*.tla` | **4 hit**、すべて `MirrorLifecycleCore.tla` の mirror 文脈 / exit 0 |
| Q16 | `git grep -c "" -- <焦点 5 ファイル>` | state `6360` / orchestrate `7055` / stop `1048` / lib `9042` / autonomy-production `1334` 行 |

**grep exit code の注意**（`cid:reverse-engineering:c6-absence-predicate-exit-code`）: Q5 / Q6 / Q7 の空出力はすべて **exit 1**（不一致）であって exit 2（エラー）ではないことを確認済み。選言述語は使わず固定文字列で分割実行した。

## 11. Verification

- 選定 base = `cd64486a68c6a1144db50fbe3fde8273f5e18455`（observed の祖先で距離 **6**、Q0 系の実測による）
- git 状態変更（commit / branch / checkout / stash / merge）: **ゼロ**
- GitHub への書込: **ゼロ**（`gh issue view` / `gh api ... comments` の**読取のみ**）
- engine / state ツール（`amadeus-orchestrate.ts` / `amadeus-state.ts` / `amadeus-log.ts` / `amadeus-bolt.ts`）の実行: **ゼロ**
- `bun run build` の実行: **ゼロ**
- 書き込み先: `amadeus/spaces/default/codekb/amadeus/` 配下のみ（record dir への書込なし）
- 並行 intent の面（`intents/260814-failopen-error-paths/`、`re-scans/260814-failopen-error-paths.md`、codekb の failopen 節、`reverse-engineering-timestamp.md` の `260814-failopen-error-paths` 節）への編集: **ゼロ**
- scratch ファイルは repo 外（`/private/tmp/claude-501/.../scratchpad`）で実行
