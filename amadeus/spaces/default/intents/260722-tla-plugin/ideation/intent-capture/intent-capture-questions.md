# Intent Capture 質問 — 260722-tla-plugin

> E-OC1 証跡: ソロモード・選挙不要判定(根拠種別: 全5問ともユーザー本人の HUMAN_TURN 直接回答 — Grill me 対話で1問ずつ回答を受領)。合意サマリのユーザー承認タイムスタンプ: 2026-07-22T11:18:31Z(「はい、確定」)
> モード: Grill me(grilling-protocol.md 準拠 — 質問は1問ずつ動的に追記される)
> 事前整理済みの裁定(前提知識として質問対象外):
> - 二層検証態勢(cid:build-and-test:two-layer-verification-posture、user decision 2026-07-22): 日常CIはPBT/unit/integration、並行プロトコルのspec変更時のみ形式検証を追加。一律義務化しない。
> - PBTオラクル相殺(cid:build-and-test:pbt-oracle-cancellation): TLA 7/7 vs PBT 3/7 の実測根拠。
> - intent記述で確定済み: formal-model-check ステージ新設(プラグイン供給・opt-in)、.tla別ファイル化、run-model-check.ts へのTLC実行コア一般化、formal-verification.yml 退役→ci.yml 統合、完備性sensor新設。

## Q1. 本intentの成功指標(何をもって完了とするか)

事実(自己調査): TLAモデルは tla-arm.ts:329 に文字列埋め込み。run-model-check.ts は未存在。formal-verification.yml は workflow_dispatch 専用スケルトン。

- A. エンドツーエンド動作(推奨): .tla外部ファイル化された選挙プロトコルモデルを run-model-check.ts で完全探索でき、ci.yml 統合ジョブが green、完備性sensorが欠落を実際に検出(落ちる実証)する
- B. 機構の設置のみ: ステージ・ツール・sensorが存在しCIが通ればよく、実モデルの完全探索実行は将来intentに委ねる
- C. 完全移植: A に加え、実験資材(arm-s系・eligibility系)の整理・退役まで含めて完了とする
- X. Other (please specify)

[Answer]: A — E2E動作(.tla外部化モデルの完全探索 + ci.yml統合ジョブ green + 完備性sensorの落ちる実証)(2026-07-22, Grill me)

## Q2. 実験資材(arm-s系・eligibility系・run-skeleton-ci.ts)の扱い

事実(自己調査): scripts/formal-verif/ に35ファイル。うち arm-s-*(PBT側)、eligibility*(適格性判定)、run-skeleton-ci.ts(スケルトンCI)は実験専用。tlc-toolchain 系はTLC実行コアとして run-model-check.ts の一般化元になる。

- A. 保持(推奨): 実験資材はそのまま残し、本intentでは触らない(run-model-check.ts は tlc-toolchain 系を再利用して新設)。退役判断は将来intentへ
- B. 本intentで退役: 実験専用資材を削除し、tlc-toolchain 系のみ残す
- C. アーカイブ移動: experiment/ 配下等へ移動して整理
- X. Other (please specify)

[Answer]: A — 保持(退役は将来intentで判断。run-model-check.ts は tlc-toolchain 系を再利用して新設)(2026-07-22, Grill me)

## Q3. formal-model-check ステージの「プラグイン供給・opt-in」の具体形

事実(訂正済み・自己調査): プラグイン機構は実在する(docs/guide/19-plugins.md)。`plugins/<name>/plugin.json` が stages(新ステージファイル)・seams(既存ステージの produces/consumes/sensors/required_sections への追記)・fragments を宣言し、パッケージャが全ハーネスへ投影、compose/doctor/drop のライフサイクルを持つ(リファレンス: test-pro、t254)。初回提示の「プラグイン機構は現存しない」は誤りで、ユーザー指摘により訂正(scopes 合成は plugin の見送り面という制約は実在)。

- A. plugins/ バンドルとして供給(推奨): formal-model-check ステージ+完備性sensor(sensors seam)を `plugins/<name>/` にオーサリングし、compose で opt-in、drop で可逆除去(intent 記述どおり)
- B. コア同梱・scope外: stage ファイルをコア framework に同梱し scopes: 空で opt-in
- C. 新設 scope で供給
- X. Other (please specify)

[Answer]: A — plugins/ バンドル供給(formal-model-check ステージ+完備性sensorを plugins/<name>/ にオーサリングし compose で opt-in)(2026-07-22, Grill me、初回提示の事実誤りをユーザー指摘で訂正後の再提示に対する回答)

## Q4. 完備性sensor(モデル完備性)の検査対象

事実(自己調査): 既存sensorは4種+answer-evidence。plugin は sensors seam で既存ステージへ sensor id を追記できる。TLC実行は「宣言済み有限domainの固定点まで完走した completion marker + state統計」が NOT_DETECTED 主張の条件(cid:application-design:finite-exploration-not-detected-proof)。

- A. モデル⇔実装の対応完備性(推奨): .tla モデルが宣言する検査対象(不変量・状態機械)と、対象実装のspec面(選挙プロトコル等)の対応が登録簿で追跡され、spec変更時にモデル未更新を検出する
- B. 実行結果の完備性: TLC実行が完全探索を完走したこと(completion marker・state統計・fail-closed)を機械検証する
- C. 両方: A+B を単一sensorまたは2sensorで実装
- X. Other (please specify)

[Answer]: A — モデル⇔実装の対応完備性(spec変更時のモデル未更新ドリフト検出。実行完全性は run-model-check.ts の fail-closed 責務)(2026-07-22, Grill me)

## Q5. 本intentで .tla 外部ファイル化・完全探索する対象モデルの範囲

事実(自己調査): 実験で形式化済みなのは選挙プロトコル(FormalElection、tla-arm.ts 埋め込み)のみ。二層検証態勢(既決)は「選挙・監査ロック・provenance など状態機械/相互排除の不変量」を形式検証の対象クラスと定めるが、モデルの実装順は未決。

- A. 選挙プロトコルのみ(推奨): 実験済みの FormalElection を外部化・移植して E2E を成立させる。監査ロック・provenance のモデル新規作成は将来intentへ
- B. 選挙+監査ロック: 相互排除の代表として監査ロックモデルも本intentで新規作成
- C. 3対象すべて: 選挙・監査ロック・provenance を揃える
- X. Other (please specify)

[Answer]: A — FormalElection 1本のみ(実験済みモデルの外部ファイル化のみ。仕組みは複数モデル対応の汎用設計とし、他プロトコルのモデル化は将来intentへ)(2026-07-22, Grill me。回答前に2回の明確化対話あり: (1) TLA検査は運用モード非依存でソロでも実行可能 (2) 選挙は実験の題材であり TLA+ 自体は汎用技法 — の2点を説明のうえ確定)
