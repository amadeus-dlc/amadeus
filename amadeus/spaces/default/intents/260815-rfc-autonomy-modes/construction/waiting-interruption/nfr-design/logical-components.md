# Logical Components — unit waiting-interruption

> application-design(components.md / component-methods.md)の写像。詳細シグネチャは component-methods.md が正本。

- C4 — state.ts の waiting 状態機械 + orchestrate.ts の directive + 専用永続面(FD 裁定の格納面)+ 監査イベント 2 種(event-registry/audit-format 同期)。resume 単一入口の型 dispatch。
