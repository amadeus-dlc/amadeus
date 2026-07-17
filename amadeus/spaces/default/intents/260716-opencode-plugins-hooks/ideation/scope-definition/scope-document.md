# Scope Document — opencode-plugins-hooks(Issue #1049)

上流入力(consumes 全数): `../intent-capture/intent-statement.md`、`../feasibility/feasibility-assessment.md`(GO 条件・確信度付き写像推定)、`../feasibility/constraint-register.md`(C-1〜C-6)。

## In Scope(Issue スコープ4点の転記+feasibility 精密化)

1. **写像対応表の実測確定**: amadeus core hooks(10ファイル — dist/opencode/.opencode/hooks/ 配布済み)× opencode plugins イベントの対応可否。payload 語彙は @opencode-ai/plugin 公開ソース一次直読で確定(C-4)
2. **薄いアダプタ実装**: 対応可能イベントへ Cursor 同型(adapter+lib)の配線プラグインを `packages/framework/harness/opencode/` に実装、`.opencode/plugins/` へ manifest 経由で配布(C-6)
3. **偽グリーン排除**: 文書化(または一次ソース確定)イベントのみ配線 — 写像不能面は根拠付き「未対応」維持(C-1、HUMAN_TURN 相当の不在可能性を含む — R-1)
4. **機能単位表の更新**: docs per-harness 機能表の「opencode hooks: 未対応」行を実装面の解消 or 根拠付き維持へ

## Out of Scope

1. 全 stage 完全互換・core への harness 分岐直書き(#626 非目標の継承 — C-3)
2. hook による gate 強制の置換(C-2 — ツール所有 emit が正)
3. opencode 以外のハーネスの hooks 変更(Cursor アダプタは参照のみ・非接触)
4. グローバル配置(`~/.config/opencode/plugins/`)への対応 — 配布はプロジェクトローカルのみ(installer の既存配布単位に閉じる)
5. release/npm publish ライフサイクル(release.yml 非接触 — project.md Mandated)

## 受け入れ境界

- 成功の最小形: 写像表が全イベントについて「配線 or 根拠付き未対応」で埋まり、配線分が実測検証済み(偽グリーンなし)であること — 配線数 0 でも表が根拠付きで確定すれば Issue スコープ(1)(3)(4)は充足
- 検証: 既存検証列(typecheck / lint / dist:check / promote:self:check / --ci)+配線分のテスト
