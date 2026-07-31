# Code Summary — fix-1773-ballot-blind-storage

上流入力(consumes 全数): requirements.md — FR-1a〜1d の充足状況を本書で対応付ける。

## 実装(PR #1808、branch bolt/fix-1773-ballot-blind-storage、head eb7c1bd16)

`packages/framework/core/tools/amadeus-election-store.ts` に pending lane を追加。`appendBallot` は tally 前は `pending/<voter>.json`(到着 seq 付き・gitignored)へ書き `ledger.json` に触れない(FR-1a)。tally 後は従来どおり late lane へ書くが、その前に `integratePending` を通し pending の取りこぼしを構造的に排除。`Store.ledger` は台帳+未統合 pending のマージビューを返す単一の読み取り口で、`status` の `{voted,pending,state}`・`vote` の `{"accepted":…}`・timeline 行は不変(FR-1c/1d)。統合は `ballotKey`(voter/kind/submittedAt)の内容同定で冪等 — drain 失敗や再 tally でも二重計上しない(FR-1b)。pending 行は `isPendingEntry` で形状検証し、壊れた行は例外でなく `corrupt` を返す(fail-closed)。`.gitignore` と 7ハーネス `dot-gitignore` に `amadeus/spaces/*/elections/*/pending/` を追加(利用者ワークスペースでも同じ漏洩が起きるため配布面にも投影)。

付随: `specs/tla/model-map.json` の実装ハッシュ再ピン(TLA 仕様に ledger/pending の格納概念は現れず意味論不変 — #1510 の暫定運用どおり PR 本文に根拠明記)。coverage allowlist 行ピン2件を機械 remap+reason/現行行の直読照合。

## テスト(FR-1 受け入れ基準との対応)

- 基準1(Red→Green): 新規 `tests/integration/t373-election-ballot-blind-storage.integration.test.ts`(5 tests)— collecting 中の `ledger.json` に票本文非出現+pending 側に実在+status/timeline 不変。Red exit 1 → Green exit 0 実測。
- 基準2: `git check-ignore` exit 0 の実測+repo/全ハーネス dot-gitignore のパターン実在を assert。
- 基準3: election 系スイート・tally/record 様式のグリーン維持。
- 基準4: pending lane 上の amend 共存/重複拒否/unknown-ref fail-closed+late lane 維持(reexamRequired 込み)+io-error 3分岐+統合の冪等性。
- 申告済み判断: `tests/integration/t236-election-loop.integration.test.ts` の amend 閉包確認は collecting 中の `ledger.json` 直読(= FR-1a が禁じた欠陥状態そのものをピン)だったため、確認先をマージビューへ移し、tally 後の ledger 3行(到着順)を新規固定 — AC-1 と AC-3 の構造的両立不能を FR 準拠側で解消(builder 申告・conductor 受理)。

## 検証(head eb7c1bd16・個別直書き・exit code 実測)

typecheck 0 / lint 0 / dist:check 0 / promote:self:check 0 / complexity 0 / coverage registry 0 / **patch gate 0(added 90 / covered 90 / uncovered 0)** / t373 0 / election 系8ファイル 0(95 pass) / formal-verif 系 0(35 pass)。GitHub Actions は 17 checks 全 pass(Tests 8m22s・Coverage head 8m49s)。ローカル全数 CI の `t-team-up-codex-resume.serial` 赤は負荷起因 flake(3実行で落ちるテストが3通り・単体 exit 0・ファイル交差なし)と帰属。CI patch gate の初回赤(store.ts:153 未カバー1行)は lcov DA 実測で到達テストを追加して閉鎖。制御バイト混入 0 件を byte 走査で確認(初版 ballotKey の NUL 2件を除去)。

## 同根棚卸し

collecting 中の票本文が共有 tracked ファイルへ載る経路は選挙ストア全域で `ledger.json` の1箇所のみ(views = 自ビューのみ / timeline = voter 名と時刻のみ / その他 = tally 後または定義)— 本 PR で閉鎖。
