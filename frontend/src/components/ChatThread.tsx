import { MessageList } from './MessageList';

export function ChatThread() {
  return (
    <div className="flex-1 flex flex-col min-h-0 bg-claude-dark">
      <MessageList />
    </div>
  );
}
