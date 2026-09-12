- `Array<T>` より `ReadonlyArray<T>` を使うこと, さらに T
  がプリミティブ型で重複しないのなら `ReadonlySet<T>` を使うこと. `Map<K, V>`
  より `ReadonlyMap<K, V>`. `Set<T>` より `ReadonlySet<T>`
- 編集したら deno fmt を実行してフォーマットすること
- deno lint --fix で lint エラーを一部解消し, 残りは手動で改善し deno lint
  の警告が 0 件になるようにすること
- 作業のキリが良い段階でコミットすること
