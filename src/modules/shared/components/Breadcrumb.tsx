import React from 'react';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  id: string;
  label: string;
  onClick?: () => void;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  homeLabel?: string;
  onHomeClick?: () => void;
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({
  items,
  homeLabel = 'Workspaces',
  onHomeClick,
}) => {
  return (
    <nav className="flex items-center text-sm text-gray-500 space-x-1 overflow-x-auto">
      <button
        onClick={onHomeClick}
        className="flex items-center space-x-1 hover:text-blue-600 transition-colors whitespace-nowrap"
      >
        <Home className="w-4 h-4" />
        <span>{homeLabel}</span>
      </button>

      {items.map((item, index) => (
        <React.Fragment key={item.id}>
          <ChevronRight className="w-4 h-4 flex-shrink-0 text-gray-400" />
          {index === items.length - 1 ? (
            <span className="font-medium text-gray-900 whitespace-nowrap">
              {item.label}
            </span>
          ) : (
            <button
              onClick={item.onClick}
              className="hover:text-blue-600 transition-colors whitespace-nowrap"
            >
              {item.label}
            </button>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};

export default Breadcrumb;
