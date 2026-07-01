# D003 Skill Contract alignment

## 状態

accepted

## 背景

decision review は Skill Contract を入力証拠として扱う。

stage 前提確認を decision review だけに置くと、契約生成物や evaluator の入力から漏れる。

## 判断

Skill Contract catalog に stage 前提確認の事前条件と feedback 条件を追加する。

Ideation、Inception、Construction の phase skill 起動時説明にも同じ確認観点を追加する。

## 理由

stage 前提確認は、実行順序としては decision review に近く、契約境界としては Skill Contract に近い。

両方へ接続することで、phase skill 起動時の実行順序と生成物の契約をそろえられる。

## 影響

`amadeus-contracts/catalog/skills.ts`、生成物、phase skill の source と昇格先成果物を更新した。
