# 外部システム

この文書は、システム外部の連携先を扱う。

外部システムが未確認の場合は、推測で識別子を作らない。

## 一覧

| 識別子 | 名前 | 役割 | 接点 | 状態 |
|---|---|---|---|---|
| EXT001 | GitHub | Issue、Pull Request、review comment、CI 状態を扱う。 | `gh`、GitHub Actions、review thread | 採用 |
| EXT002 | Cursor Bugbot | PR の自動 review comment を投稿する。 | Pull Request review comment | 採用 |
