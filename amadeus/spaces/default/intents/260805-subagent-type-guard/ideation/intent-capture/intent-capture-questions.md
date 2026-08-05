# Intent Capture — 質問票

- **Intent**: `260805-subagent-type-guard`
- **Stage**: intent-capture (1.1 / IDEATION)
- **Scope**: self-feature / **Depth**: Standard(合計最大8問、追質問込み)
- **Mode**: chat
- **起点**: GitHub Issue [#2279](https://github.com/amadeus-dlc/amadeus/issues/2279)(Issue-first)
- **Mirror Issue**: [#2288](https://github.com/amadeus-dlc/amadeus/issues/2288)
- **測定 ref**: `7060956c5617125dd2f4e284957aa180cb306484`(= `origin/main`、ブランチ `260805-subagent-type-guard`)

## 質問しない事項(Issue #2279 本文で確定済み — 前提として成果物へ反映)

`cid:intent-capture:c1`(事前裁定済みの事項は質問せず前提知識として反映)および
`cid:requirements-analysis:c1-xrev-verdict-not-ruling-authority`(Issue 本文が逐語で指名している
canonical は未裁定ではなく執行事項)に基づき、以下は質問対象から外す。

- 対象範囲 (a)(b)(c) の3点(許可集合照合の advisory 検査 / SUBAGENT イベントへの model 属性 / 必要なら汎用 builder 用の定義済み型)
- 検査は **advisory から開始**する(fail-closed 拒否は「ハーネス組込型の正当な利用まで塞ぐ過剰措置」として Issue が明示的に非採用)
- 許可集合の定義 = `.claude/agents/` の定義済み型 + ハーネス組込型
- 種別 `enhancement` / 優先度 P2

## 質問

(chat モード — 決定が確定した時点で各 `[Answer]:` を書き戻す)

### Q1. この intent の完了地点(スコープの深さ)

Issue の対象範囲は (a) 型の許可集合照合 (b) model 属性の記録 (c) 必要なら汎用 builder 用の
定義済み型の新設 の3点だが、(c) は「必要なら」と条件付き。どこまでを本 intent の完了とするか。

- A. (a)+(b) のみ。検出と可観測化を出し切り、(c) は別 Issue へ回す
- B. (a)+(b)+(c)。ad-hoc 名の受け皿となる汎用 persona まで用意して「正しい起動先」を提供する
- C. (a) のみ先行(検出だけ入れて実態を測り、model 属性は次段)
- X. Other (please specify)

[Answer]: A — (a)+(b) のみ。(c) は別 Issue へ回す。ユーザー承認: 2026-08-05T13:33:00Z(**Mode:** chat / 推奨採用)

### Q2. 成功指標 — 何が達成できたら「監査可能になった」と言えるか

- A. 型未指定・集合外の spawn が起きた瞬間に警告が出ること(検出の即時性)
- B. 任意の期間について「型別・モデル別の spawn 内訳」を1コマンドで出せること(事後集計)
- C. A と B の両方
- D. 上記に加えて、集合外 spawn の件数が運用で実際に減ったことを測れること(再発抑止の実証)
- X. Other (please specify)

[Answer]: C — 検出の即時性と事後集計の両方。D(再発が実際に減った実証)は本 intent の完了条件ではなく運用後の観測とする。ユーザー承認: 2026-08-05T13:33:00Z(**Mode:** chat / 推奨採用)

### Q3. model 属性をどこまで「実効」として追うか(CXR-33 との関係)

クロスレビュー reviewer-2 の C10 実測により、ハーネス間で事情が違うことが判明した:

- **Codex**: hook payload に `model` を既に供給しており、アダプタが逐語パイプで core へ渡している。読んでいないだけ。
- **Claude Code**: SubagentStop payload に `model` が無い。実効モデルは `agent_transcript_path` の先にあるが、
  `CXR-33`(`260713-swarm-driver-migration` の business-rules.md:58)が当該パスの読取・保存を
  confidentiality failure として禁じている。
- 「実効 model」は単一フィールドの複写ではなく `明示指定 > agent 定義の model ピン > セッション継承` の解決結果。

- A. Issue の hedge どおり。供給ハーネス(Codex)では実値を載せ、Claude Code では属性欠落を明示するに留める
- B. CXR-33 を明示改訂し、Claude Code でも transcript からモデル名のみを限定抽出する
- C. 解決可能な範囲(明示指定 / persona の model ピン)だけを「宣言モデル」として記録し、解決不能なものは `inherited` 等で明示する
- D. A を基本線に C を重ねる — 解決順で決まる範囲は載せ、解決不能な場合のみ欠落を明示。CXR-33 は本 intent では触らない
- X. Other (please specify)

[Answer]: D — 解決順(明示指定 > agent 定義の model ピン > セッション継承)で決まる範囲を載せ、解決不能な場合は欠落を明示する。CXR-33 の改訂は本 intent では扱わない。載せられる範囲の確定は RE(2.1)の live payload 実測に従う。ユーザー承認: 2026-08-05T13:40:00Z(**Mode:** chat / 推奨採用)

### Q4. start seam の配線不発をどう扱うか(スコープ)

reviewer-1 の実測: live `.claude/settings.json` に `PreToolUse` エントリが無く
`amadeus-log-subagent-start.ts` はどこからも呼ばれない(`.claude/settings.json.example:60-66` には存在 = drift)。
その結果 `SUBAGENT_STARTED` は単一 intent の60件のみで、**本 Issue が問題視する型未指定199件は
100% が `SUBAGENT_COMPLETED` 行**。ガードを `SUBAGENT_STARTED` だけに置くと動機証拠に対して
一度も発火しない。

- A. 本 intent で start seam の配線回復(settings drift の是正)まで含める。ガードは start 側に置く
- B. 配線回復は別 Issue とし、本 intent のガードは `SUBAGENT_COMPLETED` 側に置く(動機証拠に確実に当たる)
- C. ガードを両方の記録面に置く。配線回復は別 Issue だが、回復後は start 側でも発火する
- X. Other (please specify)

[Answer]: C — ガードを `SUBAGENT_STARTED` / `SUBAGENT_COMPLETED` の両記録面に置く。settings drift(`.claude/settings.json` に `PreToolUse` 不在)の是正は別 Issue とする。理由: B のみだと配線回復後に start 側が無防備、A のみだと動機証拠(型未指定199件は全て completed 行)に当たらない。ユーザー承認: 2026-08-05T13:40:00Z(**Mode:** chat / 推奨採用)
