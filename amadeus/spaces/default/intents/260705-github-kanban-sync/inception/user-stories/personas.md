# Personas（260705-github-kanban-sync）

上流入力: [requirements.md](../requirements-analysis/requirements.md)

## 利用者ペルソナ

### Maintainer（ゲート審査官）

- 1 人で複数エージェント（Claude、Codex）の並行自己開発を監督する。
- 日常の関心は「いま何が動いていて、どこで自分の承認を待っているか」である。
- GitHub の UI（board、Issue、PR）を主要な確認画面として使う。ローカルの grep は最終確認に使いたい。
- 暫定ツールに運用負担（設定、保守、通知対応）を追加したくない。

## 非利用者（明示）

### 実行エージェント（Claude / Codex）

- board を読まない。並行可否判断と情報共有はローカル成果物（`intents.json`、`aidlc-state.md` = 正）で行う（C01、intent-capture learning c2）。
- 関わりは間接的で、成果物を書くと hook がキューへ記録し、セッション終了時に flush が board を更新する。エージェント自身は sync を意識しない。
