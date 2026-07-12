# Performance Requirements — metrics-observation

> 数値は強制メカニズムから導出(nfr-requirements:c3 — 照合なしの数値を書かない)。

- **P-1: snapshot job の実行上限 = `timeout-minutes: 5`(強制メカニズム = GitHub Actions の job timeout)** — 根拠: 全 collector は既存出力の読取+軽量走査で、最重量の lizard 実測でも 0.35s(feasibility)。5分は10倍超の余裕を持つ防衛値で、これを超える場合は設計前提(D2: 再実行しない)の破れとして調査対象。
- **P-2: CI 総時間の実質非増** — snapshot job は既存 job と並行しない後段(needs: coverage)だが、ci-success 集約外(U3 設計判断)のため PR のクリティカルパスに影響ゼロ。main push run の壁時計増分は P-1 上限内。合否は「PR run のクリティカルパス構成が本 intent 前後で不変」(ci.yml の needs グラフ diff で機械検証)。
- **P-3: 手動 `--write` はローカルで 10 秒以内**(強制メカニズム = テストの timeout。lizard フル計測が支配項 — complexity-gate フル実行の実績値から余裕設定。超過はテスト赤で検出)。
