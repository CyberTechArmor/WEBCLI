import React from 'react';
import { Header } from './components/Header';
import { ChatThread } from './components/ChatThread';
import { InputArea } from './components/InputArea';
import { SettingsModal } from './components/SettingsModal';

function App() {
  return (
    <div className="h-screen flex flex-col bg-claude-dark">
      <Header />
      <ChatThread />
      <InputArea />
      <SettingsModal />
    </div>
  );
}

export default App;
