# Security Requirements — goa-sparse-acceptance

上流入力(consumes 全数): `business-logic-model.md` の全体拒否フローと E-code 受理域、`business-rules.md` の BR-4/BR-6〜BR-10、`requirements.md` の FR-1〜FR-3、brownfield 条件の `technology-stack.md` にあるローカル CLI・追加外部依存なしの境界を実依拠として使用する。

## データ分類と脅威境界

入力は version-controlled な memory Markdown と、利用者がローカル CLI へ渡す election ID である。認証情報、個人情報、決済情報、PHI、外部通信、新規永続 store は扱わないため、認証・認可・暗号化・PCI-DSS/HIPAA/GDPR control は本 Unit では N/A とする。適用する STRIDE 面は、入力による tampering（不正 token を正当値として集計）と denial of correctness（抽出漏れ・部分集計）である。

## 要件

| ID | 要件 | 検証 | 根拠 |
|---|---|---|---|
| S-1 | sparse 経路へ入った入力は label、segment、bin、count を parse 境界で全件検査し、重複 label・範囲外/逆順/重複 bin・不正 token・空 segment を fail-closed に拒否する | 4 stable prefix ごとの負テスト。失敗時 `ParseFailure` 以外の成功値を返さない | BR-4/BR-6〜BR-8 |
| S-2 | 1 segment でも不正なら record 全体を拒否し、正当 segment の部分 `votes` を返さない | 正当+不正を混在させた fixture で failure を assertし、部分値の取得経路がないことを型と分岐で確認 | business-logic-model Step 7 |
| S-3 | canonical 候補を sparse と誤分類して受理域を意図せず広げない | `2x...` と `1xz...` が既存 canonical error へ到達する回帰テスト | BR-1、FR-1 |
| S-4 | `GoaLineCode.parse` は複節 E-code のみ受理域を拡大し、小文字・空 segment・先頭/末尾 hyphen・非文字列を拒否する | 正負境界 table test。入力文字列を変換しないことも assert | FR-2、BR-9 |
| S-5 | 新しい credential、network call、runtime log、telemetry、dependency を導入しない | changed-path/dependency diff と `technology-stack.md` の継承表を review | FR-4、technology-stack.md |

## Error と情報開示

エラーは `ParseFailure` の既存型を維持し、`sparse/duplicate-label`、`sparse/bin-sequence`、`sparse/malformed-token`、`sparse/empty-segment` の stable prefix と、呼び出し元が与えた token に基づく診断詳細だけを返す。filesystem path、環境変数、stack trace、別 record の内容を新たに含めない。CLI `handleOpen` は regex 期待形式の説明だけを更新し、内部状態や store 内容を出力しない。

## Compliance 判定

規制対象データ・処理目的・地域間転送が増えないため、新しい compliance framework mapping と retention policy は不要である。既存 repository audit/PR 証跡の保持方針は変更しない。将来、外部入力・個人データ・共有 service 境界へ用途が広がる場合は、本判定を再利用せず新しい threat model と data classification を行う。
