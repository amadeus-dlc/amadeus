# Pi User / Maintainer Guides — NFR Design Questions

## 回答方針

この Unit のengine-resolved `consumes` は空であり、条件付きの `security-requirements` / `tech-stack-decisions` も期待どおり非適用である。これらを再作成せず、承認済みscopeに含まれる日英guide、typed fact/command catalog、supply-chain説明、link/section parityのsecurity designだけを行う。

## Questions and Answers

### Q1. 文書内commandを自由記述shell文字列として管理するか

[Answer]: しない。command ID、argv token、typed placeholder、safety class、前提/結果claimを持つtrusted command catalogを正本にする。rendererがshell dialectごとに表示文字列へ投影し、guide本文からcommandをparseして実行しない。

### Q2. 日英guideで別々のsecurity claimを書いてよいか

[Answer]: だめ。同じtyped fact ID、severity、negation、precondition、evidence referenceをlocale rendererで投影する。trust≠sandbox、autoapprove禁止、Git pin、dependency code execution、backup/credential非開示などのmandatory claimは片方だけ省略・弱化できない。

### Q3. source URLやpathの実例にcredential/local absolute pathを使うか

[Answer]: 使わない。credential-free canonical repository URL、immutable commit placeholder、project-relative pathだけを使う。home、username、token、private installer path、live transcriptはguide、snapshot、link reportへ入れない。

### Q4. ガイドの手順をtestから自動実行するか

[Answer]: read-only commandだけをfixtureで実行できる。install/update/remove/trust操作はtoken構造と前提/結果contractを検証し、production user projectやtrust storeへ自動実行しない。formal live journeyはconformance Unitが隔離fixtureで所有する。

## 曖昧性分析

- material ambiguityはない。
- guideはruntime/package/doctor/evidenceの正本ではなくmachine catalogの投影である。
- ガイド内の「予定」「推測」「固定件数」を正式対応claimとして出荷しない。
- performance/scalability/reliability/logical-components artifactはエンジンがpruneしており、本Unitでは生成しない。
