"use client";

/** 單一 Tab 的定義 */
interface Tab {
  /** 唯一識別碼（對應 activeTab） */
  id: string;
  /** 顯示文字 */
  label: string;
  /** Emoji 圖示 */
  icon: string;
}

/** 應用內所有可用的導航分頁 */
const TABS: Tab[] = [
  { id: "chat", label: "Chat", icon: "💬" },
  { id: "quiz", label: "Quiz", icon: "📝" },
  { id: "summary", label: "Summary", icon: "📑" },
];

/** TabNav 元件的 Props */
interface TabNavProps {
  /** 當前選中的 tab id */
  activeTab: string;
  /** 切換 tab 時觸發的回調 */
  onTabChange: (id: string) => void;
}

/**
 * 頂部分頁導航列 — Chat / Quiz / Summary 三個 tab。
 * @param props - {@link TabNavProps}
 */
export function TabNav({ activeTab, onTabChange }: TabNavProps) {
  return (
    <div className="flex border-b border-slate-200 bg-white rounded-t-lg overflow-hidden">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors
            ${
              activeTab === tab.id
                ? "text-indigo-700 border-b-2 border-indigo-600 bg-indigo-50/50"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            }`}
        >
          <span>{tab.icon}</span>
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
}
