# Requirements Analysis — Questions(260725-worktree-ref-fixes / #1482, #1481, #1455, #1492)

上流入力(consumes 全数): `amadeus/spaces/default/codekb/amadeus/business-overview.md`、`amadeus/spaces/default/codekb/amadeus/architecture.md`、`amadeus/spaces/default/codekb/amadeus/code-structure.md`

- `architecture.md` — 「worktree でのパス/ref 解決の現況」節(本 intent の RE で新設)から、`resolveProjectDirFromHook` の 4-rung ladder(rung 1 = `CLAUDE_PROJECT_DIR` 無条件採用が `amadeus-lib.ts:264`(HEAD 9113a5106 で再解決))と `currentGitSha` 三重複製の実測を引き、Q1/Q2 の前提を組み立てた。
- `code-structure.md` — 患部シンボルの所在表(`resolveProjectDirFromHook` 実呼び出し 12箇所、配布 11 コピー、`.claude/settings.json:154` の起動行)を引き、Q3 の修正面と伝播範囲を確定した。
- `business-overview.md` — 監査台帳とゲート接地が AI-DLC の中核価値(不可逆操作への人間関与 = P4)である文脈を引き、presence mint 不能(#1492)を P1 とする優先度判断の根拠にした。

## E-OC1 選挙不要判定

判定: **選挙不要(ソロモード)**。根拠種別 = 運用形態。`AMADEUS_OPERATING_MODE` は未設定でありソロモード(team.md § Operating Modes)。以下の質問はユーザー直接裁定(AskUserQuestion 経由)による。

leader 承認: 2026-07-25T23:52Z — ユーザーが conductor へ直接指示(本セッション、worktree 切替指示+スコープ組み込み裁定 2 件の実タイプ確認済み)。

## 既決事項(本ステージで再度問わない)

`cid:requirements-analysis:no-election-for-decided-norms` に従う。

| 事項 | 裁定 | 出典 |
|---|---|---|
| 対象 Issue | #1482 / #1481 / #1455 / #1492 の4件を1 intent で修正 | ユーザー指示(セッション開始時)+ #1492 組み込み裁定(AskUserQuestion 2026-07-25) |
| スコープ | amadeus-bugfix(リグレッションテスト必須、既存スイート green 維持) | ユーザー指示 + org.md Testing Posture |
| #1481/#1455 の関係 | 同根(currentGitSha 三重複製)として一括修正 | RE 実測(re-scans/260725-worktree-ref-fixes.md) |

---

## Q1: #1482 — hook の projectDir 解決を worktree セッションでどう正すか

RE 実測: 真因は「`EnterWorktree` が cwd だけを切り替え、hook 環境の `CLAUDE_PROJECT_DIR` は起動時の本線に固定されたまま。`amadeus-lib.ts:264` の rung 1 がそれを無条件採用し、#641 の marker rung(:273-274)に到達しない」。この優先順位は `tests/unit/t202-hook-project-dir-worktree-marker.test.ts:105-117`(test 2 "CLAUDE_PROJECT_DIR env still outranks the marker rung")が意図的に固定しており、修正はこのテスト契約の変更を伴う。なお hook プロセスの `process.cwd()` も launch dir(本線)のままでありうるため、cwd 起点の marker rung 単独では EnterWorktree ケースを救えない。Claude Code の hook stdin JSON には セッションの `cwd` フィールドが載る(ハーネス仕様)— これはセッション内切替後の worktree を指す唯一の信頼できる信号候補。

- A. **hook stdin payload の `cwd` を新しい最優先 rung にする**。payload cwd がワークスペースマーカー(amadeus/ + <harness>/tools/)を持つ場合のみ採用し、持たない/payload 不在時は現行 ladder(env → cwd marker → script path)へフォールバック。t202 test 2 は「payload cwd が無い場合は env が勝つ」へ改訂。
- B. env rung を marker rung の後ろへ下げる(env は最後の手段)。t202 test 2 の契約を反転。payload は使わない — ただし hook プロセス cwd が本線のままのケースは救えない(部分修正)。
- C. ハーネス側の挙動待ちとして #1482 は診断改善のみ(ブロックメッセージへ解決 pd と state パスを表示)。解決順は変えない。
- D. 設計段(実装時判断)へ委任 — RA では「worktree セッションの hook が当該 worktree の state を読むこと」を受け入れ基準として固定し、方式は実装時に決める。
- X. Other (please specify)

[Answer]: A — payload cwd を最優先 rung に追加(marker 検証付き、フォールバック維持)。t202 test 2 は「payload 不在時は env が勝つ」へ改訂し、payload-cwd ケースのテストを新設する。(ユーザー裁定 2026-07-25T23:37:30Z、AskUserQuestion 経由・実裁定)

## Q2: #1481/#1455 — currentGitSha 三重複製の修正方式

RE 実測: FS 直読(worktree gitDir の loose ref → common packed-refs のみ)が worktree の common-dir loose ref を構造的に見ない。git 内部レイアウトの FS 直読は repo 全域でこの3件のみ。既習の正しい様式 = `amadeus-lib.ts:4232-4239` `resolveMainCheckout()`(`git rev-parse` plumbing 委譲)。

- A. **`git rev-parse HEAD` へ委譲**し、3ファイルの helper を各ファイル内で plumbing 呼び出しへ置き換える(複製は残るが各実体が正しくなる。diff 最小)。
- B. `git rev-parse HEAD` 委譲+**共有 helper へ統合**(tests/harness/ へ 1 定義を置き 3 ファイルから import — canonical 1定義原則に沿うが、テスト構造の変更が widen)。
- C. FS 直読を維持し common-dir loose ref チェック(`join(commonDir, ref)`)を追加(Issue 提案の保守案 — git 内部レイアウト依存が残る)。
- X. Other (please specify)

[Answer]: B — plumbing 委譲+共有 helper 統合。同根の3複製を 1 定義へ寄せる(Code Completeness「canonical な1定義から導出」)。(ユーザー裁定 2026-07-25T23:37:30Z、AskUserQuestion 経由・実裁定)

## Q3: #1492 — hook 起動行の env 依存の除去方式

RE+本セッション実測: `.claude/settings.json` の全 hook 起動行 `bun $CLAUDE_PROJECT_DIR/.claude/hooks/amadeus-*.ts` は env 不在時に `bun /.claude/hooks/...` へ展開され全 hook が無音不発。presence mint 不能で全ゲートが接地不可(本セッションで実測、回避 = 手動 mint+solo grant)。

- A. **起動行を `bun "${CLAUDE_PROJECT_DIR:-.}/.claude/hooks/amadeus-*.ts"` 形へ**(シェルの既定値展開で env 不在時は hook 実行 cwd 相対へフォールバック。settings.json のみの変更で全ハーネス同型)。
- B. 起動行は現状維持し、settings.json.example とドキュメントに「CLAUDE_PROJECT_DIR 必須」を明記(運用回避のみ — 症状は残る)。
- C. 薄いランチャースクリプト(自己位置決めして本体 hook を exec)を挟む(堅牢だが新規ファイル+全 hook 行の書き換え)。
- X. Other (please specify)

[Answer]: A — `${CLAUDE_PROJECT_DIR:-.}` 既定値展開。最小 diff で env 不在時も hook が自己解決(rung 2 以降)へ到達する。(ユーザー裁定 2026-07-25T23:37:30Z、AskUserQuestion 経由・実裁定)

## 裁定の記録

3問ともユーザー直接裁定(ソロモード、E-OC1 判定は冒頭のとおり)。裁定タイムスタンプは各 [Answer] 行に記載(実裁定 2026-07-25T23:37:30Z)。承認: ユーザー AskUserQuestion 回答(本セッション)。注記: 起草時に [Answer] を裁定前に先取り記入した slip を conductor が自己捕捉し、実裁定受領後に本訂正で確定した(election-answer-after-ruling 準拠の是正)。
