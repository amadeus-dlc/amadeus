# Requirements Analysis Questions — 260721-teamup-safety-wait

> **E-OC1 判定ヘッダ**: Q1〜Q3 は current run の対象 pane、許可入力、supervisor lifecycle というユーザー可視・安全契約である。leader から 2026-07-21T02:32:50Z に受領した recorded 人間裁定（E-TSWRA1〜3 はすべて choiceInternalNo=1、GoA=1、reservation=null）で確定した。
>
> 上流入力(consumes 全数): `business-overview.md` は利用者価値と current session/run の業務境界、`architecture.md` は Herdr supervisor・完全 fingerprint・TOCTOU 制約、`code-structure.md` は `team-up.sh`・`run-codex.sh`・`team-msg.sh`・関連 tests の所有境界として本文へ反映した。

## Q1. 対象 Codex pane の境界（E-TSWRA1）

自動解除の対象をどこまで含めるか。

A. current run で `team-up.sh` が起動した leader と全 engineer の Codex pane
B. current run の engineer Codex pane のみ
C. current run の leader Codex pane のみ
X. Other (please specify)

[Answer]: A。E-TSWRA1 の recorded 人間裁定（leader 承認 2026-07-21T02:32:50Z）により、current run で `team-up.sh` が起動した leader と全 engineer の Codex pane を対象とする。e1 の original ballot は choiceInternalNo=1、GoA=1、reservation=null として受理された。

## Q2. 許可する入力契約（E-TSWRA2）

既知の `Additional safety checks` UIを検出したとき、対象 pane へどの操作を許可するか。

A. 完全な visible fingerprint が `Keep waiting` の現在選択状態まで安定して証明した場合だけ Enter を1回送る
B. 既知の別選択状態から固定 key で `Keep waiting` へ移動し、再読取後に Enter を1回送る
C. 検出時に警告するだけで入力しない
X. Other (please specify)

[Answer]: A。E-TSWRA2 の recorded 人間裁定（leader 承認 2026-07-21T02:32:50Z）により、完全な visible fingerprint が `Keep waiting` の現在選択状態まで安定して証明した場合だけ Enter を1回送る。e1 の original ballot は choiceInternalNo=1、GoA=1、reservation=null として受理された。

## Q3. Supervisor lifecycle（E-TSWRA3）

起動・再開・rearm・cleanup をどの単位で固定するか。

A. pane ごとの supervisor を fresh/resume で起動し、role 名から pane を一意再解決する。modal 消失確認後のみ rearm し、pane/session/run 終了・`--kill`・rollback で cleanup する
B. session 単一 supervisor が対象 pane を巡回する
C. session で最初の1回だけ解除し、rearm しない
X. Other (please specify)

[Answer]: A。E-TSWRA3 の recorded 人間裁定（leader 承認 2026-07-21T02:32:50Z）により、pane ごとの supervisor を fresh/resume で起動し、role 名から pane を一意再解決する。modal 消失確認後のみ rearm し、pane/session/run 終了・`--kill`・rollback で cleanup する。e1 の original ballot は choiceInternalNo=1、GoA=1、reservation=null として受理された。
