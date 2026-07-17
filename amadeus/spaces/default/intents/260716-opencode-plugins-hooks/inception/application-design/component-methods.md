# Component Methods — opencode-plugins-hooks(Issue #1049)

上流入力(consumes 全数): `../requirements-analysis/requirements.md`(FR-1〜5)、codekb の architecture.md・component-inventory.md(re-scan 鮮度確認済み)、`../practices-discovery/team-practices.md`(live 温存)。

## C2(写像 lib)の公開メソッド(狭い API — 情報隠蔽)

| メソッド | シグネチャ(案) | 契約 |
|---|---|---|
| `reconstruct` | `(event: string, payload: unknown) => Reconstruction \| { error: string }` | 純関数。配線済みイベントのみ CoreCall[] を返し、未登録は advisory error(cursor :130 同型)。payload 欠落フィールドは error(汎用入力検証 — 一般則)。**注: AC-3c(machine マーカー判別不能なら mint 配線自体を見送る)は本メソッドのランタイム検証ではなく工程0/ADR-5 の設計判断で充足する — 両者は別物** |
| `toolNameFor` | `(opencodeTool: string) => string \| undefined` | 実測確定値のみの map(AC-2d)。undefined = 配線しない |
| `runPlugin`(entrypoint 側) | `(ctx) => Hooks` | フック登録のみ。例外は catch して stderr 記録(advisory — opencode をブロックしない、AC-2c) |

内部(非公開): machine 注入判定の写像・spawn ラッパ。breachEncapsulationOf 系の公開はしない。

## 契約の検証面

reconstruct の fail-closed(payload 欠落 → error)と advisory reject(未登録語彙)は AC-3a のテスト2系で機械検証する — 消費されない検証フィールドを持たせない(検証劇場回避)。
