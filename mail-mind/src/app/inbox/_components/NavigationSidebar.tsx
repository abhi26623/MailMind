"use client";

import { authClient } from "@/server/better-auth/client";
import { useRouter } from "next/navigation";

interface NavigationSidebarProps {
  isSidebarOpen: boolean;
  activeFolder: string;
  activeCategory: string | null;
  onToggleSidebar: () => void;
  onCompose: () => void;
  /** Called when user picks a folder from the sidebar. */
  onSelectFolder: (folder: string) => void;
}

const FOLDERS = [
  {
    id: "inbox",
    label: "Inbox",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
      />
    ),
  },
  {
    id: "drafts",
    label: "Drafts",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    ),
  },
  {
    id: "sent",
    label: "Sent",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
      />
    ),
  },
  {
    id: "archive",
    label: "Archive",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
      />
    ),
  },
  {
    id: "favorite",
    label: "Favorite",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
      />
    ),
  },
  {
    id: "readLater",
    label: "Read Later",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    ),
  },
  {
    id: "trash",
    label: "Trash",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    ),
  },
];

export function NavigationSidebar({
  isSidebarOpen,
  activeFolder,
  activeCategory,
  onToggleSidebar,
  onCompose,
  onSelectFolder,
}: NavigationSidebarProps) {
  const router = useRouter();

  return (
    <div
      className={`${
        isSidebarOpen ? "w-56" : "w-[72px]"
      } h-full border-r border-forest-900/10 bg-white py-4 flex flex-col justify-between items-center text-forest-700 flex-shrink-0 transition-all duration-300 overflow-y-auto overflow-x-hidden z-20`}
    >
      {/* Hamburger Toggle */}
      <div className="w-full flex justify-start px-4 mb-4">
        <button
          onClick={onToggleSidebar}
          className="p-2 text-forest-500 hover:bg-forest-50 rounded-lg"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      <div className="flex flex-col space-y-2 w-full px-3">
        {/* Compose Button */}
        <button
          onClick={onCompose}
          className={`py-3 bg-forest-900 hover:bg-forest-800 text-cream-100 rounded-xl shadow-lg flex items-center ${
            isSidebarOpen ? "justify-start px-4" : "justify-center"
          } mb-6 transition-all w-full flex-shrink-0`}
        >
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          {isSidebarOpen && (
            <span className="ml-3 font-semibold text-sm whitespace-nowrap">Compose</span>
          )}
        </button>

        {/* Folder List */}
        <div className="space-y-1 w-full flex flex-col items-start">
          {FOLDERS.map((folder) => {
            const isActive = activeFolder === folder.id && !activeCategory;
            return (
              <button
                key={folder.id}
                onClick={() => onSelectFolder(folder.id)}
                className={`py-3 ${
                  isActive
                    ? "bg-wheat-100 text-wheat-700"
                    : "text-forest-600 hover:bg-white/60 hover:text-forest-950"
                } rounded-xl w-full flex items-center ${
                  isSidebarOpen ? "justify-start px-4" : "justify-center"
                } group/btn transition-all`}
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {folder.icon}
                </svg>
                {isSidebarOpen && (
                  <span className="ml-4 font-semibold text-xs whitespace-nowrap">{folder.label}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sign Out */}
      <div className="w-full px-3 mt-auto mb-4 space-y-2">
        <button
          onClick={() =>
            authClient.signOut({ fetchOptions: { onSuccess: () => router.push("/") } })
          }
          className={`py-3 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-all flex items-center w-full ${
            isSidebarOpen ? "justify-start px-4" : "justify-center"
          }`}
          title="Sign Out"
        >
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          {isSidebarOpen && (
            <span className="ml-4 font-semibold text-xs whitespace-nowrap">Sign Out</span>
          )}
        </button>
      </div>
    </div>
  );
}
