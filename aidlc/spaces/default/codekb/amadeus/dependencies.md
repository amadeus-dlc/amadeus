# 依存関係：amadeus

| 依存 | 方向と性質 |
|---|---|
| skill → エンジン | skill（SKILL.md）はエンジン CLI を呼ぶ。逆方向（エンジンが repo 開発スクリプトへ依存）は禁止 |
| エンジン内部 | amadeus-lib.ts がパス解決・状態 I/O のチョークポイント。audit との循環は lazy require で回避 |
| source skill → 昇格先 | promote-skill.ts のみ（手動同期禁止）。検証は test:it:promote-skill |
| 上流 | awslabs/aidlc-workflows（fde1e1af）。適応は parity-map の宣言で追跡（#428） |
| method rules → graph | memory/*.md と phases/*.md は graph compile で rules_in_context へ焼き込み。rules 0 件（memory 実在時）は fail-loud（#491） |
| registry docsOnly → workspace_requires ガード | `declare-docs-only` が書く registry の免除宣言（非空 evidence 必須）を `verifyStageArtifacts` が読み、免除時のみ `GUARD_EXEMPTED` を audit へ記録して完了を許可。宣言なしは従来の拒否経路（#499） |
| reverse-engineering 成果物 → codekb 正準ファイル | record 内 reference-stub（相対リンク + 採用根拠）は validator が参照先の実在を検査。ダングリングは fail（#501） |
| board | ローカル成果物（正）→ Projects v2（鏡）への一方向。逆流なし |
