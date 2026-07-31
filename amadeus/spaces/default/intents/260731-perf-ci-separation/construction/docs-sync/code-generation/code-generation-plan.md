# Code Generation Plan — U4 docs-sync

上流入力(consumes 全数): business-logic-model.md、business-rules.md、domain-entities.md(U4 FD)

## 実行計画

1. Bolt 冒頭 dual-key 再 grep で棚卸し鮮度確認(business-logic-model.md ロジック1)
2. domain-entities.md の台帳(✅ 10ファイル)を en/ja 同一コミットで更新(BR-U4-1/2)
3. doc-consuming ガードの grep 確認と green 維持(BR-U4-6)
4. NFR-1(ii) 非退行実測(ロジック3 の run 一意選定+中央値手順)
5. 検証(--ci / typecheck / lint / drift / H2 パリティ / リンク整合)

## 実行形態

swarm(batch 4)worktree 分離、builder subagent 1名、branch bolt-docs-sync。
