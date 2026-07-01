# R002 stage 前提確認

## 要求

phase skill 起動時に、stage0、stage1、stage2、stage0 採用判断の前提を確認できる。

## 背景

stage2 は次回 stage0 として自動採用しない。

stage2 を stage0 として扱うには、対象 PR の merge、基準 commit、build workspace の参照 commit、人間による stage0 採用判断が必要である。

## 受け入れ条件

- phase skill 起動時に、現在参照している skill が stage0、stage1、stage2 のどれに由来するかを確認できる。
- stage2 の成果物を使う場合、stage0 採用判断の有無を確認できる。
- stage0 採用判断がない場合、その状態を前提不成立として扱える。
- stage 方針は `.amadeus/steering/policies.md` と `.amadeus/glossary.md` の語彙に沿って説明されている。

## 依存

- R001

## 対応する対象境界

- SC-IN-003

## 未確認事項

- stage0 採用判断の証拠を、PR、commit、成果物 path のどの組み合わせで最小化するかは Construction で確定する。
