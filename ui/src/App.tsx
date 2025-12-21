import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import { Suspense, lazy, useState, useCallback } from 'react';
import { useAccount } from 'wagmi';

import { config } from './config/wagmi';
import { Header } from './components/Header';
import { Button } from './components/ui/button';
import { Plus, FileText, BookOpen } from 'lucide-react';

// Lazy load heavy components for better performance
const AdminPanel = lazy(() => import('./components/AdminPanel').then(module => ({ default: module.AdminPanel })));
const EditList = lazy(() => import('./components/EditList').then(module => ({ default: module.default })));
const AddEditDialog = lazy(() => import('./components/AddEditDialog').then(module => ({ default: module.default })));
const GuidePanel = lazy(() => import('./components/GuidePanel').then(module => ({ default: module.GuidePanel })));

const queryClient = new QueryClient();

type ViewMode = 'document' | 'guide';

interface AppState {
  viewMode: ViewMode;
  showAddDialog: boolean;
  showAdminPanel: boolean;
}

function AppContent() {
  const { isConnected } = useAccount();
  const [addEditOpen, setAddEditOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('document');

  return (
    <div className="flex min-h-screen flex-col relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/3 rounded-full blur-3xl"></div>
      </div>
      <Header />
      <main className="flex-1 relative">
        <div className="container mx-auto px-6 py-8 relative z-10">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-foreground bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Shared Workspace
              </h2>
              <p className="text-muted-foreground mt-1">Collaborate securely with encrypted document editing</p>
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
                <Suspense fallback={<div className="h-96 bg-muted rounded-lg animate-pulse" />}>
                  <EditList />
                </Suspense>
              </div>
              <div className="md:col-span-2">
                <Suspense fallback={<div className="h-32 bg-muted rounded-lg animate-pulse" />}>
                  <AdminPanel />
                </Suspense>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="md:col-span-2">
                <Suspense fallback={<div className="h-64 bg-muted rounded-lg animate-pulse" />}>
                  <GuidePanel />
                </Suspense>
              </div>
            </div>
          )}
        </div>
      </main>

      <Suspense fallback={null}>
        <AddEditDialog open={addEditOpen} onOpenChange={setAddEditOpen} />
      </Suspense>
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
