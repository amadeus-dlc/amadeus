# Intent Statement — AI-DLC v2.3.0 相当のプラグイン導入 UX を全ハーネスへ追従(plugin-host-delivery)

> 起点: 旧 Issue #1543(本文はユーザー起草の確定裁定。intent 成立後は破棄可 — 本 intent の Intent Mirror が共有面となる)
> スコープ: `amadeus-feature`(project.md Scope Overrides 既決)

## Problem Statement(解決する問題)

Amadeus は AI-DLC v2.3.0 追従でプラグインの合成・検査・drop の安全機構(アトミック compose、trust grant、drift 検査、doctor/drop)を実装済みだが、上流 2.3.0 が主要価値として提供する**利用者向け導入経路**を追従できていない。

- `scripts/package.ts` はプラグインを `dist/plugins/<name>/` のハーネス中立バンドルとしてのみ出力し、ハーネス別の実ホストプラグイン(`.claude-plugin` / `.codex-plugin`、marketplace metadata、SessionStart compose hook 相当)を生成していない
- compose engine は安全機構を備えるが、通常のインストール・セッションライフサイクルから到達できない
- `formal-model-check` は `scopes: []` + `--single` 専用で、「プラグインのインストールを選ぶ opt-in」と「実行ごとに単独起動する opt-in」が混同されている
- 利用者ガイドの「全ハーネスへ投影する」記述と実際の neutral-only packaging が不一致
- 上流 2.3.0 のプラグイン適合テストに相当する回帰テストがなく、upstream sync 後の機能欠落を機械検出できない

結果として、利用者は「インストールするだけで通常ワークフローが拡張される」上流の想定 UX を得られず、毎回 `--stage formal-model-check --single` の手動起動を強いられる。

## Target Customer(誰が恩恵を受けるか)

- **Amadeus を導入するチーム/個人(6ハーネスいずれかの利用者)** — ホスト標準のプラグイン機構でインストールすれば、SessionStart 等のホストフックが自動 compose し、通常スコープ実行からプラグインステージと additive contribution を利用できる
- **Amadeus 保守者(本チーム)** — 上流ケース ID との追跡表を持つ適合テストにより、今後の upstream sync で機能面の抜け漏れを機械検出できる
- **プラグイン作者** — ハーネス中立の正本 1 つから 6 ハーネスへ投影される配布経路を得る

## Success Metrics(成功指標)

旧 Issue #1543 の受け入れ条件をそのまま成功指標とする。

1. 全 6 対象ハーネス(Claude Code / Codex / Cursor / Kiro CLI / Kiro IDE / OpenCode)の能力マトリクスと設計判断が文書化されている(silent skip なし、非対応は明示 degrade 契約)
2. ハーネス別のインストール可能なプラグイン成果物が生成される
3. 対応ホストでは、インストール後のセッションライフサイクルから compose が自動起動する
4. compose 後、通常 scope 実行でプラグインステージ・contribution が利用できる
5. Amadeus 既存の atomic / trust / drift / drop 安全契約を維持する(0-plugin build は baseline と byte-identical)
6. 上流 2.3.0 テストケースとの追跡表が存在し、対応する Amadeus 適合テストが green である
7. 6 ハーネスの package・compose・lifecycle テストが green である(native hook の実起動 — verification theatre 禁止)
8. `formal-model-check` の activation policy が承認され、`--single` 必須 UX が解消されている
9. 利用者ガイドが実装済みの install / doctor / drop 手順と一致している
10. upstream sync レポートが、ファイル差分だけでなくプラグイン適合テスト結果を根拠に追従状態を判定する

## Initiative Trigger(なぜ今か)

- 直近の upstream-sync(v2.3.0 追従)と tla-plugin intent で compose engine・plugin skeleton が着地し、残る欠落が「利用者向け導入経路」に集約された
- 上流 v2.3.0 の正準資料(Plugin Mechanism doc、test-pro reference plugin、t188 plugin compose integration test)が commit `29a31f78` で参照可能になっており、追跡表を作る条件が揃っている
- 適合テスト不在のまま次の upstream sync を迎えると、機能欠落の検出手段がないままドリフトが拡大する

## Initial Scope Signal(初期スコープ信号)

- スコープ: `amadeus-feature`(Amadeus 自己開発の新機能)
- **1 intent で受け入れ条件全体を扱う**(ユーザー裁定 2026-07-26: 子 Issue 分割はしない。複雑さは units-generation / delivery-planning の Unit / Bolt 分割で吸収する)
- `formal-model-check` activation policy は application-design の ADR + 承認ゲートで本 intent 内に裁定する(ユーザー裁定 2026-07-26)
- 非目標(上流自身が未実装 — 別 intent 扱い): プラグイン独自 scope、`adds.scopes` / `adds.requires_stage`、`when:` 一般評価エンジン、agents / memory / knowledge のプラグイン投影、完全な依存解決・lockfile
- 実装原則: ハーネス中立正本からの投影、ホストフックは既存 atomic compose engine を呼ぶ(弱い合成の重複実装禁止)、compose 後の自動再コンパイル、additive contribution、再 compose 冪等、doctor 可観測、drop 後の 0-plugin baseline 復元
