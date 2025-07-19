import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import type { AppState, MessageData } from '../utils/types';
import './WebFilterDialog.css';

interface WebFilterDialogProps {
  currentFilterType: AppState['filterType'];
  messages: MessageData[];
  onApplyFilter: (filterType: AppState['filterType']) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const WebFilterDialog: React.FC<WebFilterDialogProps> = ({
  currentFilterType,
  messages,
  onApplyFilter,
  isOpen,
  onClose,
}) => {
  const [selectedFilterType, setSelectedFilterType] =
    useState<AppState['filterType']>(currentFilterType);
  const [isAnimating, setIsAnimating] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedFilterType(currentFilterType);
  }, [currentFilterType]);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      // Focus the dialog when opened
      if (dialogRef.current) {
        dialogRef.current.focus();
      }
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Calculate message counts for each filter type
  const getMessageCount = (filterType: AppState['filterType']): number => {
    switch (filterType) {
      case 'all':
        return messages.length;
      case 'user':
        return messages.filter((msg) => msg.message?.role === 'user').length;
      case 'assistant':
        return messages.filter((msg) => msg.message?.role === 'assistant').length;
      case 'tools':
        return messages.filter((msg) => msg.message?.tool_calls?.length || msg.toolUseResult)
          .length;
      case 'sidechains':
        return messages.filter((msg) => msg.isSidechain).length;
      default:
        return 0;
    }
  };

  const handleConfirm = () => {
    onApplyFilter(selectedFilterType);
    onClose();
  };

  const handleCancel = () => {
    setSelectedFilterType(currentFilterType); // Reset to original
    onClose();
  };

  const handleReset = () => {
    setSelectedFilterType('all');
  };

  const handleOverlayClick = (event: React.MouseEvent) => {
    if (event.target === overlayRef.current) {
      handleCancel();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        handleCancel();
        break;
      case 'Enter':
        event.preventDefault();
        handleConfirm();
        break;
    }
  };

  const filterOptions = [
    {
      value: 'all' as const,
      label: 'All Messages',
      count: getMessageCount('all'),
      description: 'Show all messages in the conversation',
    },
    {
      value: 'user' as const,
      label: 'User Messages',
      count: getMessageCount('user'),
      description: 'Show only user messages',
    },
    {
      value: 'assistant' as const,
      label: 'Assistant Messages',
      count: getMessageCount('assistant'),
      description: 'Show only assistant messages',
    },
    {
      value: 'tools' as const,
      label: 'Tool Messages',
      count: getMessageCount('tools'),
      description: 'Show only messages with tool calls or results',
    },
    {
      value: 'sidechains' as const,
      label: 'Sidechain Messages',
      count: getMessageCount('sidechains'),
      description: 'Show only sidechain/subtask messages',
    },
  ];

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={`web-filter-dialog-overlay ${isAnimating ? 'open' : ''}`}
      ref={overlayRef}
      onClick={handleOverlayClick}
    >
      <div
        className="web-filter-dialog"
        ref={dialogRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-modal="true"
        aria-labelledby="filter-dialog-title"
      >
        <div className="filter-dialog-header">
          <h2 id="filter-dialog-title" className="filter-dialog-title">
            🔧 Filter Messages
          </h2>
          <button className="close-button" onClick={handleCancel} aria-label="Close filter dialog">
            ✕
          </button>
        </div>

        <div className="filter-dialog-content">
          <div className="current-filter-info">
            <span className="current-filter-label">Current filter:</span>
            <span className="current-filter-value">{currentFilterType}</span>
          </div>

          <div className="filter-options">
            <h3>Select filter type:</h3>
            <div className="filter-radio-group">
              {filterOptions.map((option) => (
                <label
                  key={option.value}
                  className={`filter-option ${
                    selectedFilterType === option.value ? 'selected' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="filterType"
                    value={option.value}
                    checked={selectedFilterType === option.value}
                    onChange={() => setSelectedFilterType(option.value)}
                  />
                  <div className="filter-option-content">
                    <div className="filter-option-header">
                      <span className="filter-option-label">{option.label}</span>
                      <span className="filter-option-count">({option.count})</span>
                    </div>
                    <div className="filter-option-description">{option.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {selectedFilterType !== currentFilterType && (
            <div className="filter-preview">
              <div className="preview-info">
                <span className="preview-icon">👀</span>
                <span>Preview: Will show {getMessageCount(selectedFilterType)} messages</span>
              </div>
            </div>
          )}
        </div>

        <div className="filter-dialog-actions">
          <button
            className="filter-action-button primary"
            onClick={handleConfirm}
            disabled={selectedFilterType === currentFilterType}
          >
            ✓ Apply Filter
          </button>
          <button
            className="filter-action-button secondary"
            onClick={handleReset}
            disabled={selectedFilterType === 'all'}
          >
            ↺ Reset to All
          </button>
          <button className="filter-action-button tertiary" onClick={handleCancel}>
            ✕ Cancel
          </button>
        </div>

        <div className="filter-dialog-help">
          <small>
            <kbd>↑</kbd>/<kbd>↓</kbd> Navigate • <kbd>Enter</kbd> Apply • <kbd>Escape</kbd> Cancel
          </small>
        </div>
      </div>
    </div>
  );
};

export default WebFilterDialog;
