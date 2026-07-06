# Decisions — 260706-installer-versioning（application-design）

上流入力: [components.md](components.md)

| ID | 判断 | 理由と不採用案 |
|---|---|---|
| AD-1 | 単一スクリプト構成を維持し、関数群として追加する | #451 の確立構成。別ファイル分割（不採用）は配布物の形を変え、インストーラ自身の配布・実行を複雑化する |
| AD-2 | 書き込みの単一入口（TrackedWriter）を設ける | ハッシュ計上と 3-way を 3 箇所の書き込み点へ個別に埋め込む案（不採用）は漏れを生みやすい。単一入口は eval でも検証しやすい |
| AD-3 | ThreeWayJudge を純関数にする | 象限判定は本 Intent の中核ロジックであり、eval で全象限を表引きで検証する（bootstrap 含む） |
| AD-4 | 退避 dir は決定論 path（時刻）で遅延作成 | mkdtemp（不採用）は path が予測不能になり、summary 告知・eval 検証・利用者の発見性が悪化する |
| AD-5 | symlinks ステップは追跡対象外 | リンクはハッシュで管理する「内容」を持たない（interaction-spec で確定済みの帰結） |
| AD-6 | settings.json の 3-way は特則とする: 「新内容」は pristine な配布内容ではなく merge(現状, wiring) の結果、「記録ハッシュ」は前回 merge 書き込み内容の値。改変判定（現状 ≠ 記録）時は退避してから merge を適用する | settings.json は利用者所有のマージ対象で、他 3 経路（丸ごと置換）と性質が異なる。mergeSettings 自体が非 hooks キーを保全するため退避は二重の保全。pristine 上書き扱い（不採用）は利用者設定の破壊を意味する |
| AD-7 | copyEngine / copySkills は rm→cp の丸ごと置換からファイル単位（列挙 → 判定 → 書き込み + 削除パス）へ書き換える | 丸ごと置換は判定前に導入先現状を破壊し 3-way と両立しない（§12a 反復 1 Critical）。cpSync 維持 + 事前スナップショット（不採用）は全ファイルの二重読みと一時領域を要し、単一入口（AD-2）の検証性も失う |
