# Requirements Analysis 質問(260722-teamup-prompt-race)

上流入力(consumes 全数): business-overview、architecture、code-structure。

> 既決照合(質問しない事項): (1) 修正方向 = 「watcher attach の検証+再送」— Issue #1384 本文の原因所在分析(クロスレビュー e3/e4 の2名実在確認済み)と intent birth 指示文で確定。 (2) 検証 seam = agmsg ready センチネル(`lib/actas-lock.sh:69-73` の `agmsg_ready_path`、team+role キー)— RE スキャンで機械判定可能と実測済み。 (3) 再送手段 = herdr `pane send-text`+`send-keys enter` の2段 — 既決 cid:herdr-send-submit-two-step。 (4) リグレッションテスト必須 — bugfix スコープの org.md Testing Posture 既決。
>
> 運用モード: チームモード(AMADEUS_OPERATING_MODE=team 実測)。明確化質問はエージェント選挙(cid:election-protocol、amadeus-election CLI 正本)で回答を作る。[Answer] 記入は裁定受領後のみ(cid:election-answer-after-ruling / E-OC1 3段順序)。
>
> E-OC1 証跡: 全4問はエージェント選挙 E-TPRRA1〜4(amadeus-election CLI、blind 配布)で裁定。開票 2026-07-22T22:31:01Z、全件 terminal recorded(record = amadeus/spaces/default/elections/E-TPRRA1..4/record.md、leader 通知 22:31:29Z)。[Answer] 記入は裁定受領後に実施。

## Q1. 検証+再送の実装形態はどれにしますか?

`scripts/team-up.sh` の claude 起動経路に watcher attach 検証を足す位置の設計判断です。対照実装が2系統あります: agmsg `spawn.sh:576-588` は spawn 直後にインラインでポーリングブロックし、`scripts/team-up.sh:237-260` の safety-wait supervisor(260721 導入)は Codex 専用のバックグラウンド監視です。

- A. インライン検証: 全メンバー spawn 後に team-up.sh 本体が各メンバーの ready センチネルをポーリングし、未 attach のメンバーへ再送してから終了する(spawn.sh 様式。起動完了 = watcher 全員 armed が保証される)
- B. supervisor 一般化: 既存 `start_safety_wait_supervisors()`(`:340` の codex 限定 return を外す)を claude 用 readiness 検証+再送に拡張する(バックグラウンド。team-up.sh の終了は早いが検証は非同期)
- C. ハイブリッド: インライン検証(A)を既定とし、`--no-wait` フラグで従来挙動へ戻せるようにする(spawn.sh の `--no-wait` と対称)
- X. Other (please specify)

[Answer]: A(E-TPRRA1 裁定 2-1、GoA 1x1 2x2。留保: [e4] レイテンシ問題化時のみ C 再検討 / [e5] poll・再送は全メンバー一括ループで総待ち有界、--no-wait は spawn.sh 対称の最小フラグ1本)

## Q2. ready 待ちタイムアウトと再送回数の規定値はどれにしますか?

数値は実在する対照実装の named constant から導出します(cid:constants-from-code)。実測値: agmsg `spawn.sh:132` `READY_TIMEOUT=90`(秒、`:47` default 90 / timeout 時 status=timeout exit 3)。agmsg ack ノルムの再送上限は2回(cid:dispatch-ack-required)。

- A. タイムアウト 90 秒(spawn.sh:132 と同値)× 再送最大2回(ack ノルムと同値)— 既存定数の再利用のみで新しいマジックナンバーを作らない
- B. タイムアウト 90 秒 × 再送1回のみ(TUI レースは起動直後に限られるため1回で十分とみなす)
- C. 数値は design 段の判断に明示委任する(requirements では「有限のタイムアウトと再送上限を持つ」ことだけを固定)
- X. Other (please specify)

[Answer]: A(E-TPRRA2 裁定 3-0、GoA 1x1 2x2。留保: [e3] 90秒の意味論(全体予算か試行ごとか)は design 段で spawn.sh:132 の per-wait 意味に揃えて明文化 / [e4] 実績は再送1回で復旧だが上限2回は ack ノルム整合で害なし)

## Q3. 再送・タイムアウト後も watcher が起動しない場合の失敗時挙動はどれにしますか?

検証が偽グリーンにならない失敗経路の規定です(検証劇場 Forbidden の予防面)。

- A. loud 失敗: 未 armed メンバー名を列挙して stderr へ警告し、team-up.sh を非ゼロ exit で終える(運用者が即気づける。ただし起動済みメンバーはそのまま残る)
- B. loud 警告のみ: 未 armed メンバー名+手動復旧手順(`/agmsg mode monitor` を当該 pane へ手入力)を stderr へ出すが exit 0(部分成功を正常系として扱う)
- C. 警告+exit code は未 armed 数に応じて分岐(0 = 全員 armed、非ゼロ = 1名以上未 armed。CI/スクリプト消費と人間運用の両立)
- X. Other (please specify)

[Answer]: C(E-TPRRA3 裁定 2-1、GoA 2x3。留保: [e4] A/C の差は exit 0 側の契約明文化のみ — C は落ちる実証の assert が書きやすい / [e3] exit code 値と stderr 様式(未 armed 列挙+復旧手順)は design 段で spawn.sh:581-583 の既習様式に揃える / [e5] 検証は mux attach より前に完了させる実装順序が前提)

## Q4. 修正の適用範囲はどこまでにしますか?

RE の原因所在は「260721-teamup-safety-wait が readiness 検証を Codex 専用に新設し claude 経路へ一般化しなかった設計(一般化漏れ)」です。一方 bugfix スコープは外科的最小変更が既定です。

- A. claude 経路のみ修正する(#1384 の実測被害範囲に限定。codex の初期プロンプト経路は今回触らず、必要なら別 Issue)
- B. claude 経路を修正し、codex 側の同型ギャップ(あれば)は実測のうえ Issue 起票のみ行う(cid:same-root-inventory の棚卸しを要件に含める)
- C. 両 runtime の readiness 検証を今回で統一する(スコープ拡大。bugfix の外科性を超えるため要ユーザー承認)
- X. Other (please specify)

[Answer]: B(E-TPRRA4 裁定 3-0、GoA 1x3、留保なし)
