# Reverse Engineering — Developer スキャン結果(integrity-batch)

## 実行メタデータ

- Date: 2026-07-09
- Intent: `260709-integrity-batch`(scope: `bugfix`、対象バグ4件 — #705 / #706 / #707 / #708)
- Stage: `reverse-engineering`(2.1)Developer スキャン
- 手法: diff-refresh(project.md 是正事項 `cid:reverse-engineering:c1` に従う。フルスキャンは行わない)
- Base commit(前回スキャン): `a1c79dc12`(`codekb/amadeus/reverse-engineering-timestamp.md` の Observed commit)
- Observed commit(今回): `162553b99`(origin/main、チェックアウト中)
- 制約: git 状態操作(checkout/stash/reset/branch 切替)は不使用。読み取りと本ファイルの新規作成のみ。codekb/ の書き換えは Architect 合成に委ねる。

---

## 1. 差分サマリ

`git diff --name-status a1c79dc12..162553b99`(15コミット):

- ファイル数: **227**(A=44、D=18、M=165)
- 主要クラスタ(トップディレクトリ別ファイル数):
  - `amadeus/`(工程記録・codekb・memory)= 72。うち `codekb/claude-leader/`(9)と `codekb/claude-engineer-1/`(9)の **削除(D)** = #693(PR)後の codekb 一本化の後始末。`codekb/amadeus/` の 9ファイルは M(前回 bug-zero-batch スキャンの結果反映)。
  - `tests/` = 66(#696 派生サイズ分類器・#698/#703 の class-B テスト standalone 化など)
  - `dist/` = 45(生成物。core 変更の伝播)
  - `packages/` = 14
  - `docs/` = 6、`.codex/tools`・`.claude/tools` = 各6、他
- 主なコミット(15件、いずれも今回4バグの焦点コードには未着手):
  - `162553b99` team norms consolidation + 本日分の工程記録(#704)
  - `611dd1ef8` class-B テスト standalone-green(#698/#703)
  - `7da09f0c7` pyramid: derived-size classifier + drift guard(#696 Phase A / #700)
  - `392a2d781` hooks: cwd workspace marker で project dir 解決(#641 / #682)
  - `1289608c6` **first-class delegated-approval provenance(#671 / #681)** ← #708 の前提機構
  - `909e590d4` **codekb repo 名を origin remote 由来に統一(#693)** ← #707 の前提機構
  - `cb9d19a8e` human-presence guard を reject に配線(#675 / #692)
  - 他 #674 / #677 / #678 / #657 / #686 / #673 / #672

### 焦点コードの diff 内 touch 状況(バグ残存の裏取り)

| ファイル/領域 | a1c79dc12..162553b99 で touch? | 含意 |
|---|---|---|
| `packages/framework/core/hooks/amadeus-mint-presence.ts`(#708) | **未変更** | バグはこの区間の前後で残存 |
| `tests/harness/sdk-drive.calibration.test.ts`(#705) | **未変更** | 既知回答文字列のドリフトは残存 |
| `.claude/amadeus-common/stages/inception/reverse-engineering.md`(#707) | **未変更** | timestamp 単一ファイル構造は残存 |
| `.claude/tools/amadeus-lib.ts`(#707 前提) | M | #693 の `codekbRepoName` origin 由来化を含む(#707 の直接原因) |
| `packages/framework/core/knowledge/amadeus-delivery-agent/workflow-planning-guide.md`(#706) | M(ただし L55 のみ、#672) | 破損参照は **L3**。今回区間では未変更 = 既存の恒久欠陥 |

---

## 2. 焦点領域ごとの現状構造

> 注記: パス表記は self-install ツリー(`.claude/`)を実測面として引用する。source of truth は `packages/framework/core/`、生成物は `dist/`。3ツリーは `bun scripts/package.ts` / `bun run promote:self` で同期される(team.md Mandated)。修正は core 側を編集し dist/self-install へ伝播させること。

### 2.1 #708 human-presence 偽陽性(P1)

**mint 側(無条件 mint・stdin 未読)**
- `.claude/hooks/amadeus-mint-presence.ts:23-31` — `try` ブロック内で `resolveProjectDirFromHook(import.meta.url)` → `existsSync(stateFilePath(...))` なら **無条件に** `appendAuditEntry("HUMAN_TURN", {}, projectDir)`。
- 同ファイル冒頭コメント L12-13 は「Presence-only: the prompt text is irrelevant, so stdin is not read.」と明言。**stdin を一切読まない**ため、UserPromptSubmit を発火させた入力が「人間の生タイプ」か「機械注入(Stop-hook フィードバック / task-notification)」かを区別する情報を取得していない。これが #708 の偽陽性の直接原因。

**gate 側(mint を消費する判定)**
- `.claude/tools/amadeus-lib.ts:1442-1479` `humanActedSinceGate(projectDir)` — 全監査シャードを読み、`HUMAN_TURN`(および検証済み `DELEGATED_APPROVAL`)とゲート解決イベントを時系列ソートし、`lastHuman > lastResolution` なら true(=人間が関与)を返す。空台帳は fail-open で true(L1444)。
- `.claude/tools/amadeus-lib.ts:1480以降` `verifyDelegatedApproval` — #671 の委任承認 provenance。issuer シャードの実 HUMAN_TURN を物理照合し、偽造委任を drop。**この機構自体は健全**だが、偽の HUMAN_TURN が mint 側で湧くと `isHumanTurn` 経路(L1451)で無条件にカウントされ、delegate provenance を経由せずゲートが開く。
- 消費点: `amadeus-state.ts:1311`(handleApprove/Reject 共通ヘルパー)、`amadeus-state.ts:1479`(delegate-approval)。

**修正実装に効く観察 — 他フックの stdin parse パターン(採用可能な既存様式)**
- 参照実装 A: `.claude/hooks/amadeus-audit-logger.ts:29-44` — `if (process.stdin.isTTY) process.exit(0);` → `const input = await Bun.stdin.text();` → `JSON.parse` → `isClaudeCodeHookInput(raw)` 型ガードで検証 → 失敗時 `process.exit(0)`(fail-open)。**mint-presence が採るべき既存の定型**。
- 参照実装 B: `.claude/hooks/amadeus-session-start.ts:86-96` — 同じく `!process.stdin.isTTY` ガード後に `Bun.stdin.text()` → `JSON.parse` → `isClaudeCodeHookInput` → **`raw.source` を読んで分類**(`source = raw.source ? String(raw.source) : "unknown"`)、`raw.session_id` も取得。SessionStart のペイロードが `source`(startup/resume/clear/compact)を運ぶことをコードが実証している。
- hook 入力 JSON の型: `.claude/tools/amadeus-lib.ts:2029-2047` `interface ClaudeCodeHookInput` — 宣言済みフィールドに `hook_event_name?`, `tool_name?`, `tool_input?`, `reason?`, **`source?`**, **`prompt?`**, `agent_type?`, `agent_id?`, `last_assistant_message?`, および index signature `[key: string]: unknown`。型ガード `isClaudeCodeHookInput`(L2049-2051)は `isPlainObject` のみのゆるい判定。
- **推定(要実測確認)**: UserPromptSubmit の Claude Code 公式ペイロードは一般に `session_id` / `transcript_path` / `cwd` / `hook_event_name` / `prompt` を含む。`source` フィールドは **SessionStart 固有**(session-start.ts が読んでいるのはそれ)であり、UserPromptSubmit に機械注入 vs 生タイプを判別する `source` が来る保証はない。`ClaudeCodeHookInput.source` が型に在ることは「UserPromptSubmit でも来る」ことを意味しない。修正タスクは、実際の UserPromptSubmit stdin JSON に何が来るかを実機で1件キャプチャして確認する必要がある(#708 本文の「source フィールド有無を file:line で確認」要求に対応)。判別材料が無い場合は、#708 提案 (b)「gate は delegate provenance(#671)を正道とし、ローカル単独 HUMAN_TURN を信頼しない運用に倒す」が現実的な緩和方向。
- リポジトリ内ドキュメント: `docs/reference/06-hooks-and-tools.md:36`(および `.ja.md:36`)が mint-presence の契約を「every real human prompt / answered AskUserQuestion widget」と記述。UserPromptSubmit ペイロードのフィールド仕様そのものを記した文書はリポジトリ内に見当たらなかった(docs/ 内 `UserPromptSubmit` 言及は 06-hooks-and-tools の2箇所のみ)。

### 2.2 #707 codekb 並行リフレッシュ衝突(P2)

- `.claude/tools/amadeus-lib.ts:556-565` `codekbRepoName(projectDir, space?)` — recorded repos が 1件ならその名、**0件なら `originRepoSlug(projectDir)`**(L560)、解決不能時 `basename(projectDir)`。#693 でここが origin remote 由来に統一され、全 worktree/clone が同一 `codekb/amadeus/` を指すようになった = #707 の前提。
- `.claude/tools/amadeus-lib.ts:530-533` `codekbDir` / `571-580` `originRepoSlug`(SSH/HTTPS 双方から `.git` 除去して末尾セグメント抽出、失敗時 null で fail-safe)。
- ステージ定義 `.claude/amadeus-common/stages/inception/reverse-engineering.md`:
  - L5 `condition:` = 「Execute when project is brownfield. **Always rerun for freshness.** Skip for greenfield projects.」— 常時リフレッシュ前提。
  - L36 `outputs:` = `codekb/<repo>/`(9アーティファクト)。**単一ディレクトリ・9固定ファイル構造**。
  - L110 — `reverse-engineering-timestamp.md` は「per-repo codekb store の freshness/staleness marker」で「stale なら rerun をトリガ」。**単一ファイル**であり、per-intent の base/observed を分離して持てない = #707 が指摘する「並行リフレッシュで base/observed が互いに上書き」の構造的原因。
  - L162 timestamp 書式は ISO 8601(`- 2026-05-20T10:14:32Z — <summary>`)だが、これは memory.md エントリの書式であって timestamp アーティファクト全体の書式規約ではない。
- 現行 `codekb/amadeus/reverse-engineering-timestamp.md` の実形式: 「実行メタデータ(Date / Intent / Scope / Repository / Stage / 手法 / Base commit / Observed commit / Focus)」+「分析範囲」+「鮮度に関する注記」+「合成方針」+「更新した成果物」+「統合記録」の散文構造。**単一 intent の単一スキャン点を前提**とし、複数 intent の並行 base/observed を表現する欄が無い。#707 修正方向 C(timestamp を per-intent 記録化、本文 last-writer-wins 明文化)を採るなら、このファイル構造とステージ定義 L110/L36 の両方に規約追記が要る。
- 補足: 今回の diff で `codekb/claude-leader/`・`codekb/claude-engineer-1/` が D(削除)= #693 後の一本化。並行 intent が別ブランチで同一 `codekb/amadeus/` を書く現在の運用では、#707 のマージ衝突は今後も再発しうる。

### 2.3 #705 sdk-drive calibration のランナー管理外・doctor ドリフト(P2)

- 対象: `tests/harness/sdk-drive.calibration.test.ts`。
  - L55-72 が既知回答 doctor 文字列をピン留め。実測した現行値:
    - `DOCTOR_HEADER = "AI-DLC Health Check"`(L67)
    - `DOCTOR_RULE = "─".repeat(37)`(L68)
    - `DOCTOR_BUN_LABEL = "bun installed (required for CLI tools and hooks)"`(L69)
    - `DOCTOR_HOOK_LABEL = "amadeus-audit-logger.ts present"`(L70)
    - `DOCTOR_SETTINGS_LABEL = "settings.json present"`(L71)
    - **`DOCTOR_DOCS_LABEL = "amadeus-docs/ directory exists"`(L72)** ← ドリフト箇所
- **#705 の主張 vs 実コード突き合わせ結果**:
  - 主張1「doctor が `amadeus-docs/ directory exists` を出さなくなった」→ **確認(CONFIRMED)**。`.claude/tools/amadeus-utility.ts` を grep すると `amadeus-docs/ directory exists` は **存在せず**、代わりに L628 が `label: \`workspace shell ready (${harnessDir()}/ + amadeus/spaces/default/memory/)\`` を出力。doctor のワークスペースチェックは「workspace shell ready」文言に置き換わっており、calibration が待つ旧文字列は現行出力に現れない。よって calibration 2 は依存導入後も失敗する(#705 再現の rc=1 と整合)。
  - 主張2「この test はランナーの substrate skip 管理外(smoke/unit/integration/e2e の discovery path 外)」→ **確認(CONFIRMED)**。`tests/run-tests.ts:31` `type Level = "smoke" | "unit" | "integration" | "e2e"`。`levelFiles(level)`(L577-587)は `join(SCRIPT_DIR, level)` 直下の `*.test.ts` のみを列挙。`tests/harness/` はいずれの Level にも属さないため、`sdk-drive.calibration.test.ts` はランナーの tier discovery に載らず、`shouldSkipForClaude`(L478付近で適用)による substrate skip も掛からない。ad hoc 実行時のみ走り、通常 CI では tier 外。
  - `tests/run-tests.ts` の substrate ゲート実体: L279-293(live SDK/substrate = `*.sdk.test.ts` / `driveAidlc`、AWS 資格情報無効時 skip)、L485-489(`shouldSkipForClaude(file)` で SKIP 表示 + meta 記録)。この skip 管理は「ランナーが discover したファイル」にのみ適用される(#705 evidence の run-tests.ts:478-489 と一致)。
  - なお `tests/gen-coverage-registry.ts` のカバレッジウォーク(L675-)は `tests/` 全体を再帰し `tests/harness/` も走査対象に含む(サイズ分類集計)。ただしこれは**実行**ではなく静的集計であり、substrate ゲートとは別系統。
- doctor 期待値 drift の実体: calibration が参照する「shipped doctor handler」の該当行(コメント L61-66 が `utility.ts:396` の `amadeus-docs/ directory exists` を指すと記すが)は現行 `amadeus-utility.ts` に無く、コメント自体もドリフト。**修正はテスト側の期待値更新 + ランナー登録方針の決定**(#705 提案の A/B いずれか)を伴う。

### 2.4 #706 delivery knowledge の tree 外参照(P3)

- 破損参照: `packages/framework/core/knowledge/amadeus-delivery-agent/workflow-planning-guide.md:3` — 「Use this alongside **`product-guide.md`** when leading execution plan creation.」
- delivery-agent の宣言済み knowledge ロードパス(#706 引用の `amadeus-delivery-agent.md:71-77`)は自分の `knowledge/amadeus-delivery-agent/` と `amadeus-shared/` のみ。product-agent ディレクトリは読まない。
- 実ファイル配置(実測):
  - `knowledge/amadeus-delivery-agent/` = `mob-programming-guide.md`, `team-topologies.md`, `workflow-planning-guide.md` の3ファイルのみ。**`product-guide.md` は不在**。
  - `product-guide.md` は `knowledge/amadeus-product-agent/product-guide.md` に存在(`find` 実測: core / `.claude` / `.codex` / `dist/{claude,codex,kiro,kiro-ide}` の7箇所に伝播済み)。
- **core→dist→self-install の伝播構造**(修正が触れる面):
  - source of truth: `packages/framework/core/knowledge/amadeus-delivery-agent/workflow-planning-guide.md`
  - `bun scripts/package.ts` が `dist/<harness>/` を生成(`dist/claude/.claude/knowledge/...` 等)。
  - `bun run promote:self` が self-install ツリー(`.claude/` / `.codex/` / `.agents/` / `CLAUDE.md`)へ昇格。
  - 破損参照は既に `.claude/` と `dist/claude/` の複製にも伝播している(grep 実測で `.claude/knowledge/.../workflow-planning-guide.md:3` にも同文言)。したがって修正は **core を直し package.ts + promote:self で全ツリー再同期**する必要がある(project.md Mandated: dist:check / promote:self:check 同一コミット)。
- 破損参照は今回 diff 区間で導入されたものではない(L3 は本区間で未変更、L55 のみ #672 で編集)= 恒久的な既存欠陥。修正方向は (a) 参照文言の削除/修正、(b) `product-guide.md` を delivery ディレクトリにコピー(重複負債・NEVER 二重実装ノルムと緊張)、(c) delivery-agent のロードパスに product-agent knowledge を追加、のいずれか — 設計判断は Architect/後続ステージへ。

---

## 3. 修正実装に効く横断観察

- **stdin parse の canonical パターン(#708 修正の型)**: `amadeus-audit-logger.ts:29-44` / `amadeus-session-start.ts:86-96` が `isTTY` ガード → `Bun.stdin.text()` → `JSON.parse` → `isClaudeCodeHookInput` 型ガード → fail-open(`process.exit(0)`)の定型を確立済み。mint-presence をこの型に寄せれば、ペイロードから判別フィールド(存在すれば)を読む配線は最小改修で入る。fail-open 契約(mint 失敗が人間のターンをブロックしない)は維持必須。
- **hook 入力型は既に `source`/`prompt` を宣言**(`amadeus-lib.ts:2029-2047`)。フィールド追加不要。ただし型に在る=ランタイムで来る、ではない点に注意(#708 は実 UserPromptSubmit ペイロードの実測キャプチャが必須)。
- **#707 と #706 は「共有ストア/参照の一貫性」系、#705 と #708 は「検証機構の正しさ」系**。#705(calibration の trust anchor drift)と #708(gate 偽陽性)はどちらも team.md/project.md の「検証劇場 Forbidden」(偽の信頼を生む機構)の趣旨に直結する。修正時は「落ちる実証」(失敗ケース注入で赤くなることの実証)が team.md Mandated で要求される。
- **伝播対象の徹底**: #706 の修正は core / dist(4 harness)/ self-install(.claude・.codex)全ツリー。`dist:check` と `promote:self:check` を同一コミットに含めること(project.md Mandated / Forbidden: dist 手編集禁止)。
- **バグ4件はいずれも a1c79dc12..162553b99 の焦点コードに未着手**(§1 の touch 表参照)であり、前回スキャン点から現在まで残存し続けている欠陥である。#707・#708 は今回区間で入った前提機構(#693 origin 由来 repo 名 / #671 delegate provenance)の副作用/隣接領域として顕在化した。

---

## 4. Architect 合成への引き継ぎメモ

- codekb/ の 9アーティファクト更新は Architect が実施(本スキャンでは codekb を書き換えていない)。差分リフレッシュ方針を維持し、変更のない構造節(one-core-many-harnesses、Bun/TS/Biome スタック、release.yml 一本化)は前回 `codekb/amadeus/` 版を温存推奨。
- `reverse-engineering-timestamp.md` の Base=`a1c79dc12` / Observed=`162553b99` へ更新し、Focus を今回4バグ(#705/#706/#707/#708)に差し替える。ただし **#707 自身が「単一 timestamp ファイルの並行衝突」を問題化している**ため、Architect は timestamp 更新時にこの緊張(自己言及)を認識し、last-writer-wins 前提で書くこと。
- 未解決の実測要調査(推定に留めた点): UserPromptSubmit stdin JSON の実フィールド(特に機械注入 vs 生タイプの判別材料の有無)。これは修正実装(code-generation)段で実機キャプチャして確定する。
