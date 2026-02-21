import { Toaster as SonnerToaster } from 'sonner';

export default function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      richColors
      toastOptions={{
        className: 'text-sm',
        duration: 3000,
      }}
    />
  );
}
