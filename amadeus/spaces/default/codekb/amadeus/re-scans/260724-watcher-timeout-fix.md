# re-scan 記録 — 260724-watcher-timeout-fix

## 実行メタデータ

- Date: 2026-07-24(scan-notes 実行時刻)
- Intent: `260724-watcher-timeout-fix`([Issue #1449](https://github.com/amadeus-dlc/amadeus/issues/1449) — `packages/framework/core/tools/team-up.sh` の `verify_watchers_armed`(:1139-1178)が、1メンバーでも agmsg watcher が unarmed だと既定値 `WATCHER_READY_TIMEOUT=90` 秒 ×(`WATCHER_RESEND_MAX=2`+1)= 最大 270 秒(4.5 分)、`mux_attach`(ユーザーが team ペインへアタッチできる時点)を構造上ブロックする性能問題。正常系(全員即 armed)ではオーバーヘッドほぼゼロ = 実測 59.1ms)
- Scope: `amadeus-bugfix`(Depth Minimal)
- Project type: Brownfield
- Repository: `amadeus`
- Stage: `reverse-engineering`(2.1)
- 手法: differential refresh(cid:reverse-engineering:c1、E-L63 の base 選定則)。base `a81c11dde83e0059c48ecc912d2d22dd6bca60eb`(直近 freshness pointer が指す 260722/260723 系 scan の共通 observed。`git merge-base --is-ancestor a81c11dde HEAD` exit 0 実測)、observed `6d4df90566dcf7aa00980e5f9e85c831ca9108ba`(現 HEAD 実測 `git rev-parse HEAD`)、distance `git rev-list --count a81c11dde..HEAD`=155。Developer スキャン→Architect 合成の直列(cid:reverse-engineering:c3)。
- 測定 ref: 全 file:line は Observed=HEAD `6d4df9056` のワークツリー実ファイル直読、および repo 外 read-only の agmsg skill(`~/.agents/skills/agmsg/scripts/spawn.sh`)直読(cid:measurement-ref-in-artifacts)。区間件数・diff 規模・タイムアウト値はコマンド出力からの転記(numbers-from-command-output-only)。
- Delivery boundary: 実装・修正コード、`bun scripts/package.ts`/`promote:self` による dist・self-install 再生成、main merge/rebase、Issue close、PR 作成・更新は本 scan で実施していない。

## diff 規模(機械集計、ref = base..HEAD)

- `git diff --shortstat a81c11dde..HEAD`: `1762 files changed, 217563 insertions(+), 3536 deletions(-)`(転記)。大宗は `amadeus/spaces` の RE codekb・intent record の記録面と選挙 CLI 関連 intent。
- 本バグ交差面の実コード:
  - `git diff --numstat a81c11dde..HEAD -- packages/framework/core/tools/team-up.sh` = `1462 0`(base では `scripts/team-up.sh` に存在、#1421 で `packages/framework/core/tools/` へ移動したため git は新規追加として計上)。
  - `git diff --numstat a81c11dde..HEAD -- tests/integration/t-team-up-watcher-arming.test.ts` = `197 0`(新規テスト)。
- 区間内で team-up.sh(いずれかのパス)を触ったコミットは 2 件(`git log --oneline a81c11dde..HEAD -- scripts/team-up.sh packages/framework/core/tools/team-up.sh`):
  - `42c9341d8`(#1391、2026-07-23)`fix(team-up): verify claude watcher arming with resend before mux attach` — **`verify_watchers_armed` 検証ロジックを導入した本体コミット**(`git log -S "verify_watchers_armed()"` 実測で唯一の導入元)。#1384 の修正。base `a81c11dde` には未存在(`git show a81c11dde:scripts/team-up.sh | grep -c verify_watchers_armed` = 0)。
  - `0d24c6f93`(#1421、2026-07-23)`Team Modeの選挙・ランチャーを配布フレームワークへ昇格` — `scripts/team-up.sh` → `packages/framework/core/tools/team-up.sh` へ移動し、10 の配布コピー(`.claude`/`.codex`/`.cursor`/`.opencode` + `dist/*` の計 11 ツリー = `git ls-files '*team-up.sh' | wc -l`)を生成。検証ロジック自体は不変(base scripts 版と packages 版の diff 235 行はすべてパス参照・prerequisite チェック・install URL・docs 追加で `verify_watchers_armed` 本体は同一)。

## スキャン対象と現行結論(根本原因)

### 対象機構(静的読解、file:line は `packages/framework/core/tools/team-up.sh` HEAD 実測)

- **定数定義**:
  - `WATCHER_READY_TIMEOUT="${WATCHER_READY_TIMEOUT:-90}"`(:101)。コメント(:98-100)verbatim「Per-wait readiness timeout: seconds waited per polling round before a re-send / giving up. Mirrors agmsg spawn.sh:132 `READY_TIMEOUT=90` (per-wait, not a whole-run budget).」= **per-wait(1 ポーリングラウンドあたり)の意味**であり全体予算ではない。
  - `WATCHER_RESEND_MAX="${WATCHER_RESEND_MAX:-2}"`(:104)。コメント(:102-103)verbatim「Max monitor-prompt re-sends, mirroring the agmsg ack retry ceiling (dispatch-ack-required: at most 2 resends before escalating).」
- **`watcher_verification_applies()`**(:1067-1069):`[ "$RUNTIME" = "claude" ] && [ "$MSG_BACKEND" = "agmsg" ]`。claude + agmsg 組み合わせのみ検証が発火(codex は FR-6 で対象外、herdr backend は arm する monitor が無い)。
- **`ready_sentinel_path()`**(:1078-1085):agmsg の `actas-lock.sh` を subshell で source して `agmsg_ready_path` を呼ぶ(NFR-4、path 文字列を重複させない)。lib 不在時は空 stdout で「unarmed 扱い」に倒す(loud fail)。
- **`resolve_member_pane()`**(:1093-1105):`herdr agent list` を member ラベルで引いて pane id を返す。
- **`resend_monitor_prompt()`**(:1110-1115):herdr の send-text → send-keys enter の 2 段(cid:herdr-send-submit-two-step)。
- **`clear_stale_watcher_sentinels()`**(:1122-1129):pane 起動前に旧 sentinel を除去(agmsg spawn.sh:572 対称、launch 後 clear は本物の fresh sentinel を消すため禁止)。
- **`verify_watchers_armed()`**(:1139-1178):**性能問題の核心**。二重ループ構造 —
  - 外側ループ = 再送試行(`max_attempts = WATCHER_RESEND_MAX + 1` = 3、:1141)。
  - 内側ループ(:1146-1159)= 全 unarmed メンバーを 1 秒刻みでポーリング。`[ "$waited" -ge "$WATCHER_READY_TIMEOUT" ] && break`(:1156)で 1 ラウンド最大 90 秒待つ。
  - よって **1 メンバーでも armed しないと 90 秒 × 3 = 最大 270 秒**まで内側待機を繰り返す。全員 armed なら内側は即 break(:1155)で無待機(実測 59.1ms)。
- **呼び出し元**(:1442-1445):`watcher_status=0; if watcher_verification_applies; then verify_watchers_armed || watcher_status=$?; fi`。**直後の :1448 が `mux_attach "$S"`**。すなわち検証が完了するまで interactive attach がブロックされる。コメント(:1437-1441)verbatim「Completed BEFORE mux_attach so the exit code is meaningful (an interactive attach would swallow it).」= **アタッチ前完了は exit code の意味保持のための意図的な実装順序**。最終 `exit "$watcher_status"`(:1462)。

### 原因の所在(cid:bug-intent-linkage)

- 導入 intent = `260722-teamup-prompt-race`(#1384/#1391)。原因の所在 = **設計(受容されたリスクの先送り)であって実装逸脱ではない**。根拠:
  - `260722-teamup-prompt-race/inception/requirements-analysis/requirements.md` の **FR-4**(:17)verbatim:「ready 待ちタイムアウト **90 秒**(`~/.agents/skills/agmsg/scripts/spawn.sh:132` verbatim `READY_TIMEOUT=90` — 2026-07-22 conductor 直接実測)× 再送**最大2回**(agmsg ack ノルム cid:dispatch-ack-required と同値)とする(E-TPRRA2 裁定 A、3-0)。新規マジックナンバーは作らない。」→ **90 秒値は spawn.sh:132 に接地しており根拠あり**。再送上限 2 は既決ノルムに接地。
  - **FR-3 の [e4] 留保**(:16)verbatim:「起動レイテンシ(最遅メンバー分の同期待ち、上限は FR-4 タイムアウト)が将来問題化した場合のみ C(`--no-wait`)を再検討する。」→ **#1449 の性能問題は設計時に予見され、`--no-wait`(agmsg spawn.sh の `WAIT_READY` 相当のフラグ 1 本)を緩和策として明示的に先送りしていた**。
  - **FR-5 の [e5] 留保**(:18)verbatim:「exit code 分岐は mux_attach より前に検証を完了させる実装順序が前提(attach 後の exit code は対話 detach に飲まれて意味を失う)。」→ **mux_attach 前ブロックは exit code 契約の要請**。
- したがって #1449 は「バグ」ではなく設計時に受容し先送りした性能トレードオフの顕在化。修正は文書化済み契約(exit code 分岐・no silent success)を壊さずレイテンシを削る方向になる。

### agmsg spawn.sh との対照(値の一致/不一致)

- `~/.agents/skills/agmsg/scripts/spawn.sh:132` verbatim `READY_TIMEOUT=90     # seconds to wait for readiness before giving up`。**90 の値は team-up.sh と一致**(コメントの mirror 主張は正確)。
- **ただし待機構造は非対称**:spawn.sh(:576-588)は `WAIT_READY=1` のとき **単発の 90 秒待ち**で、タイムアウトすると `exit 3`(status=timeout)で諦める — **再送ループを持たない**(`grep -n "RESEND\|resend\|retry" spawn.sh` = 0 hit)。team-up.sh の `verify_watchers_armed` は spawn.sh に**無い再送ループ(× 最大 3 ラウンド)を追加**しており、worst-case はagmsg 単発 90 秒の **3 倍(270 秒)**。この増幅は team-up.sh 独自の設計であり spawn.sh には接地していない。

### テスト被覆(性能面の盲点)

- `tests/integration/t-team-up-watcher-arming.test.ts`(197 行)は seam 3 テスト + `verify_watchers_armed` 4 テスト(全員 armed / 未 armed で非ゼロ exit / 再送後 armed / applies マトリクス)を持つ。
- **タイミング挙動は無被覆**:fixture の env は `WATCHER_READY_TIMEOUT: "0"`(:79)を設定するため、内側ループは `waited(=0) >= 0` で即 break し、**90 秒/270 秒の実待機を一切踏まない**。unarmed テスト(:149-161)も `WATCHER_RESEND_MAX: "1"` で試行回数を絞る。→ **本番既定値 90 のブロッキング時間はテストスイート上構造的に不可視**。落ちる実証や回帰テストを書くなら、この timeout をパラメータ化して実待機を注入する seam が要る。

## 修正の設計判断ポイント(RE 所見、裁定は後続ステージ)

1. **`--no-wait` / `WAIT_READY` フラグ**(FR-3 [e4] が明示的に予約した緩和策):spawn.sh 対称のフラグ 1 本で検証待ちを opt-out。ただし既定 ON/OFF の選択が exit code 契約(FR-5)・no-silent-success(検証劇場 Forbidden)と干渉しうる。
2. **`mux_attach` 後へ検証を非同期化/バックグラウンド化**:レイテンシは消えるが FR-5 [e5]「attach 前完了で exit code の意味を保つ」契約に反する — exit code をどう返すかの再設計が要る。
3. **タイムアウト予算の縮小**:90×3=270 の worst-case を、例えば単発 90(spawn.sh 対称に戻す)や短縮値へ。90 の接地(spawn.sh:132)を崩すか、再送ループを外すかの二択。
4. **タイミング seam の追加**:いずれの修正でも「落ちる実証」を書くには timeout の実待機をテストから注入可能にする seam(現状は env 上書きのみで実測ロジックは無被覆)が前提。

原因の所在まとめ:**設計**(#1384/#1391 の requirements で 90×3 のブロッキングを受容し、レイテンシ緩和 `--no-wait` を FR-3 [e4] で将来課題として先送り。実装は設計どおりで逸脱なし。90 値は spawn.sh:132 接地・再送増幅は team-up.sh 独自)。
