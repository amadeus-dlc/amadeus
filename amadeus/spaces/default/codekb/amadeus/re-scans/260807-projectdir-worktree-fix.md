# re-scan: 260807-projectdir-worktree-fix

## 実行メタデータ

- Date: `2026-08-07`
- Intent: `260807-projectdir-worktree-fix`（scope `self-fix`、Brownfield、単一 repo `amadeus`）
- Base commit: `b8e3e664f08185e0bd3e3b6d9b7f2dfb60c0ad7d`（`cid:reverse-engineering:rescan-base-ancestry` に従い、`re-scans/*.md` の observed 候補 109 件超から HEAD 祖先かつ距離最小のものを選定。距離 **12 commits**）
- Observed commit: `4a3da7d62c3cc3dadda2dfb6225d30cfa985a8d0`（= 本 worktree HEAD = `origin/main` 系譜。`cid:reverse-engineering:c2-observed-mainline-commit`）
- Focus: [Issue #2352](https://github.com/amadeus-dlc/amadeus/issues/2352) — **`resolveProjectDir` の worktree marker 段欠落による本線 record の無音汚染**
- Scan mode: **xrev scan mode**（`cid:reverse-engineering:c1-xrev-scan-mode` / `c1-xrev-single-issue`）+ conductor / Architect の二重化
- 成果物: 共有8成果物の現在断面を更新（直前の現在断面 `260807-failclosed-recovery-path` を本文保持のまま履歴へ降格 — `cid:reverse-engineering:c3-relabel`）、`reverse-engineering-timestamp.md` の最新ヘッダを更新、本 record を新設

### scan mode の成立根拠

#2352 は起票者以外2名（reviewer-1 / reviewer-2）の独立エビデンス付き verdict でクロスレビューが成立している。両 verdict は**検証 SHA `75a1c198d` を明記**する。xrev scan mode はこの verdict を Developer scan の一次入力とし、conductor の verbatim スポット再実測と Architect の observed 断面での独立実読で二重化した。

### 行番号 currency の確定（`cid:reverse-engineering:E-XBB-RE-S13-c2` の区間実測）

review SHA `75a1c198d` → observed で `packages/framework/core/tools/amadeus-lib.ts` は **`+143/-0`**。hunk header 実測: `@@ -4982,0 +4983,143 @@` — **全 143 行が `:4983`（`parseApprovedSwarmBatches` の下）に着地**する。

```
cmp <(git show 75a1c198d:…amadeus-lib.ts | sed -n '210,360p') <(sed -n '210,360p' …)
→ IDENTICAL (exit=0)
```

したがって**患部区間 210-360 のシフト量はゼロ**であり、レビューの引用行番号は observed でそのまま有効: `resolveProjectDir` = **`:226-250`**、`resolveProjectDirFromHook` = **`:310-347`**。

これは免除の適用ではなく、**区間実測による currency の確定**である。唯一シフトしたのは射程外の指摘（stale comment）で、reviewer-1 の `:6530` は `+143` 行の下流にあたるため observed では **`:6673`** に着地する。その他の患部引用（`settings.json.example:10` / `stage-protocol.md:511` / `t202` / `t296`）も observed で実在を確認済み。

### 検証手段

coverage 実行は `cid:code-generation:c1-coverage-single-owner` に従い**一切行っていない**。検証は次の2系統:

1. **observed 断面の verbatim 実読** — `sed` / `grep` / `git show` / `git log -L` / `git ls-files` / `gh pr list`（exit code を記録）
2. **repo 外 scratch での 5ケース決定的再現** — fixture の lib は正本と `cmp` byte 一致（`MAIN_LIB_IDENTICAL` / `WT_LIB_IDENTICAL`、両 exit=0）、env は `env -u CLAUDE_PROJECT_DIR` で明示除去、全ケース exit=0

---

## 患部の実測

### 1. 両梯子の段構成（observed verbatim）

`packages/framework/core/tools/amadeus-lib.ts:226-250` — CLI 側 4段 + fallback。**loud path ゼロ**（`sed -n '226,250p' | grep "console\|warn\|throw"` → exit=1、出力なし）:

| 段 | 行 | verbatim |
|---|---|---|
| 1 | `:228` | `if (explicitDir) return explicitDir;` |
| 2 | `:231` | `if (process.env.CLAUDE_PROJECT_DIR) return process.env.CLAUDE_PROJECT_DIR;` |
| 3 | `:236-238` | `const scriptDir = dirname(fileURLToPath(import.meta.url));` / `const fromScript = stripHarnessLeaf(scriptDir, "tools");` |
| 4 | `:242-246` | `for (const h of KNOWN_HARNESS_DIRS) { if (existsSync(join(cwd, h)))` |

同 `:310-347` — hook 側 5段 + fallback。CLI に**無い**2段:

- 段1 `:317` — `if (payloadCwd && hasWorkspaceMarker(payloadCwd)) return payloadCwd;`
- 段3 `:329-330` — `const markerDir = findWorkspaceMarkerAncestor(process.cwd());` / `if (markerDir) return markerDir;`

hook 側 doc-comment `:306-309` が理由を逐語で記す:

> `It outranks CLAUDE_PROJECT_DIR because that env var is pinned to the launch directory (the main checkout) and does NOT follow a session into a git worktree`

**非対称は2面**: (a) marker 段の欠落、(b) **段2 の相対順位** — hook 側は marker 付き payload cwd が env を上回るが、CLI 側は env が段2で無条件に勝つ。

### 2. caller 棚卸し（observed 再計数）

`packages/framework/core/tools/` の `resolveProjectDir(` 出現 = **97**（`grep -roh | wc -l`、per-file 合計と一致、exit=0）。うち **2件は非 caller**:

- `:226` — 定義行 `export function resolveProjectDir(...)`
- `:6673` — コメント `// matches AMADEUS_PROJECT_DIR in resolveProjectDir() above.` ← **stale comment**（実装が読むのは `CLAUDE_PROJECT_DIR`、`:231`）

実 call site = **95 / 15 ファイル**（`amadeus-lib.ts` 自身を除く）。内訳: `amadeus-state.ts` 33、`amadeus-orchestrate.ts` 19、`amadeus-swarm.ts` 12、`amadeus-worktree.ts` 9、`amadeus-jump.ts` 4、`amadeus-graph.ts` / `amadeus-bolt.ts` 各 3、`amadeus-utility.ts` / `-sensor` / `-runtime` / `-log` 各 2、`amadeus-learnings` / `-goal` / `-election` / `-audit` 各 1。

`core/tools` 外に **1件**: `packages/framework/core/otel/relay.ts:777`。**合計実 call site = 96**。

**名前シャドウ**: `packages/framework/core/hooks/amadeus-statusline.ts:31` に同名のローカル関数 `async function resolveProjectDir(input: Input)` が存在する（内部で `resolveProjectDirFromHook` を呼ぶ、`:42`）。lib 関数の caller ではなく、grep ベースの棚卸しで誤カウントしやすい。

**レビューとの差分**: reviewer-1「97箇所」は出現数（定義+コメント込み）、reviewer-2「94/15」は本 scan の 95/15 と1件ずれる。計数方法差と見る。

### 3. marker 段の導入経緯（`git log -L` 実測）

| 対象 | 導入コミット | 日付 / Issue |
|---|---|---|
| `hasWorkspaceMarker` / `findWorkspaceMarkerAncestor` / hook 段3 | **`392a2d781`** | 2026-07-09、#641 / #682 |
| hook 段1（payload cwd） | **`e12259ba7`** | 2026-07-26、#1482 / #1493 |

`392a2d781` は `resolveProjectDir` を**一切変更していない**（`git show 392a2d781 -- amadeus-lib.ts | grep -E "^[+-].*resolveProjectDir\b"` → 出力ゼロ、exit=0）。コミットメッセージも `resolveProjectDirFromHook` のみを名指しし、CLI 側への言及は無い。

### 4. workspace marker の定義と fresh worktree での不成立

`amadeus-lib.ts:283-286` verbatim:

```ts
function hasWorkspaceMarker(dir: string): boolean {
  if (!isDir(join(dir, "amadeus"))) return false;
  return KNOWN_HARNESS_DIRS.some((h) => isDir(join(dir, h, "tools")));
}
```

2ディレクトリ（`amadeus/` + `<harness>/tools/`）の**両方がディレクトリであること**を要求（`isDir` は `:266-272`。両半がディレクトリでなければならない旨は `:280-282` のコメントが #641 レビュー是正として明記）。

**構造的根拠（observed 実測）**: `.claude/**` は `.gitignore:24` で ignore され、`.claude/` 配下の tracked ファイルは **3件のみ**（`CLAUDE.md` / `hooks/amadeus-dispatch.ts` / `settings.json`）。`git ls-files .claude/tools` → **0件**。`.claude/tools/` は完全な未追跡生成物であり、`bun run build` 前の worktree は marker 後半を満たさない。

**設計制約**: **marker ベースの drift ガードは build 前 worktree を構造的に検出できない。** この構造は `cid:scope-definition:c3-worktree-selfinstall-bootstrap` と同根。

### 5. 既存テスト面 — 非対称がテストにも写っている

| テスト | `covers:` 宣言 | ケース B 被覆 |
|---|---|---|
| `tests/integration/t144-harness-seam.cli.test.ts` | `function:harnessDir, function:resolveProjectDir, function:rulesSubdir, file:tools/amadeus-lib.ts`（`:4`） | **なし** |
| `tests/unit/t202-hook-project-dir-worktree-marker.test.ts` | `function:resolveProjectDirFromHook, file:tools/amadeus-lib.ts`（`:5`） | hook 側のみ |
| `tests/integration/t296-hook-launch-and-worktree-resolution.test.ts` | `hook:amadeus-mint-presence, function:resolveProjectDirFromHook, …, file:settings.json.example`（`:1`） | hook 側のみ |
| `tests/integration/t230-hook-project-dir-opencode-cursor-marker.test.ts` | opencode / cursor の marker 段（#1048） | hook 側のみ |

**t144 の落とし穴**: test 5 のタイトルは `"resolveProjectDir CWD-marker rung accepts a .codex marker"` だが、body（`:134-146`）は `mkdirSync(join(project, ".codex"))` のみで `amadeus/` を作らない — これは**段4（既知 harness dir の存在）であって workspace marker ではない**。`resolveProjectDir` に workspace marker 段は存在しないため、t144 が pin するのは段1/2/3/4 のみ。**ケース B（cwd=worktree marker 保有 × 本線絶対パス lib）を固定するテストは repo 全域で不在**。

**t144 の前提条件**: t144 は `dist/claude/.claude/tools/amadeus-lib.ts` を読む（`:37-38` `const CLAUDE_TOOLS = join(REPO_ROOT, "dist", "claude", ".claude", "tools")`）。source-only 移行後 `dist/` は未追跡生成物のため、**このテストは `bun run build` 済みを前提とする** — ケース B の回帰テストを t144 に足す場合の前提条件。

### 6. `stage-protocol.md:511` と投影面

observed で実在（両レビューの CONTRADICTED 訂正を追認）:

> `packages/framework/core/amadeus-common/protocols/stage-protocol.md:511`
> **CWD drift warning**: If a stage runs `cd` in Bash … subsequent `bun {{HARNESS_DIR}}/tools/...` calls using relative paths will fail with "Module not found". Always use absolute paths to the tools directory for tool calls (on Claude Code, `$CLAUDE_PROJECT_DIR/.claude/tools/`), or run `cd` commands in subshells: `(cd subdir && npm install)`.

この1行が**相対形推奨と正面衝突する**。ただし文中に既に代替（サブシェル `(cd subdir && …)`）が明記されており、reviewer-1 の (a) 案は正本にすでに書かれている。

**起動形の実測（observed）** — 測定面が2つある:

| 面 | 相対形 `bun .claude/tools/` | 絶対形 `bun $CLAUDE_PROJECT_DIR/.claude/tools/` |
|---|---|---|
| 正本 `packages/` 全域 | **31** | **1** |
| セルフインストール面 `.claude/skills/` | **113** | **0** |

**Developer scan からの refinement**: scan が報告した「113」はセルフインストール面 `.claude/skills/`（未追跡の投影物）の計数であり、正本 `packages/framework/harness/claude/skills/` の計数は **31** である。修正の対象面を決めるときに両者を混同しない。

**さらに**: 正本側の絶対形 1件は `packages/framework/harness/claude/settings.json.example:10`（allowlist エントリ自身）であり、実際の起動行ではない。すなわち **allowlist が許可している形を、正本のスキルは1つも発行していない**。

### 7. settings allowlist — 同期面は2つ

```
packages/framework/harness/claude/settings.json.example:10
      "Bash(bun $CLAUDE_PROJECT_DIR/.claude/tools/*)",
.claude/settings.json:39
      "Bash(bun $CLAUDE_PROJECT_DIR/.claude/tools/*)",
```

`.claude/settings.json` は **tracked**（`git ls-files --error-unmatch .claude/settings.json` exit=0）。`.claude/**` は gitignore 対象だが tracked ファイルは ignore を上書きするため、**完了条件1は正本とセルフインストール面の2ファイル同時変更**を要する。`dist/` 配下は未追跡生成物のため同期対象外（`bun run build` で再生成）。

同一ファイル内の非対称（#1492 の指摘）も現存: hook 起動行 14本はすべて `${CLAUDE_PROJECT_DIR:-.}` のフォールバック付きクォート形で、`:10` の allowlist だけが素の `$CLAUDE_PROJECT_DIR`。

### 8. `--project-dir` の既存サポート

段1（明示引数）の受け口は**広く実装済み**: `"--project-dir"` を parse するツールは **18ファイル**（`advisory-choice` / `audit` / `bolt` / `finding` / `goal` / `jump` / `lib` / `log` / `migrate` / `mirror-lifecycle` / `mirror-presentation` / `orchestrate` / `sensor-model-completeness` / `state` / `subagent-stats` / `swarm` / `utility` / `worktree`）。共有ヘルパー `stripProjectDir`（`amadeus-lib.ts:212-224`）を runtime / sensor / learnings が使用。

`stage-protocol.md:1211` の `--project-dir <workspace-root>` は `amadeus-finding.ts create-github-issue` の呼び出し例（`:1209-1216`）。段1 を正規形に据える設計案は、新規機構ではなく**既存の広い受け口を使う**。

### 9. 先例と交差判定

| Issue | state | 修正の形 |
|---|---|---|
| [#796](https://github.com/amadeus-dlc/amadeus/issues/796) | CLOSED | `7e6a7c33e` — `fire` に `--project-dir` を配線（**段1 での点回避**、梯子は無変更） |
| [#1450](https://github.com/amadeus-dlc/amadeus/issues/1450) | CLOSED | `04efcd42c` — election の既定 pd を `resolveProjectDir` 経由へ（**呼び出し側の点修正**） |
| [#1287](https://github.com/amadeus-dlc/amadeus/issues/1287) | OPEN | enhancement、解決順の再設計（ADR 前提） |

**2件の先例はいずれも呼び出し側の点修正で、梯子そのものには触れていない。** #2352 は同じ根の4件目であり、reviewer-2 の「点修正の反復が効いていない」を修正コミットの実体で追認する。

**交差**: `gh pr list --state open` → **0件**（出力なし、exit=0）。resolver 周辺に交差する進行中変更なし。base→observed の 12 commits も resolver 領域を触っていない（§行番号 currency の `cmp` で証明済み）。

---

## 決定的再現（repo 外 scratch、observed lib、全 exit=0）

fixture の lib は repo の正本と `cmp` byte 一致（`MAIN_LIB_IDENTICAL` / `WT_LIB_IDENTICAL`、両 exit=0）。env は `env -u CLAUDE_PROJECT_DIR` で明示除去。

| ケース | cwd | 読込 lib | env | `resolveProjectDir()` | `resolveProjectDirFromHook()` |
|---|---|---|---|---|---|
| A | main | main | UNSET | main | main |
| **B** | **worktree** | **main 絶対** | UNSET | **main** ← 欠陥 | worktree |
| C | worktree | worktree | UNSET | worktree | worktree |
| C+env | worktree | worktree | main | **main** | main |
| B+payloadCwd | worktree | main 絶対 | UNSET | **main** | worktree |

両レビュアーの表と完全一致。**欠陥は observed HEAD で現存する。**

---

## 事実と仮説の分離

**事実（実測）**:

- 梯子の非対称（marker 段の欠落 + 段2 の相対順位）と CLI 側の loud path 不在
- 実 call site 96（`core/tools` 95 / 15 ファイル + `otel/relay.ts:777` 1）
- marker 段の導入コミット2件（`392a2d781` / `e12259ba7`）と、`392a2d781` が `resolveProjectDir` を触っていないこと
- `.claude/tools` 未追跡（`git ls-files` → 0件）
- テストの非対称（ケース B を固定するテストが repo 全域で不在）
- `stage-protocol.md:511` の逆向き指示
- allowlist の同期面2ファイル、および正本側で絶対形の唯一の出現が allowlist 自身であること
- 先例2件が呼び出し側の点修正であること
- 交差ゼロ
- 5ケース決定的再現

**仮説（断定不可）**:

- (a) #641 時に CLI 側が「検討されず」か「検討して見送られた」か — コミット記録は前者を示唆するが、これは**証拠の不在**であって不在の証拠ではない
- (b) 実運用でケース B が発生した監査証跡は未探索（頻度未測定。両レビュアーも未実施）
- (c) reviewer-2 が挙げた bootstrap SHA `46b120d19` は本 worktree の履歴では引けず、`git log -L 10,10` は **`5cfb16165`**（2026-07-06、"chore: bootstrap AI-DLC framework"）単独を返す。いずれにせよ `origin:bootstrap` 該当という結論は一致
- (d) clone 内 worktree の marker 成立/不成立の全数再census（reviewer-2 の「144 worktree 中 7件 INVALID」）は、本セッションの worktree 隔離ガードが他 worktree を跨ぐループ実行を拒否したため**未実施**。構造的根拠（§4）のみ確定

---

## 設計材料としての要点（Requirements Analysis への引き継ぎ）

1. **主軸は完了条件3（梯子そのもの）**。完了条件1（allowlist）/ 2（`stage-protocol.md:511`）は従である — reviewer-1 の指摘を実測が支持する。**ケース C+env で相対形は救わない**（worktree 内の正しい lib を読んでいても env 段2 が本線へ倒す）。
2. **marker 段の追加だけでは閉じない**。§4 のとおり marker ベースのガードは build 前 worktree を検出できず、さらに `resolveProjectDir` に hook と同じ marker 段を足しても **env 段2 が上位に残る限りケース C+env は開いたまま**である。段順そのものの再設計が要る。
3. **段1（明示 `--project-dir`）を正規形に据える案は新機構を要さない** — §8 のとおり 18 ツールで受け口が実装済み。ただし段順の再設計は **#1287 と射程が重なる**ため、スコープ境界の裁定が要る。
4. **loud path の新設は 96 call site すべてへ伝播する**。警告 / 例外 / 返り値型の変更（確信度の表現）のいずれを採るかで影響面が変わる。
5. **ケース B の回帰テストの置き所**は `t144`（`dist/` を読むため `bun run build` 依存、`:37-38`）か `t202` 系譜（正本を直 import）かの選択になる。
6. **副次的な是正候補**: `t144` test 5 のタイトル（`"CWD-marker rung"` が実体の段4を指す命名債務）と `amadeus-lib.ts:6673` の stale comment。本 intent に含めるかは要裁定。
