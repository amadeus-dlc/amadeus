# External Dependency Map

**上流入力(consumes 全数)**: `requirements`(Out of scope の行き先 Issue と AS-1〜3)/ `components`(外部入力面 — E-3/E-4 の seam 座標)/ `unit-of-work`(Unit との対応 — E-1/E-2 が U2 の started 面、E-5 が U3 の集計に対応)/ `unit-of-work-dependency`(U3⊥U2 の独立実測 — E-5 の「依存の向きが逆」の根拠)/ `unit-of-work-story-map`(リリース刻み — E-5 の設計入力になるのは U3 完了後の集計出力という時系列の根拠)

**測定 ref**: observed `7060956c5617125dd2f4e284957aa180cb306484`

## 外部依存の全数

| # | 依存先 | 性質 | 本 intent への影響 | ブロッカーか |
|---|---|---|---|---|
| E-1 | [#2303](https://github.com/amadeus-dlc/amadeus/issues/2303)(D-1: SUBAGENT_DISPATCH_TOOL 不一致) | 兄弟 Issue(未着手) | started 面の Claude Code 発火はこの修正後。本 intent の started 配線は payload 形状テスト + kimi 経路で検証し、修正を**待たない** | **No**(CON-2) |
| E-2 | [#2297](https://github.com/amadeus-dlc/amadeus/issues/2297)(D-2: settings drift) | 兄弟 Issue(未着手) | 同上(E-1 と両方の修正で Claude Code の started が発火し始める) | **No** |
| E-3 | Codex CLI の payload `model` 供給 | 外部ハーネス seam | fixture(0.137.0 捕捉)契約でテスト。live(0.146.0)差異は欠落明示へ安全退化 | **No**(AS-1) |
| E-4 | Claude Code の組込型語彙(`Explore`/`Plan`/`general-purpose` 等) | 外部ハーネス seam | 台帳(count-free)の追記で追随。語彙変化は警告過多として顕在化(無音で壊れない — ADR-2) | **No** |
| E-5 | [#2298](https://github.com/amadeus-dlc/amadeus/issues/2298)(汎用 builder persona) | 後続 Issue | 本 intent の集計(U3)が #2298 の設計入力になる — 依存の向きは**逆**(こちらが供給側) | **No** |

## 結論

Construction をブロックする外部依存は**ゼロ**。E-1〜E-4 はすべて fail-open / fixture 契約 / 台帳追記で吸収済みの設計であり、待ち合わせは発生しない。
