# Business Rules — u001-lifecycle-inputs（260706-lifecycle-inputs）

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)

## 執筆・補正の規則

| ID | 規則 | 由来 |
|---|---|---|
| BR-1 | Inputs 表に書く Artifact は、エンジン実態（stage frontmatter の consumes、rules_in_context、upstream-coverage の参照関係）で実在を確認できたものだけとする。推測で追加しない。 | FR-2.2、ディスパッチ作業指示 3 |
| BR-2 | 実測は 1 ステージずつ frontmatter を読み、抜粋を「実測・補正記録」に残してから表を補正する。記録なしの補正はしない。 | FR-2.3、FR-4.2 |
| BR-3 | 補正は Inputs 整合に必要な最小範囲とする。Outputs・散文は自己矛盾が生じる箇所だけを補正し、全面見直しをしない。 | FR-2.4 |
| BR-4 | GD009 廃止済み参照（15 箇所、requirements.md 前提実測 2）は担当 Bolt で全数補正する: ideation/inception = B002、overview = B001、scopes = B003。 | FR-2.3、FR-2.4、§12a 申し送り |
| BR-5 | 記法定義（B001）が確定するまで B002 / B003 の文書補正を開始しない（Bolt 直列）。 | 束ね判断（ディスパッチ） |
| BR-6 | 本文は日本語のまま書く。記法の固定ラベルには英語対訳を併記し、英語化（#515〜520）が 1:1 置換で成立する形にする。 | FR-1.3、language-policy.md |
| BR-7 | 変更対象は docs/amadeus/lifecycle/ の 6 文書のみとする。エンジン・skill・validator・steering は変更しない。 | requirements.md 制約 |
| BR-8 | path 表記は rename 後（amadeus/、amadeus-state.md、.claude/amadeus-common/）を正とする。文書内に旧 path（aidlc/）を新規に書かない。 | ディスパッチ作業指示 3 |
| BR-9 | frontmatter の `required: true` は「供給元ステージが実行された場合に必須」と読む。供給元ステージが CONDITIONAL または scope で SKIP され得る場合、既存の qualifier 付き表記（`必須（Stage N.M 実行時）`）を frontmatter だけを根拠に畳まない。実測では供給元ステージの `execution` も読む。 | §12a 反復 1 Finding 1、B001 規則 3 |
