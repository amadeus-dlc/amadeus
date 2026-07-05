# Requirements — spaces/default の棚卸しと実態整合（260705-space-inventory）

対象: Maintainer 直接指示（2026-07-05）。`aidlc/spaces/default/` の intents 以外を実態と突き合わせ、ズレを修正する。

## 棚卸し結果（検出したズレの全数）

| # | 場所 | ズレの内容 | 実態 |
|---|---|---|---|
| D1 | memory/development.md:20 | 読むべきファイルに `intents/intents.md` を挙げる | intents.md は GD009 で廃止。正準台帳は intents.json |
| D2 | memory/team.md:292（並行運用ポリシー / 共有成果物の統合） | 「共有インデックス（intents.md）…再生成」 | 同上。現行の共有台帳は intents.json で、衝突解消は entry union（本日 4 回の実績） |
| D3 | memory/project.md:97,109 | Intent 例 `260629-self-dev-steering-layer` | 当該 record は存在しない（実在例: 260705-github-kanban-sync） |
| D4 | memory/project.md 命名規約 | Unit = `Unnn-<slug>`（例 U001-validator-check） | engine の slug 正規化（PR #483）により派生物は小文字。実運用も `u001-registry-issues-field` 形式（#470 で改名実績） |
| D5 | memory/phases/ | .agents/rules/amadeus.md（上流適応ファイル）が @include する {ideation,inception,operation}.md が欠落 | phases/ には construction.md のみ実在。include が壊れ、graph の phase rules も 3 phase 分が phantom 参照になっていた |
| D6 | codekb/amadeus/{architecture,api-documentation,dependencies,code-structure}.md | 廃止済みの intents.md / IndexGenerate.ts を現行機構として記述 | intents.md は廃止、IndexGenerate.ts（skills/amadeus-validator/scripts/）は存在しない |

ズレなしと判定した範囲: knowledge/ 全 6 ファイル（actors / background / context-map / domain-map / external-systems / glossary。旧名前空間・廃止参照・実在しない例のいずれも検出されず）、memory/org.md、memory/phases/construction.md。

## 機能要求

- R001: D1 / D2 の廃止参照を現行契約（intents.json 正準、衝突は entry union で解消）へ更新する。
- R002: D3 の例を実在する record へ差し替える。
- R003: D4 の命名規約を実態（小文字 `unnn-<slug>`、engine の slug 正規化と一致）へ改訂し、根拠（PR #483）を注記する。
- R004: D5 は**実データ側を埋める**: 欠落していた phases/{ideation,inception,operation}.md を construction.md（#485）と同型の phase 防護規定として新設する。参照側（.agents/rules/amadeus.md）は上流適応ファイルで変換同一性が parity 契約のため編集しない（当初案の include 削除は parity fail で棄却。経緯は memory.md の Deviations に記録）。operation.md には「default space は Operation 対象外」の適用範囲注記を含める。
- R005: D6 の codekb 4 ファイルの該当記述を現行事実へ補正し、timestamp.md へ部分補正の履歴（日時と範囲）を追記する（全面再解析はしない = スナップショットの provenance を保つ）。

## 非機能要求

- N1: 変更は docs / memory / knowledge / codekb と参照側 rules に限る（エンジン・validator・skills 非変更）。
- N2: `npm run test:all` の退行なし。graph compile 対象（memory/*.md は rules として焼き込まれる）の変更後は compile 再実行で差分有無を確認する。

## 受け入れ条件

| AC | 内容 | 担保 |
|---|---|---|
| 1 | 棚卸しの全数（ズレ 6 件 + ズレなし範囲）が本文書に記録されている | 本表 |
| 2 | D1〜D6 がすべて修正され、廃止参照・実在しないファイルへの参照が残らない | grep 検査 + PR diff |
| 3 | 既存検証に退行がない | N2 |
