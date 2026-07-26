# セキュリティ要件 — U1 harness-capability-matrix

> 上流入力(consumes 全数): business-logic-model、business-rules、requirements、technology-stack

## プローブの非破壊性(read-only)

business-logic-model の実測プローブは、リポジトリ内実装(`packages/framework/harness/<name>/` の manifest / hooks / settings)とホスト公式資料の **直読** のみで構成する。business-rules の BR-U1-2(実測性)はセルの根拠を「コマンド出力 or file:line 引用」に限定しており、いずれもホスト状態・ファイルを変更しない読み取り操作である。

- 合否: プローブ手順に含まれる全コマンドが mutation を伴わない(install / compose / drop / 設定書込などの副作用を持たない)。ProbeRecord に記録される command verbatim を §12a で走査し、書込・変更系のサブコマンドが 0 件であることを確認する
- 合否: プローブがホストのプラグイン導入機構を「実際に起動」する場合でも、対象は使い捨ての検査環境に限定し、実 self-install ツリー・record を汚染しない(scratch-script-discipline に準拠)。汚染回避の手順を ProbeRecord に明記する

## 本番経路前処理の再現(前処理等価)

requirements FR-1 合否の「実測プローブは本番経路の前処理を全数再現する(cid:feasibility:probe-preprocessing-parity)」を継承する。business-rules の BR-U1-5(前処理等価)のとおり、composeTrigger の陰性判定は本番経路が行う前処理(例: セッションライフサイクルのフック起動に先立つ delivery mode 設定など)を欠いたまま「不成立」と断定してはならない。前処理を欠いたプローブの陰性は「手順漏れ」として ProbeRecord に残し、判定根拠から除外する。

- 合否: composeTrigger を「不対応」と判定するセルは、本番経路の前処理を再現したプローブに基づくことを ProbeRecord で示す。前処理再現の有無が記録されていない陰性判定は不合格

## 認証情報の非保持

technology-stack のとおり本フレームワークは HTTP・DB を持たず、外部 seam(gh CLI 等)は argument-array で起動する。U1 のプローブがホスト資料・外部サービスへ到達する場合も、requirements NFR-3(Bun-only、runtime dependency 追加禁止)と整合し、資格情報をプローブ記録へ保存・出力しない。

- 合否: ProbeRecord に token・資格情報・provider の生レスポンスが含まれない(§12a の目視+grep 確認)
