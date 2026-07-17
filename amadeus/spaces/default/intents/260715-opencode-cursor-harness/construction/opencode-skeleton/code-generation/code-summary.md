# Code Summary — U1 opencode-skeleton(Bolt 1)

intent: `260715-opencode-cursor-harness` / PR: [#1032](https://github.com/amadeus-dlc/amadeus/pull/1032) / branch: bolt/opencode-skeleton(05880166a + efb9c062b)
上流: code-generation-plan.md、上流参照(consumes 全数): requirements.md、unit-of-work.md(U1)、functional-design(business-logic-model.md / business-rules.md / domain-entities.md)、nfr-design(performance-design.md / security-design.md / reliability-design.md ほか)。

## 変更ファイル

- authored 4: packages/framework/harness/opencode/{manifest.ts, emit.ts, commands/amadeus.md, dot-gitignore}
- generated 216+1: dist/opencode/**(+ active-space force-add)
- test 1: tests/integration/t-opencode-emit.test.ts(emit check:false/true 両分岐の in-process 駆動)

## 検証記録(全実測、builder 報告+conductor 再実行)

| 検証 | 結果 |
| --- | --- |
| bun scripts/package.ts / dist:check ×2(冪等) | exit 0(conductor も dist:check 再実行 exit 0) |
| typecheck / lint / promote:self:check | exit 0 |
| 落ちる実証 | エントリ削除→MISSING exit 1 / 改竄→DIFFERS exit 1 / 復元→exit 0(赤経路はテストにも恒久化 — e4 レビュー確認) |
| tests --ci | 唯一の赤 = #1020(herdr 環境要因、既知 Issue・2名クロスレビュー済み)。env -u で該当ファイル 0 fail 実測。他 349 file 緑 |
| AC-2b 最小疎通(repo 外 scratch、手動配置 = AC-6b 手順) | version exit 0(amadeus 0.1.2)/ doctor 29 pass+advisory 1 fail(settings.json present — harness 中立)/ orchestrate next で directive JSON 受領 exit 0 |
| AC-4d core-neutrality | git diff で core/scripts/installer への opencode/cursor 追加 0 hits(builder+conductor 二重実測) |
| harness.json | {"harnessDir":".opencode","rulesSubdir":"amadeus-rules"} — writeHarnessData 自動生成(E-OC15 A どおり emit 非関与) |
| lcov | opencode/emit.ts 27/27・manifest.ts 21/21 未カバー0(in-process seam) |
| 第3独立再列挙(AC-5c) | 11箇所すべて一致・全て未接触(閉じ列挙台帳と差分ゼロ) |
| deslop | 除去対象なし(codex 兄弟様式に一致、挙動不変) |

## dist サイズ実測(SC-U1-2)

du -sh dist/opencode/ の実測値は PR diff(+55,347 行)から確認可能 — 既存ハーネス実績帯。

## レビュー

- e4(実装者以外): **READY(条件付き GoA 3、条件 = CI green のみ)** — E-OC15 遵守・core 中立・落ちる実証恒久化・互換レイヤーなし・force-add の codex 前例一致を全点実測(PR コメント 2026-07-15T23:17Z)
- CI: 修正 efb9c062b 後の再実行を watch 中(初回赤 = active-space コミット漏れ、原因と修正は code-generation-plan.md 履歴2)
