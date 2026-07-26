# 技術スタック決定 — U3 host-projection-all

> 上流入力(consumes 全数): business-logic-model、business-rules、requirements、technology-stack

## 決定: 既存スタックのみ・runtime dependency 追加ゼロ

`technology-stack.md` の本 intent(`260726-plugin-host-delivery`)差分リフレッシュは「`git diff --name-only 1673c4332..HEAD -- package.json bun.lock` は**出力 0 件**」「新規外部パッケージもゼロ」と実測しており、U3 はこの実測所見のとおり新規外部依存を導入しない。`requirements.md` NFR-3(Bun-only、配布フレームワークへの runtime dependency 追加禁止)を継承する。

- ランタイム: Bun(TypeScript ESM、`technology-stack.md` の「TypeScript / ESM / Bun 直接実行」実測)
- 投影処理: 既存 `scripts/package.ts` 系への編入(`business-logic-model.md` フロー 1/2)。`business-rules.md` BR-U3-1(単一正本)により面別テンプレの手書き複製を作らず、既存 harness-transform を再利用する
- hash 比較: `technology-stack.md` 実測の既存 `--check` byte 比較(`MISSING` / `DIFFERS` / `ORPHAN`)を共有(BR-U3-5 write⇔check 対称)。新規のハッシュ/差分ライブラリを持ち込まない
- 決定理由: `technology-stack.md`「repo 内にチャートライブラリの前例は 0 件」と同型に、投影のためだけの外部依存を追加する前例が無く、既存スタックで完結する方が既習様式と整合する

## 決定: core/harness 境界の維持

`requirements.md` NFR-4 と project.md Mandated のとおり、harness 専用物は `harness/<name>/` へ置き、`packages/framework/core/tools/` へ harness 固有ロジックを漏出させない。U3 の投影ロジックは中立正本 1 つ(`business-rules.md` BR-U3-1)から派生し、クラス別 3 分岐(component-methods.md C3)で面差を吸収する。

- 合否: 新規 runtime dependency ゼロ(`package.json` / `bun.lock` の diff が空 — `technology-stack.md` 実測手順の再現)
- 合否: 投影物は `bun scripts/package.ts` で再生成され `bun run promote:self` で self-install へ同期、`dist:check` / `promote:self:check` の drift ガード green(project.md Mandated・BR-U3-7)

## 代替案と却下理由

- 却下: 面別の独立投影スクリプト新設 — `business-rules.md` BR-U3-1(単一正本)違反。手書き複製は count-free 原則(`requirements.md` NFR-4)に反し保守負債を生む
- 却下: 外部テンプレートエンジン導入 — NFR-3(Bun-only)違反。既存 harness-transform で足りる(technology-stack.md 依存追加ゼロ実測)
