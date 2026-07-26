# Unit of Work Dependency — metrics 可視化(B1 後続)

上流入力(consumes 全数): components.md, component-methods.md, services.md, component-dependency.md, decisions.md, requirements.md

## 依存グラフ(parseBoltDag 用 edge block)

```yaml
units:
  - name: visualize-skeleton
    depends_on: []
  - name: visualize-hardening
    depends_on:
      - visualize-skeleton
```

## 依存の根拠

- **visualize-skeleton → visualize-hardening**: U2 は U1 が作る `scripts/metrics-visualize.ts` の公開面(renderHtml / regressionClass の挿入点 / CLI 分岐)と R-1 の numericValue に追記する(component-dependency.md の V-3→V-5、V-1→V-7 エッジは U1 の構造の上にのみ成立)。CI 同乗(C-1)も U1 の `--write` が存在して初めて意味を持つ(services.md の実行環境境界)
- 逆依存なし。U1 は requirements.md の AC-1/AC-3/AC-4(一部)/AC-7 を単独で閉じる

## 実行順とゲート

1. **Bolt 1 = visualize-skeleton**: walking-skeleton ゲート対象(単独実行・ユーザー明示承認後に続行 — org.md Walking Skeleton)
2. **Bolt 2 = visualize-hardening**: Bolt 1 出荷後にラダープロンプト(自律継続 or 全ゲート)の選択に従う
