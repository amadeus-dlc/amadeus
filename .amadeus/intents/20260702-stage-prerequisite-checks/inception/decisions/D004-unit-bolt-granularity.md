# D004 Unit と Bolt の粒度

## 状態

accepted

## 文脈

要求は、stage 前提確認の入力証拠、decision review と Skill Contract の配置、前提不成立分類、代表例の説明境界に分かれる。

すべてを 1 Unit にまとめると、入力証拠契約と分類境界が混ざる。

すべてを要求ごとに Unit 化すると、Unit が細かすぎる。

## 判断

Unit は 2 件に分ける。

U001 は stage 前提確認の入力証拠と配置を扱う。

U002 は前提不成立分類と説明境界を扱う。

Bolt は 3 件に分ける。

B001 は decision review の判断ノードを扱う。

B002 は Skill Contract と phase skill 反映を扱う。

B003 は前提不成立分類と repo 内代表例の説明境界を扱う。

## 影響

Requirement、Use Case、Unit、Bolt は完全な 1:1 にはならない。

Construction では、B001、B002、B003 を順に Task Generation へ渡す。
