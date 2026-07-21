# Business Rules — routing-and-autonomy-guards

> 上流入力(consumes 全数): `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`。
>
> 設計裁定: E-USSU04FD1 A（Stop hook best-effort stale削除 + doctor read-only、3–0）とE-USSU04FD2 A（upstream同型優先、autonomous時janitor N/A、3–0）。

## Help routing invariants

| ID | ルール | 失敗時 |
|---|---|---|
| BR-U04-01 | 単独`help` / `-h`はglobal helpへroutingする。 | freeform birth候補にしない |
| BR-U04-02 | `intent help/-h`と`space help/-h`はglobal helpへroutingする。 | record switchを試行しない |
| BR-U04-03 | 複数tokenの自由文中の`help`はfreeformのまま保持する。 | intent descriptionを誤分類しない |
| BR-U04-04 | `help` slugはintent/spaceの両作成choke pointで予約拒否する。 | directory/cursor/audit不変 |
| BR-U04-05 | `space-create -h`はslugify前に拒否する。 | `h` spaceを生成しない |
| BR-U04-06 | 未知recordのswitch errorは既存一覧だけを案内し、新規workflow/space作成を誘導しない。 | non-zero、mutation 0 |
| BR-U04-07 | engine parserとterminal classifierは同じhelp decision matrixを共有する。 | parity test失敗 |

## Marker freshness invariants

| ID | ルール | 失敗時 |
|---|---|---|
| BR-U04-08 | marker pathと24時間TTLはcoreの単一定義からStop hook/doctorへ供給する。 | duplicated literalを拒否 |
| BR-U04-09 | `ageMs <= TTL`はfresh、`ageMs > TTL`はstale。未来mtimeはage 0。 | boundary test失敗 |
| BR-U04-10 | fresh markerだけがnon-autonomous interactive stop carve-outを許可する。 | enforcement継続 |
| BR-U04-11 | autonomous Constructionでは先頭returnし、markerを読まず、janitor N/Aでstaleも保持する。 | enforcement継続 |
| BR-U04-12 | stale/unreadable markerはcarve-outに使わない。 | enforcement継続 |
| BR-U04-13 | non-autonomous経路のstale判定後だけ、unlinkをbest-effort janitor outcomeとしてcarve-out decisionと分離する。 | decisionを再評価しない |
| BR-U04-14 | unlink成功は`deleted`、失敗は`delete-failed`として観測し、どちらでもblock判断を同一に保つ。 | fail-open禁止 |
| BR-U04-15 | fresh markerをjanitorが削除しない。 | live gate破壊としてtest失敗 |

## Doctor invariants

| ID | ルール | 失敗時 |
|---|---|---|
| BR-U04-16 | marker absent時はcompose marker rowを出さない。 | output互換性違反 |
| BR-U04-17 | fresh markerはage/fresh label付きadvisory PASSでdoctor exitを悪化させない。 | live gate誤診断 |
| BR-U04-18 | stale markerはage/stale label付きFAILと具体的remediationを返す。 | silent orphan禁止 |
| BR-U04-19 | doctorはfresh/staleを問わずmarker bytes/path/mtimeを変更しない。 | read-only契約違反 |
| BR-U04-20 | probe read失敗は他doctor checksを中断しない。 | doctor全体crash禁止 |

## Recompose invariants

| ID | ルール | 失敗時 |
|---|---|---|
| BR-U04-21 | autonomous Constructionのrecomposeはstate読取直後、計画validation/mutation前に拒否する。 | non-zeroで即時停止 |
| BR-U04-22 | 拒否errorはautonomous理由とgated切替/完了待ちのremediationを示す。 | actionableでないerrorを拒否 |
| BR-U04-23 | 拒否前後でstate、plan suffix、runtime graph、auditをbyte不変にする。 | atomicity test失敗 |
| BR-U04-24 | gatedまたはautonomy field未設定は既存recompose validationへ進む。 | 既存成功経路を阻害しない |
| BR-U04-25 | autonomy guardはRunning/pending/known slug/graph validationを緩和しない。 |既存fail-closedを維持 |

## Decision tables

### Compose marker

| Autonomy | Marker | Carve-out | Janitor | Doctor |
|---|---|---|---|---|
| autonomous | any（未読） | 拒否 | N/A、marker保持 | 独立doctor呼出時は通常判定 |
| non-autonomous | absent | 拒否 | なし | rowなし |
| non-autonomous | fresh | 許可 | 保持 | PASS/read-only |
| non-autonomous | stale + unlink成功 | 拒否 | deleted | 削除前の独立doctorならFAIL |
| non-autonomous | stale + unlink失敗 | 拒否 | delete-failed | FAIL/read-only |
| non-autonomous | unreadable | 拒否 | なし | 他check継続 |

### Help routing

| Input | Result |
|---|---|
| `help` / `-h` | global help |
| `intent help/-h` | global help |
| `space help/-h` | global help |
| `space-create help/-h` | actionable refusal、mutation 0 |
| `help me build auth` | freeform |
| unknown intent/space | safe switch error、creation誘導なし |

## Verification rules

- characterization-first対象のhelp routingは現行成功/失敗経路を先に固定し、不足contractだけをADAPTする。
- fresh保持 / stale削除 / unlink失敗でもblock不変 / autonomous marker未読・保持の4経路は同一fixture familyで対照検証し、E-USSU04FD1 e2 GoA2留保とE-USSU04FD2 Aを回帰契約にする。
- wall clockや実filesystem mtimeへ依存せず、clock/stat/unlinkを注入可能なpure seamで境界値を検証する。
- public error、exit code、stdout/stderr、mutation差分を同時に検査し、messageだけのgreenを禁止する。
- runtime dependency、network、database、UIは追加しない。`dist/`は手編集せずgeneratorで同期する。
