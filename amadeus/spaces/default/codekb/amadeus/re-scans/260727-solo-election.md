# RE 差分リフレッシュ記録 — 260727-solo-election

上流入力(consumes 全数): 本 intent の reverse-engineering ステージ Step 2(Developer スキャン結果)

## 実行メタデータ

| 項目 | 値 |
| --- | --- |
| Date | `2026-07-27` |
| Intent | `260727-solo-election`(ソロモード2体 subagent 選挙 — D-12 裁定の残余実装) |
| Base commit | `1673c433209c74820881c75a0816bbce3fb2d512` |
| Base 祖先性 | `git merge-base --is-ancestor 1673c4332 HEAD` = **exit 0 = 祖先**(cid:reverse-engineering:rescan-base-ancestry) |
| Base 距離 | `git rev-list --count 1673c4332..HEAD` = **63** |
| Observed commit | `3eba39a90fa76b9d52bfb3df749e2f211f6af36a`(= 現 HEAD、`git rev-parse HEAD` 実測) |
| 区間規模 | `git diff --shortstat 1673c4332 HEAD` = **1876 files changed, 316887 insertions(+), 7683 deletions(-)** |
| 区間トップレベル内訳 | `git diff --name-only 1673c4332..HEAD \| sed 's\|/.*\|\|' \| sort \| uniq -c \| sort -rn` = amadeus **639** / dist **499** / .kimi-code **296** / tests **138** / docs **97** / packages **49** / .claude **31** / .opencode **29** / .cursor **28** / .codex **28** / metrics **20** / scripts **8** / .agmsg-ballots **3** / plugins **2** / その他 8(specs / README.md / README.ja.md / contrib / CLAUDE.md / AGENTS.md / .gitignore / .github / .agents 各 1) |
| Scope | `amadeus-feature`、Brownfield、単一 repo `amadeus` |
| 方式 | 差分リフレッシュ(cid:reverse-engineering:c1) — フルスキャン不実施 |
| 測定 ref | 本記録の全 file:line・件数・SHA は observed `3eba39a90` に対する `git rev-parse` / `git merge-base --is-ancestor` / `git rev-list --count` / `git diff --shortstat` / `git diff --name-only` / `git log --oneline` / `grep -n` / `grep -c` / `grep -rho … \| sort \| uniq -c` / `sed -n` / `wc -l` / `find … \| wc -l` 出力からの転記(cid:requirements-analysis:numbers-from-command-output-only、cid:reverse-engineering:measurement-ref-in-artifacts) |

区間の選挙関連ファイル変更は `git diff --name-only 1673c4332..HEAD | grep -i election | wc -l` = **52**(canonical 5 + テスト + 投影面 12 + record)。うち **canonical コードの変更コミットは 3 件**(下記「区間の選挙変更」)。

## 選挙サブシステムの実測断面(observed `3eba39a90`)

### canonical 5 ファイル(`packages/framework/core/tools/`)

| ファイル | 行数 | 役割 |
| --- | --- | --- |
| `amadeus-election.ts` | 665 | CLI エントリ。verb dispatch・ハンドラ・transport 選択・delivery 記帳 |
| `amadeus-election-store.ts` | 536 | elections ルート解決・レジストリ・ディレクトリ解決・timeline/ballot の永続化(`Store` :323) |
| `amadeus-election-model.ts` | 477 | ドメイン型(`Election` / `Ballot` / `VoterKind` / `TimelineEvent`)と `tally` |
| `amadeus-election-record.ts` | 230 | record.md レンダリング(GoA 行・タイムライン・persist 草稿)と `verify` 判定 |
| `amadeus-election-transport.ts` | 207 | 配布ポート(agmsg / subagent)と DeliveryRecord の mint |
| **計** | **2115** | `find packages/framework/core -path '*election*' -name '*.ts' -exec wc -l {} +` |

### CLI 契約

- verb dispatch = `VERBS`(`amadeus-election.ts:617-640`)、**9 verb**: `open` / `next` / `report` / `notify` / `vote` / `status` / `tally` / `render` / `verify`。usage 文字列 `:62` が同じ 9 verb を列挙する。
- exit 契約: stdout に directive / result JSON を 1 行、stderr は advisory(cid:code-generation:stdout-directive-stderr-advisory と同じ役割分離)。
- `notify` の transport 既定は **subagent**(`:627` `a.transport ?? "subagent"`)。`--transport agmsg|subagent` で明示切替(`:62` usage)。

### transport — 指令返却設計(検証劇場回避)

- `TransportKind = "agmsg" | "subagent"`(`amadeus-election-transport.ts:31`)、`Provenance = "spawn-exit" | "reported-by-conductor"`(`:32`)。
- blind payload は `ShortNotification = { electionId, viewPath }` の**2 フィールドのみ**(`:45-47`)。設問・選択肢・推奨・先行票は**型で表現不能**(BR-T1 / FR-2a — 型が持てないものは送れない)。
- `createSubagentTransport`(`:160-176`)は **spawn せず DeliveryRecord も mint しない**。`voter-unknown` / `view-missing` を検査したのち `DeliveryDirective = { voter, viewPath, spawnInstruction }`(`:52-55`)を返すだけで、`send-failed` はこの経路で到達不能(コメント `:36-39` の error 表)。設計根拠は「ツールは spawn を観測できない」= 観測できない事実を記録しない(E-ETF-FD2 Q1=B)。
- `spawnInstruction` の実体は `buildSpawnInstruction`(`:116-118`)が返す日本語 1 行 —
  `選挙 ${electionId} の配布ビュー ${viewPath} を読み、vote verb で投票せよ`。
- **起動主体・体数・並列性の規定は canonical に不在**: `DeliveryDirective` にも `buildSpawnInstruction` にも「誰が」「何体」「同時に」の語彙がない。subagent 経路の実行主体は conductor 側の運用に委ねられている。
- subagent の DeliveryRecord は `reportDelivery`(`transport.ts:183`)が mint し、その唯一の公開呼び出しは `bookReportedDeliveries`(`amadeus-election.ts:218-239`、呼び出し元 `:205` = `report --result distributed` 遷移)。同関数は timeline 既存 `distributed` イベントの voter 集合で冪等化する(`:224` `alreadyBooked`、#1523 = 本区間内着地)。

### tally — 2体選挙の 3 ギャップ

判定順(`amadeus-election-model.ts:440-477`、first-match):

1. `FAVOR = {1,2,3,6}`(`:433`) / `AGAINST = {7,8}`(`:434`) / GoA 4 = abstain / それ以外 = discuss。
2. `blocks >= 1` → hold `block`(`:455`)
3. `counts.discuss >= 2` → hold `discussion-needed`(`:456`)
4. `favor + against === 0` → hold `quorum-short`(`:457`)
5. GoA 4 を除いた eligible 集合で choice 得票を数え、単独最多でなければ hold `tie`(`:469`、#1261)、単独なら `established`。

投票は `resolveBallots`(`:443`)で voter ごとの最新票へ解決してから数える(amend が原票を上書き)。

**2 名構成で生じるギャップ**(本 intent の `feasibility-assessment.md` に固定済み):

| # | 状況 | 現行 tally の帰結 |
| --- | --- | --- |
| (i) | 2 名がともに GoA 5(discuss) | `discuss >= 2` は満たすが、**GoA 1〜3・6 の 5 票が全会一致でも同じ経路を通らない** — 5×1 票の素通り |
| (ii) | 1 名が GoA 4 棄権、1 名のみ投票 | abstain は eligible から除外されるため、**単票で `established` が成立** |
| (iii) | 同一選択肢に賛成 1・反対 1 | `favor + against === 0` でなく、choice 得票は当該選択肢に集中するため **成立** |

いずれも定足数が「favor+against が 0 でないこと」だけで表現され、**投票者数に対する比率や最小人数の概念が型にも述語にも存在しない**ことに帰着する。

### VoterKind — 記録専用

`grep -rn 'VoterKind\|voterKind' packages/framework/core/tools/` = **7 箇所、すべて `amadeus-election-model.ts` 内**:

| 行 | 内容 |
| --- | --- |
| `:126` | `export type VoterKind = "member" \| "subagent";` |
| `:132` / `:145` / `:189` | 3 つのレコード型のフィールド宣言 |
| `:224` | parse 時の値域検査(`member` / `subagent` 以外を棄却) |
| `:232` / `:274` | parse / 構築時の転記 |

`tally`・CLI dispatch・transport のいずれからも**読まれていない** — 分岐に一切影響しない記録専用フィールドである。

ストア実データ(`amadeus/spaces/default/elections/`、175 エントリ / ballots ディレクトリ 167):

- `find amadeus/spaces/default/elections -path '*/ballots/*' -type f | wc -l` = **476**(ballot ファイル実数)
- `grep -rho '"voterKind": *"[a-z]*"' amadeus/spaces/default/elections | sort | uniq -c` = **1461 `"voterKind": "member"`**(ballot + timeline + ledger を含むストア全域の出現数)
- **`"voterKind": "subagent"` = 0 件** — subagent 経路は実データ上まったく走っていない未走行経路。

### SKILL.md の機械固定

`packages/framework/core/skills/amadeus-election/SKILL.md` = **53 行**、H2 は `grep -n '^## '` で **4 節のみ**: `## 起動`(:16) / `## 転送`(:26) / `## 人間委譲`(:42) / `## 終了`(:51)。

`grep -cin 'solo\|subagent\|サブエージェント'` = **0** — ソロ運用・subagent 起動への言及は皆無。

`tests/integration/t242-election-skill-vocabulary.integration.test.ts` の BR-K3(`:85-91`)が

```
const h2 = skill.split("\n").filter((l) => l.startsWith("## "));
expect(h2).toEqual([...REQUIRED_SECTIONS]);
```

と `toEqual` で完全一致固定しており、**H2 節の追加も順序変更も機械的に不可**。同ファイルは BR-K1(禁止語彙、`:80-83`)・BR-K4(人間委譲文言、`:94-`)も固定する。

**含意**: subagent 経路の運用手順(誰が何体 spawn するか)を SKILL.md へ書き足す設計を採る場合、既存 4 節のいずれかの本文へ収めるか、t242 の `REQUIRED_SECTIONS` 契約自体を要件として変更する裁定が要る。どちらを採るかは本 RE では判定せず、後続 requirements-analysis 以降へ送る。

### テスト所在

| テスト | 層 | 対象 |
| --- | --- | --- |
| `tests/unit/t234-election-model.test.ts` | unit | model / tally |
| `tests/unit/t244-election-choice-resolution.test.ts` | unit | choice 解決 |
| `tests/integration/t244-election-tie-choice.integration.test.ts` | integration | tie(#1261) |
| `tests/unit/t239-election-transport.test.ts` | unit | transport |
| `tests/integration/t240-election-transport.integration.test.ts` | integration | transport |
| `tests/integration/t236-election-loop.integration.test.ts` | integration | 指令ループ |
| `tests/integration/t241-election-machine-executor.integration.test.ts` | integration | 機械実行器 |
| `tests/integration/t242-election-skill-vocabulary.integration.test.ts` | integration | SKILL 語彙・構造 |
| `tests/e2e/t237-election-walking-skeleton.test.ts` | e2e | walking skeleton |

(周辺: `tests/integration/t235-election-store.integration.test.ts` / `tests/unit/t238-election-record.test.ts`)

### 投影面(同期対象)

| 面 | canonical | self-install | dist | 計 |
| --- | --- | --- | --- | --- |
| `amadeus-election.ts` | 1 | 5(`.claude` / `.codex` / `.cursor` / `.kimi-code` / `.opencode`) | 7(claude / codex / cursor / kimi / kiro / kiro-ide / opencode) | **13** |
| `amadeus-election/SKILL.md` | 1 | 3(`.agents` / `.claude` / `.kimi-code`) | 3(claude / codex / kimi) | **7** |

SKILL の投影は CLI に対し**非対称** — cursor / opencode / kiro / kiro-ide には SKILL 面が存在しない(`find . -path '*amadeus-election/SKILL.md' -not -path './node_modules/*'` 実測)。SKILL.md を触る変更は 7 面、CLI を触る変更は 13 面の同期が要る。

### 区間の選挙変更(`git log --oneline 1673c4332..HEAD -- <canonical 5>`)

- `2f76f79a4` fix(election): wire reportDelivery into the distributed report transition (#1523)
- `6aa1eb3eb` fix(election-model): `Election.parse` で重複 internalNo / 重複 voter / 空 choices を fail-closed 棄却(#1459) (#1517)
- `da94f232c` fix(election): wire verify's self-check to independently read values (#1516)

`git log --oneline 1673c4332..HEAD -- packages/framework/core/skills/amadeus-election/SKILL.md | wc -l` = **0** — SKILL.md は区間内で完全に不変。

## 上流主張の再実測と訂正

Architect 段で上流(Developer スキャン)の核心主張を observed `3eba39a90` に対し独立再実測した(**12 点照合、訂正 1 件 = 測定基準の精密化**)。

| # | 主張 | 実測手段 | 結果 |
| --- | --- | --- | --- |
| 1 | observed = `3eba39a90…`、base 祖先・距離 63 | `git rev-parse` / `merge-base --is-ancestor` / `rev-list --count` | 一致 |
| 2 | canonical 5 ファイル計 2115 行 | `find … -exec wc -l {} +` | 一致 |
| 3 | verb 9 種、dispatch `amadeus-election.ts:617-640` | `sed -n '617,645p'` / usage `:62` | 一致 |
| 4 | `TransportKind` `transport.ts:31` | `grep -n` | 一致 |
| 5 | blind payload `{electionId, viewPath}` のみ | `grep -n` = `:45-47`(上流表記 `:45-48` は閉じ括弧を含む範囲) | 一致 |
| 6 | `DeliveryDirective` / `spawnInstruction` | `:52-55` / `buildSpawnInstruction` `:116-118`(上流表記 `:117` は return 行) | 一致 |
| 7 | `createSubagentTransport` が spawn / record を作らない | `sed -n '155,180p'` 実文 | 一致 |
| 8 | tally 判定順・FAVOR/AGAINST | `:433` / `:434` / `:440` / `:455` / `:456` / `:457` / `:469` | 一致 |
| 9 | VoterKind は model.ts 内 7 箇所・記録専用 | `grep -rn 'VoterKind\|voterKind'` = 7、他ファイル 0 | 一致 |
| 10 | ストア票すべて member・subagent 0 件 | `grep -rho … \| sort \| uniq -c` | **訂正(基準)**: 下記 |
| 11 | SKILL 53 行 / 4 H2 / solo・subagent 0、t242 BR-K3 `:85-91` が `toEqual` 固定 | `wc -l` / `grep -n '^## '` / `grep -cin` / `sed -n '80,95p'` | 一致 |
| 12 | 投影面 CLI 1+5+7、SKILL 1+3+3、区間 3 コミット・SKILL 不変 | `find` / `git log --oneline … \| wc -l` | 一致 |

**訂正 1(#10、測定基準の精密化)**: 上流の「ストア実データ 1461 票」は、**ballot の実数ではなくストア全域(ballot + timeline + ledger)の `"voterKind"` 出現数**である。ballot ファイルの実数は `find … -path '*/ballots/*' -type f | wc -l` = **476**。両者とも `"voterKind": "subagent"` は **0 件**であり、「subagent 票 0 件 = 未走行経路」という上流の結論自体は変わらない。以後の成果物では 476(ballot 実数)/ 1461(ストア全域出現数)を区別して記す。

## センサー不適用と代替検証

RE ステージが宣言する 3 センサー(required-sections / upstream-coverage / answer-evidence)は、codekb 出力パス `amadeus/spaces/default/codekb/amadeus/**` が各 manifest の filter に構造的に不適合のため発火不能(cid:reverse-engineering:re-sensors-codekb-filter-mismatch、cid:reverse-engineering:c3-codekb-sensor)。**センサー成功として扱わない**。代替として本 scan で更新・作成した全成果物へ `grep -c '^## '` を実行し H2 ≥ 2 を機械確認、および上流入力ヘッダ行の実在を `grep -n '上流入力'` で確認した。

`grep -c '^## '` 実測値(observed `3eba39a90`、いずれも H2 ≥ 2 を満たす):

| 成果物 | H2 数 | 種別 |
| --- | --- | --- |
| `re-scans/260727-solo-election.md`(本ファイル) | 5 | 新規作成(上流入力ヘッダ行 実在 = `grep -c '上流入力(consumes 全数)'` = 1) |
| `reverse-engineering-timestamp.md` | 70 | 新節追加 + 旧「現在」降格 |
| `architecture.md` | 54 | 新節追加 + 旧「現在」降格 |
| `component-inventory.md` | 39 | 新節追加 + 旧「現在」降格 |
| `api-documentation.md` | 23 | 新節追加 |
| `code-quality-assessment.md` | 56 | ラベル降格のみ(本文不変) |
| `code-structure.md` | 50 | ラベル降格のみ(本文不変) |

あわせて `grep -rn '、現在、\|（現在: ' amadeus/spaces/default/codekb/amadeus/*.md` を実行し、残存する「現在」マーカーが本 intent `260727-solo-election` の **4 節のみ**（`reverse-engineering-timestamp.md:3` / `architecture.md:3` / `component-inventory.md:7` / `api-documentation.md:21`）であることを機械確認した(cid:reverse-engineering:c3-relabel — 複数「現在」併存の解消)。

## Delivery boundary

本 scan の成果物は **codekb の差分更新と本 per-intent 記録のみ**。選挙 canonical コード・テスト・SKILL.md・生成配布物(dist / self-install)・intent record / state / audit・GitHub Issue への書込は一切行わない。2 体構成の定足数をどう表現するか(GoA 閾値の人数依存化 / 新 hold reason / VoterKind の判定参加)、subagent 起動主体を SKILL.md へ書くか t242 契約を変更するか、といった方式裁定はすべて後続の requirements-analysis 以降で行う。
