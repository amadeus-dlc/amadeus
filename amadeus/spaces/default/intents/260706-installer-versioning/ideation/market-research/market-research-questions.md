# Market Research Questions — 260706-installer-versioning（Issue #543）

上流入力: [competitive-analysis.md](competitive-analysis.md)、[intent-capture-questions.md](../intent-capture/intent-capture-questions.md)

## 本ステージで確定した事実

- 対話型戦略（dpkg 既定）は非対話 1 コマンド制約により採用不能。実質候補は rpmnew 併置型 / rpmsave 退避型の二択。
- 3-way 判定の共通形（4 象限 + 削除）は全事例で一致しており、そのまま借用できる。
- Issue 提案例の xxx_orig 退避は rpmsave 型に相当する。

## 後続へ引き継ぐ論点（feasibility の実測後、全メンバー同報ピア協議で確定）

| # | 論点 | 候補（先行事例の型） |
|---|---|---|
| Q1 | バージョン表現 | manifest ファイル（版 + ハッシュ表。Maintainer 承認要旨の軸）に、版の値として配布元 commit / semver のどちらを刻むか |
| Q2 | ハッシュアルゴリズム | md5（provenance 実績）vs sha256（parity-baseline 実績）。feasibility で repo 慣行を実測してから協議 |
| Q3 | 改変検出時の戦略 | A = rpmnew/pacnew 併置型（新版を .new 等で併置、既存維持）/ B = rpmsave/xxx_orig 退避型（既存を退避、新版導入）。冪等性との相互作用を feasibility で机上検証 |
| Q4 | 導入先で削除されたファイル | A = dpkg 型（利用者の選択として尊重 = 再作成しない）/ B = 収束型の現挙動維持（再作成）。BR-13（stale 削除）との整合も含む |
| Q5 | 適用範囲 | 全ファイル vs 利用者が触りそうな文書（AMADEUS.md 等）限定。AMADEUS.md 変換生成物のハッシュは生成後の値で管理するか |
