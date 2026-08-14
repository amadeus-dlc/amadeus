# RE スキャン記録: 260814-autonomy-stop-fixes

**観測 ref**: observed = `cd64486a68c6a1144db50fbe3fde8273f5e18455`（`git rev-parse HEAD` = `git rev-parse origin/main`）。差分 base = `d7ffaa5442266508d8e67babc3e0b947fb4c1637`。

| 項目 | 値 |
| --- | --- |
| Date | `2026-08-14` |
| Intent | `260814-autonomy-stop-fixes`（scope `self-fix`、Brownfield、単一 repo `amadeus`、depth `Minimal`、build `bun`） |
| Base commit | `d7ffaa5442266508d8e67babc3e0b947fb4c1637` |
| Observed commit | `cd64486a68c6a1144db50fbe3fde8273f5e18455` |
| Scan mode | **通常の差分リフレッシュ**（xrev differential scan 不採用） |
| Focus | [Issue #3016](https://github.com/amadeus-dlc/amadeus/issues/3016)（full/autonomous 下で明示 park が一律拒否）/ [Issue #2974](https://github.com/amadeus-dlc/amadeus/issues/2974)（full grant 下で `error` directive 受領時に新規質問を発明して停止） |

## 0. Base 選定の実測根拠

`reverse-engineering-timestamp.md` と `re-scans/*.md` に現れる 40-hex トークンを全数抽出し、HEAD の祖先であるものだけを距離昇順に並べた。

述語（worktree ルート、再実行可能）:

```sh
grep -rhoE '\b[0-9a-f]{40}\b' \
  amadeus/spaces/default/codekb/amadeus/re-scans/*.md \
  amadeus/spaces/default/codekb/amadeus/reverse-engineering-timestamp.md \
  | sort -u > /tmp/shas.txt        # 159 件（`wc -l` 転記）
HEAD=$(git rev-parse HEAD)
while read s; do
  git cat-file -e "$s^{commit}" 2>/dev/null || continue
  git merge-base --is-ancestor "$s" "$HEAD" || continue
  echo "$(git rev-list --count "$s..$HEAD") $s"
done < /tmp/shas.txt | sort -n | head
```

出力（上位、逐語）:

| 距離 | commit | 出所 |
| --- | --- | --- |
| **4** | `d7ffaa5442266508d8e67babc3e0b947fb4c1637` | `re-scans/260814-coverage-quick-norm.md:3` の Observed |
| 5 | `5b12d96e99cbf46711acd3dc2b8c103be1b0f801` | `re-scans/260814-t99-copytree-race.md:10` の Observed |
| 14 | `5f6b5bf97068f59dee53dcd4a2f6564967c3d164` | 旧 Observed |
| 15 | `52f1f1b2575ea35bd23b761697b2d17a5e9a7ac3` | 旧 Observed（#2974 のクロスレビュー凍結 SHA） |

→ **base = `d7ffaa544`**（距離最小の祖先、`cid:reverse-engineering:rescan-base-ancestry`）。本 intent は初回スキャンのため、他 record の最新 observed を base とする（ステージ本文 Step 3 の規定）。

`base..observed` の非 `amadeus/` 変更は 4 ファイルのみ（`git diff --stat d7ffaa544 HEAD -- ':!amadeus/'`、exit 0）:

```
 metrics/2026-08-14T06-13-16-802Z-d7ffaa544226.json |  90 ++++++
 metrics/2026-08-14T06-56-41-145Z-f60b3f4c868f.json |  90 ++++++
 tests/harness/fixtures.ts                          |  63 +++++
 .../t-fixtures-copy-tree-retry.integration.test.ts | 120 ++++++++
 4 files changed, 363 insertions(+)
```

**焦点領域は base..observed で全面無変更**（`git diff --name-only d7ffaa544 HEAD` の出力に `amadeus-state.ts` / `amadeus-orchestrate.ts` / `amadeus-stop.ts` / `amadeus-bolt.ts` / `amadeus-intent-autonomy-production.ts` / `packages/framework/harness/` / `plugins/pr-convergence/` / `docs/reference/24-intent-autonomy*.md` / `tests/unit/t17.test.ts` / `tests/e2e/t122-stop-hook-e2e.test.ts` はいずれも現れない）。全 file:line は observed 断面の実読で採取した。

## 1. Scan mode の選択根拠（xrev 不採用）

- #3016 は**クロスレビュー未了**であり、xrev の前提（2 名 CONFIRMED + 収束 verdict）が成立しない。
- #2974 は 2 名 CONFIRMED_WITH_REFINEMENTS だが収束が **REFRAME_REQUIRED** であり、かつ凍結 SHA `52f1f1b2` は observed から距離 **15**。verdict の主張は本記録では**背景としてのみ**扱い、患部・機構・文言はすべて observed で取り直した（実際、verdict が引く `pr-convergence.md:78-79, 354-357` は observed では `:80` / `:363` `:381` へ移動しており、行ピンは現行断面に写らない）。

## 2. Issue #3016 — park の一律拒否

### P1. 拒否の実装点（唯一）

`packages/framework/core/tools/amadeus-state.ts:1579` `function handlePark`。ガードは `:1583-1587`:

```ts
if (getField(content, "Construction Autonomy Mode")?.trim() === "autonomous") {
  error(
    "Refusing to park: Construction Autonomy Mode is autonomous. An unattended " +
      "autonomous run has no human to resume it and must keep moving - do not park it.",
  );
}
```

判定入力は `Construction Autonomy Mode` **のみ**。人間 turn の有無、park 要求の起点（人間 / hook / スクリプト）は一切参照しない。ここが #3016 の患部。

述語: `git grep -n "Refusing to park" -- ':!dist/'` → 実装 1 hit（`amadeus-state.ts:1585`）。他は codekb 記録・過去の audit shard・dist 投影。

### P2. `Construction Autonomy Mode` は認可の正本ではない（規範側の証拠）

- `packages/framework/core/amadeus-common/protocols/stage-protocol.md:126` 逐語: `The canonical authorization is the Intent audit. `Construction Autonomy Mode` is only an internal scheduling projection; legacy values never authorize a gate.`
- `packages/framework/core/memory/org.md:44` も同旨。
- 書込点は `packages/framework/core/tools/amadeus-intent-autonomy-production.ts:713`（`mode === "full" ? "autonomous" : "gated"` の派生投影）。

→ **park ガードは、認可の正本ではないと明文化されたフィールド単独で、人間の明示要求を拒否している。**これは規範上の不整合であり、#3016 の期待（fresh HUMAN_TURN 由来の park は受理）と同じ方向を指す。

### P3. 「Stop hook の同一ガード」というコメントは observed では成立しない

`amadeus-state.ts:1565-1578` のコメントは逐語で `This is defence-in-depth beside the Stop hook's identical guard` と述べるが、observed の `packages/framework/core/hooks/amadeus-stop.ts` に park を拒否するガードは**存在しない**:

- 述語 `git grep -n "Construction Autonomy Mode" -- packages/framework/core/hooks/` → **0 hit**（exit 1、エラーではない）。
- `amadeus-stop.ts:947-949` は逆に `parked` を**全モードで終端 allow** する:
  ```ts
  if (kind === "parked") { allowStop(); }
  ```
  直上コメント `:943-946` 逐語: `A parked directive is terminal for the current turn in every mode.` / `The Intent grant remains a separate projection and is not revoked by this allow.`
- hook 側の autonomy ガードは park ではなく、tier-3 会話カーブアウト（`:518-540`、`AUTONOMY GUARD: never fires under Intent autonomy \`full\``）と tier-2 系カーブアウト（`:976-981`, `:994-999`）に掛かっている。

→ **二層防御は実在せず、拒否は state tool の 1 点のみ。**修正の影響面はこの 1 点に閉じる（ただしテストは後述の 3 面）。

### P4. park の周辺経路（無効化してはならない面の棚卸し）

| 経路 | 位置 | 性質 |
| --- | --- | --- |
| `parkedDirective` 生成 | `amadeus-orchestrate.ts:1100-1102` | 終端 directive のコンストラクタ |
| Branch 2.5 parked 再送 | `amadeus-orchestrate.ts:3223-3257` | `Parked At Stage === Current Stage` のときだけ再送（stale-by-progress ガード） |
| Branch 2.6 resume 時 unpark | `amadeus-orchestrate.ts:3261-3277` | `--resume` で park マーカーを明示クリア |
| Abort 後の park | `amadeus-orchestrate.ts:4050-4052` | ガードを通らず directive を直接 emit |
| REPAIR_STALLED park | `amadeus-orchestrate.ts:5944-5969` | 同上。**full grant を保持したまま park する第一級経路** |
| engine の `park` handler | `amadeus-orchestrate.ts:6499-6506`（コメント）/ `:6566-6582`（本体） | `spawnState(pd, ["park"])` へ委譲し、非 0 exit を `errorDirective` として逐語中継（`:6573`） |

**重要**: `4050` と `5944-5969` の park は `handlePark` を通らない（directive を直接 emit する）ため、**autonomous 下でも park は現に成立している**。つまり「autonomous な run は park できない」という不変量は observed では既に成立しておらず、`handlePark` の拒否は経路依存の非対称にすぎない。t122 の該当テストもこの非対称を「authorised abnormal-stop projection」として明示的に固定している（後述 P5）。

### P5. 契約を固定しているテスト面（3 面。修正時に同時更新が要る）

述語 `git grep -ln '"park"' -- 'tests/*.ts'` → **10 ファイル**。うち一律拒否を固定するのは 2 面:

1. `tests/unit/t17.test.ts:1222-1235` — `test("park REFUSES under Construction Autonomy Mode=autonomous")`。`Construction Autonomy Mode: autonomous` を注入 → `rc !== 0`、stderr に `autonomous`、`- **Parked**:` 未書込を固定。
2. `tests/e2e/t122-stop-hook-e2e.test.ts:504-548` — 実 CLI での park 拒否（`:521-528`、`expect(park.status).not.toBe(0)`）と、手で注入した parked マーカーを実 hook が allow すること（`:534-545`）を 1 テストで固定。**コメント `:521` の引用 `amadeus-state.ts:420-424` は observed では `:1579-1587` へ移動しており、コメント側に行ピンの drift がある。**
3. （非拒否面だが同時に見るべき）`tests/unit/t213-orchestrate-parked-new-intent.test.ts:40` / `tests/unit/t114-orchestrate-next.test.ts:364` / `tests/integration/t462-session-takeover.integration.test.ts:430,440` / `tests/integration/t365-kimi-reviewer-boundary.integration.test.ts:625,692` が park→resume/新 intent 経路を固定。

免除台帳にも `handlePark` の spawn-only 免除が 4 エントリ（`tests/.coverage-patch-allowlist.json:922,933,944,955`）。関数本体に行を足す修正では、これらのセレクタ（`function` + `anchorLines` 等）の再解決が要る。

### P6. 「fresh な HUMAN_TURN」を判定できる既存機構

新規実装は不要。`packages/framework/core/tools/amadeus-intent-autonomy-production.ts` に 3 つの既成部品がある:

| 機構 | 位置 | 意味 |
| --- | --- | --- |
| `latestHumanTurnId` | `:320-344` | `humanActedSinceGate` が偽なら **null**（＝ゲート以後に人間が動いていない）。真なら全 shard の `HUMAN_TURN` から最新を digest 化 |
| `AutonomyProvenanceScope` | `:346-362` | `intent` / `launch-chain` の判別ユニオン。`launch-chain` は**参照する turn の識別子を型に含む**（「名指しのない launch-chain」を表現不能にする） |
| `launchChainHumanTurnId` | `:452-478` | 4 条件（実在 / 未消費 / record 誕生時刻以前 / fingerprint 一致）で他 record の turn を解決 |
| `resolveDeclarationProvenance` | `:486-500` | `launch-chain` かつ `full` は `PROVENANCE_SCOPE_FORBIDDEN`、turn 不在は `PROVENANCE_REQUIRED` |
| `freshHumanRetryTurn` | `:1163-1185` | **REPAIR_STALLED 以後の HUMAN_TURN だけを fresh と認める**先例。#3016 の「古い turn は拒否」に最も近い形 |

→ #3016 の「fresh な HUMAN_TURN に結び付いた明示 park は受理、使い回し・古い turn は拒否」は、`freshHumanRetryTurn` と同型の「基準時刻より後の HUMAN_TURN」判定として実装可能。基準時刻の候補（park 要求の直前ゲート / grant 発行時刻 / 直近 AUTO_DECIDED）は**設計裁定事項**。

### P7. #3016 の修正候補（裁定申し送り）

| 候補 | 内容 | 留意 |
| --- | --- | --- |
| A | `handlePark` に provenance 引数（`--human-turn <id>` 等）を追加し、fresh HUMAN_TURN が解決できたときだけ受理 | 明示的・fail-closed。CLI 契約の追加になるため `docs/reference` と全ハーネス表層の同期要否を確認 |
| B | ガードを `latestHumanTurnId` 系の暗黙判定に置換（引数追加なし） | 呼出面は不変だが「hook 起因の park」を turn の鮮度だけで弁別できるかの実証が必要 |
| C | ガードを `Construction Autonomy Mode` から Intent 監査（正本）へ付け替えたうえで A/B を重ねる | P2 の規範不整合も同時に閉じる。影響面は最大 |

いずれも `t17.test.ts:1222` の一律拒否テストの**書き換え**を伴う（削除ではなく「unattended/hook 起因は依然拒否」へ分割するのが期待挙動に整合）。`t122:504-548` も同様。**park 後の `--resume` 再開**は Branch 2.6（`:3261-3277`）が既に持つため、grant の保持・失効方針だけがテストで未固定。

## 3. Issue #2974 — `error` directive 受領時に新規質問を発明した

### E1. 停止自体は契約準拠（reframe (a) の observed 確認）

forwarding loop の停止集合に `error` が含まれることを全ハーネス表層で実測。述語 `git grep -n "| \`error\` |" -- packages/framework/harness/` → **7 hit**:

| harness | ファイル:行 | 文言 |
| --- | --- | --- |
| claude | `packages/framework/harness/claude/skills/amadeus/SKILL.md:59` | `Print \`directive.message\` verbatim and STOP. Do not recover, retry, or smooth it over — the message is the user-facing error.` |
| codex | `packages/framework/harness/codex/skills/amadeus/SKILL.md:57` | 同上（逐語一致） |
| kimi | `packages/framework/harness/kimi/skills/amadeus/SKILL.md:59` | 同上 |
| kiro | `packages/framework/harness/kiro/skills/amadeus/SKILL.md:55` | 同上 |
| kiro-ide | `packages/framework/harness/kiro-ide/skills/amadeus/SKILL.md:55` | 同上 |
| cursor | `packages/framework/harness/cursor/commands/amadeus.md:67` | **`Print \`directive.message\` verbatim and STOP. Do not recover or smooth it over.`（短縮形 — `retry` と「message は user-facing error」が欠落）** |
| opencode | `packages/framework/harness/opencode/commands/amadeus.md:67` | cursor と同一の短縮形 |

pi はテーブルを持たず散文で表現（`packages/framework/harness/pi/skills/amadeus/SKILL.md:68-71`、逐語 `Stop for \`ask\`, \`select-intent\`, \`error\`, \`parked\`, \`await-completion\`, and \`done\`.` — **「message を逐語出力せよ」に相当する指示がない**）。

**drift 所見**: この条項は **core に正本を持たない**（述語 `git grep -rn "Print \`directive.message\` verbatim" -- packages/framework/core/` → **0 hit**）。8 ハーネス表層に手書きで散在する開放集合であり、5 種一致 / 2 種短縮 / 1 種欠落の 3 系統に分岐している。**#2974 の欠陥（message を出さずに新規質問を発明）を文言で閉じる修正は、この 8 面すべてを同一変更で同期する必要がある**（`project.md` ALWAYS: framework source / 全ハーネス配布 / self-install 面 / tests / 対訳ドキュメント）。

### E2. 患部の `error` を出す engine 側の面

成果物欠落による report 拒否は `packages/framework/core/tools/amadeus-orchestrate.ts:4270-4293` の degrade-unit 経路。3 分岐すべて `errorDirective(...)` を返す:

- 候補 0 件（`:4279-4281`）
- 全 unit が成果物充足済み（`:4283-4288`）
- 一部 unit が required artifacts を欠く（`:4291-4293`、逐語 `${uncovered.length} of them are still missing this stage's required artifacts`）

`errorDirective` は `amadeus-orchestrate.ts` 内で **98 箇所**から呼ばれる（`git grep -c "errorDirective"` 転記）。`error` は engine の汎用 fail-closed 表現であり、conductor 側の扱いは「逐語出力して停止」の一択。

### E3. 破られた条項（reframe (c) の observed 確認）

`amadeus/spaces/default/memory/project.md`（`cid:scope-definition:c1-semi-ladder-routing`）逐語:

> semi/full の Intent autonomy が有効な間、§13 学習選定やステージ内の判断質問は人間へ直接提示せず `amadeus-bolt decide-question` の梯子で裁定し、fail-closed の結果のみ人間へ回す。

梯子の実装点: `packages/framework/core/tools/amadeus-bolt.ts:1019-1035` `handleDecideQuestion`（`--input` の JSON carrier → `commitProductionQuestionDecision`）。dispatch は `:1331`、subcommand 一覧は `:1317`。

手順の正本: `stage-protocol.md:135`（full）/ `:137`（semi）。`:137` 逐語: `Under \`semi\`, therefore, do **not** put a stage question to the human directly: \`decide-question\` is the route, and a \`human-required\` result is what sends the question to a person.`

五段梯子の定義: `docs/reference/24-intent-autonomy.md:92-113`（confirmed-policy / norm / history / solo-election / agent-recommendation）。

### E4. 「grant が勝つ」一律解が不可な理由（reframe (d) の observed 確認）

`docs/reference/24-intent-autonomy.md:79-84` 逐語:

> Effects are classified, and five classifications can never be authorized by a grant: `new-permission`, `irreversible`, `scope-out`, `norm-waiver`, and `quality-waiver`. ... Autonomy therefore cannot widen its own permissions, waive quality, or take an irreversible action, regardless of mode.

対訳: `docs/reference/24-intent-autonomy.ja.md:76`。→ remote write を一律 grant 認可にする解は、この分類と正面衝突する。

### E5. 未文書なのは「approval boundary の定義」（reframe (b) の observed 確認）

`plugins/pr-convergence/stages/pr-convergence.md` は remote write の人間承認をステージ契約として明文化している:

- `:78-80` 逐語: `Commit and push under the workspace's approval boundary for remote writes.`
- `:378-382` 逐語: `**Ask before writing to the remote.** Pushing, replying, resolving, and filing Issues are all writes to a shared surface. Follow this workspace's approval boundary for them, and never merge: merging is a separate human decision and no convergence verdict authorises it.`
- `:363` 逐語: `Push-first changes the *ordering* of validation, never the approval boundary:`

**しかし「approval boundary」を定義した箇所は存在しない。**述語 `git grep -rn "approval boundary\|approval-boundary\|承認境界" -- docs/ plugins/ packages/ amadeus/spaces/default/memory/ | grep -vi "existing approval boundary"` → **5 hit**（exit 0）: 上記 3 件 + `packages/framework/core/amadeus-common/protocols/grilling-protocol.md:158`（別文脈の「approval boundary record」）+ `amadeus/spaces/default/memory/project.md:118`（日本語「人間承認境界」、gh CLI 文脈）。いずれも定義ではなく参照。

`stage-protocol.md` 側の `existing approval boundary`（`:313`, `:380`, `:399`, `:415`）は「新しいゲートを作らず既存の承認境界へ回せ」の意で、**ステージゲートを指す別概念**。pr-convergence の「remote write の承認境界」との関係も未定義。

→ #2974 の未文書点は「(i) approval boundary が何を指すか」「(ii) それと Intent grant の優先順位」の 2 点で確定。

### E6. `stage-protocol.md:139-141` との突き合わせ

`:139-141` は **Bolt の code-generation 失敗**についてのみ `always halt regardless of autonomy mode` を規定する（`:141` 逐語: `This is the one case where \`autonomous\` mode stops to consult.`）。**remote write は対象外**であり、#2974 の停止をここへ帰属させることはできない。

なお `amadeus-orchestrate.ts:6171-6182` のコメントは、`report` が前進のみ・generic park が autonomous 下で拒否されるため、typed failure に admission 経路がないことを明記し、semi/full では Quality Repair が引き取ると述べる。**#3016 のガードが engine 内部の設計制約としても効いている**ことを示す面であり、#3016 の修正時に「この経路の前提が変わらないか」を検査する必要がある。

### E7. #2974 の修正候補（裁定申し送り）

| 候補 | 内容 | 留意 |
| --- | --- | --- |
| A | remote write 可否判断を `decide-question` 梯子へ流す（`human-required` のときだけ人間へ） | `cid:scope-definition:c1-semi-ladder-routing` に整合。E4 とも衝突しない。ただし「push は `irreversible` か」の分類裁定が前提 |
| B | `error` directive の扱いを 8 ハーネス表層で強化（逐語出力の義務化 + 新規質問の発明禁止を明文化） | E1 の drift 3 系統を同時解消。A と併用可能かつ独立に価値がある |
| C | approval boundary を定義し Intent grant との優先順位を明記（`stage-protocol.md` または `docs/reference/24-intent-autonomy.md` に正本を置く） | E5 の未文書点を閉じる。A の分類裁定の土台にもなる |

**merge は人間専権のまま**（`pr-convergence.md:381` の `never merge` を壊さない）。

## 4. 述語一覧（再実行可能。すべて worktree ルート、observed = `cd64486a6`）

| ID | 述語 | 結果 |
| --- | --- | --- |
| P0 | `git rev-parse HEAD` / `git rev-parse origin/main` | 両方 `cd64486a68c6a1144db50fbe3fde8273f5e18455` |
| P1 | `git grep -n "Refusing to park" -- ':!dist/'` | 実装 1 hit（`amadeus-state.ts:1585`）。他は codekb / audit shard |
| P2 | `git grep -n "Construction Autonomy Mode" -- packages/framework/core/hooks/` | **0 hit**（exit 1 = エラーなし不一致）。hook 側に park ガードなし |
| P3 | `git grep -n "\| \`error\` \|" -- packages/framework/harness/` | 7 hit（exit 0）。5 種一致 / cursor・opencode が短縮形 |
| P4 | `git grep -rn "Print \`directive.message\` verbatim" -- packages/framework/core/` | **0 hit**。core に正本なし |
| P5 | `git grep -ln '"park"' -- 'tests/*.ts'` \| `wc -l` | **10** ファイル |
| P6 | `git grep -c "errorDirective" -- packages/framework/core/tools/amadeus-orchestrate.ts` | **98** |
| P7 | `git grep -rn "approval boundary\|approval-boundary\|承認境界" -- docs/ plugins/ packages/ amadeus/spaces/default/memory/ \| grep -vi "existing approval boundary"` | **5 hit**（exit 0）。うち定義は 0 件 |
| P8 | `git grep -c "" -- <焦点 5 ファイル>` | stop `1048` / bolt `1428` / autonomy-production `1334` / orchestrate `7018` / state `6360` 行 |
| P9 | `git diff --name-only d7ffaa544 HEAD \| grep -v "^amadeus/"` | 4 件（metrics 2 / tests 2）。焦点面は 0 件 |

**grep の exit code 注意**（`cid:reverse-engineering:c6-absence-predicate-exit-code`）: P2 / P4 の空出力はいずれも exit 1（不一致）であって exit 2（エラー）ではないことを確認済み。なお本セッション初回の `grep -rn ... --include=*.ts` は zsh の glob 展開で `no matches found` / exit 1 の**シェルエラー**を返しており、この空出力を 0 hit の根拠にはしていない（`git grep` へ切り替えて再実測した）。

## 5. Verification

- git 状態変更（commit / branch / checkout / merge）: **ゼロ**
- GitHub への書込: **ゼロ**
- engine / state ツール（`amadeus-orchestrate.ts` / `amadeus-state.ts` / `amadeus-log.ts` / `amadeus-bolt.ts`）の実行: **ゼロ**
- `bun run build` の実行: **ゼロ**
- 書き込み先: `amadeus/spaces/default/codekb/amadeus/` 配下のみ（record dir への書込なし）
