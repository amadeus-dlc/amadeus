上流入力(consumes 全数): code-generation-plan, code-summary

# 性能テスト手順

## 選定判断

**選定なし**。build-and-test:c1 規範(性能検査は承認済み NFR と実在境界へ trace して選定し、戦略名だけで機械追加しない)に従う。本 intent(chore スコープ)は NFR ステージを持たず、変更は CLI 引数解決の追加のみで、性能境界(ループ・I/O 増幅・正規表現の敵対入力面)を導入しない — `extractIntentSelector` は固定トークン照合の plain for ループで、regex-linearity-untrusted-input 規範の対象外(code-generation-plan の設計判断参照)。

## 再判断の条件

将来セレクタ解決がワークスペース走査(intent 列挙等)へ拡張される場合は、その時点の NFR で性能検査を選定する。
