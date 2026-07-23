# Re-scan Record: 260722-election-core-promotion

## 基本情報

- Date: 2026-07-23T00:00:00Z（RE 合成断面）
- Repository: `amadeus`
- Base commit: `a326f47bc0146a3b4285552f42b92fd61fb343a7`
- Observed commit: `fd5767257d82ff02d217aaee051478ec027d11e6`
- Focus: チーム機能(選挙エンジン5本+チーム系4本)の「コア昇格」— repo-only な `scripts/` 資産を配布フレームワーク(`packages/framework/` → dist/self-install)へ昇格させる際の配布境界・import 境界・外部依存面・テスト資産の再照合。

## Base 選定根拠

`git merge-base --is-ancestor a326f47bc0146a3b4285552f42b92fd61fb343a7 fd5767257d82ff02d217aaee051478ec027d11e6` は exit 0、距離は115コミット(`git rev-list --count a326f47bc..fd5767257` = 115)。base は直近の `re-scans/` 到達可能 observed(260720-upstream-sync-230 / 260721-teamup-safety-wait が採用した同一 base)を継承する。日付の新しい非祖先 observed は `--is-ancestor` exit 1 のため除外。共有 `reverse-engineering-timestamp.md` から base を逆算していない。区間 HEAD(`git rev-parse HEAD` = `bc7e42741...`)は observed より後の断面であり、本 scan は observed `fd5767257` を真実源とする。

## 差分概要

- 差分: `git diff --shortstat a326f47bc fd5767257` = 2653 files changed、`+355,785/-5,290`。大半は選挙 record・監査シャード・生成投影・工程記録であり、チーム機能の実装差分ではない。
- チーム機能の実装コミット(区間内、file:line は `observed` 直読):
  - `b76739467` feat(norm-metrics): sparse GoA records 受理(#1316)
  - `f3d91998a` feat(election): tie hold を choice で解決(#1301)
  - `e1fd1826b` fix(election-cli): ballot receipt time stamp + receipt 軸の timeline verify(#1277)
  - `a6f4a4522` fix(election-cli): fail-closed ballot 受理 — invalid-timestamp validation / amend 経路 / per-voter resolution(#1273)
  - `ea6acac53` fix(election): tally winner を choiceInternalNo で決定(#1268)
  - `0b1255e05` upstream v2.3.0 同期 — plugin 機構(#1338)を含む配布経路の新設
- 選挙 TS 資産の diff(scan 転記): election-model +165 / election-record +60 / election-store +41 / election.ts +74(transport 無変更)。チーム系: leader-sync 新規 +795、package.ts +146、plugin-projection.ts 新規 +425、team-up.sh +212(team-msg.sh / codex-safety-wait 無変更)。contrib/skills/amadeus-election/SKILL.md +1。

## 焦点別の観測

### 1. 配布境界の非対称(コア昇格の核心)

選挙エンジン5本(`scripts/amadeus-election.ts` 607行 / `-model.ts` 464 / `-store.ts` 261 / `-record.ts` 222 / `-transport.ts` 207、observed 実測)とチーム系4本(`scripts/team-up.sh` 1271 / `team-msg.sh` 221 / `team-up-codex-safety-wait.ts` 567 / `amadeus-leader-sync.ts` 795)は**すべて `scripts/` repo-only**。dist/.claude/.codex/.cursor/.opencode に `election*` 実体は0件(`find dist .claude .codex .cursor .opencode -name '*election*'` は `.claude/skills/amadeus-election` のみ = contrib 投影の SKILL ディレクトリで、`scripts/` の CLI 実体は含まない)。一方 SKILL(`contrib/skills/amadeus-election/SKILL.md`)は `CONTRIBUTOR_SKILLS_ROOT=contrib/skills`(promote-self.ts:45)→ `.claude/skills`+`.agents/skills`(:46)へ配布される。SKILL:11 は "Requires bun and this repository checkout (scripts/amadeus-election.ts)" と明記し、:21/:31 で `bun scripts/amadeus-election.ts` を直接呼ぶ。すなわち**配布される SKILL が repo-only な `scripts/` を参照する層またぎ**が構造的に存在する — コア昇格はこの非対称を解消する intent。

### 2. 選挙エンジンの import 境界(移設の blast radius)

- `amadeus-election-model.ts`: import ゼロ(`grep '^import'` = 0件)。純粋ドメインモデル。
- `amadeus-election-store.ts`: node:fs/path + model のみ。
- `amadeus-election-record.ts`: model のみ。
- `amadeus-election-transport.ts`: model + node:fs。外部プロセスは agmsg `send.sh` spawn(header :8-14、provenance "spawn-exit" :32、subagent 経路は spawn せず record を mint しない :50)。
- `amadeus-election.ts`: node:fs/os/path(:20-22) + 相互4本(model/record/transport/store) + **`../packages/framework/core/tools/amadeus-norm-metrics`(:46、`parseGoaLine`)が唯一の横断 import**。`amadeus-norm-metrics.ts` は `packages/framework/core/tools/`(982行、observed 実測)に実在し dist 投影済み。→ **選挙エンジンを core/tools へ移設すれば :46 の相対パスは `./amadeus-norm-metrics` に収束**し、唯一の層またぎ import が同一 core/tools 内解決へ変わる。

### 3. plugin 機構の新設(配布経路の新しい選択肢、#1338)

`scripts/package.ts` に plugin 投影が新設: `pluginsRoot()`(:75-76 = `AMADEUS_PLUGINS_ROOT ?? join(REPO_ROOT, "plugins")`、不在時 0-file baseline :70-71)、`repoPlugins()`(:297-298)、harness 投影(:311-312, :496-498)、中立 bundle `dist/plugins/<name>/`(:756-766)。`plugin-projection.ts` 新規(+425)。ただし `plugins/` ディレクトリは現状**不在**(稼働 plugin 0、`ls plugins` = No such file)。コア昇格の配布経路として plugin を使う選択肢が存在するが、現時点は 0-file baseline。

### 4. promote-self 5面 vs dist 6面

`promote-self.ts` managedDirs(:37-43)は5エントリ = `dist/claude/.claude` / `dist/codex/.codex` / `dist/codex/.agents` / `dist/cursor/.cursor` / `dist/opencode/.opencode`(claude/codex/cursor/opencode の4ハーネス、codex は .codex+.agents の2 dst)。dist は6面(`ls dist/` = claude/codex/cursor/kiro/kiro-ide/opencode)。**kiro/kiro-ide は dist 生成対象だが self-install(promote-self)対象外** — コア昇格資産を配布する場合、この5面/6面の対象差を保つ必要がある。core/tools 現況: 33エントリ(`amadeus-*.ts` 32 + data)。coreDirs 投影規則は `dist/claude/manifest.ts:42-54`(tools→tools 筆頭)。

### 5. 選挙エンジンの区間内 contract 進化

移設対象の contract は区間内で複数回進化済み(上記コミット): #1268 tally を choiceInternalNo で決定 / #1273 fail-closed ballot(invalid-timestamp / amend / per-voter resolution) / #1277 receipt time stamp + receipt 軸 timeline verify / #1301 tie hold を choice で解決 / sparse GoA 受理(#1316)。コア昇格は**この進化した contract をバイト等価で移設**し、回帰テスト(下記)で固定する必要がある。

### 6. 外部依存面(コア昇格時に core 中立層へ持ち込めない依存)

- herdr: `team-up.sh:56`(HERDR env)、`:426`(workspace create)、`:444`(pane split)、`:453`(attach、Ghostty `open -na`)、`:155-161`(ready 待ち)、`:152`(pane id パーサ)。
- agmsg: `team-up.sh:45`(AGMSG_ROOT)、`team-msg.sh:95-113`(send/history 委譲、env override 可)、`:212-216`(TEAM_MSG backend 選択)、`:56`(role→herdr 名逆写像)。
- mise trust 焼き込み: `team-up.sh:831/:937/:976`(observed で `mise trust -q` を printf 起動文字列に確認)。
- leader-sync: 外部依存ゼロ(node: のみ、:7-21)、`SYNC_ELECTION_THRESHOLD=10`(:31、`thresholdExceeded` 判定 :337)。
- codex-safety-wait: `SafetyWaitAdapter` port(:30-33)で herdr を抽象化、純ロジック poll(:387)。
- → 選挙エンジン(model=依存ゼロ、他も node: + agmsg spawn のみ)は core 昇格に適合。チーム系(team-up.sh 等)は herdr/Ghostty/mise という**ホスト環境依存が濃く、core 中立層より harness 表層/scripts 寄り**の性質を持つ。

### テスト資産

- 選挙: unit `t234-election-model` / `t238-election-record` / `t239-election-transport` / `t244-election-choice-resolution`、integration `t235-election-store` / `t236-election-loop` / `t240-election-transport` / `t242-election-skill-vocabulary` / `t244-election-tie-choice`、e2e `t237-election-walking-skeleton` / `t241-election-machine-executor`、隣接 `t243-post-complete-audit-stop`(t244 は unit/integration で二重採番)。
- チーム: integration `t-team-msg` / `t-team-up-codex-resume.serial` / `t-team-up-msg-backend` / `t-team-up-watcher-arming`、unit `t-team-up-codex-safety-wait`(+fixtures)、leader-sync `t245-amadeus-leader-sync`(unit + integration)。
- fake-herdr パターン: `t-team-msg.test.ts:23-52`(`fakeHerdr` — 一時 dir に shim を chmod 0755、verb を env 分岐、unknown verb `exit 2` :47)、`t-team-up-msg-backend.test.ts:68`(backend 未知値で loud error assert)。→ コア昇格後も外部依存はこの shim/adapter シームで in-process テスト可能。

## 後続への引き継ぎ

- 昇格の第一次候補は選挙エンジン5本 — import 境界がほぼ閉じており(model 依存ゼロ、唯一の横断 :46 が core/tools 内へ収束)、blast radius が小さい。
- 配布経路は2択: (a) core/tools 直投影(既存 coreDirs 規則、5面/6面の対象差を維持) (b) plugin 機構(#1338、稼働実績0の新設)。選択は Requirements/設計判断へ委ねる。
- チーム系4本は herdr/Ghostty/mise 依存が濃く、選挙エンジンと同一昇格単位に束ねると core 中立性を損なう — 昇格単位の分離を設計で検討する。
- 移設した contract は #1268/#1273/#1277/#1301/#1316 の進化面を回帰テスト(t234-t245)でバイト等価に固定する。
- SKILL→scripts 層またぎ(SKILL:11/:21/:31)の解消(scripts 昇格に伴う参照パス更新、または SKILL の core パス参照化)を着地単位へ含める。

file:line の詳細と構造判定は `../architecture.md` / `../code-structure.md` / `../dependencies.md` の current view を、配布・技術面は `../technology-stack.md` を、検査・保守性は `../code-quality-assessment.md` の current view を真実源とする。
