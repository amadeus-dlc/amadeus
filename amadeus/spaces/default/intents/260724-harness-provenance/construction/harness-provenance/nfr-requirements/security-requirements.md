# Security Requirements — harness-provenance

上流入力(consumes 全数): business-logic-model.md, business-rules.md, requirements.md, technology-stack.md

## セキュリティ境界

business-logic-model.mdの環境変数入力、business-rules.mdのfail-closed parse、requirements.mdのstate記録契約を対象とする。technology-stack.mdのBun標準`process.env`と既存file writeだけを使い、外部通信・新規credential・追加権限を導入しない。

## 入力・永続化要件

| ID | 要件 |
|---|---|
| SEC-1 | `AMADEUS_HARNESS_TYPE`はexact 7値だけを受理し、未知値・空値は`unknown`へ正規化する |
| SEC-2 | raw override値をstate、memory、audit、stdout、stderrへ出力しない |
| SEC-3 | `AMADEUS_HARNESS_DIR`は既存path seamとして扱い、本機能からfilesystem pathへ展開・書込しない |
| SEC-4 | stateへ保存する値は固定7値だけで、改行・Markdown injectionを含められない |
| SEC-5 | invalid overrideでも例外詳細にraw値を含めず、intent birthを継続する |

## Threat considerations

- **環境変数注入**: 任意文字列を固定unionへ閉じるためstate injectionを防ぐ
- **情報漏洩**: 保存対象はハーネス製品種別だけで、session ID、token、credential、環境変数名以外の値は収集しない
- **path spoofing**: dot-dirは補助シグナルでありsecurity identityとして利用しない。manual override可能であることを文書化する
- **権限昇格**: authentication/authorization判断には使わず、観測情報に限定する

## Compliance

個人情報、認証情報、顧客データ、規制対象データを新規処理しないため、追加の保持期間・暗号化・同意・監査要件はない。既存repository/stateのアクセス制御を継承する。

## 検証

invalid・空文字・改行を含むoverrideが`unknown`のみを生成するnegative testを置く。raw入力が生成stateとaudit shardに現れないことをfixtureで確認する。repository全体のdependency auditに既存advisoryがある場合は本変更起因と分離して報告する。
