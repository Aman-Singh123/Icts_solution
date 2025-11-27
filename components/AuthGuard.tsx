// components/AuthGuard.tsx
'use client';
import { ReactNode, useEffect, useState } from 'react';
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
        let mounted = true;

        const check = async () => {
            setLoading(true);

            // dynamic import and create client in browser only
            const { createClient } = await import('@supabase/supabase-js');

            const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
            const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
            if (!url || !anon) {
                console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
                // optionally redirect to an error page
                return;
            }

            const supabase = createClient(url, anon);

            try {
                const { data } = await supabase.auth.getSession();
                const session = data.session;

                if (!session) {
                    if (!mounted) return;
                    setAllowed(false);
                    setLoading(false);
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
                        // sign out and redirect to contact (optional signOut)
                        try { await supabase.auth.signOut(); } catch (e) { }
                        if (!mounted) return;
                        setAllowed(false);
                        setLoading(false);
                        router.replace('/contact');
                        return;
                    }
                }

                if (!mounted) return;
                setAllowed(true);
                setLoading(false);
            } catch (err) {
                console.error('Auth check failed', err);
                try { await supabase.auth.signOut(); } catch (e) { }
                if (!mounted) return;
                setAllowed(false);
                setLoading(false);
                router.replace('/login');
            }
        };

        check();

        return () => { mounted = false; };
    }, [router, requireAdmin]);

    if (loading) return;
    if (!allowed) return null;
    return <>{children}</>;
}
