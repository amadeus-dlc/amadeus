# Application Design 質問 — Election CLI 多問対応

## Context

[Requirements](../requirements-analysis/requirements.md)、CodeKB の [Architecture](../../../../codekb/amadeus/architecture.md)、[Component Inventory](../../../../codekb/amadeus/component-inventory.md) を入力とする。GUI、外部 API、AWS infrastructure は対象外であり、既存の Bun-only layered modular CLI を維持する。full autonomy の裁定ラダーにより、以下を可逆性と既存境界への適合度から決定した。

## Q1: 多問 aggregate の境界をどう置くか？

- A. 一つの Election が stable ID 付き `questions[]` を直接所有する
- B. 親 Election が単問の子 Election 群を束ねる
- C. 単問 Election の連続実行を外部スクリプトで束ねる
- D. store だけ多問化し domain model は単問のままにする
- E. CLI 表示だけ多問化する
- X. Other (please specify)

[Answer]: A（E-OC1: full autonomy。FR-DEF-1 と既存 voter/store/transport 境界を同時に満たし、子 Election 間の分散整合を持ち込まない）

## Q2: schema compatibility をどこで吸収するか？

- A. model/store の versioned decoder で legacy を canonical v2 へ正規化し、内部演算と新規 write は v2 に限定する
- B. CLI 各 verb が legacy/new を個別分岐する
- C. open 時に既存 store を一括変換する
- D. migration CLI の実行を読み取り前提にする
- E. legacy 型を内部演算にも残す
- X. Other (please specify)

[Answer]: A（E-OC1: full autonomy。FR-COMP-1/2 と fail-closed を一つの信頼境界で満たす）

## Q3: mixed result と再実行状態をどこが所有するか？

- A. model が question result と集約 lifecycle を定義し、CLI が directive、store が snapshot/history を所有する
- B. CLI がすべての状態を独自に計算する
- C. store のファイル配置だけで状態を推論する
- D. record prose を状態の正本にする
- E. question ごとに独立 state machine を常駐させる
- X. Other (please specify)

[Answer]: A（E-OC1: full autonomy。既存の model/store/CLI 責務を維持しながら FR-TAL-2 と FR-RER-3 を満たす）

## Q4: append-only result history をどう実現するか？

- A. `tally.json` を canonical current snapshot とし、各確定 run を immutable な `tallies/<runId>.json` に追記する
- B. `tally.json` を毎回上書きし履歴を ledger prose だけに残す
- C. 全 snapshot を単一巨大 JSON 配列へ追記する
- D. Git 履歴だけを result history とする
- E. question ごとに別 Election directory を作る
- X. Other (please specify)

[Answer]: A（E-OC1: full autonomy。既存 read path を段階移行でき、FR-COMP-3 の監査性を機械検証できる）

## Q5: hold-only rerun の orchestration 単位は何か？

- A. CLI directive が `targetQuestionIds` と preserved result digest を返し、ballot coverage と tally をその集合に限定する
- B. 全問を再配布・再投票して established を結果比較で守る
- C. 人間が question text を指定する
- D. 最初の hold 1問だけを扱う
- E. record renderer が対象問を推論する
- X. Other (please specify)

[Answer]: A（E-OC1: full autonomy。stable ID、機械実行可能性、established 不変性を同時に満たす）

## Q6: service / infrastructure を新設するか？

- A. 新設せず、短命 CLI 内の同期的な application service と filesystem adapter を維持する
- B. question ごとの worker service を追加する
- C. AWS queue と object storage を追加する
- D. HTTP API を追加する
- E. database を追加する
- X. Other (please specify)

[Answer]: A（E-OC1: full autonomy。要求に外部 service はなく、AWS/GUI は明示的に out of scope）
