import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';

import { config } from './config/wagmi';
import { Header } from './components/Header';
import { AdminPanel } from './components/AdminPanel';
import { EditList } from './components/EditList';
import { AddEditDialog } from './components/AddEditDialog';
import { GuidePanel } from './components/GuidePanel';
import { Button } from './components/ui/button';
import { Plus, FileText, BookOpen } from 'lucide-react';
import { useState } from 'react';
import { useAccount } from 'wagmi';

const queryClient = new QueryClient();

type ViewMode = 'document' | 'guide';

function AppContent() {
  const { isConnected } = useAccount();
  const [addEditOpen, setAddEditOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('document');

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 bg-background">
        <div className="container mx-auto px-6 py-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-foreground">Shared Workspace</h2>
              <p className="text-muted-foreground">Collaborate securely with encrypted document editing</p>
            </div>
            <div className="flex items-center gap-3">
              {/* View Mode Toggle */}
              <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-1">
                <Button
                  variant={viewMode === 'document' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('document')}
                  className="gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Document
                </Button>
                <Button
                  variant={viewMode === 'guide' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('guide')}
                  className="gap-2"
                >
                  <BookOpen className="h-4 w-4" />
                  Guide
                </Button>
              </div>
              {isConnected && viewMode === 'document' && (
                <Button onClick={() => setAddEditOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Edit
                </Button>
              )}
            </div>
          </div>

          {viewMode === 'document' ? (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="md:col-span-2">
                <EditList />
              </div>
              <div className="md:col-span-2">
                <AdminPanel />
              </div>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="md:col-span-2">
                <GuidePanel />
              </div>
            </div>
          )}
        </div>
      </main>

      <AddEditDialog open={addEditOpen} onOpenChange={setAddEditOpen} />
    </div>
  );
}

function App() {
  return (
  <WagmiProvider config={config}>
    <QueryClientProvider client={queryClient}>
        <RainbowKitProvider locale="en">
          <AppContent />
      </RainbowKitProvider>
    </QueryClientProvider>
  </WagmiProvider>
);
}

export default App;
