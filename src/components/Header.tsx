import { Settings, RefreshCw, Globe, HelpCircle } from "lucide-preact";

interface HeaderProps {
  onOpenSettings: () => void;
  onReset: () => void;
  onOpenWorlds: () => void;
  possibleWorldsCount: number;
}

export function Header({
  onOpenSettings,
  onReset,
  onOpenWorlds,
  possibleWorldsCount,
}: HeaderProps) {
  return (
    <header className="header">
      <div className="logo-area">
        <h1 className="logo-title">GNOSIA SOLVER</h1>
        <span className="logo-subtitle">電脳人狼推理支援ツール</span>
      </div>

      <div className="header-actions">
        <button
          className="btn"
          onClick={onOpenWorlds}
          title="成立する配役パターン一覧を表示"
        >
          <Globe size={16} />
          <span>可能世界: <strong>{possibleWorldsCount}</strong> 通り</span>
        </button>

        <button
          className="btn"
          onClick={onOpenSettings}
          title="参加者や役職設定を変更"
        >
          <Settings size={16} />
          <span>ゲーム設定</span>
        </button>

        <button
          className="btn btn-danger btn-sm"
          onClick={onReset}
          title="現在のゲーム履歴をリセット"
        >
          <RefreshCw size={14} />
          <span>リセット</span>
        </button>
      </div>
    </header>
  );
}
