# G001: wave 実行契約の定義先

## 概要

- 状態: completed
- 対象: Intent
- 反映先: [requirements.md](requirements.md)

## 確定判断

| ID | 判断 | 状態 | 反映先 | 置き換え先 |
|---|---|---|---|---|
| GD001 | wave 実行契約（導出、実行、統合、まとめ承認の順序）は公開入口 `amadeus-construction` の SKILL.md に定義し、内部 skill の契約は変更しない。 | active | [R001-wave-derivation-contract.md](requirements/R001-wave-derivation-contract.md)、[R004-serial-execution-compatibility.md](requirements/R004-serial-execution-compatibility.md) | なし |

## 質問記録

### Q001

- 確定判断: GD001
- 確認したいこと: wave 実行契約を公開入口 `amadeus-construction` に定義するか、内部 skill（bolt-preparation、implementation-execution）へ分散するか。
- 確認が必要な理由: 定義先が Unit の実装対象（どの SKILL.md を変更するか）と Bolt 分割を決めるため。
- 推奨回答: 公開入口 `amadeus-construction` に定義する。
- 推奨理由: 親 skill の責務は「プロセスの順序を決め、内部 skill を呼び出す」ことであり、複数 Bolt の実行順序（wave）の判断は親の責務に一致する。内部 skill へ分散すると wave の全体像が分散し、契約の定義元が 2 箇所になる。
- ユーザー回答: 公開入口 `amadeus-construction` に定義する。
