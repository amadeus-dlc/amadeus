# Scope Definition 質問 — 260803-pi-harness

> E-OC1 証跡: 全2問ともユーザー本人のHUMAN_TURN直接回答。合意サマリのユーザー承認タイムスタンプ: 2026-08-03T07:55:13Z（「1」= 確認OK）
> モード: Guide me（対話式）
> 上流入力: `intent-statement`を採用。`feasibility-assessment`と`constraint-register`は本workflowでskipされたため未生成
> 事前整理済みの裁定（質問対象外）:
> - Must: Piネイティブskill、extension lifecycle adapter、human gate、subagent、installer、doctor、`dist/pi`、文書、決定的適合テスト、TUI dogfood、自動live journey
> - Must: setup CLIとPi Packageの二重導入経路、および両経路のparity
> - 正式対象はPi Coding Agent 0.83.0以上。`pi-agent-core`単体の独立埋め込みAPIと、証明されていない旧版互換は対象外
> - セッションskillとstage runnerは、Piで非互換と判明しない限り生成器の標準セットを全量同梱する
> - 順序はwalking-skeleton-first + risk-first + dependency-first。extension event→監査→human gate→停止/継続→subagentの縦断を先に証明する
> - ハードデッドラインは提示されていないため、品質ゲートを優先する。期限が追加された場合は正式なscope changeとして扱う

## Q1. Piで正式保証するsubagent範囲

Pi本体はsubagentを組み込み機能として提供しないため、Amadeus側のextension/driverから子PiプロセスまたはSDK sessionを起動する必要がある。どの経路までを今回のMustにするか。

- A. 全経路（推奨）: stageのsupport/reviewer agentとConstruction swarmの両方をPiネイティブdriverで保証し、親子関係・role・終了状態・失敗伝播を適合テストする
- B. stage subagentまで: support/reviewer agentは保証するが、Construction swarmは後続intentへ送る
- C. single-agentのみ: subagentは今回の正式保証から外す
- X. Other（自由記述）

[Answer]: A — 全経路。stageのsupport/reviewer agentとConstruction swarmの両方をPiネイティブdriverで保証し、親子関係・role・終了状態・失敗伝播を適合テストする（2026-08-03、Guide me）

## Q2. Pi Packageの公開範囲

`pi install -l ./path`またはgit sourceで導入できるPi Package互換生成物の作成・実機検証と、公開npm registryへのリリースは別の外部境界である。今回どこまで含めるか。

- A. release-readyまで（推奨）: Pi Package互換の生成物、local/git導入、parity、文書、実機検証までをMustにする。npmへの実公開は通常のリリース手続きへ委ねる
- B. npm実公開まで: 実装・検証に加え、公開npm registryへのパッケージ公開も完了条件にする
- C. manifestのみ: Pi Packageの構造だけ追加し、`pi install`の実機導入検証は後続intentへ送る
- X. Other（自由記述）

[Answer]: A — release-readyまで。Pi Package互換生成物、local/git導入、parity、文書、実機検証をMustとし、公開npm registryへの実公開は通常のリリース手続きへ委ねる（2026-08-03、Guide me）
