# Scope Document — plugin-host-delivery

> 上流入力(consumes 全数): intent-statement、feasibility-assessment、constraint-register
> intent-statement の成功指標 10 項目を IN 境界、非目標を OUT 境界の正とし、feasibility-assessment(Conditional GO)の条件と constraint-register の制約(T1-T9 / O1-O6)をスコープ形状へ反映した。

## IN(本 intent で出荷する)

1. **能力マトリクス(7 ハーネス)** — claude / codex / cursor / kimi / kiro / kiro-ide / opencode の各面について、配布形式・trust 境界と承認方法・compose trigger・root 解決・compose/doctor/drop の利用者操作・degrade 契約を実測で文書化。silent skip 禁止(constraint-register O5)
2. **ハーネス別インストール可能成果物** — `plugins/<name>/` 中立正本からの投影(host manifest、marketplace metadata、hook、プラグイン内容)。同一正本から生成し dist drift ガード対象に含める(T2/T6)
3. **compose の利用者到達経路** — (a) 手動 fallback = 明示 compose コマンド(全ハーネス共通の床)、(b) 対応ホストではフック(SessionStart 相当)からの自動 compose。どちらも既存 atomic compose engine(scripts/plugin-composition.ts)を呼ぶだけ(T4)
4. **compose 後の自動再コンパイル+通常 scope 統合** — stage graph / scope grid の再コンパイル、プラグインステージと additive contribution の通常 scope 実行での利用。再 compose 冪等
5. **doctor 統合** — インストール済みプラグイン、compose 状態、drift、drop された未対応 surface の可観測化(diagnosePlugins の CLI 露出)
6. **drop / 0-plugin baseline 復元** — 対象プラグインの所有物と contribution だけを除去、最後の drop 後は baseline と byte-identical(T3)
7. **formal-model-check activation policy** — application-design の ADR + 承認ゲートで裁定し(intent-capture Q3)、`--single` 必須 UX を解消。TLC コスト制約下で決定的に(T7)
8. **上流 2.3.0 適合テスト** — t188 の 32 ケースを正準とする追跡表(上流ケース ID・期待挙動・Amadeus テスト対応)+ Packaging / Composition / Lifecycle / Harness matrix の自動検証。native hook の実起動(verification theatre 禁止)
9. **docs 同期** — 利用者ガイド(19-plugins)を実装済み install / doctor / drop 手順と一致させる(現状 `docs/guide/19-plugins.ja.md:7` の「全ハーネスへ投影」記述が実装と不一致)
10. **upstream sync レポートの判定根拠拡張** — ファイル差分に加えプラグイン適合テスト結果で追従状態を判定

## OUT(非目標 — 別 intent / 別 Issue)

- プラグイン独自 scope の定義・投影、`adds.scopes` / `adds.requires_stage`、`when:` の一般評価エンジン、agents / memory / knowledge のプラグイン投影、完全な依存解決・lockfile(上流自身が未実装 — intent-statement 非目標)
- #1380(plugin への skills 貢献面)— 隣接するが別 Issue
- ミラー機構の不具合修正(#1547 / #1534)— 運用注意のみ(raid-log I-1)

## スコープ境界の原則

- **利用者体験の最小実行可能単位から逆算**(cid:intent-capture:ux-first-scope-for-distribution-intents): walking skeleton は「Claude Code で install → 自動 compose → 通常 scope 実行 → drop」の利用者 E2E とし、作り手都合の部分配布(投影だけ・エンジンだけ)を skeleton にしない
- **risk-first + 依存優先**(cid:scope-definition:c3): 未実測の外部 seam(能力マトリクス)を最初に潰し、未証明の基盤に依存する価値面を先行着地させない
- 上流よりも trust を弱めない: folder-drop 系ハーネスでも Amadeus の trust grant / no-clobber / atomic 契約を維持(T9、成功指標 5)

## Value Stream(利用者の到達価値)

```
プラグインを選ぶ → ホスト標準機構でインストール → (次セッション起動で自動 compose)
→ /amadeus 通常 scope 実行にプラグインステージ・contribution が現れる
→ doctor で状態確認 → 不要になったら drop → 0-plugin baseline へ復元
```

テキストフォールバック: インストールから利用まで手動手順ゼロ(対応ホスト)、非対応ホストは文書化された 1 コマンドの手動 compose。
