# U3 subagent-stats — Reliability Design

**上流入力(consumes 全数)**: `business-logic-model`(エラーモデル表 — 本書の分類の導出元)。条件解決で除外された consumes(`performance-requirements` / `security-requirements` / `scalability-requirements` / `reliability-requirements` / `tech-stack-decisions`)は nfr-requirements SKIP による設計上の不在(directive の `consumes_absent` expected: true)。

**測定 ref**: observed `7060956c5617125dd2f4e284957aa180cb306484`

## fail-open / fail-closed の使い分け(回復可能性による分類)

business-logic-model のエラーモデル表を信頼性統制として確定する:

| 異常クラス | 方針 | 根拠 |
|---|---|---|
| 引数の誤用(未知フラグ・不正 space 名) | **fail-closed**(loud エラー + 非0 exit) | 観測開始前の契約違反 — 誤った走査範囲での「もっともらしい集計」は誤診断を生むため入力契約は硬く |
| データの部分破損(parse 不能行) | **fail-open**(skip + 件数注記、exit 0) | 観測できた範囲内の欠陥 — 1行の破損で全集計を放棄しない。件数は隠さない(0 でも注記行を出す) |
| **シャード実在下の読取失敗**(EACCES・途中 I/O エラー等) | **fail-loud**(`unreadableShardCount` 計上 + path を stderr + 注記行、走査は続行、**exit 非0**) | 観測宇宙そのものの欠け — 集計の診断価値は保ちつつ、script 消費側に「完全な集計」と誤読させない(business-logic-model エラーモデル表の訂正注記 = 本 ND iteration 1 の cross-stage 是正で FD 側に確定済み) |
| 環境差(audit dir 不在・許可集合解決失敗) | **fail-open**(0 件レポート / 台帳のみ縮退 + warnings) | 空 corpus・欠損環境も「観測された事実」として報告する |

3方針の分岐は「回復可能性」と「誤診断リスク」の2軸で単調 — 行レベル(範囲内の欠陥)は open、シャードレベル(範囲自体の欠け)は loud、引数(開始前の違反)は closed。

## 決定性(リトライ・分散パターンの非採用)

- circuit breaker / retry / failover は N/A — ローカル FS の単発読取に過渡故障モデルは適用されない(`nfr-design:c1`)。シャード読取失敗は即座に `unreadableShardCount` + stderr へ計上し、リトライしない(同一実行内で結果が変わる読取は測定 ref の同一性を壊す)
- 同一 corpus + 同一許可集合 + 同一時刻入力 → 同一レポート(compose の純関数性)— 信頼性の中核は決定性

## 部分結果の可視化(無音の禁止)

- 注記行(parse skip / verdict 食い違い / 許可集合 warnings / 読取失敗シャード / 対欠落導出値)は **0 のときも出す** — 「注記が無い」と「注記がゼロ件」を出力上で区別可能にする(BR-U3-5)
- exit code: 行レベルの fail-open(parse skip・warnings)と環境差の fail-open(audit dir 不在の空 corpus・許可集合縮退)のみなら 0 — 観測範囲内の部分欠陥・空の観測は失敗ではない。**読取失敗シャードが1つでもあれば非0**(fail-loud — 観測宇宙の欠け)、引数エラーも非0(fail-closed)— 4クラス全ての exit が本行で確定
