# Constraint Register — plugin-host-delivery

> 上流入力(consumes 全数): intent-statement
> intent-statement の実装原則・非目標を制約として具体化し、リポジトリの既決ノルム(memory 層)と突き合わせた台帳。

## 技術制約

| # | 制約 | 根拠 |
|---|---|---|
| T1 | Bun 単独ランタイム・配布フレームワークへの runtime dependency 追加禁止 | project.md Forbidden(affirmed 2026-07-07) |
| T2 | 正本は `plugins/<name>/`(ハーネス中立)+ `packages/framework/{core,harness}/`。`dist/`・self-install は生成物で手編集禁止、同一変更でコミット間整合 | project.md Forbidden/Mandated |
| T3 | 0-plugin build は従来 baseline と byte-identical(上流の「Reversible & inert when off」と同値) | intent-statement 成功指標 5、上流 doc |
| T4 | compose はいまある atomic engine(`scripts/plugin-composition.ts`)を唯一の合成実装とし、ホストフックはそれを呼ぶだけ — 弱い合成の重複実装禁止 | intent-statement 実装方針 3 |
| T5 | harness 専用ツールは `packages/framework/harness/<name>/tools/`+harnessFiles 投影に置く(core/tools は全ハーネスへ漏出する) | project.md cid:code-generation:harness-tools-placement |
| T6 | drift ガード(dist:check / promote:self:check)はハーネス投影後のプラグイン成果物にも維持され、path 変更案は維持方法を同一成果物に書く | project.md Mandated |
| T7 | TLC 探索は高コスト — formal-model-check を既存スコープへ無条件追加しない。activation policy は決定的に設計し ADR で承認 | intent-statement(`formal-model-check` の扱い)+ 二層検証態勢(cid:build-and-test:two-layer-verification-posture) |
| T8 | 上流 `when:` 未評価・plugin scope 未実装を前提にする(追従しない — 非目標) | intent-statement 非目標 |
| T9 | プラグインは `core/` ファイルを編集しない(上流 "No plugin edits a core/ file" と Amadeus の no-clobber を両立) | 上流 doc §4、既存 compose engine の no-clobber |

## 組織・運用制約

| # | 制約 | 根拠 |
|---|---|---|
| O1 | ソロモード運用 — 選挙系ノルムは適用外、未決・仕様変更・不可逆はユーザーエスカレーション | team.md Operating Modes |
| O2 | `amadeus-feature` スコープ = walking-skeleton gate 有効。最初の Construction Bolt は小さな E2E スライスでゲート | project.md Mandated(affirmed 2026-07-25) |
| O3 | Bolt 単位 PR + スカッシュ、人間承認マージ。Bolt 実装は worktree 分離(solo-bolt-worktree-required) | org.md / project.md |
| O4 | リリース(version bump / tag / publish)は release.yml のみ — 本 intent の PR はバージョン面に触れない | project.md Mandated |
| O5 | 対象ハーネスは 7(claude / codex / cursor / kimi / kiro / kiro-ide / opencode)。silent skip 禁止 — 非対応面は明示 degrade 契約として文書化+doctor 可観測 | feasibility-questions Q1 裁定 2026-07-26 + intent-statement |
| O6 | 認可・trust に関わる変更は directive contract / state transition / audit invariant / race / harness drift のテストで検証 | project.md Mandated(affirmed 2026-07-25) |

## 規制・コンプライアンス

該当なし(OSS 開発フレームワーク。外部データ処理・PII なし)。trust 境界(プラグインの信頼承認・path escape 拒否・clobber 拒否)は規制ではなく product の安全契約として requirements で固定する。

## 外部依存の検証状態(feasibility:c1 — 実ツール検証)

| 依存 | 状態 |
|---|---|
| 上流一次資料(Plugin Mechanism doc / test-pro README / t188) | commit `29a31f78` の raw を直読済み(2026-07-26)。t188 = 32 ケース列挙取得済み |
| 各ハーネスのネイティブ plugin/hook 機構 | リポジトリ内のフック面実在は確認済み(7/7)。**ホスト側の導入機構(marketplace 等)の語彙・実挙動は未実測** — 能力マトリクスの実測が確定条件(external-seam-vocab-measurement 準拠、✅ 確約はしない) |
| gh / GitHub | 到達性・認証は本セッションで実測済み(Issue 操作・Mirror #1545 作成成功) |
