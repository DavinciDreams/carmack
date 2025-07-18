import React, { useCallback, useMemo } from 'react';
import type { MessageItemProps } from '../utils/types';
import {
  extractPlainText,
  formatTimestamp,
  formatToolResult,
  getRoleColor,
  getRoleEmoji,
  formatMessageContent,
  formatUsageStats,
  formatTaskInput,
} from '../utils/formatting';
import './WebMessageComponent.css';

interface WebMessageComponentProps extends MessageItemProps {
  searchQuery?: string;
  onClick?: () => void;
  onDoubleClick?: () => void;
}

export const WebMessageComponent: React.FC<WebMessageComponentProps> = ({
  message,
  index,
  isSelected,
  isExpanded,
  indentLevel = 0,
  onToggleExpand,
  onSelect,
  searchQuery = '',
  onClick,
  onDoubleClick,
}) => {
  const role = message.message?.role || 'unknown';
  const roleEmoji = getRoleEmoji(role);
  const roleColor = getRoleColor(role);

  const maxWidth = 100 - indentLevel * 2;
  const expandIndicator = isExpanded ? '▼' : '▶';
  const hasContent =
    message.message?.content || message.message?.tool_calls || message.toolUseResult;

  // Handle click events
  const handleClick = useCallback(() => {
    onSelect(index);
    if (onClick) {
      onClick();
    }
  }, [onSelect, index, onClick]);

  const handleDoubleClick = useCallback(() => {
    onToggleExpand(message.uuid);
    if (onDoubleClick) {
      onDoubleClick();
    }
  }, [onToggleExpand, message.uuid, onDoubleClick]);

  const handleExpandToggle = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    onToggleExpand(message.uuid);
  }, [onToggleExpand, message.uuid]);

  // Highlight search matches in text
  const highlightSearchText = useCallback((text: string) => {
    if (!searchQuery || !text) return text;

    const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, partIndex) => {
      const isMatch = part.toLowerCase() === searchQuery.toLowerCase();
      return isMatch ? (
        <mark key={`highlight-${partIndex}`} className="search-highlight">
          {part}
        </mark>
      ) : (
        part
      );
    });
  }, [searchQuery]);

  // Memoized content processing
  const contentPreview = useMemo(() => {
    if (!hasContent || isExpanded) return null;

    const content = extractPlainText(message.message?.content || '');
    const preview = content.replace(/\n/g, ' ').substring(0, 60);
    const toolCount = message.message?.tool_calls?.length || 0;
    const hasTools = toolCount > 0 ? ` (${toolCount} tools)` : '';
    const hasResult = message.toolUseResult ? ' [result]' : '';
    
    return `${preview}${preview.length > 60 ? '...' : ''}${hasTools}${hasResult}`;
  }, [hasContent, isExpanded, message]);

  return (
    <div
      className={`web-message-component ${isSelected ? 'selected' : ''} ${isExpanded ? 'expanded' : ''}`}
      style={{
        paddingLeft: `${indentLevel * 16}px`,
        borderLeft: isSelected ? `3px solid ${roleColor}` : 'none',
      }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      role="button"
      tabIndex={0}
      aria-selected={isSelected}
      aria-expanded={isExpanded}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleDoubleClick();
        }
      }}
    >
      {/* Header Section */}
      <div className="message-header">
        <div className="message-role-info">
          {hasContent && (
            <button
              className="expand-toggle"
              onClick={handleExpandToggle}
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
            >
              {expandIndicator}
            </button>
          )}
          <span className="role-emoji">{roleEmoji}</span>
          <span className="role-name" style={{ color: roleColor }}>
            {role.toUpperCase()}
          </span>
        </div>

        <div className="message-metadata">
          <span className="timestamp">{formatTimestamp(message.timestamp)}</span>
          {message.isSidechain && (
            <span className="sidechain-badge">SUBTASK</span>
          )}
          {message.parentUuid && message.parentUuid !== 'null' && (
            <span className="parent-indicator">↳</span>
          )}
        </div>
      </div>

      {/* Expandable Content Section */}
      {hasContent && isExpanded && (
        <div className="message-content">
          {/* Message Content */}
          {message.message?.content && (
            <div className="content-section">
              <div className="content-text">
                {highlightSearchText(formatMessageContent(message.message.content, maxWidth))}
              </div>
            </div>
          )}

          {/* Tool Calls */}
          {message.message?.tool_calls && message.message.tool_calls.length > 0 && (
            <div className="tool-calls-section">
              <div className="section-header">
                <span className="tool-icon">🔧</span>
                <span className="section-title">Tool Calls:</span>
              </div>
              <div className="tool-calls-list">
                {message.message.tool_calls.map((call, callIndex) => (
                  <div key={callIndex} className="tool-call-item">
                    <div className="tool-call-header">
                      <span className="tool-icon">🔨</span>
                      <span className="tool-name">{highlightSearchText(call.name)}</span>
                    </div>
                    {call.name === 'Task' && call.input ? (
                      <div className="tool-input">
                        {formatTaskInput(call.input)}
                      </div>
                    ) : call.input && Object.keys(call.input).length > 0 ? (
                      <div className="tool-input">
                        {JSON.stringify(call.input).length > 80
                          ? '(...)'
                          : `(${JSON.stringify(call.input)})`}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tool Results */}
          {message.toolUseResult && (
            <div className="tool-result-section">
              <div className="section-header">
                <span className="result-icon">📊</span>
                <span className="section-title">Result:</span>
              </div>
              <div className="tool-result-content">
                {formatToolResult(message.toolUseResult)}
              </div>
            </div>
          )}

          {/* Usage Stats for Assistant Messages */}
          {message.message?.usage && role === 'assistant' && (
            <div className="usage-stats-section">
              <div className="usage-stats">
                {formatUsageStats(message.message.usage)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Collapsed Content Preview */}
      {hasContent && !isExpanded && contentPreview && (
        <div className="content-preview">
          {highlightSearchText(contentPreview)}
        </div>
      )}
    </div>
  );
};

export default WebMessageComponent;