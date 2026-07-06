# Requirements Analysis 質問（260705-doctor-drops）

対象 Issue: [#432](https://github.com/amadeus-dlc/amadeus/issues/432)

Maintainer の包括委任（sub 割り当て、agmsg 2026-07-05T09:13:58Z）に基づき、推奨案で自己回答する。

---

## Q1. drops の表示形式は？（Issue の未確定事項 1）

A. hook ごとに 1 行: hook 名 + 件数 + 最新 1 件の時刻と理由（recordHookDrop の書式 = `<ISO>\t<reason>` を利用）
B. 全件を列挙する
X. Other (please specify)

[Answer]: A（doctor は 1 検査 1 行の体裁。全件は drops ファイル自体を見れば良く、doctor の役割は「気づかせる」こと）

## Q2. drops がある hook の判定は？（Issue の実施候補 2）

A. fail（pass: false）とし、fix に「理由を確認して当該 .drops を削除する」というクリア手段を書く
B. pass のまま advisory 表示
X. Other (please specify)

[Answer]: A（書き込み専用で誰にも気づかれないことが問題の本質なので、doctor を fail させて表面化する。クリアは調査後のファイル削除 = 明示的な人間操作。Issue の未確定事項 2（古い drops の扱い）は「自動解除しない、削除でクリア」と確定する）
