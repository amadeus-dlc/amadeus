# Unit Design Brief: README skill 役割整合

## 概要

この文書は U001 の Unit Design Brief である。

Inception では、README の skill 分類と実在する `amadeus-*` skill の役割をそろえ、Construction で Task 化するための入力を扱う。

詳細な README 文面、差分確認、検証方法は Construction で確定する。

## 設計戦略

README を公開入口の案内として扱うか、内部 skill 一覧も扱う文書として扱うかを先に確認する。

そのうえで、README の Phase Skills、Cross-Cutting Support Skills、Internal Skills の分類と、実在する `amadeus-*` skill の役割を照合する。

互換性維持対象が明示されていない場合は、旧入口、旧名、alias、互換層を追加せず、現在の契約へ寄せる判断を維持する。

## 責務境界

所有するもの:

- README の skill 分類確認。
- 実在する `amadeus-*` skill 一覧との照合。
- 公開入口 skill と内部 skill の説明境界。
- 互換性維持対象の有無確認。

所有しないもの:

- `skill-forge` 本体の変更。
- `amadeus-*` skill 本文の一括リライト。
- validator 契約の破壊的変更。
- example snapshot の一括再生成。

依存してよいもの:

- README の現行分類。
- Domain Map の BC001 自己開発運用。
- `.agents/rules/backward-compatibility.md`。
- steering policy の変更種別ごとの完了条件。

後続で再確認が必要になる条件:

- README に内部 skill を全列挙する必要がある場合。
- 互換性維持対象を追加する必要がある場合。

## 構成候補

| 構成候補 | 役割 |
|---|---|
| README 分類棚卸し | README の skill 分類と実在 skill 一覧を照合する。 |
| 公開入口説明 | phase skill と横断的補助 skill を公開入口として説明する。 |
| 内部 skill 説明 | 内部 skill を workflow から使うものとして説明する。 |
| 互換性境界 | 旧入口、旧名、alias、互換層を追加しない判断を扱う。 |

## データと契約候補

| 種別 | 候補 |
|---|---|
| 入力候補 | README、README.ja、`skills/amadeus-*` 一覧、`.agents/skills/amadeus-*` 一覧、互換性ルール。 |
| 出力候補 | 更新済み README、互換性判断、Construction の検証結果。 |
| 状態候補 | 要求の採用済み、Construction Task の完了、受け入れ状態の検証済み。 |
| 事前条件候補 | Inception gate が passed である。 |
| 事後条件候補 | README の skill 分類と実在 skill の役割を説明できる。 |
| 不変条件候補 | 未記録の互換性維持対象を暗黙に追加しない。 |

## 検証観点

- README の分類が公開入口と内部 skill の境界を誤読させない。
- README と README.ja の説明が対応している。
- 実在 skill 一覧との差が意図した分類として説明されている。
- 互換性維持対象を追加する必要がある場合は、先に記録されている。

## Bolt 分割方針

- B001 は README role inventory を扱う。
- B004 は互換性判断と README 更新後の検証条件を扱う。

## Construction への引き継ぎ

- Functional Design では、README に載せる skill 分類方針と互換性判断を確定する。
- Task Generation では、README 棚卸し、文面更新、互換性確認、検証を Task 化する。
- 実装では、必要な場合だけ README と README.ja を更新する。
- 検証では、対象 Intent validator、必要な diff check、README と skill 契約の照合を実行する。
