# Intent Statement — 260821-fmc-retirement

## 解決する問題

formal-model-check(FMC)プラグインは、投資と成果が逆転した状態にある。実測(2026-08-21、origin/main 断面): tools 16,217 行のうち authoring パイプライン約 3,760 行は全履歴で 2 回しか使われず、tla-authoring ステージは 32 intent 中 author-new 完遂 2 件・revise-model 0 件で、2026-08-14 以降 .tla ファイルは一度も増減していない。一方、毎 intent で 2 ステージ(tla-authoring / formal-model-check)が実行され、毎 CI で blocking job が走り、適用性判定・センサー・ノルム群がトークンと時間を消費し続けている。ゴール(形式モデルが増える・更新される)に寄与しない機構が混乱の源になっている。

ユーザー裁定(2026-08-21 実 HUMAN_TURN、逐語): 「今のFMCはゴミです。ないほうが混乱がない。再設計するので、それまでは削除です」「関係するノルムやテストも削除ですね」。

## 意図

**FMC プラグインを完全退役する(再設計までの削除)。** 部分縮退や互換シムではなく、プラグイン・設定・CI・テスト・ノルム・生成物投影のすべてを削除して 0-plugin baseline へ戻す(org.md Forbidden: 要求されない後方互換レイヤー禁止、P5: 古い挙動は削除して置き換える。過去の実装・モデルは git 履歴が保存する)。

## スコープ(削除対象の全数)

1. `plugins/formal-model-check/` 全体(tools 37 ファイル 16,217 行、stages 2、sensor manifest、docs、README)
2. `amadeus/config.json`: `plugin.activation.names` の `formal-model-check`、`plugin.scope-bindings.formal-model-check` 全体
3. `.github/workflows/ci.yml`: formal-model-check job(blocking — `ci-success` の require_result ci.yml:989 を含む配線一式)
4. 参照テスト: `git grep -l "formal-model-check" -- tests/` = **153 ファイル**(削除または FMC 依存部分の除去。t3186×2 / t448-tla-registration / t439 / t445 / t449 / t450 / t-formal-verif 系 / formal スイート等)+ `tests/.coverage-registry.json` regen + coverage-patch-allowlist の該当エントリ整理
5. 生成 runner skill: `/amadeus-tla-authoring`・`/amadeus-formal-model-check`(runner-gen 再生成で消滅、drift guard 整合)
6. `amadeus/spaces/default/specs/tla/`(7 .tla + cfg + model-map.json)— 削除(再設計時の参照は git 履歴。処遇根拠は questions Q2)
7. self-install 投影(`.claude/plugins/formal-model-check` ほか)と全ハーネス dist — `bun run build` 再生成、隔離2回ビルド再現性・source-only 境界・グラフ不変量検査を同一成果物で確認
8. docs 対訳(guide / harness-engineering / reference の FMC 記述)— t3028 docs-sync 整合
9. ノルム整理: team.md 二層検証の形式検証面、project.md の fmc 系 / tla-authoring 系 / bt-ledger-resync の model-map 部分 — 失効 cid の整理は蒸留手順(単独ノルム PR、矛盾監査)に従う
10. 関連 Issue の処遇: #3246(author-new 分離)ほか FMC 系 open Issue — questions Q3 の裁定に従う

## スコープ外

- 再設計(新 FMC)の設計・実装 — 本 intent は削除のみ
- `github-pr-convergence` プラグイン(別物 — #3382 は別エージェント対応中で本 intent 非接触)。ただし同プラグインの models が model-map に持つ pin エントリは model-map 削除に伴い消滅する(consumer は FMC 側のみであることを requirements で実測確認する)
- リリース・publish 等の不可逆外部操作

## 成功基準

- 次の intent の compile で tla-authoring / formal-model-check が stage graph に現れない(0-plugin baseline 復元)
- CI(ci-success 集約)が FMC job なしで green
- `git grep -i "formal-model-check"` が本線コード・テスト・設定・docs で 0 hit(履歴・record・ノルムの経緯記録は除く)
- 隔離2回ビルド再現性・source-only・グラフ不変量・plugin-conformance-e2e が green

## トリガ

技術負債(休眠 3,760 行+実効ゼロの毎 intent / 毎 CI コスト)と、ユーザーによる再設計方針の確定。
