# Performance Test Instructions — CodeKB hygiene verification handoff

## 適用性とtarget

`code-generation-plan.md`のStep 3〜4と`code-summary.md`のMeasurementRef検証を再実行する。常駐service、request endpoint、concurrent user、production-like environmentがないためload / stress / spike / soak testはN/Aである。架空のp95 / p99やwall-clock SLOを設定せず、完全性とboundednessを測る。

- Target paths: 2 / 2。
- Marker fields: 2 path×4 vocabulary=8 / 8、全count 0。
- Heading fields: 2 path×2 category=4 / 4、全count 1。
- Repeatability: 同一SHA・同一patternで12 / 12 equal。
- Complexity: 対象総行数`N`に対する有限回の全数scan、unbounded retry 0。

## 実行方法

1. `git rev-parse HEAD^{commit}`で`MeasurementRef.sha`を固定する。
2. `git cat-file -e "${sha}:${path}"`で2 pathの存在を確認する。
3. `git show "${sha}:${path}"`を使い、各pathで行頭`<<<<<<<`、`|||||||`、`=======`、`>>>>>>>`を独立計数する。
4. 同じblobのH2からlatestと`260715-opencode-cursor-harness` historyを独立計数する。
5. 同一commandを2回実行し、12値をfield単位で比較する。
6. `git merge-base --is-ancestor 5e92d1516ba44856f1ec039e7b1eadebbfb4c8c0 "${sha}"`のverdictをcontent countと別fieldにする。

## Failure handling

Ref解決、path存在、field completeness、count、repeatabilityのいずれかが失敗した場合はpartial resultを捨ててfail-closedとする。別refの値を補完せず、marker不一致はSHA / path / vocabulary / count / file:lineを保持する。`code-summary.md`の旧MeasurementRefは比較証拠であり、fresh値の代理にしない。
