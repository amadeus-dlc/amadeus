# 技術スタック決定 — U2 walking-skeleton-claude

> 上流入力(consumes 全数): business-logic-model、business-rules、requirements、technology-stack

## 依存追加ゼロ・Bun 単独

technology-stack の実測所見「`git diff --name-only 1673c4332..HEAD -- package.json bun.lock` は出力 0 件」「新規外部パッケージもゼロ」「plugin 機構のために runtime dependency を追加せず、Bun/TypeScript と既存 manifest/FS API で実装する」を継承する。requirements の NFR-3(Bun-only、配布フレームワークへの runtime dependency 追加禁止)と一致する。

U2 の実装(engine 移設・CLI 配線・claude 投影・SessionStart フック)は、business-logic-model のフロー 1〜5 が示すとおり全て既存 engine 関数(planPluginComposition / applyPluginPlan / planPluginDrop / diagnosePlugins / runRecovery)と既存ビルド経路(`scripts/package.ts`)の再利用に閉じ、新規の外部ライブラリを必要としない。

- 決定: 新規 runtime dependency を追加しない(合否: `package.json` / `bun.lock` の U2 由来 diff が 0 件)
- 決定: 合成ロジックを再実装せず既存 engine を単一実装として呼ぶ(business-rules BR-U2-1)

## core/harness 境界の維持

requirements の NFR-4(core/harness 境界維持 — harness 専用物は harness/<name>/ へ)を継承する。business-rules の BR-U2-7(移設先頭)のとおり、engine 移設は `scripts/plugin-composition.ts → core/tools` へ行い、旧パスへの互換 re-export を置かない(org.md Forbidden)。claude 固有の投影・フック配線は harness 表層に置き、ハーネス中立正本と混在させない。

- 決定: engine はハーネス中立の core 層へ移設し、claude 固有物は harness 表層へ置く
- 決定: 互換 re-export・移行シムを追加しない(古い挙動は削除して置き換え — org.md Forbidden)

## 配布同期の既存機構踏襲

business-rules の BR-U2-9(dist 同期)のとおり、正本変更は `bun scripts/package.ts` / `bun run promote:self` で dist / self-install を再生成し、`dist:check` / `promote:self:check` の drift ガードで一致を検証する。technology-stack の既存様式(manifest-driven 投影)をそのまま用い、新規の配布ツール・台帳を発明しない(requirements NFR-4 の count-free 原則)。

- 決定: 配布は既存の manifest-driven 投影機構を用い、新規ツール・件数台帳を新設しない
