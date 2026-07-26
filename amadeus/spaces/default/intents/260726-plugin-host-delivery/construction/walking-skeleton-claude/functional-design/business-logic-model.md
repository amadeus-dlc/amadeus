# Business Logic Model — U2 walking-skeleton-claude

> 上流入力(consumes 全数): unit-of-work、unit-of-work-story-map、requirements、components、component-methods、services
> U2 = unit-of-work.md の walking-skeleton Bolt(単独ゲート)。制御フローは story-map ジャーニー 1 の「入れる→使い始める→使う→やめる」を 1 ハーネス(claude)で貫通する。

## フロー 1: 手動 compose(FR-3a — 全クラス共通の床)

```
argv → parsePluginCliArgs(fail-closed)
  → discoverPlugins(pluginsRoot)      … 既存 engine
  → inspectPlugin × n                  … 既存 engine(trust / no-clobber 検査含む)
  → planPluginComposition              … 既存 engine
  → applyPluginPlan(atomic tx)         … 既存 engine(失敗時 runRecovery 経路)
  → 再 compile 起動(既存 amadeus-runtime.ts compile — 新コンパイラなし)
  → PluginCliResult{composed}
```

失敗はどの段でも typed failure → stderr 1 行 loud → exit 1(サイレント失敗禁止 — construction.md Error Handling)。

## フロー 2: 自動 compose(FR-3b claude 面)

```
claude SessionStart hook(settings.json)
  → HookInvocation.command(compose --if-stale)
  → composition record が最新? ──yes→ PluginCliResult{noop}(apply 不到達・数百 ms 目標)
                                └─no→ フロー 1 と同一経路
```

「最新」判定 = composition record の対象プラグイン集合・内容ハッシュが `<harnessDir>/plugins/` の実在物と一致(決定的 — 既存 record の revision / ハッシュ機構を再利用し新判定を発明しない)。

## フロー 3: drop(FR-6)

```
drop <name> → planPluginDrop → applyPluginDrop(atomic)→ 再 compile → PluginCliResult{dropped}
```

最後の 1 plugin の drop 後は 0-plugin baseline へ復元(byte-identical — hash 比較で検証)。

## フロー 4: E2E(walking skeleton の合否そのもの)

1. claude 向け投影成果物(C3 claude 最小面)を self-install ツリーへ配置(= install 相当)
2. フロー 2 を hook 実起動で駆動(verification theatre 禁止 — FR-3b 合否)
3. `amadeus-orchestrate next --stage formal-model-check --single` 相当の到達で compose 済みステージが compiled graph に載っていることを確認(FR-4 統合合否 — composition record 読取配線経由)
4. フロー 3 で drop → baseline 復元を hash 比較

## フロー 5: claude 最小投影(FR-2 claude 面 — C3 の U2 断面)

```
bun scripts/package.ts(既存ビルド経路に編入)
  → discoverPluginSources(中立正本 plugins/<name>/ — 既存)
  → projectPluginForHarness(plugin, "claude", dist/plugins/<name>/claude/)   … U2 で新設する claude projector
      生成物: .claude-plugin/plugin.json+hooks snippet(SessionStart 1 行 — フロー 2 の HookInvocation.command)+plugins/<name>/ 内容
  → 出力先安全検査: 既存投影でない非空 dir / file / symlink outDir を plan 段で拒否(ADR-5 の拒否集合の claude 面最小 — 全集合の実装は U3)
  → 0-plugin 時は本セクション全体が no-op(byte-identical 維持 — FR-2 合否)
```

検証: 生成物の期待位置実在+ハーネス固有トークン置換(FR-2 合否)+0-plugin build の baseline hash 一致。`--check` の stale/orphan 全面編入は U3 スコープ(U2 は claude 面の生成と no-op 保証まで — unit-of-work.md の U2/U3 分担)。

## engine 移設(C2)の実行順(bolt-plan の Bolt 内順序 — リスク制御)

移設(scripts/plugin-composition.ts → core/tools)+import 消費側更新+既存 t252-254 green 確認を**本 Unit の先頭手順**とし、その上に C1/投影/フックを積む。移設は挙動不変(シグネチャ不変)であり、green 確認が挙動不変の実証。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-26T15:51:12Z
- **Iteration:** 1
- **Scope decision:** none

判別 union・既存型非再定義・移設先頭順序・verification theatre 拒否は妥当。Major 1: trace が主張する FR-2(claude 面)の投影ロジックが 3 成果物のどれにもモデル化されていない(E2E 前提扱いのみ)。Minor 1: dropped variant に recompiled 確認フィールドがなく compose⇔drop の型対称性が崩れる。

### Findings

- [Major] U2 FD が C3 claude 最小面(投影の生成・検証)をモデル化していない — FR-2 合否への trace 切れ
- [Minor] PluginCliResult.dropped に recompiled 相当フィールド欠落(symmetric-pair-review)

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-26T15:53:09Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 の 2 指摘は閉包。フロー 5(claude 最小投影)+BR-U2-10 で FR-2 claude 面をモデル化、dropped variant へ recompiled 追加で compose⇔drop 対称性を回復。新規矛盾なし。

### Findings

- None
