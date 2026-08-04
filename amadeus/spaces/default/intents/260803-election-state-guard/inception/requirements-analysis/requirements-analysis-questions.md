# Requirements Analysis 明確化質問 — 260803-election-state-guard(Issue #2125)

上流入力(consumes 全数): business-overview.md、architecture.md、code-structure.md

## 選挙不要判定の証跡(cid:requirements-analysis:no-election-judgment-gate / eoc1-evidence-in-questions-header)

本質問群は**エージェント選挙にかけない**。判定と根拠種別:

- Q1〜Q4: **ユーザー専権**(エスカレーション正準リスト(4)仕様変更 — ユーザー可視の CLI 契約とテスト契約の改訂を含むため、メンバー・選挙のいずれでも決定しない)
- Q5〜Q6: **ユーザー専権**(スコープ裁定 — `cid:requirements-analysis:issue-selection-user-decides` により何に着手するかはユーザーが決める)

ソロモードのため leader 承認は不要(conductor がユーザーへ直接エスカレーションする)。

ユーザー承認: 2026-08-03T12:02:13Z（guided モードで対話し、Q1〜Q6 および追加の Q7〜Q10 について「推奨でいい」との裁定を受領）

## 質問

### Q1: 修正の3面(a)(b)(c)のうち、本 intent のスコープに含める範囲は?

RE で確定した3面は役割が異なり代替関係にない。(b) verb 側の fail-closed な state ガード / (a) `tallied` の append 点を `report` 側へ移す / (c) `verifySelf` に kind 順序(state 機械 legality)の検査クラスを追加。(a)(b) は将来の混入防止、(c) は既存の破損記録7件を検出する唯一の面。

- A. (a)(b)(c) すべてを本 intent で実装する
- B. (b) のみ — 最小の fail-closed 化で混入を止め、(a)(c) は別 intent へ
- C. (b)+(a) — 混入防止を完結させ、検出機構 (c) は別 intent へ
- D. (b)+(c) — 混入を止めつつ既存破損を可視化し、対称性の是正 (a) は別 intent へ
- X. Other (please specify)

[Answer]: A. (a)(b)(c) すべてを本 intent で実装する。3面は役割が異なり代替関係にない((a)(b)=将来の混入防止、(c)=既存破損7件を検出する唯一の面)。いずれも同じ4ファイル群を触るため同一 intent が効率的。Q7 の裁定により (c) の実現方式が確定したため実装可能。

### Q2: `notify` / `tally` の fail-closed 化は既存テスト契約の改訂を伴う。どこまでを本 intent で改訂してよいか?

`t236-election-loop.integration.test.ts` は現在の無ガード挙動に依存しうる assert を持つ(`:440` distributed 件数2 / `:577` notify 後0件 / `:587-590` / `:636-638`)。`t235-election-store.integration.test.ts:222,239-240` は state を明示設定せず `materialize` を直呼びしている。`cid:reverse-engineering:c1-pinned-behavior-ruling` により、テストで固定された挙動の変更は実装段でなく要件段で裁定する。

- A. 必要な範囲のテストを本 intent で改訂してよい(改訂理由を要件へ明記する)
- B. 既存テストを壊さない実装に限定する(壊れる面は実装せずスコープ外へ送る)
- C. `t235` のみ改訂可(永続化層の直呼びテスト)、`t236` の CLI ループ契約は不変とする
- D. 改訂の可否を実装段で individual に停止して都度裁定する
- X. Other (please specify)

[Answer]: A. 必要な範囲のテストを本 intent で改訂してよい(改訂理由を要件へ明記する)。cid:reverse-engineering:c1-pinned-behavior-ruling が求める「要件段での契約明示改訂」を本裁定で成立させる。

### Q3: `materialize` への state ガードは永続化層と CLI 層のどちらに置くか?

`Store.materialize`(`amadeus-election-store.ts:676-715`)に置くと `t235:222` の直呼びテストが破れる。`handleTally`(`amadeus-election.ts:457-467`)に置くと `Store` は永続化に徹したまま入口で止まるが、`Store` を直接使う経路は無防備のままになる。

- A. CLI 層(`handleTally` / `handleNotify`)に置く — 層の責務境界を維持し、既存テストへの影響も最小
- B. 永続化層(`Store.materialize` / `appendTimeline`)に置く — `Store` を直接使う経路も守れる
- C. 両層に置く(CLI 層で早期拒否、永続化層で最終防御)
- D. `appendTimeline` 自体に「許可された state × kind」の表を持たせ、4呼出し元すべてを一箇所で守る
- X. Other (please specify)

[Answer]: A. CLI 層(handleTally / handleNotify)に置く。層の責務境界(Store は永続化に徹する)を維持し、t235:222 の直呼びテストを壊さない。production に Store を直接使う他経路は存在しない。

### Q4: `tally` / `notify` の exit code 契約変更をユーザー可視の仕様変更として扱うか?

現在は state 不一致でも exit 0 で成功する。fail-closed 化すると `invalid-transition` 系で exit 1 を返すようになる。

- A. 仕様変更として扱い、要件へ受け入れ基準(exit code と stderr 文言)を明記する
- B. 欠陥の修正(文書化済み仕様への回復)として扱い、契約変更とは見なさない
- C. 仕様変更として扱うが、移行期間として警告のみ出して exit 0 を維持する段階を設ける
- X. Other (please specify)

補足: `cid:requirements-analysis:escalation-canonical`(4)は「既存の要件・ユーザー可視契約・挙動を変更したい場合はユーザーへエスカレーション」と定め、「バグ修正=文書化済み仕様への回復は該当しない」としている。本件がどちらかの判断を求める。

[Answer]: A. 仕様変更として扱い、要件へ受け入れ基準(exit code と stderr 文言)を明記する。移行期間(警告のみで exit 0 維持)は org.md Forbidden の「要求されていない互換レイヤー」に当たるため設けない。

### Q5: late レーンの判定軸(`amadeus-election-store.ts:605`)を変更するか?

現在は **state のみ**を見て tally.json の存在を見ないため、「tally.json は存在するが state は collecting」の窓で後着票が late レーンを迂回する。

- A. (b) のガードで窓自体を消し、`:605` は無改修とする(変更面を最小化)
- B. 判定軸に tally.json の存在を併用する(`state !== "collecting" || tally.json 存在` で late 扱い)— 窓が再発しても票は正しく分類される
- C. 両方(窓を消し、かつ判定軸も二重化する)
- X. Other (please specify)

[Answer]: A. (b) のガードで窓自体を消し、amadeus-election-store.ts:605 は無改修とする。判定軸の二重化は変更面を広げるうえ、窓が消えれば不要。

### Q6: `ElectionState` の二重定義を本 intent で単一源へ寄せるか?

型定義(`amadeus-election-model.ts:39-46`)と実行時 set(`amadeus-election-store.ts:272-280` の `VALID_STATES`)が同じ語彙を二重に持つ。本 intent の患部ではないが同一ファイル群に触れる。

- A. 本 intent のスコープ外とし、別 Issue として起票する
- B. 本 intent で単一源へ寄せる(state ガード追加時に両方を触るため同時が効率的)
- C. 起票もせず現状のまま(実害が観測されていない)
- X. Other (please specify)

[Answer]: A. 本 intent のスコープ外とし、別 Issue として起票する。ElectionState の二重定義は本 intent の患部ではなく、同時に触ると変更面が膨らむ。

### Q7: (c) kind 順序検査は timeline 単独では実現不能。どう実現するか?

hold から collecting へ戻る解決値(block:reopen / quorum-short:resume-collecting / discussion-needed:discussed)が存在し、その後の再 tally は**正当な2件目の tallied** を生む。しかし timeline の kind は distributed/ballot/tallied/late の4種のみで(`amadeus-election-model.ts:175`)、state 遷移も reopen も記録されない。

- A. tally.json の resolutions(reason / resumedTo / at)を verifySelf へ渡して判定する
- B. timeline に遷移イベント(reopen/resumed 等)の kind を追加する
- C. 「tallied の後の distributed」のみを違反とし、tallied の重複自体は見ない
- D. (c) を本 intent から外す
- X. Other (please specify)

[Answer]: A. tally.json の resolutions を verifySelf へ渡して判定する。resolutions には既に reason / resumedTo / at が揃っており、resumedTo === "collecting" の解決が時刻 T にあれば「T 以降の2件目の tallied は正当」と機械判定できる。verifySelf は純関数のまま引数が1つ増えるだけで fs も clock も持ち込まない。B は version-controlled な append-only 成果物のスキーマ変更で既存263件の読み取り互換検証を要し self-fix スコープに重すぎる。C は実測7件のうち3件しか捕捉できず検出力が半減する。

### Q8: (c) 導入後、既存の破損記録で verify が finding を返す。どう処理するか?

- A. 既知の破損として台帳化し、verify は台帳の7件を finding から除く
- B. finding を返すままにする
- C. 新規選挙のみを検査対象にする(enforcement cutoff)
- X. Other (please specify)

[Answer]: A. 既知の破損として台帳化する。反証確認の結果、**全選挙記録を verify する CI は存在しない**(tests/ の election 系はいずれも一時ディレクトリの fixture を使い、実 `amadeus/spaces/default/elections/` を走査するのは elections.json の実在確認のみ)ため即時の CI 赤は生じないが、台帳化により7件を名指しで可視化できる。enforcement cutoff は日付以前を一律免除するため、古い記録に後から見つかる別種の破損まで隠す。記録の遡及改変をしない方針とも両立する。

### Q9: (b) で notify を open 限定にすると collecting 中の再送が塞がれる。どうするか?

team.md の dispatch-ack-required は「3分で ack が無ければ再送(最大2回)」を規定し、選挙の配信も対象。

- A. open + collecting を許可し、tallied 以降を拒否する
- B. open 限定にする
- C. collecting 中の notify は実行を許すが timeline へ append しない
- X. Other (please specify)

[Answer]: A. open + collecting を許可し tallied 以降を拒否する。dispatch-ack-required の再送規定と両立し、実測された異常(E-TCRRA1 の tallied 4日後の distributed ×3)は tallied 以降の拒否で捕捉できる。subagent transport では notify が唯一の配信手段のため open 限定は運用を壊す。

### Q10: late 迂回の真の影響が確定した。重大度を見直すか?

実測により **materialize は ledger.ballots のみを固定し late を集計に入れない**(`amadeus-election-store.ts:707`)ことが確定した。よって迂回の真の影響は「本来除外される票が算入され、集計結果が実際に変わる」こと。

- A. S2-CRITICAL へ引き上げ
- B. S3-MAJOR のまま(ただし Issue 本文の影響記述を訂正)
- C. P を P1 へ引き上げ
- X. Other (please specify)

[Answer]: B. S3-MAJOR / P2 のまま維持し、Issue #2125 本文の影響記述を訂正する。S2-CRITICAL は「回避策なし」が条件だが本件は指令ループを守れば発現せず、発現には規律違反と late 票到着の重なりが要る限定条件で、実測7件でも裁定結果は全件不変だった。P の引き上げは修正 intent が既に走っているため運用を変えない。ただし本文の「再審査トレイルが消える」だけでは影響を過小に記述しているため、集計結果が実際に変わる旨へ訂正する。
