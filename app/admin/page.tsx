// app/admin/page.tsx
'use client';

import { AuthGuard } from '@/components/AuthGuard';
import { AdminTable } from '@/components/AdminTable';

export default function AdminPage() {
    return (
        <AuthGuard requireAdmin>
            <AdminTable />
        </AuthGuard>
    );
}
