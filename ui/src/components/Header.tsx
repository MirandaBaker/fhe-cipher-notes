import { ConnectButton } from '@rainbow-me/rainbowkit';

export function Header() {
  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-md shadow-sm relative z-20">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/20">
              <span className="text-xl font-bold">F</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
                FHE Cipher Notes
              </h1>
              <p className="text-sm text-muted-foreground">Collaborative Encrypted Document Editing</p>
            </div>
          </div>
          <ConnectButton />
        </div>
      </div>
    </header>
  );
}


