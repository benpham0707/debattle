
import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Bell } from 'lucide-react';

export const NewsDropdown = () => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="comic-border bg-gradient-to-r from-comic-orange to-comic-yellow text-white px-4 py-2 font-bold text-sm hover:from-comic-yellow hover:to-comic-orange transition-all duration-300 transform hover:scale-105 flex items-center gap-2 rounded-xl">
        <Bell className="h-4 w-4" />
        NEWS & UPDATES
        <ChevronDown className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 comic-border bg-white z-50 rounded-2xl p-2">
        <DropdownMenuLabel className="text-comic-dark font-bold text-lg px-3 py-2">Latest Updates</DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-comic-dark/30 mx-2" />
        
        <DropdownMenuItem className="p-0 m-1">
          <div className="w-full p-4 hover:bg-comic-red/10 transition-colors rounded-xl border-2 border-comic-red/20 hover:border-comic-red/40 bg-white">
            <div className="space-y-2">
              <div className="font-bold text-comic-red text-sm flex items-center gap-2">
                <span className="text-lg">🔥</span>
                NEW FEATURE
              </div>
              <div className="text-sm text-comic-dark font-bold">Health system now includes combo multipliers!</div>
              <div className="text-xs text-comic-dark/70 font-bold">2 days ago</div>
            </div>
          </div>
        </DropdownMenuItem>
        
        <DropdownMenuItem className="p-0 m-1">
          <div className="w-full p-4 hover:bg-comic-green/10 transition-colors rounded-xl border-2 border-comic-green/20 hover:border-comic-green/40 bg-white">
            <div className="space-y-2">
              <div className="font-bold text-comic-green text-sm flex items-center gap-2">
                <span className="text-lg">⚡</span>
                PATCH v1.2.1
              </div>
              <div className="text-sm text-comic-dark font-bold">Fixed timer synchronization issues</div>
              <div className="text-xs text-comic-dark/70 font-bold">1 week ago</div>
            </div>
          </div>
        </DropdownMenuItem>
        
        <DropdownMenuItem className="p-0 m-1">
          <div className="w-full p-4 hover:bg-comic-purple/10 transition-colors rounded-xl border-2 border-comic-purple/20 hover:border-comic-purple/40 bg-white">
            <div className="space-y-2">
              <div className="font-bold text-comic-purple text-sm flex items-center gap-2">
                <span className="text-lg">🎨</span>
                UI UPDATE
              </div>
              <div className="text-sm text-comic-dark font-bold">Enhanced Spider-Verse visual effects</div>
              <div className="text-xs text-comic-dark/70 font-bold">2 weeks ago</div>
            </div>
          </div>
        </DropdownMenuItem>
        
        <DropdownMenuItem className="p-0 m-1">
          <div className="w-full p-4 hover:bg-comic-pink/10 transition-colors rounded-xl border-2 border-comic-pink/20 hover:border-comic-pink/40 bg-white">
            <div className="space-y-2">
              <div className="font-bold text-comic-pink text-sm flex items-center gap-2">
                <span className="text-lg">🏆</span>
                TOURNAMENT
              </div>
              <div className="text-sm text-comic-dark font-bold">Weekly championship starts Monday!</div>
              <div className="text-xs text-comic-dark/70 font-bold">3 weeks ago</div>
            </div>
          </div>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator className="bg-comic-dark/30 mx-2 my-3" />
        <DropdownMenuItem className="p-0 m-1">
          <div className="w-full p-3 text-center text-comic-blue font-bold hover:bg-comic-blue/10 rounded-xl border-2 border-comic-blue/20 hover:border-comic-blue/40 transition-all bg-white">
            View All Updates →
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
