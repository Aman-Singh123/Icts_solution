// components/AuthGuard.tsx
'use client';
import { ReactNode, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

interface AuthGuardProps {
    children: ReactNode;
    requireAdmin?: boolean;
}

export function AuthGuard({ children, requireAdmin }: AuthGuardProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [allowed, setAllowed] = useState(false);

    useEffect(() => {
        const check = async () => {
            const { data } = await supabase.auth.getSession();
            const session = data.session;

            if (!session) {
                router.replace('/login');
                return;
            }

            if (requireAdmin) {
                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('is_admin')
                    .eq('id', session.user.id)
                    .maybeSingle();

                if (error || !profile?.is_admin) {
                    
                    router.replace('/contact');
                    return;
                }
            }

            setAllowed(true);
            setLoading(false);
        };

        check();
    }, [router, requireAdmin]);

    if (loading && !allowed) return <p>Checking access...</p>;
    if (!allowed) return null;

    return <>{children}</>;
}
