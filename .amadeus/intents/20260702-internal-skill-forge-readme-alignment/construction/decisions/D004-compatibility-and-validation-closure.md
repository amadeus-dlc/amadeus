# D004 互換性と検証の閉じ方

## 状態

accepted

## 判断

互換性を保つため、今回は skill 本文、metadata、validator 実装、昇格先成果物を変更しない。

Construction の完了判断は README 差分、Amadeus 成果物、PR #289、Validator、contract check、diff check で行う。

## 根拠

要求 R004 は既存利用者の起動契約を壊さないことを求めている。

README の説明追加だけで目的を満たせるため、skill 本文変更は不要である。

## 影響

PR #289 を作成した。

PR URL があるため、Construction の `pr.md` を作成する。

そのため、state.json の Construction は `completed` と `passed` にする。
