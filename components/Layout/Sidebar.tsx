import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Linkedin,
  Search,
  Facebook,
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  ChevronDown,
  Target
} from 'lucide-react';
import { Platform } from '../../types';
import { PlatformManagerModal } from '../Dashboard/PlatformManagerModal';

interface SidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, setMobileOpen }) => {
  const {
    selectedPlatform,
    setSelectedPlatform,
    platforms,
    campaigns,
    selectedCampaignId,
    setSelectedCampaignId
  } = useApp();
  const [collapsed, setCollapsed] = useState(false);
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [expandedPlatform, setExpandedPlatform] = useState<string | null>(null);

  const getIcon = (platformId: string, emoji?: string) => {
    if (emoji) return <span className="text-lg leading-none">{emoji}</span>;

    switch (platformId) {
      case 'linkedin': return <Linkedin size={20} />;
      case 'google': return <Search size={20} />;
      case 'meta': return <Facebook size={20} />;
      default: return <LayoutDashboard size={20} />;
    }
  };

  const handlePlatformClick = (id: Platform) => {
    if (collapsed) {
      // If collapsed, clicking just selects it (and maybe opens overview)
      setSelectedPlatform(id);
      setSelectedCampaignId(null);
      setExpandedPlatform(null); // Or expand? Hard to see when collapsed.
      return;
    }

    if (expandedPlatform === id) {
      setExpandedPlatform(null); // Toggle collapse
    } else {
      setExpandedPlatform(id);
      setSelectedPlatform(id);
      // We don't necessarily reset campaign here if we just want to expand, 
      // but usually clicking the header means "Switch to this platform".
      // Let's default to Overview (null campaign) when switching platforms explicitly?
      // Or keep previous state? 
      // User request: "The LinkedIn tab may continue to exist where all data comes together."
      // So clicking the platform should probably go to Overview.
      if (selectedPlatform !== id) {
        setSelectedCampaignId(null);
      }
    }
  };

  const selectOverview = (e: React.MouseEvent, platformId: string) => {
    e.stopPropagation();
    setSelectedPlatform(platformId);
    setSelectedCampaignId(null);
    setMobileOpen(false);
  };

  const selectCampaign = (e: React.MouseEvent, platformId: string, campaignId: string) => {
    e.stopPropagation();
    setSelectedPlatform(platformId);
    setSelectedCampaignId(campaignId);
    setMobileOpen(false);
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
          <div className={`flex items-center justify-between text-xs font-semibold text-slate-400 uppercase mb-2 ${collapsed ? 'flex-col gap-2' : 'px-2'}`}>
            <span>{collapsed ? 'Plats' : 'Platforms'}</span>
            <button
              onClick={() => setIsManagerOpen(true)}
              className="text-slate-400 hover:text-brand-500 transition-colors"
              title="Manage Platforms"
            >
              <PlusCircle size={16} />
            </button>
          </div>

          {platforms.map((platform) => {
            const isExpanded = expandedPlatform === platform.id;
            const isSelected = selectedPlatform === platform.id;
            const platformCampaigns = campaigns.filter(c => c.platform === platform.id);

            return (
              <div key={platform.id} className="space-y-1">
                <button
                  onClick={() => handlePlatformClick(platform.id)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors relative
                    ${isSelected && selectedCampaignId === null
                      ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }
                    ${collapsed ? 'justify-center px-0' : ''}
                  `}
                  title={collapsed ? platform.label : undefined}
                >
                  {getIcon(platform.id, platform.emoji)}
                  {!collapsed && (
                    <>
                      <span className="font-medium truncate flex-1 text-left">{platform.label}</span>
                      <ChevronDown
                        size={14}
                        className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </>
                  )}

                  {isSelected && selectedCampaignId === null && !collapsed && (
                    <div
                      className="absolute right-2 w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: platform.color || '#e84661' }}
                    ></div>
                  )}
                </button>

                {/* Expanded Sub-menu */}
                {!collapsed && isExpanded && (
                  <div className="ml-4 pl-3 border-l one-border-slate-100 dark:border-slate-700 space-y-1">
                    {/* Overview Link */}
                    <button
                      onClick={(e) => selectOverview(e, platform.id)}
                      className={`
                          w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors
                          ${isSelected && selectedCampaignId === null
                          ? 'text-brand-600 font-medium bg-brand-50/50'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                        }
                        `}
                    >
                      <LayoutDashboard size={14} />
                      Overview
                    </button>

                    {/* Campaigns List */}
                    {platformCampaigns.map(campaign => (
                      <button
                        key={campaign.id}
                        onClick={(e) => selectCampaign(e, platform.id, campaign.id)}
                        className={`
                            w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors
                            ${isSelected && selectedCampaignId === campaign.id
                            ? 'text-brand-600 font-medium bg-brand-50/50'
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                          }
                         `}
                      >
                        <Target size={14} />
                        <span className="truncate">{campaign.name}</span>
                      </button>
                    ))}

                    {platformCampaigns.length === 0 && (
                      <div className="px-3 py-2 text-xs text-slate-400 italic">No campaigns</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
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

      <PlatformManagerModal
        isOpen={isManagerOpen}
        onClose={() => setIsManagerOpen(false)}
      />
    </>
  );
};