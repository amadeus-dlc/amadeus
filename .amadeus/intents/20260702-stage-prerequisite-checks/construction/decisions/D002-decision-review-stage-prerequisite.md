# D002 decision review stage 前提

## 状態

accepted

## 背景

phase skill 起動時の判断は `amadeus-decision-review` が担う。

stage 前提確認は、処理開始前に確認する入力証拠である。

## 判断

stage 前提確認を `amadeus-decision-review` の入力証拠と判断ノードに置く。

`upstream_feedback_required` を outcome に追加し、前段 phase または前段 stage の不足を現在 phase の補修と分ける。

## 理由

存在しない内部 skill や host environment で使えない skill を前提にした後続作業は、phase skill 起動時に検出する必要がある。

## 影響

`skills/amadeus-decision-review/SKILL.md` と `.agents/skills/amadeus-decision-review/SKILL.md` を更新した。
