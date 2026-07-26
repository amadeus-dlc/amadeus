# Services — metrics 可視化(B1 後続)

上流入力(consumes 全数): requirements.md, architecture.md, component-inventory.md, team-practices.md

## 外部サービス・実行環境

| サービス/環境 | 関係 | 変更 |
|---|---|---|
| GitHub Actions(metrics-snapshot job) | 実行環境(FR-5 の同乗先、component-inventory.md M-4) | ステップ1つ追加のみ。App token・bot PR・auto-merge 経路(ci.yml:464-480)は不変 |
| Codecov | 非接触 | なし(カバレッジ時系列サービスの責務は Codecov 維持 — constraint C7。本件はリポジトリ内台帳の横断表示) |
| GitHub Pages | 不使用 | なし(scope Out 1 / バックログ V1) |
| npm レジストリ | 不使用 | なし(依存追加ゼロ — team-practices.md 対応表) |
| ブラウザ(閲覧) | `file://` でローカル閲覧 | self-contained HTML のため サーバ・ネットワーク不要(requirements.md FR-3) |

## サービス境界の不変条件

- 可視化はネットワーク I/O を一切持たない(生成時: ローカル fs のみ / 閲覧時: file:// のみ)
- CI での失敗は job 赤としてのみ表面化(既存の loud-fail・ci-success 集約外の非対称 — C5 — を変えない)
