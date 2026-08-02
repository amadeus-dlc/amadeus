# Discovered Rules — 260801-tla-multi-model

上流入力(consumes 全数): `team-practices.md`、4スキャン報告

## 発見規則(証拠付き、新規 affirmation 候補なし — 既存 memory 層と一致)

1. **squash マージ運用**: 直近7日の main への merge commit 0件、PR は単一 squash コミットで着地(pipeline-deploy スキャン実測)。RE の base 選定で「直前 intent の observed が非祖先になりうる」ことの構造的原因。
2. **patch coverage 100% ゲート**: PR diff の計測可能行 0-hit 不許容(quality スキャン、coverage-patch-gate.ts)。本 intent のスキーマ/loader 変更行はすべて新規テストで被覆が必須。spawn 子プロセス(bun --coverage 非帰属)は allowlist 理由クラス。
3. **doc が実装を先行してはいけない**: stages/formal-model-check.md:35-36 が「他の登録ペアを指せる」と未実装の能力を記述(RE 所見)。本 intent で実装と一致させる。
4. **生成物完全性**: dist:check / promote:self:check / distribution:check が drift を強制(devsecops スキャン)。plugin tools 変更は `.kimi-code/` self-install への promote が要るかを実装時に確認(plugin 面は dist 対象外の可能性あり — code-structure.md 現在節の配置判断に従う)。
5. **CI 権限最小**: permissions: contents: read(devsecops スキャン)。formal-model-check ジョブの拡張でも権限追加しない。

## 既存 memory 層との関係

上記はすべて org.md / team.md / project.md の既存内容と一致・増補の範囲。競合する新規候補はなく、本ステージでの affirm 追記は不要(§13 での個別候補化のみ)。
