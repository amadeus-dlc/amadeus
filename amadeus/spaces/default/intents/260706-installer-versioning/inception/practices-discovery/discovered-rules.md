# Discovered Rules — 260706-installer-versioning（Issue #543）

上流入力: [team-practices.md](team-practices.md)、[evidence.md](evidence.md)

## 候補規則（本 Intent の実装で従う。昇格提案はしない）

| ID | 規則 | 証拠 |
|---|---|---|
| DR-1 | installer の出力は起動/終了/summary = `amadeus-install: ` prefix、本体 = `[n/5]` ステップ行の混合形式を維持する | evidence.md E-1 |
| DR-2 | エラーと不在系は `fix: ...` で次の一手を明示する | evidence.md E-2 |
| DR-3 | eval は隔離 tmp workspace を作り、成功・失敗とも片付ける | evidence.md E-3 |
| DR-4 | 冪等性は「同一入力での再実行が同一結果」を eval で直接検証する | evidence.md E-4 |
| DR-5 | manifest 等の新規生成物は amadeus/ 配下に置かない（不可侵） | evidence.md E-5 |

Space memory への昇格提案はない（いずれも既存規約の適用・具体化であり、新規の一般規則ではない）。
