// app/contact/page.tsx
'use client';

import { AuthGuard } from '@/components/AuthGuard';
import { ContactForm } from '@/components/ContactForm';

export default function ContactPage() {
    return (
        <AuthGuard>
            <ContactForm />
        </AuthGuard>
    );
}
