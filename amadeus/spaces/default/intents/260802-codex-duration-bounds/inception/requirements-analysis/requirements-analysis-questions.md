# Requirements Analysis Questions — Codex Duration Bounds

> E-OC1 証跡: ソロモード。Q1〜Q5 はユーザー本人の HUMAN_TURN 直接回答で確定し、各 `[Answer]` は回答受領後に記入した。leader 承認: 2026-08-02T03:49:20Z

## Upstream Context

`intent-statement`、`scope-document`、`business-overview`、`architecture`、`code-structure`、`team-practices` を入力とする。4 Issue は #1602 → #1998 → #1999 → #1919 の順で、共有core契約とharness capabilityを分離して扱う。

## Q1. 実行相関IDの粒度

stage・agent・toolを同一workloadとして相関しつつ、再試行を区別するID契約をどこまで要求しますか？

A. 共有 `operation_id` を論理実行に1つ、`attempt_id` を各試行に1つmintし、state・audit・runtime graph・OTelで相関する（推奨）
B. `operation_id` だけを持ち、試行番号はaudit順序から導出する
C. stage実行だけIDを持ち、agent/toolは親stageと時刻で相関する
D. 既存session/intent/stage識別子だけを使い、新しいIDは追加しない
X. Other (please specify)

[Answer]: A. 共有 `operation_id` を論理実行に1つ、`attempt_id` を各試行に1つmintし、state・audit・runtime graph・OTelで相関する。

## Q2. 回復可能エラーと停止予算

機械的・一時的なエラーでworkflowを不要に止めず、それでも無限再試行を防ぐ契約はどれにしますか？

A. allowlistされた回復可能エラーだけを別の有界retry budget内で自動再試行し、各試行を記録する。budget超過・未知・state不整合は共有termination reasonで安全停止する（推奨）
B. すべてのエラーを同じ固定回数だけ自動再試行する
C. 回復可能性をLLMが都度判断し、回数上限は置かない
D. 現状どおり最初のエラーで必ずユーザーへ戻す
X. Other (please specify)

[Answer]: A. allowlistされた回復可能エラーだけを別の有界retry budget内で自動再試行し、各試行を記録する。budget超過・未知・state不整合は共有termination reasonで安全停止する。

## Q3. 質問・follow-up・review予算の構造

#1999 の反復予算をどの単位で数えますか？

A. stage instanceごとに質問、follow-up、review iterationを別counterで数え、再開後もdurableに継続し、どれかの超過を共通termination reasonで終端する（推奨）
B. stage instanceごとの単一counterに全対話とreviewを合算する
C. sessionごとにcounterをリセットする
D. stage種別ごとに個別実装し、共有counter契約を置かない
X. Other (please specify)

[Answer]: A. stage instanceごとに質問、follow-up、review iterationを別counterで数え、再開後もdurableに継続し、どれかの超過を共通termination reasonで終端する。

## Q4. swarm Unit poolの待ち行列契約

#1919 のactive slotとretryをどう扱いますか？

A. FIFOの待ち行列、active slot hard cap、Unitごとのdurable attempt countを共有契約にする。queuedはactiveに数えず、再試行も同じUnitの上限を消費する（推奨）
B. active slot hard capだけを共有し、待ち順とretryはdriver任せにする
C. 優先度付きqueueを導入し、Unitごとに動的優先度をLLMが決める
D. concurrencyだけを制限し、retry上限は設けない
X. Other (please specify)

[Answer]: A. FIFOの待ち行列、active slot hard cap、Unitごとのdurable attempt countを共有契約にする。queuedはactiveに数えず、再試行も同じUnitの上限を消費する。

## Q5. 数値上限の確定方法

時間・停止・質問・review・swarmの具体値をいつ、どの証拠で確定しますか？

A. #1602 の固定workload baselineと現行既定値を基にNFRで固定defaultと境界値を決め、設定可能範囲もhard capで閉じる（推奨）
B. 各Boltの実装時に担当者が個別に決める
C. 実行時にLLMがworkloadごとに動的決定する
D. 数値を固定せず、警告だけを出す
X. Other (please specify)

[Answer]: A. #1602 の固定workload baselineと現行既定値を基にNFRで固定defaultと境界値を決め、設定可能範囲もhard capで閉じる。
