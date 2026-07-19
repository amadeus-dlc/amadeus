# Intent Statement — mirror-productization

> 上流入力(consumes 全数): なし(intent 起点 — 前提知識は 2026-07-19 standalone grilling 裁定 G-1〜G-7)

## 何を(What)

チームローカル実証済みの `scripts/amadeus-mirror.ts`(intent-first ミラー Issue の create/sync/close、#1222 等で運用実証)を **フレームワーク配布物へ昇格**する:

1. **ツール移設**: 正本を `packages/framework/core/tools/amadeus-mirror.ts` へ移設し全ハーネス dist/self-install へ投影。`scripts/` 版は廃止(二重実装禁止)— G-2
2. **リカバリー SKILL**: `/amadeus-mirror` を薄い user-invocable SKILL として配布 — 新規 `status` verb(読取専用の乖離診断: record 状態行 vs Issue 実態の突合・ミラー未作成検出)を入口に、create/sync/close へ分岐 — G-3
3. **phase 境界ミラー**: engine が phase boundary で「ミラー同期しますか?」の ask directive を発行。auto-mirror 設定時は ask を飛ばし sync 実行の print 指令(run-then-continue)— 新 directive kind なし — G-4
4. **3層設定機構**: GlobalConfig(amadeus/ 直下・git 共有)→ SpaceConfig → IntentConfig の汎用階層解決を新設し、初のキーとして auto-mirror を載せる(既存設定の移行はしない)— G-5b/G-6
5. **ノルム改定**: gh CLI を「配布物でも optional runtime 依存として可(不在・未認証は loud エラーで当該機能のみ不可、workflow は止めない)」へ改定(260717 gh-scripts-boundary 裁定の更新)— G-1

## なぜ(Why)

- intent-first-mirror-issue 運用(record 正本・Issue は共有面)が election intent 等で実証され、ミラーが「フレームワークの標準運用面」になったが、ツール自体は repo ローカル scripts のままで他プロジェクト・他ユーザーに届かない
- ミラーの状態行更新は現在 leader の手動運用 — phase 節目の同期忘れ(#992 クローズ漏れ類型)を構造的に防ぐには workflow への組み込みが必要
- ミラー乖離時のリカバリー(sync し忘れ・手動編集された Issue)に、診断から入れる単独入口(SKILL)がない

## 副作用境界(安全面の確約 — G-7)

auto で無確認実行するのは **sync のみ**(承認済み共有面への冗長更新・低リスク)。create(外部可視の新規作成)と close(不可逆寄り・close-after-landing 検証が別途かかる)は auto 設定下でも必ず ask を残す。

## 成功指標

1. 配布3面(core 正本・dist・self-install)が drift guard(dist:check / promote:self:check)で機械同期される
2. phase 境界のミラー同期漏れゼロ(engine 組み込み後の intent で実測)
3. `/amadeus-mirror status` が乖離3クラス(状態行 stale・ミラー未作成・Issue 手動変更)を検出できる

## 前提知識(grilling 裁定 G-1〜G-7、2026-07-19 ユーザー確定済み)

G-1: gh optional 依存許容(ノルム改定) / G-2: core/tools 移設・scripts 廃止 / G-3: 3 verb+status / G-4: ask+auto 時 print(既存 directive 語彙) / G-5b: 汎用3層 config 新設・初キー auto-mirror / G-6: Global は amadeus/ 直下 git 共有・マシンローカル層なし / G-7: auto は sync のみ

## ideation/design へ委任(grilling で明示委任)

- intent/Bolt 分割(ツール移設+SKILL と engine+config の分離判断)→ scope-definition
- mirror verb の実行主体制約の有無 → design
- 設定ファイル形式(yml/json/md)・SKILL の6ハーネス生成様式 → design
