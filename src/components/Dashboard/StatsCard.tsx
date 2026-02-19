import React from "react";

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: string;
  icon: React.FC<React.SVGProps<SVGSVGElement>>; // Ajusta o tipo do ícone para JSX
  color: "blue" | "green" | "purple" | "orange";
}

const colorVariants = {
  blue: {
    bg: "bg-gradient-to-br from-blue-500 to-blue-600",
    light: "bg-blue-50",
    text: "text-blue-600",
    change: "text-blue-600",
  },
  green: {
    bg: "bg-gradient-to-br from-green-500 to-green-600",
    light: "bg-green-50",
    text: "text-green-600",
    change: "text-green-600",
  },
  purple: {
    bg: "bg-gradient-to-br from-purple-500 to-purple-600",
    light: "bg-purple-50",
    text: "text-purple-600",
    change: "text-purple-600",
  },
  orange: {
    bg: "bg-gradient-to-br from-orange-500 to-orange-600",
    light: "bg-orange-50",
    text: "text-orange-600",
    change: "text-orange-600",
  },
};

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  change,
  icon: Icon,
  color,
}) => {
  const colors = colorVariants[color];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {change && (
            <p className={`text-sm mt-1 ${colors.change}`}>{change}</p>
          )}
        </div>
        <div
          className={`w-12 h-12 ${colors.bg} rounded-lg flex items-center justify-center`}
        >
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
};

export default StatsCard;
