# Reliability Requirements — u002-kanban-sync-cli

上流入力: [business-logic-model.md](../functional-design/business-logic-model.md)、[business-rules.md](../functional-design/business-rules.md)、[requirements.md](../../../inception/requirements-analysis/requirements.md)

## 要求

N1（冪等収束）が中心の信頼性要求である。加えて、worktree からの実行が他 Intent のカードを古い値へ退行させないこと（部分 sync 限定 + worktree からの `--all` 拒否 = BR-7、D-AD7 改訂 / D-AD11）を信頼性保証に含める。加えて、部分書き込みで終了しても再実行で収束すること（FR-4.2）、失敗が明示的（非 0 exit + 1 段落メッセージ）であることを要求する。鮮度は Synced At で可視化する（FR-3.7）。

## 根拠と検証

requirements.md の N1〜N5 を本 Unit へ具体化したものであり、新しい NFR は追加しない（暫定機構 C07）。検証は build-and-test の TDD と walking skeleton の board 実確認で行う。
