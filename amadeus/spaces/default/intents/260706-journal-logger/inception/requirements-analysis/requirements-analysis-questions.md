# Requirements Analysis Questions — 260706-journal-logger

## 上流入力

[intent-statement.md](../../ideation/intent-capture/intent-statement.md)、[scope-document.md](../../ideation/scope-definition/scope-document.md)、[team-practices.md](../practices-discovery/team-practices.md)、codekb（[business-overview.md](../../../../codekb/amadeus/business-overview.md)、[architecture.md](../../../../codekb/amadeus/architecture.md)、[code-structure.md](../../../../codekb/amadeus/code-structure.md)）。

要求の大枠はディスパッチ・設計確定（feasibility 4 問）・スコープ確定（納品物 5 点）で決着済み。細部 1 問を自己判断（理由付き）で確定する。

## Q1. #556 移行エントリの日付ファイルの扱い

- A. #556 の記録日（2026-07-06）の journal/260706.md へ移行し、エントリに「#556 から移行」の出自を明記する（記録日 = 事実の発生日を保つ）
- B. 移行実施日のファイルへまとめる
- C. その他
- X. Other (please specify)

[Answer]: A（記録日ファイル + 出自明記）。journal は時系列の生ログであり、発生日の保存が参照価値の本体。移行という操作の事実は各エントリの出自表記と decision に残る。自己判断（理由付き）。
