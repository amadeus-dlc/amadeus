# Requirements Analysis — Questions (260724-watcher-timeout-fix / Issue #1449)

## E-OC1 選挙不要判定

判定: 選挙が必要(選挙不要ではない)。修正方針は複数の妥当な設計判断選択肢が存在し、既決ノルムから機械的に一意に導出できないため、cid:requirements-analysis:always-elect に従いエージェント選挙にかける。

---

## Q1: team-up.sh の watcher readiness 検証の修正方針

reverse-engineering 段階(Developer/Architect subagent)の実測により、以下が判明している:

- 根本原因: 実装逸脱ではなく、元intent #1384(`260722-teamup-prompt-race`)requirements.md FR-3 [e4] 留保が「起動レイテンシが将来問題化した場合のみ `--no-wait` を再検討」と明示していた設計トレードオフの顕在化。
- `WATCHER_READY_TIMEOUT=90`(team-up.sh:101)は agmsg `spawn.sh:132` に verbatim 接地された正当な値。再送上限2は `dispatch-ack-required` に接地。
- agmsg `spawn.sh`(:576-588)は単発90秒待ち・再送ループなし(exit 3)。team-up.sh の `verify_watchers_armed`(:1139-1178)は spawn.sh に無い再送×3ループを独自追加し、1メンバーでも unarmed だと worst-case を 270秒(90×3)に増幅している。
- 正常系(全員即armed)はこのロジックのオーバーヘッドがほぼゼロ(実測59.1ms、7メンバー構成)。
- 壊してはならない制約: exit code分岐(0=全員armed/非ゼロ=未armed)と、`mux_attach` 前に検証を完了させる実装順序(FR-5 [e5] 留保)、no-silent-success(検証劇場 Forbidden)。

どの修正方針を採用すべきか?

- A. `--no-wait` / `WAIT_READY` 相当のフラグを追加し、待機をオプトアウト可能にする(FR-3 [e4] が予約していた緩和策)。既定はブロッキング維持、必要な人だけ明示的に待機をスキップ。
- B. `mux_attach` 後(または並行)へ検証を移動し、ユーザーの体感待機を実質ゼロにする。ただし FR-5 [e5] の「attach前に検証完了」契約を再設計する必要があり、exit code の意味論(スクリプト全体の成功/失敗シグナル)を作り直す設計変更を伴う。
- C. タイムアウト予算を縮小する。具体的には再送ループ自体を撤去し、agmsg spawn.sh と対称な「単発 `WATCHER_READY_TIMEOUT` 秒待ち→ダメなら1回だけ再送→再度待ち」程度に絞り、worst-case を 270秒から 90〜180秒程度へ縮小する(spawn.sh の90秒接地は維持しつつ、re-send回数を減らす)。
- D. 上記A〜Cのいずれを選んでも、まずタイミングseam(WATCHER_READY_TIMEOUT/WATCHER_RESEND_MAXをテストで実測駆動できる構造)を追加し、「落ちる実証」で270秒ブロックを再現してから修正する二段構え。
- X. Other (please specify)

[Answer]: C(E-WTFRA1 選挙裁定、choice3=4票/D案choice4=1票、GoA全票2)。再送ループを縮小し agmsg spawn.sh 対称の「単発 WATCHER_READY_TIMEOUT 秒待ち→1回だけ再送→再度待ち」(合計2ラウンド)へ縮小する。worst-case を 270秒(3ラウンド)から 180秒(2ラウンド)へ確定(純単発にしない理由=#1384回復に最低1回の再送が必要)。90秒接地は維持。exit code分岐/mux_attach前検証(FR-5)/no-silent-success の3制約は保持。留保(GoA2 全5票、record verbatim): (1) C実装時も org.md Mandated の『落ちる実証』(既存seamで270→縮小後の赤→緑を実測)を必須とする=NFR-1a (2) #1384のprompt脱落回復力が再送2→1で保たれるか設計/実装段で確認=NFR-1b (3) 純単発でなく1回再送=2ラウンド=180秒とする=FR-1。record(leader worktree相対、本worktreeには未同期): amadeus/spaces/default/elections/260724-e-wtfra1/record.md(leader worktreeで直読照合済み)

---

## Q2: 修正の検証方法

修正の妥当性を検証する際、実際にteam-up.shでチームを起動して90秒待つ形の重い統合テストを追加すべきか、それとも既存の `tests/integration/t-team-up-watcher-arming.test.ts` のシーム(`WATCHER_READY_TIMEOUT`/`WATCHER_RESEND_MAX` の環境変数オーバーライド)を使い、短縮値での「落ちる実証」+ロジック等価性の検証に留めるべきか?

- A. 既存シームを使い、短縮値(例: 2〜3秒)での実測タイミング検証に留める。実チーム起動の重い統合テストは追加しない(bughunt-file-only 由来の実測手法をそのままテストへ転用)。
- B. 実際に `WATCHER_READY_TIMEOUT=90` のデフォルト値のままでもタイミング検証する統合テストを追加し、実時間で90秒超のテストを許容する。
- X. Other (please specify)

[Answer]: A(E-WTFRA2 選挙裁定、choice1=5票、GoA 1x4 2x1)。既存シーム(`tests/integration/t-team-up-watcher-arming.test.ts` の `WATCHER_READY_TIMEOUT`/`WATCHER_RESEND_MAX` env override)を使い、短縮値での実測タイミング検証に留める。実90秒統合テストは追加しない。留保(e5, GoA2): 90デフォルト値自体は重い実待機テストでなく軽量な定数assert(env未設定時90確認)で別途担保=NFR-1c。record(leader worktree相対、本worktreeには未同期): amadeus/spaces/default/elections/260724-e-wtfra2/record.md(leader worktreeで直読照合済み)
