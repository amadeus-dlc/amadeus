# Business Rules

## 目的

README skill 役割整合の判断規則と Intent Contracts を定義する。

## 業務ルール

| 識別子 | 規則 | 根拠 | 状態 |
|---|---|---|---|
| BR001 | README は phase skill と横断的補助 skill を公開入口として示す。 | R001, UC001 | accepted |
| BR002 | 内部 skill は、通常の公開入口ではなく workflow family として説明する。 | R001, UC001 | accepted |
| BR003 | 明示的な互換性維持対象がない場合は、旧入口、旧名、alias、互換層を追加しない。 | R004, UC004 | accepted |
| BR004 | README と README.ja は、skill 分類と skill-forge 確認方針を対応させる。 | R001, R005 | accepted |
| BR005 | README だけを変更して、skill 契約や昇格先成果物の確認を省略しない。 | R005, UC004 | accepted |

## 例外

| 条件 | 扱い | 根拠 |
|---|---|---|
| 内部 skill を明示的に使う作業である。 | 公開入口ではなく、明示された内部 skill として扱う。 | R001 |
| 互換性維持対象を追加する必要がある。 | 実装前に `docs/backward-compatibility.md` へ対象、維持理由、終了条件を記録する。 | R004 |

## Intent Contracts

| 識別子 | 種別 | 条件 | 根拠 | 状態 |
|---|---|---|---|---|
| PRE001 | 事前条件 | README と実在する `amadeus-*` skill 一覧を参照できる。 | R001 | accepted |
| PRE002 | 事前条件 | 互換性維持対象の有無を確認できる。 | R004 | accepted |
| POST001 | 事後条件 | README から公開入口と内部 skill family を区別できる。 | R001 | accepted |
| POST002 | 事後条件 | 互換層を暗黙に追加していないことを説明できる。 | R004 | accepted |
| INV001 | 不変条件 | 内部 skill を全て公開入口として扱わない。 | R001 | accepted |

## 未確認事項

なし。
