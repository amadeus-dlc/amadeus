# Services — 260727-plugin-verb-skills

上流入力(consumes 全数): requirements.md(利用者可視契約)、architecture.md(エントリ3層・exit code 規約の実測)、component-inventory.md(入口の現状)、team-practices.md(trust 不変方針)

常駐サービスは持たない(CLI/スキルのみ)。本書は利用者から見た「入口サービス面」の契約を固定する。

## 入口サービス面(3系統)

| 入口 | 形 | 备考 |
|---|---|---|
| raw CLI | `bun <harness-dir>/tools/amadeus-plugin.ts <verb>` | 既存4 verb+新 install。従来どおり動作(後方互換の削除なし — 既存入口は docs 上「上級者向け」へ位置づけ変更のみ) |
| ユーティリティハンドラ | `/amadeus plugin <status\|compose\|drop\|doctor\|install>` | 新設。exit code・stdout/stderr は raw CLI へ透過委譲 |
| ユーザー起動スキル | `/amadeus-plugin` | 新設(全7面)。status first → 固定 verb 実行のガード付き導線 |

## exit code / 出力契約(全入口で同一 — 委譲透過)

- 0: composed / noop / dropped / status / doctor(健全)/ installed
- 1: failure(stage 明示: discover / trust / plan / apply / recover / **install**)、doctor degraded
- 2: usage-error(stderr に message+USAGE)

## 冪等性・部分失敗(install)

- コピーは一時領域→rename。再実行は stagingEntryState の3値(absent / identical / different)で分岐し、identical は続行(冪等)、different は fail(`--force` のみ置換)
- compose 委譲失敗後の再実行: staging は既に identical → compose のみ再試行される(重複副作用なし)

## セキュリティ/trust

- install は compose の trust 三層(compose/compile/run 検証)へ一切手を入れない。staging へのコピーは信頼判定前の素材配置であり、信頼判定は既存 compose 経路が唯一の門
- スキル/ハンドラは固定 verb の組立てのみ行い、任意コマンド組立てを持たない(argument array 様式)
