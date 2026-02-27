// frontend/src/app/inventory-form/layout.tsx
// Minimal layout: No app shell/sidebar. This relies on parent layout not forcing a sidebar.
export default function PublicInventoryLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}


