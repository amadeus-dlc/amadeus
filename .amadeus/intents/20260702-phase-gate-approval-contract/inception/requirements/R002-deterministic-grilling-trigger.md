# R002 決定論的な grilling 起動トリガー

## 要求

phase skill（ideation、inception、construction）の decision review において、前段成果物の未確定事項の文言規約により grilling 起動が決定論的に判定される。

## 背景

現在の decision review には `grill_required` を強制する客観条件がなく、「既存成果物から分かることは質問しない」が抜け道になっている。
前段成果物の未確定事項に「後続 phase で判断する」と記録された項目が残っていても、質問ゼロで通過できる。

## 受け入れ条件

- 前段 phase の必須成果物にある `未確定事項` または `未確認事項` 見出しのうち、「<現在 phase> で判断する」を含む項目が 1 件以上残っている場合は `grill_required` とし、該当項目を一問ずつ確認する規則が、3 つの phase skill（ideation、inception、construction）の decision review 記述に定義されている。
- 後続 phase へ送る未確定事項は「〜は <phase> で判断する。」の形で書くという記録規約が、同じ契約の中に定義されている。
- 判定は文言規約による機械的な一致で行い、エージェントの裁量判断を挟まない。

## 依存

なし。

## 対応する対象境界

- SC-IN-003

## 未確認事項

- なし。
