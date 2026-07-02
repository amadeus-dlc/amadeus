# Business Rules

## 目的

wave 実行契約の skill への定義が満たすべき規則を、文書作成と検証の判定基準として固定する。

## 業務ルール

| 識別子 | 規則 | 根拠 | 状態 |
|---|---|---|---|
| BR001 | wave 実行契約は公開入口 `skills/amadeus-construction/SKILL.md` に 1 箇所で定義し、挿入位置は `内部プロセス` の直後に新見出し `Bolt の wave 実行` を置く。内部 skill の SKILL.md は変更しない。 | R001, [Inception G001 GD001](../../../inception/grillings/G001-contract-placement.md) | accepted |
| BR002 | wave の導出規則は「依存がすべて前の wave までに完了する Bolt の集合を wave 1 から順に導出する」とし、依存に循環がある場合は導出せず `bolts.md` の補修へ戻す。 | R001 | accepted |
| BR003 | wave 並行の適用条件は「依存のない Bolt が複数あり、worktree 分離で実行できる場合」とし、条件を満たさない場合の既定は従来どおりの直列実行のままにする。既存の内部プロセスの順序（5 つの内部 skill を上から順に使う）は Bolt ごとに維持する。 | R004 | accepted |
| BR004 | 並行実行は worktree 分離で行い、同一 worktree 内の Bolt と検証は直列のままにする。worktree の分離と統合の運用は、対象 workspace の steering layer に並行運用の判断基準（steering policy）がある場合はそれに従う、という一般形で参照する。特定 workspace の policy へ固定参照しない。 | R002 | accepted |
| BR005 | wave 完了時は、並行 branch の統合、共有成果物の整合、標準検証の pass を確認してから次の wave へ進む。wave 内の 1 つの Bolt の検証が失敗した場合は、修正して検証を通すまで次の wave へ進まない。 | R002 | accepted |
| BR006 | 同じ wave 内の複数 Bolt は、Bolt 実行準備をまとめて行い、まとめて `ready_for_approval` にして停止してよい。Bolt ごとの Task Generation Gate の契約（`ready_for_approval` 停止、承認 evidence、承認判断の decision 記録）は変更しない。 | R003 | accepted |
| BR007 | wave は `state.json` に新しいフィールドを追加せず、`bolts.md` の依存表と既存の Bolt 単位の状態から導出する順序判断として扱う。 | R004 | accepted |
| BR008 | skill 変更は source skill と昇格先を promote 手順で同期し、標準検証（e2e mock eval を含む）の pass を維持する。 | R004 | accepted |

## 例外

- wave 実行の実運用で新しい観察（統合の失敗、想定外の競合）が得られた場合は、契約を実例の根拠付きで更新する。推測での先回り更新はしない。

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
| PRE001 | 事前条件 | 対象 Intent の `bolts.md` が `依存` 列と `依存関係` 表を持ち、依存に循環がない。 | R001 | accepted |
| POST001 | 事後条件 | wave の統合後に標準検証が pass している。 | R002 | accepted |
| INV001 | 不変条件 | 同じ依存表からは常に同じ wave 分割が導出される。 | R001 | accepted |
| INV002 | 不変条件 | Bolt ごとの Task Generation Gate と内部プロセスの順序は、wave 並行でも変わらない。 | R003, R004 | accepted |

## 未確認事項

なし。
