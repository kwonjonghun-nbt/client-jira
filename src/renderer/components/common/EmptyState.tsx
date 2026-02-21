interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function EmptyState({ icon = '📭', title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <span className="text-4xl mb-4">{icon}</span>
      <h3 className="text-lg font-semibold text-gray-700 mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-gray-400 max-w-sm mb-4">{description}</p>
      )}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors cursor-pointer"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
