# Requirements — 260722-teamup-prompt-race

上流入力(consumes 全数): business-overview、architecture、code-structure。

## Intent 分析

`scripts/team-up.sh` でチーム起動したとき、**全 claude メンバーの agmsg watcher が確実に armed になること**を保証したい。現状は起動時 argv の初期プロンプト `/agmsg mode monitor`(`scripts/team-up.sh:800`)を一発供給するのみで、Claude Code TUI 起動レースによる消失(Issue #1384 実測 5/6)を検知も回復もできない。architecture(codekb)の current view が示すとおり、readiness 検証は `start_safety_wait_supervisors():340` の `[ "$RUNTIME" = "codex" ] || return 0` により Codex 専用で、claude 経路には構造的に不在。ゴールは機能追加ではなく**文書化済み挙動(起動後に watcher が受信できる)への回復**であり、bugfix スコープの範囲内。

- 対象 Issue: #1384(bug / P2 / S3-MAJOR、クロスレビュー e3・e4 実在確認済み)
- 原因所在: 260721-teamup-safety-wait の設計(readiness 検証の Codex 専用実装 — claude 経路への一般化漏れ)。code-structure の scripts/ 構造面に記録済み

## 機能要件(FR)

- **FR-1(検証)**: team-up.sh は claude runtime の各 fresh 起動メンバーについて、agmsg watcher の attach を **ready センチネルの実在**で機械検証する。センチネル path は `agmsg_ready_path()`(`~/.agents/skills/agmsg/lib/actas-lock.sh:69-73`、team+role キー)を正とし、検証開始前に stale センチネルを除去する(対照実装 `spawn.sh:572` の `rm -f` と同型)。ps/transcript 推測での判定は行わない。
- **FR-2(再送)**: 検証がタイムアウトしたメンバーへ、初期プロンプト `/agmsg mode monitor` を herdr `pane send-text` + `pane send-keys <pane_id> enter` の2段(cid:herdr-send-submit-two-step)で再送し、再検証する。
- **FR-3(実装形態)**: **インライン検証**とする(E-TPRRA1 裁定 A、2-1)。全メンバー spawn 後に team-up.sh 本体が各 claude メンバーの ready センチネルをポーリングし、未 attach のメンバーへ再送してから終了する(spawn.sh 様式。起動完了 = 全員 armed が保証される)。留保転記: [e4] 起動レイテンシ(最遅メンバー分の同期待ち、上限は FR-4 タイムアウト)が将来問題化した場合のみ C(`--no-wait`)を再検討する。[e5] poll と再送は全メンバー一括ループで総待ち時間を有界にし、`--no-wait` は spawn.sh 対称の最小追加(WAIT_READY 相当のフラグ1本)に留める。
- **FR-4(タイムアウト・再送上限)**: ready 待ちタイムアウト **90 秒**(`~/.agents/skills/agmsg/scripts/spawn.sh:132` verbatim `READY_TIMEOUT=90     # seconds to wait for readiness before giving up` — 2026-07-22 conductor 直接実測。usage 記述は `:46-47` default 90)× 再送**最大2回**(agmsg ack ノルム cid:dispatch-ack-required と同値)とする(E-TPRRA2 裁定 A、3-0)。新規マジックナンバーは作らない。留保転記: [e3] 90秒の意味論(全体予算か試行ごとか)は design 段で `spawn.sh:132` の per-wait 意味に揃えて明文化する。[e4] 本番実測(#1384 回避策)では再送1回で全員復旧しており上限2回は保守側だが、ack ノルムの既存上限と整合し害はない。
- **FR-5(失敗時挙動)**: 再送・タイムアウト後も未 armed のメンバーが残る場合、**未 armed メンバー名を列挙した警告を出し、exit code を分岐**する: 0 = 全員 armed、非ゼロ = 1名以上未 armed(E-TPRRA3 裁定 C、2-1)。無音成功は禁止(検証劇場 Forbidden)。留保転記: [e4] A と C の差は exit 0 側の契約明文化のみ — A でも非ゼロ exit は満たされるが、C の両側契約の方が落ちる実証・回帰テストの assert が書きやすい。[e3] A と C は非ゼロ exit の点で実質同型 — design 段で exit code の値と stderr 様式(未 armed メンバー列挙+復旧手順)を `spawn.sh:581-583`(status=timeout+exit 3)の既習様式に揃える。[e5] exit code 分岐は mux_attach より前に検証を完了させる実装順序が前提(attach 後の exit code は対話 detach に飲まれて意味を失う)。
- **FR-6(適用範囲)**: **claude 経路の修正のみ**を本 intent の実装対象とし、codex 側の初期プロンプト同型ギャップは実測(same-root 棚卸し cid:same-root-inventory)のうえ、存在すれば **Issue 起票のみ**行う(E-TPRRA4 裁定 B、3-0、留保なし)。
- **FR-7(resume 経路の非退行)**: `--continue` 再開メンバー・既 armed メンバーに対して再送を行わない(冪等: ready センチネル実在なら skip)。leader の resume 経路(#1384 タイムラインで正常だった経路)の挙動を変えない。

## 非機能要件(NFR)

- **NFR-1(回帰テスト)**: 対象バグへのリグレッションテストを第一級成果物として追加する(org.md Testing Posture / bugfix 既定)。watcher arming の検証ロジックは in-process seam(関数直接呼び出し)でテスト可能な形に置き、実 FS を使う検証は integration 層に置く(cid:fs-tests-integration-first、cid:bun-coverage-spawn-blindspot)。「落ちる実証」: センチネル不在ケースで検証が実際に赤くなることをテストで固定する。
- **NFR-2(既存 CI green)**: `bun run typecheck` / `bun run lint` / `bash tests/run-tests.sh --ci` の既存 gate を green に保つ。team-up.sh は scripts/ 配下の repo ローカル開発支援ツールであり、配布フレームワーク(packages/framework/、dist/)には触れない見込み(dist:check / promote:self:check は非交差の確認として実行)。
- **NFR-3(依存追加なし)**: 新規ランタイム依存を追加しない。検証は bash + 既存 agmsg スクリプト面(センチネル path)のみで実装する(technology-stack の交差スタック実測に整合)。
- **NFR-4(ポータビリティ)**: センチネル path の解決は agmsg 側実装(`agmsg_ready_path`)の出力仕様に従い、path 文字列をハードコードで複製しない(canonical 1定義から導出 — construction ガードレール)。

## 制約

- bugfix スコープ(Minimal depth): 変更は外科的最小に保つ。`scripts/team-up.sh`(+必要ならヘルパー・テスト)以外の面へ広げない
- agmsg スクリプト群(`~/.agents/skills/agmsg/`)は repo 外の別プロダクトであり、本 intent では**変更しない**(読み取り契約としてのみ利用)
- 260721-teamup-safety-wait の Codex 専用 supervisor(`scripts/team-up-codex-safety-wait.ts`)の既存挙動を退行させない

## 前提

- ready センチネルは claude actas watcher(`watch.sh:294-310`)が attach 時に生成する — RE で生成コード実在は確認済み。実行時の生成タイミング(attach 直後か受信開始後か)は実装時に実測して閉包する(scan-notes §6 の未確定事項)
- herdr pane API(send-text / send-keys)はチーム起動経路で利用可能 — 260717 の E-TMB-CGZ C1 実測(cid:herdr-send-submit-two-step)に基づく

## Out of scope

- codex runtime の初期プロンプト経路の修正(E-TPRRA4 裁定 B により、同型ギャップは実測+Issue 起票のみ — 修正は別 intent)
- Claude Code TUI 側のレース自体の修正(外部プロダクト — Issue #1384 の原因所在分析どおり team-up.sh 側から制御不能)
- agmsg スクリプト群の変更
- team-up.sh の resume 経路・`--instance` 隔離・メッセージバックエンド選択など、watcher arming 以外の挙動変更

## Open questions

- ready センチネルの生成タイミングの実測(実装時の閉包条件 — 前提節参照)
- (Q1〜Q4 は選挙 E-TPRRA1〜4 で裁定済み — requirements-analysis-questions.md の [Answer] と FR-3〜FR-6 に反映済み)

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-07-22T22:43:50Z
- **Iteration:** 2
- **Scope decision:** none

iteration 2 で FR-5 [e3] 留保前半節欠落(Major)と FR-4 [e4] 出典簡略化(Minor)を指摘。予算(max 2)消費後、両件とも record 原文 verbatim 復元で是正し grep 機械閉包を conductor が実測確定(E-LSSADS13 機械検証可能クラス受理)

### Findings

- Major: FR-5 [e3] 留保転記が record 原文の前半節(A と C は非ゼロ exit の点で実質同型)を欠落 — 是正済み・grep 機械閉包確認(requirements.md / E-TPRRA3 record.md 各1 hit)
- Minor: FR-4 [e4] 留保の出典表現(本番実測(#1384 回避策)では)が簡略化 — 是正済み・grep 機械閉包確認(requirements.md / E-TPRRA2 record.md 各1 hit)
