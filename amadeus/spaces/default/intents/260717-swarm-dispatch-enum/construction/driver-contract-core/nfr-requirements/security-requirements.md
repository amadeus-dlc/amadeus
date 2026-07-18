# Security Requirements — driver-contract-core(swarm-dispatch-enum / Issue #1157)

上流入力(consumes 全数): `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。

## 要件

- SNR-1(C-24 承継): resolve の出力・エラーに env の他変数・token・credential を含めない。出力は `AMADEUS_USE_SWARM` の raw 値と許可値列挙のみ(`business-rules.md` BR-7 の様式。受け入れ = 出力形の fixture 検査)
- SNR-2(入力検証): raw 値は検証のみに使い、shell へ再展開しない(コマンド組み立てに raw を埋め込まない — インジェクション面ゼロ。受け入れ = 実装 diff に raw の文字列連結によるコマンド生成なし)
- SNR-3(fail-closed): 未知値で認可的な既定(floor 起動)へ倒さない — `requirements.md` FR-2 の security 面(受け入れ = rejected 経路の副作用ゼロ negative test)

## 検証

- 認証・認可・データ規制は非該当(C-21/C-22 承継、新規データ収集なし)— 明示 N/A
