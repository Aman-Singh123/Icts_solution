// app/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace('/login');
        return;
      }

      // Check profile for admin flag
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', data.session.user.id)
        .maybeSingle();

      if (profile?.is_admin) {
        router.replace('/admin');
      } else {
        router.replace('/contact');
      }
    };

    checkSession();
  }, [router]);

  return <p>Loading...</p>;
}
