# Code Summary — Bolt 3 projection-sweep

**Intent**: 260810-grilling-frontier-resync / **Stage**: code-generation / **Unit**: projection-sweep (packaging)

上流入力(consumes 全数): `code-generation-plan.md`(Step 実績)、`unit-of-work.md`(U3 完了条件)、`bolt-plan.md`(Bolt 3 の検証列)、`requirements.md`(FR-PROJ-2/3/4 の AC)、`security-design.md`(配布投影の完全性統制の充足面)、`component-methods.md`(C6 の投影面)。FD 成果物は packaging kind の produces_kinds 解決により本 unit に不在(`consumes_absent`、`expected: true`)。

## 実装実績(swarm 経路 — builder: amadeus-builder-agent、worktree `bolt-projection-sweep`、base = a5e05d2af)

| コミット | 内容 |
|---|---|
| ac77c949c | docs(grilling): prose 消費者を frontier 契約へ再同期(docs 14ファイル、+28/-24) |
| e7d962bf6 | docs(grilling): onboarding テンプレート投影を frontier 契約へ再同期(申告付きスコープ拡張) |

referee: `amadeus-swarm.ts check projection-sweep` converged / tampered false(スコープ拡張コミット後に再実測)→ `finalize --batch 2` exit 0。

## 更新面

- **FR-PROJ-2**: `docs/guide/02-your-first-workflow`(.md/.ja.md)、`07-interaction-modes`、`12-cli-commands`、`14-artifacts-reference`、`16-worked-examples`、`17-skills`、`docs/reference/04-stage-protocol`(.md:294 / .ja.md:244)。語彙は `grilling-protocol.md` §2.1/§2.2/§2.4 と `stage-protocol.md:277` の確定文言へ接地。
- **FR-PROJ-3**: `docs/reference/04-stage-protocol.md:315-322` / `.ja.md:264` の hybrid 終了記述を frontier/枝刈り閾値/遮断器の記述へ書き換え。
- **申告付きスコープ拡張**: `packages/framework/core/templates/onboarding.md:13`(正本)、`.agents/rules/amadeus-codex-suffix.md:31`(再生成で追従)、`CLAUDE.md:62` / `.claude/CLAUDE.md:33`(当該1文のみ置換)。

### 投影経路の所見(builder 実測)

claude ハーネスの onboarding doc は `dist/claude/.claude/CLAUDE.md.example` として出荷される**種ファイル**で、`promote-self` はユーザーの `CLAUDE.md` を上書きしない(codex 側は生成物のため自動追従する非対称)。example への一括同期は本 intent と無関係な既存ドリフト2箇所(self-* スコープ方針の段落=ローカル追加、`.amadeus-*` gitignore 行=example 側が新しい)を巻き込みローカル段落を消すため採らず、当該1文のみの置換に留めた。不変条件 `CLAUDE.md == PROJECT_INSTRUCTIONS + .claude/CLAUDE.md`(`scripts/promote-self.ts:432-441` `rootClaudeProblems`)を保つため両方を同一文言で更新し、`bun scripts/promote-self.ts --check` = **exit 0**(`project-local self install is in sync`)で実証。

## 検証(HEAD e7d962bf6 で全数再実行)

| コマンド | exit |
|---|---|
| `bun run build` | 0 |
| `bun run source-only:check` | 0(`source-only boundary: clean`) |
| 隔離2回ビルド再現性検査(CI `reproducible-build` job の逐語再現 — 2ツリーへ detach clone → install → build → `release-dist.ts`) | 0 — 10出力すべて `diff -qr` で byte 一致 |
| t199(unit+integration) | 0 — 26 pass / 0 fail |
| `bun run typecheck` / `bun run lint` | 0 / 0 |
| doc 消費ガード(t132 / t86 / t-pi-docs-contract / t287 / t487 / t415) | 0 — 46 pass / 0 fail |
| `bun scripts/promote-self.ts --check` | 0 |
| `bun run build` 後の tracked 不変 | `git status --porcelain` 空 |

## 全数 sweep の述語と実測(再実行可能な形で記録)

```
P1: git grep -in "one question at a time"                                                       → exit 1(0 hit・repo 全域)
P2: git grep -n  "一度に1質問"                                                                   → exit 1(0 hit・repo 全域)
P3: git grep -inE "one[ -]question[ -]at[ -]a[ -]time" -- docs/                                  → exit 1(0 hit)
P4: git grep -nE "一問一答|一度に ?1 ?[問質]" -- docs/                                           → exit 1(0 hit)
P5: git grep -in "hybrid termination" -- docs/                                                   → exit 1(0 hit)
P6: git grep -n  "ハイブリッド終了" -- docs/                                                      → exit 1(0 hit)
P7: git grep -inE "one[ -]question[ -]at[ -]a[ -]time" -- . ':!amadeus/spaces/*/intents/*' ':!.briefing'  → exit 1(0 hit)
R2: git grep -nE "一問一答|一度に ?1 ?[問質]" -- . ':!amadeus/spaces/*/intents/*' ':!.briefing'   → exit 1(0 hit)
R3: git grep -inE "hybrid termination|ハイブリッド終了" -- . ':!amadeus/spaces/*/intents/*' ':!.briefing' ':!tests' → exit 1(0 hit)
R4: grep -rlE "one[ -]question[ -]at[ -]a[ -]time|一問一答|hybrid termination" dist .claude .codex .agents .cursor .opencode .kimi-code → exit 1(0 hit)
```

P3/P4 はハイフン結合形と対訳実語彙を捕捉するための拡張述語(P1 の大小文字非区別だけでは `one-question-at-a-time` と「一問一答」を構造的に見落とす)。簡体字チェックも 0 hit。

## 逸脱・申し送り

- **申告付きスコープ拡張(ユーザー裁定 2026-08-10)**: `onboarding.md:13` の旧語彙残存の是正。FR-PROJ-2 の受け入れ述語(`git grep -in "one question at a time"`)には一致しないため U3 の完了条件には非影響だったが、実行時配布される出荷契約(CLAUDE.md ほか3投影面)との即時矛盾であるため、Bolt 1 が conductor.md:51 を同じ理由で先行是正した cid:code-generation:c6 の対称適用として同梱。
- `CLAUDE.md` / `.claude/CLAUDE.md` は生成物ではなくユーザー面の種ファイル由来のため手編集した(上記所見)。`promote-self --check` exit 0 で不変条件の維持を実証済み。
- PR は conductor が発行(cid:code-generation:c2-ssp-plugin-overlay-review-order)。

## §12a 指摘への conductor 是正(iteration 予算消費後・機械検証可能クラス)

- **測定ツリーの明記(i2 NIT の閉包)**: 上表の「HEAD `e7d962bf6` で全数再実行」はすべて **builder の隔離 worktree `/Users/j5ik2o/Sources/j5ik2o.github.com/amadeus-dlc/amadeus/.amadeus/worktrees/bolt-projection-sweep`** での実測である(cid:reverse-engineering:measurement-ref-in-artifacts)。
- **自己インストール投影の再生成(i2 BLOCKER 3件の閉包)**: conductor ツリーは Bolt 取込直後 `bun run build` 未実行のため、gitignore された自己インストール木(`.claude` / `.codex` ほか)が旧内容のままだった。conductor ツリーで `bun run build`(exit 0)を実行後、R4 述語 `grep -rlE "one[ -]question[ -]at[ -]a[ -]time|一問一答|hybrid termination" dist .claude .codex .agents .cursor .opencode .kimi-code` を再実行し **exit 1(0 hit)** を実測して閉包した(測定ツリー = conductor ツリー `/Users/j5ik2o/orca/workspaces/amadeus/worktree-grilling-frontier-resync-2`)。
- **追跡ファイル面の再実測(conductor ツリー)**: `git grep -in "hybrid termination" -- docs/` = exit 1 / 0行、`git grep -n "ハイブリッド終了" -- docs/` = exit 1 / 0行、`git grep -in "one question at a time" -- docs/` = exit 1 / 0行。`git grep -inE "one[ -]question[ -]at[ -]a[ -]time" -- . ':!amadeus/spaces/*/intents/*' ':!amadeus/spaces/*/codekb/*' ':!.briefing'` の残 15行はすべて**選挙ストアと codekb re-scan の履歴引用**(本 intent の作業記録そのもの)であり出荷面ではない。exit code はパイプを介さず個別取得した(cid:code-generation:no-exit-capture-through-pipe)。
- **申し送り**: `bun run build` 後の `git status --porcelain` 空は追跡ファイルの不変を示すのみで、gitignore された自己インストール木の更新を証明しない(i2 FOLLOW-UP)。source-only 境界下では**取込側ツリーでの再生成が受け入れ条件の一部**であり、これは配送先ツリーの述語で受け入れ条件を書く既決規範(cid:requirements-analysis:c2-acceptance-at-delivery-tree)の実例である。
