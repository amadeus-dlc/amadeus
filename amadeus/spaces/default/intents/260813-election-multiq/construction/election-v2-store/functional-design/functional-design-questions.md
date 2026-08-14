# Functional Design 質問 — election-v2-store

## Context

[unit-of-work](../../../inception/units-generation/unit-of-work.md)、[unit-of-work-story-map](../../../inception/units-generation/unit-of-work-story-map.md)、[requirements](../../../inception/requirements-analysis/requirements.md)、[components](../../../inception/application-design/components.md)、[component-methods](../../../inception/application-design/component-methods.md)、[services](../../../inception/application-design/services.md) を入力とする。U3はfilesystem persistence、dual-read、append-only history、repairを所有する。

## Q1: pending voter fileは何を保存するか？

- A. voterごとのordered ballot events配列。各ballotにresponses[]を完全保存する
- B. 最新responseだけ
- C. questionごとの別file
- D. shared ledgerへ即時追記
- E. record Markdownだけ
- X. Other (please specify)

[Answer]: A（E-OC1: full autonomy。blind laneとappend-only amend historyを両立する）

## Q2: tally history/currentをどう配置するか？

- A. `tallies/<runId>.json`をcreate-only、`tally.json`をatomic current snapshotにする
- B. tally.json上書きだけ
- C.単一巨大配列
- D. Git historyだけ
- E. question別directory
- X. Other (please specify)

[Answer]: A（E-OC1: full autonomy。監査証拠と既存current read pathを両立する）

## Q3: partial failureをどうrepairするか？

- A. 同runId・同canonical bytesなら不足stepだけ再試行し、異bytesならconflict
- B. historyを削除してやり直す
- C.新runIdへsilent変更
- D. snapshotだけ採用
- E. warningで継続
- X. Other (please specify)

[Answer]: A（E-OC1: full autonomy。create-only historyを壊さず前進回復する）

## Q4: legacy readでwrite backするか？

- A. しない。memory内canonicalizeだけ行い、次の明示writeからv2を使う
- B. load時に自動変換
- C. status時に変換
- D. verify時に変換
- E. directory全体を置換
- X. Other (please specify)

[Answer]: A（E-OC1: full autonomy。read-only contractとappend-only historyを守る）

## Q5: state update順序は何か？

- A. history create → current snapshot atomic replace → registry/state compare-and-write → timeline append
- B. stateを先に進める
- C. timelineだけ先に書く
- D.任意順
- E.全fileを非同期並行write
- X. Other (please specify)

[Answer]: A（E-OC1: full autonomy。stateが証拠より先行しないようにする）
