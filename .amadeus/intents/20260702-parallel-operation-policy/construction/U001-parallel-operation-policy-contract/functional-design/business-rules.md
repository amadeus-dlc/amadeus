# Business Rules

## 目的

並行運用ポリシーの本文、索引登録、責務分担が満たすべき規則を、文書作成と検証の判定基準として固定する。

## 業務ルール

| 識別子 | 規則 | 根拠 | 状態 |
|---|---|---|---|
| BR001 | policy 本文は `steering/policies/parallel-operation.md` とし、見出し構成は既存 Git Branching Policy の形式（目的、対象、責務分担、判断基準の章、根拠）を踏襲する。判断基準の章は、並行させる単位、共有成果物の統合、ゲート承認の運用、同一 worktree での直列化の 4 つとする。 | R005, [Inception G001 GD001](../../../inception/grillings/G001-policy-placement.md) | accepted |
| BR002 | 判断基準は肯定形の行動指針を先に書き、禁止は実際に起きた失敗に限定する（agent-instruction-rules 準拠）。観察済みの実例に根拠がない規則は書かない。 | R001, R002, R003, R004 | accepted |
| BR003 | 各判断基準の章は、根拠となる観察済みの実例への参照リンク（Intent 成果物、PR URL、decision）を持つ。根拠の対象は、#334 cycle（20260702-shared-index-generation、PR #348）、#350 cycle（20260702-gate-queue-visualization、PR #359）、遡及承認（20260702-construction-internal-next-skill-parent-routing の D003、PR #363）とする。 | R001, R002, R003, R004 | accepted |
| BR004 | 並行判断の基準は、接触面（同一 skill への変更集中、promote 単位の重なり、共有ファイルの同一行）の有無で並行可否を決め、索引行の追加だけの接触は統合手順で解消できる小さい接触として扱う。 | R001 | accepted |
| BR005 | 統合手順は、`origin/main` の追従、共有インデックスの再生成、標準検証の順とする。branch lifecycle（追従の操作自体）は Git Branching Policy の所有とし、再定義しない。 | R002 | accepted |
| BR006 | 承認運用は、承認待ちキュー一覧（`GateQueueList.ts`）による確認、複数件のまとめ承認、承認判断の decision 記録と approval evidence の追加、取り残しの遡及承認を扱う。承認の実行主体は人間のまま変えない。 | R003 | accepted |
| BR007 | 直列化の基準は、同一 worktree 内の Bolt と検証（`test:all` など作業ツリー全体を対象にするコマンド）を直列実行し、並行は worktree 単位で行うこととする。 | R004 | accepted |
| BR008 | `policies.md` の方針または判断基準と `policies/README.md` の登録表に policy への参照を追加し、`git-branching.md` の `責務分担` に相互参照を追記する。追記は相互参照の明記に限定し、既存の判断基準を変更しない。 | R005 | accepted |
| BR009 | validator への個別 policy ファイルの構造検査は追加しない。既存 validator は個別 policy（git-branching.md）の内容検査を持たず、索引（`policies.md`、README）の構造検査で参照の実在が確認できるため。内容妥当性は人間レビューで扱う。 | R005 | accepted |

## 例外

- 並行運用で新しい実例（統合の失敗、想定外の衝突）が観察された場合は、policy の判断基準を実例の根拠付きで更新する。推測での先回り更新はしない。

## 参照リンク方針

| 参照種別 | 表示 | リンク先 | 備考 |
|---|---|---|---|
| ID | Requirement ID、Use Case ID、Unit ID、Bolt ID など | 参照先成果物への Markdown リンク | 参照先が一意に決まる場合だけ扱う。 |
| 成果物名または workspace 内ファイルパス | 成果物名または相対パス | 参照元 Markdown から見た相対 Markdown リンク | 同一ファイル内アンカーは、見出し安定性がある場合だけ使う。 |
| GitHub 上のファイルパスまたはコード参照 | ファイルパスまたはコード位置 | commit SHA 付き permalink | branch URL で代替しない。 |
| PR番号 | PR #123 | GitHub Pull Request URL | PR を言及するときは URL を持つリンクにする。 |
| Issue番号 | Issue #123 | GitHub Issue URL | Issue を言及するときは URL を持つリンクにする。 |

## Intent Contracts

| 識別子 | 種別 | 条件 | 根拠 | 状態 |
|---|---|---|---|---|
| PRE001 | 事前条件 | steering layer の `policies.md` と `policies/README.md` が存在する。 | R005 | accepted |
| POST001 | 事後条件 | policy 本文から 4 つの判断基準が読め、索引から policy へ到達できる。 | R001, R002, R003, R004, R005 | accepted |
| INV001 | 不変条件 | 各判断基準は観察済みの実例への根拠リンクを持つ。 | R001, R002, R003, R004 | accepted |
| INV002 | 不変条件 | git-branching.md の既存の判断基準は変更されない（相互参照の追記のみ）。 | R005 | accepted |

## 未確認事項

なし。
