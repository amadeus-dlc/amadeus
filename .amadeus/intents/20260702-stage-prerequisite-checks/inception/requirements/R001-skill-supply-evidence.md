# R001 skill 供給元証拠

## 要求

phase skill 起動時に、source skill、昇格先成果物、host environment での利用可否を入力証拠として区別できる。

## 背景

source skill が存在しても、昇格先成果物へ反映されていない場合は host environment で使えるとは限らない。

また、昇格先成果物が target workspace に存在していても、build workspace がその成果物を stage0 として採用しているとは限らない。

## 受け入れ条件

- phase skill 起動時の判断材料に、source skill の存在を確認する項目がある。
- phase skill 起動時の判断材料に、昇格先成果物の存在を確認する項目がある。
- phase skill 起動時の判断材料に、host environment での利用可否を確認する項目がある。
- source skill と昇格先成果物の同期状態を、host environment の利用可否と混同しない。

## 依存

なし。

## 対応する対象境界

- SC-IN-001
- SC-IN-002

## 未確認事項

- host environment の利用可否を、どの実行結果または参照状態で証拠化するかは Construction で確定する。
