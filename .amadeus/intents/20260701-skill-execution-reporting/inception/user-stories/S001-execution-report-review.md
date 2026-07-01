# S001: 実行時問題報告レビュー

## ストーリー

- Maintainer として、skill 実行中に見つかった問題や懸念を、現在の Intent に含めるか、後続 Issue 候補にするか、報告不要にするか判断したい。
- それにより、現在の Intent の traceability を汚さず、必要な改善を失わずに扱える。

## 受け入れ条件

- 報告先分類と最低項目が揃っている。
- 現在の Intent へ混ぜる理由、または後続 Issue 候補へ切り出す理由が確認できる。
- GitHub Issue 作成が人間承認付きであることを確認できる。
- source skill、昇格先 skill、eval の整合確認対象が追跡できる。

## 根拠

- [Issue #248](https://github.com/amadeus-dlc/amadeus/issues/248) は、skill 実行中に見つかった問題や懸念を標準化して扱う必要を示している。
- `.amadeus/steering/actors.md` は、Maintainer を Amadeus 本体の方針、PR、merge 判断を行うアクターとして定義している。

## 未確認事項

- なし。
