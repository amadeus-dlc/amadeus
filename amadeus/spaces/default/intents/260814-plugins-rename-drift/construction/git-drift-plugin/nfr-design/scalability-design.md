# Scalability Design — git-drift-plugin

上流入力: `functional-design/business-logic-model.md`。nfr-requirements は SKIP(expected 不在)。

## スケール軸の評価

- **リポジトリ規模**: 判定コストは変更ファイル数に線形(diff --name-only)。behind が大きい場合も rev-list --count は git 側で効率的。交差判定は集合演算(Set)で O(n)。
- **worktree 並行度**: throttle 記録は workspace 単位のため、並行 worktree が増えても fetch 頻度は workspace ごとに上限化される(clone ごとに独立 — 意図どおり。各 clone は自分の remote-tracking ref を見る)。
- **発火頻度**: PostToolUse(Write|Edit)ごと。ローカル判定のみのため書込頻度への追随に問題なし(performance-design 参照)。

## 非該当項目

- 水平/垂直スケーリング・データパーティショニング・キャッシュ階層: 単発ローカル CLI であり該当なし(1 行理由)。
