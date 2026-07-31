# Code Summary — fix-1811-supervisor-orphans

上流入力(consumes 全数): requirements.md — FR-1a〜1d の充足状況を本書で対応付ける。

## 実装(PR #1821、branch bolt/fix-1811-supervisor-orphans、commit ff474226f)

変更は `tests/integration/t-team-up-codex-resume.serial.test.ts` の1ファイルのみ(+104/−3)。

- **FR-1a(掃引)**: モジュールスコープに `collectSupervisorPids`(`Bun.Glob("**/safety-wait.pid")` の再帰列挙+`Number.isSafeInteger` 検証)、`stillAlive`(`process.kill(pid,0)`)、`reapSupervisors`(SIGTERM → 25ms ポーリング → 2秒猶予超過分に SIGKILL、ESRCH は握り潰し)を追加。afterEach を async 化し **rmSync より前**に掃引(pid ファイルが削除対象ツリー内にあるため順序が本質)。
- **FR-1b(stub 是正)**: fake stub 末尾の `setInterval` 不死設計を `--run-record` ディレクトリ実在ポーリング(消滅で exit 0)へ置換。述語はディレクトリ実在のみ(本番の3ファイル読取は写さない)。**起動時 record 不在の supervisor は従来の SIGTERM 待ちを維持**する分岐を明示 — foreign-run 所有権テストの保護に必須。
- **FR-1c**: メタデータ改変系3テスト(another run / mismatched pid / dead owner)を個別実行で green 実測。
- **FR-1d(本番非改変)**: `git diff --numstat origin/main...HEAD -- packages scripts` = **0 行**を実測確認。coverage patch 母集団への新規プロダクション行なし・allowlist 非接触。

## テスト(FR-1 受け入れ基準との対応)

- 基準1(Red→Green): t374 リグレッション(fixture 起動→孤児化→期限内全消滅 assert)。Red exit 1(survivors 7件)→ Green exit 0。deslop 後に Red 再実証(分岐無効化→exit 1→復元)。
- 基準2: 漏洩3経路を含むスイート完走後の pgrep 前後差分 = **新規増分 0**(既存の他セッション由来孤児 105 件は不接触)。
- 基準3: FR-1c 3テスト+スイート全体 57 pass / 0 fail(633 expect)。

## 検証(個別直書き・exit code 実測)

typecheck 0 / lint 0(warning 増加なし)/ dist:check 0 / promote:self:check 0 / 対象スイート 0(57 pass、143.56s)/ FR-1c 3テスト各 0。PR CI 全 green(Tests/Coverage/drift/CodeRabbit "No actionable comments"/Bugbot)、mergeable CLEAN・thread 0。
