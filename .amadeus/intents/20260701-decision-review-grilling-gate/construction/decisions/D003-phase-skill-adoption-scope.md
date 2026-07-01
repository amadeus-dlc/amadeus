# D003 Phase Skill Adoption Scope

## 状態

accepted。

## 背景

Inception では、公開 phase skill への初期反映対象を Ideation、Inception、Construction に限定した。
Discovery、Event Storming、Steering まで同時に含めると初回 Construction slice が大きくなる。

## 判断

初期対象 phase skill は `amadeus-ideation`、`amadeus-inception`、`amadeus-construction` に限定する。
Discovery、Event Storming、Steering への反映は後続候補にする。

## 根拠

- R004。
- B002。
- U002 Unit Design Brief。

## 影響

B002 は対象3 skill と昇格先 skill の同期だけを完了条件にする。
他の公開入口への横展開は、この Intent の初回 Construction には含めない。
