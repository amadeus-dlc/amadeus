上流入力(consumes 全数): requirements, architecture, component-inventory, team-practices

# Component Dependency — 260725-kimi-harness

> 上流入力の使用箇所: requirements.md の FR 全件を依存関係の出発点とし、architecture.md / component-inventory.md の現行節(3閉集合・packaging flow・amadeus-harness.ts 移管)を経路設計の根拠として使用。team-practices.md の Walking Skeleton(最初の Bolt = C1)より、C1 が他 component への実行時依存を持たない最初の配送単位であることを確認した。

## 依存マトリクス

| 依存元 | 依存先 | 種別 | 方向の正当性 |
|---|---|---|---|
| C1 manifest | scripts/manifest-types.ts(型のみ) | コンパイル時 | 全ハーネス共通 |
| C2 adapter | core hooks(`.kimi-code/hooks/amadeus-*.ts`) | 実行時 subprocess | adapter → core の一方向(09-porting 契約) |
| C2 lib | core hooks への変換表 | ロジック | 同上。core は kimi を知らない |
| C3 domain/kimi-hooks | C1 の snippet 正本 | データ参照 | snippet は dist に同梱され単一ソース |
| C3 modules/kimi-hooks | setup 既存 ports(tty/apply-write/fsops) | 呼出 | 既存流儀の再利用(kimi 独自経路なし) |
| C4 doctor arm | C2/C3 の成果物(adapter 実在・managed block 有無) | 検査 | 検査は実在を見るのみ |
| C6 live driver | kimi バイナリ + dist/kimi 配置物 | 実行時 | テスト層から本番層への依存(一方向) |

## データフロー

1. **hook 経路**: Kimi CLI → stdin JSON → adapter(shim) → lib.normalize → core hook → audit/state → lib.translate → adapter → Kimi CLI へ exit/stdout
2. **導入経路**: setup CLI → dist/kimi 配置 → snippet 読取 → plan report → confirm → config.toml atomic 書込み(+バックアップ)
3. **検査経路**: doctor → adapter/config/バージョン/probe → 結果表示(advisory 中心)

## 共有リソースと競合

- `~/.kimi-code/config.toml`: ユーザーと setup が共有。managed block マーカーで所有範囲を分離し、範囲外は読み取りのみ(書換え禁止)
- `<record>/` 配下: 既存の state/audit 機構に委譲(新規の共有状態なし)
- hook の並行起動: adapter は無状態。core 側の mkdir ロックが直列化(既存機構)
