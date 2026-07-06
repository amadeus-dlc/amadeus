# Requirements Analysis Questions：260706-docs-consistency

上流入力: Issue #562 / #576、ディスパッチ定型文（reverse-engineering 宛 decision）、本ステージの直接実測（rollout-plan、skill 42 個の日本語残存、scope-grid、overview / scopes / operation.md / AMADEUS.md）。コードベース全体像は codekb（[business-overview.md](../../../../codekb/amadeus/business-overview.md)、[architecture.md](../../../../codekb/amadeus/architecture.md)、[code-structure.md](../../../../codekb/amadeus/code-structure.md)）を参照した。

## Q1: #562 の確定方式（自己判断。ディスパッチ補足条件の範囲内）

- 判断: 退役（削除、stub なし）とする。
- 根拠: (1) ディスパッチ補足条件「完了済みなら退役が本命」に対し、実測で英語化は実質完了（42 skill 中、日本語残存は正当な維持対象 3 件のみ = domain-modeling のユーザー向け質問例文、validator の日本語見出し・出力フォーマット記述、grilling のテンプレートフィールド名「反映先」引用。reviewer iteration 1 の再実測で 2→3 件へ補正）。(2) 外部参照は 4 件（reviewer-mapping と skill-language-policy の英日 Related documents リンク。当初の「0 件」は grep フィルタの誤りで reviewer が検出）あり、FR-1.2 でリンク除去または退役注記への更新を必須化して削除の影響を封じる。(3) backward-compatibility ルール上、旧計画文書の温存は既定で行わない。gate の人間承認で確定する。

## Q2: #576 の対象範囲（実測により Issue 記載より拡大。gate で人間確定）

- 判断: 対象は「scope-grid 実体と直接矛盾する記述」に限定し、実測で確認した 4 箇所（overview L86 / L270、scopes L41 / L104、operation.md L7 の根拠引用）+ operation-phase-boundary.md の位置づけ（FR-2.4、設計段判断）とする。
- 根拠: Issue は overview + project.md Corrections を挙げたが、実測で project.md に Operation 言及はなく、該当は `memory/phases/operation.md` だった。一方 scopes.md にも同じ矛盾前提が 2 箇所ある。受け入れ条件「scope-grid の実体および steering の運用と矛盾しない」を満たすには scopes.md を除外できない。拡大は矛盾記述の解消に限り、Operation 運用そのものの変更（steering の対象外判断の変更）はスコープ外に保つ。
- 判断者: 範囲拡大は gate 報告で明示し、人間承認で確定する。

## Q3: operation-phase-boundary.md の扱い（設計段へ送る）

- 判断: 位置づけ（「歴史的判断 #394 の記録としての注記」か「steering 判断への移行の明記」か）は requirements 段では固定せず、設計段で参照元（overview.md 英日からのリンク各 2 箇所。scopes.md からのリンクは実測でなし）と文書内容を実測して、リンク更新と一体で決める（FR-2.4）。ただし下限は requirements で確定済み: 位置づけの決定にかかわらず、Decision 節の断定文（it does not treat any stage as an execution target / Stage Progress is always `[S]`）は scope-grid 実体と矛盾しない表現へ補正する。
- 理由: 文書全体の退役まで広げると Issue の受け入れ条件を超える。矛盾解消に必要な最小の位置づけ変更に留める（Right-Sizing）。
