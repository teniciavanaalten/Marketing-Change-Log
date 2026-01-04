import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PLATFORMS } from '../../constants';
import { 
  Linkedin, 
  Search, // Using Search for Google 
  Facebook, 
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  Menu
} from 'lucide-react';
import { Platform } from '../../types';

interface SidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, setMobileOpen }) => {
  const { selectedPlatform, setSelectedPlatform } = useApp();
  const [collapsed, setCollapsed] = useState(false);

  const getIcon = (platformId: string) => {
    switch(platformId) {
      case 'linkedin': return <Linkedin size={20} />;
      case 'google': return <Search size={20} />;
      case 'meta': return <Facebook size={20} />;
      default: return <LayoutDashboard size={20} />;
    }
  };

  const handlePlatformSelect = (id: Platform) => {
    setSelectedPlatform(id);
    setMobileOpen(false); // Close on mobile after selection
  };

  return (
    <>
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 z-20 bg-slate-900/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside 
        className={`
          fixed md:sticky top-0 left-0 z-30 h-screen bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700
          transition-all duration-300 ease-in-out flex flex-col
          ${mobileOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'}
          ${collapsed ? 'md:w-20' : 'md:w-64'}
        `}
      >
        {/* Logo Area */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100 dark:border-slate-700">
          {!collapsed && (
            <div className="flex items-center gap-2 font-bold text-xl text-slate-800 dark:text-white">
              <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center text-white">
                M
              </div>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-500 to-brand-600">
                MarketerLog
              </span>
            </div>
          )}
          {collapsed && (
             <div className="w-10 h-10 bg-brand-500 rounded-lg flex items-center justify-center text-white mx-auto">
             M
           </div>
          )}
          
          <button 
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <div className={`text-xs font-semibold text-slate-400 uppercase mb-2 ${collapsed ? 'text-center' : 'px-2'}`}>
            {collapsed ? 'Plats' : 'Platforms'}
          </div>
          
          {PLATFORMS.map((platform) => (
            <button
              key={platform.id}
              onClick={() => handlePlatformSelect(platform.id)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors relative
                ${selectedPlatform === platform.id 
                  ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                }
                ${collapsed ? 'justify-center px-0' : ''}
              `}
              title={collapsed ? platform.label : undefined}
            >
              {getIcon(platform.id)}
              {!collapsed && <span className="font-medium">{platform.label}</span>}
              
              {selectedPlatform === platform.id && !collapsed && (
                <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-brand-500"></div>
              )}
            </button>
          ))}
        </nav>

        {/* Footer/User Info */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-700">
          <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
             <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-200">
               DM
             </div>
             {!collapsed && (
               <div className="overflow-hidden">
                 <p className="text-sm font-medium text-slate-900 dark:text-white truncate">Demo Marketer</p>
                 <p className="text-xs text-slate-500 truncate">Pro Plan</p>
               </div>
             )}
          </div>
        </div>
      </aside>
    </>
  );
};