# UC001 承認待ちキューを一覧して承認を進める

## ユースケース

Maintainer がゲート審査官として一覧を 1 回実行し、承認待ちの Intent、phase、ゲート、待ち理由を Markdown 表で一望して、承認する対象と順序を決める。

## アクター

- ACT001 Maintainer

## 外部システム

- なし

## 事前条件

- workspace に複数の Intent が存在し、それぞれの `state.json` が validator の構造検査を通る。

## 基本フロー

1. Maintainer は workspace を指定して一覧を実行する。
2. 一覧は `.amadeus/intents/*/state.json` を横断スキャンし、確定済みゲート語彙契約に従って承認待ちを判定する。
3. 一覧は承認待ちの Intent、phase、ゲート、待ち理由を Markdown 表として表示する。
4. Maintainer は表を読み、承認する Intent とゲートを決め、該当 phase の承認作業へ進む。

## 代替フロー

| 条件 | 扱い |
|---|---|
| `state.json` が JSON として解釈できない Intent がある。 | その Intent を読み飛ばすか警告するかは Construction Functional Design で確定した規約に従い、一覧全体は失敗しない。 |
| `.amadeus/intents` が存在しない workspace を指定した。 | 対象外として通知し、実行失敗と区別できる形で終了する。 |

## 対応要求

- R001
- R002
- R004
- R005

## 未確認事項

- 一覧の行の並び順規則は Construction Functional Design で確定する。
