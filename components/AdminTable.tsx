// components/AdminTable.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

type ContactRow = {
    id: number;
    first_name: string;
    last_name: string;
    academic_title: string | null;
    email: string | null;
    mobile_phone: string | null;
    office_phone: string | null;
    hospital_clinic_address: string | null;
    admin_assistant_name: string | null;
    admin_assistant_email: string | null;
    admin_assistant_phone: string | null;
    created_at: string;
    organization?: { name: string | null };
    country?: { name: string | null };
    department?: { name: string | null };
    specialty?: { name: string | null };
    occupation?: { name: string | null };
    creator?: { full_name: string | null }; // from profiles
};

export function AdminTable() {
    const router = useRouter();

    const [rows, setRows] = useState<ContactRow[]>([]);
    const [filtered, setFiltered] = useState<ContactRow[]>([]);
    const [search, setSearch] = useState('');
    const [countryFilter, setCountryFilter] = useState('');
    const [loading, setLoading] = useState(true);
    const [countries, setCountries] = useState<{ id: number; name: string }[]>([]);
    const [loggingOut, setLoggingOut] = useState(false);

    // Load contacts + countries + profiles
    useEffect(() => {
        let mounted = true;

        const load = async () => {
            setLoading(true);

            const { createClient } = await import('@supabase/supabase-js');

            const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
            const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
            if (!url || !anon) {
                console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
                setLoading(false);
                return;
            }

            const supabase = createClient(url, anon);

            try {
                // 1) Load contacts (include created_by for mapping, but we won't type it in ContactRow)
                const { data, error } = await supabase
                    .from('contact')
                    .select(
                        `
            id,
            first_name,
            last_name,
            academic_title,
            email,
            mobile_phone,
            office_phone,
            hospital_clinic_address,
            admin_assistant_name,
            admin_assistant_email,
            admin_assistant_phone,
            created_at,
            created_by,
            organization:organization_id ( name ),
            country:country_id ( name ),
            department:department_id ( name ),
            specialty:specialty_id ( name ),
            occupation:occupation_id ( name )
          `
                    )
                    .order('created_at', { ascending: false });

                if (error) {
                    console.error('Error loading contacts', error);
                }

                // 2) Load profiles for "created_by" names
                const { data: profileRows, error: profileError } = await supabase
                    .from('profiles')
                    .select('id, full_name');

                if (profileError) {
                    console.error('Error loading profiles', profileError);
                }

                const profileMap = new Map<string, string | null>();
                (profileRows ?? []).forEach((p: any) => {
                    profileMap.set(p.id, p.full_name ?? null);
                });

                if (!error && data && mounted) {
                    const mapped: ContactRow[] = (data as any[]).map((r: any) => {
                        const orgRaw = r.organization;
                        const countryRaw = r.country;
                        const deptRaw = r.department;
                        const specRaw = r.specialty;
                        const occRaw = r.occupation;

                        const organization = Array.isArray(orgRaw) ? orgRaw[0] : orgRaw ?? null;
                        const country = Array.isArray(countryRaw) ? countryRaw[0] : countryRaw ?? null;
                        const department = Array.isArray(deptRaw) ? deptRaw[0] : deptRaw ?? null;
                        const specialty = Array.isArray(specRaw) ? specRaw[0] : specRaw ?? null;
                        const occupation = Array.isArray(occRaw) ? occRaw[0] : occRaw ?? null;

                        const creatorFullName = r.created_by
                            ? profileMap.get(r.created_by) ?? null
                            : null;

                        return {
                            id: Number(r.id),
                            first_name: r.first_name ?? '',
                            last_name: r.last_name ?? '',
                            academic_title: r.academic_title ?? null,
                            email: r.email ?? null,
                            mobile_phone: r.mobile_phone ?? null,
                            office_phone: r.office_phone ?? null,
                            hospital_clinic_address: r.hospital_clinic_address ?? null,
                            admin_assistant_name: r.admin_assistant_name ?? null,
                            admin_assistant_email: r.admin_assistant_email ?? null,
                            admin_assistant_phone: r.admin_assistant_phone ?? null,
                            created_at: r.created_at ?? new Date().toISOString(),
                            organization: organization ? { name: organization.name ?? null } : undefined,
                            country: country ? { name: country.name ?? null } : undefined,
                            department: department ? { name: department.name ?? null } : undefined,
                            specialty: specialty ? { name: specialty.name ?? null } : undefined,
                            occupation: occupation ? { name: occupation.name ?? null } : undefined,
                            creator: creatorFullName ? { full_name: creatorFullName } : undefined,
                        };
                    });

                    setRows(mapped);
                    setFiltered(mapped);
                }

                // 3) Load countries for filter
                const { data: countryData } = await supabase
                    .from('country')
                    .select('id, name')
                    .order('name');

                if (mounted) {
                    setCountries(countryData ?? []);
                }
            } catch (err) {
                console.error('Load failed', err);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        load();

        return () => {
            mounted = false;
        };
    }, []);

    // Search + filter
    useEffect(() => {
        let data = [...rows];

        if (search) {
            const s = search.toLowerCase();
            data = data.filter(r => {
                const fullName = `${r.first_name} ${r.last_name}`.toLowerCase();
                const email = (r.email ?? '').toLowerCase();
                const orgName = (r.organization?.name ?? '').toLowerCase();
                const spec = (r.specialty?.name ?? '').toLowerCase();
                return (
                    fullName.includes(s) ||
                    email.includes(s) ||
                    orgName.includes(s) ||
                    spec.includes(s)
                );
            });
        }

        if (countryFilter) {
            data = data.filter(r => r.country?.name === countryFilter);
        }

        setFiltered(data);
    }, [rows, search, countryFilter]);

    const exportToCsv = () => {
        const header = [
            'ID',
            'First Name',
            'Last Name',
            'Academic Title',
            'Email',
            'Mobile Phone',
            'Office Phone',
            'Country',
            'Organization',
            'Department',
            'Specialty',
            'Occupation',
            'Hospital/Clinic Address',
            'Admin Assistant Name',
            'Admin Assistant Email',
            'Admin Assistant Phone',
            'Created By',
            'Created At',
        ];

        const lines = filtered.map(r =>
            [
                r.id,
                r.first_name,
                r.last_name,
                r.academic_title ?? '',
                r.email ?? '',
                r.mobile_phone ?? '',
                r.office_phone ?? '',
                r.country?.name ?? '',
                r.organization?.name ?? '',
                r.department?.name ?? '',
                r.specialty?.name ?? '',
                r.occupation?.name ?? '',
                r.hospital_clinic_address ?? '',
                r.admin_assistant_name ?? '',
                r.admin_assistant_email ?? '',
                r.admin_assistant_phone ?? '',
                r.creator?.full_name ?? '',
                r.created_at,
            ]
                .map(v => `"${String(v).replace(/"/g, '""')}"`)
                .join(',')
        );

        const csv = [header.join(','), ...lines].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'contacts_export.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleLogout = async () => {
        setLoggingOut(true);

        try {
            const { createClient } = await import('@supabase/supabase-js');
            const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
            const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
            if (!url || !anon) {
                console.error('Missing public envs for logout');
                window.location.assign('/login');
                return;
            }
            const supabase = createClient(url, anon);

            await supabase.auth.signOut();

            const start = Date.now();
            while (Date.now() - start < 3000) {
                const { data } = await supabase.auth.getSession();
                if (!data?.session) break;
                await new Promise(res => setTimeout(res, 200));
            }

            try {
                Object.keys(localStorage).forEach(k => {
                    if (k.startsWith('sb-') || k.includes('supabase')) localStorage.removeItem(k);
                });
            } catch {
                // ignore
            }
        } catch (e) {
            console.warn('Sign out error', e);
        } finally {
            setLoggingOut(false);
            window.location.assign('/login');
        }
    };

    if (loading)
        return (
            <div className="bg-gray-50 min-h-[200px] flex items-center justify-center p-6">
                <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm w-full max-w-4xl text-center">
                    <p className="text-sm text-slate-500">Loading contacts...</p>
                </div>
            </div>
        );

    return (
        <div className="relative bg-gray-50 min-h-screen py-6 px-4">
            {/* Logout button */}
            <div className="absolute right-4 z-50">
                <button
                    onClick={handleLogout}
                    disabled={loggingOut}
                    aria-label="Logout"
                    className="flex items-center gap-2 px-3 h-10 rounded-full bg-white border border-slate-300 shadow hover:bg-slate-100 focus:outline-none"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-5 h-5 text-slate-700"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeWidth={1.8}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0z"
                        />
                        <path
                            strokeWidth={1.8}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 14c-5 0-8 2.5-8 5v1h16v-1c0-2.5-3-5-8-5z"
                        />
                    </svg>
                    <span className="text-sm font-medium text-slate-700">
                        {loggingOut ? 'Logging out...' : 'Logout'}
                    </span>
                </button>
            </div>

            <div className="max-w-full mx-auto p-6 pt-16">
                <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <Image
                                width={160}
                                height={160}
                                src="/Images/icts.jpeg"
                                alt="ICTS"
                                className="mb-8 mx-auto block"
                            />
                            <p className="text-2xl text-slate-500">Manage your contacts</p>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={exportToCsv}
                                className="px-3 py-2 rounded bg-[#0B62C1] hover:bg-emerald-500 text-sm text-white"
                            >
                                Export CSV
                            </button>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                        <input
                            placeholder="Search by name, email, organization, specialty"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="px-3 py-2 rounded bg-slate-100 border border-slate-300 text-sm text-slate-900 w-full sm:w-72"
                        />
                        <select
                            value={countryFilter}
                            onChange={e => setCountryFilter(e.target.value)}
                            className="px-3 py-2 rounded bg-slate-100 border border-slate-300 text-sm text-slate-900"
                        >
                            <option value="">All countries</option>
                            {countries.map(c => (
                                <option key={c.id} value={c.name}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                        <div className="ml-auto text-sm text-slate-500">
                            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto border border-slate-100 rounded">
                        <table className="min-w-full text-sm">
                            <thead className="bg-slate-300">
                                <tr>
                                    <th className="px-3 py-3 text-left text-slate-700 font-medium">Name</th>
                                    <th className="px-3 py-3 text-left text-slate-700 font-medium">
                                        Academic Title
                                    </th>
                                    <th className="px-3 py-3 text-left text-slate-700 font-medium">Email</th>
                                    <th className="px-3 py-3 text-left text-slate-700 font-medium">Mobile</th>
                                    <th className="px-3 py-3 text-left text-slate-700 font-medium">Country</th>
                                    <th className="px-3 py-3 text-left text-slate-700 font-medium">
                                        Organization
                                    </th>
                                    <th className="px-3 py-3 text-left text-slate-700 font-medium">
                                        Admin Assistant
                                    </th>
                                    <th className="px-3 py-3 text-left text-slate-700 font-medium">
                                        Created By
                                    </th>
                                    <th className="px-3 py-3 text-left text-slate-700 font-medium">Created</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(r => (
                                    <tr
                                        key={r.id}
                                        className="border-t border-slate-100 hover:bg-slate-50"
                                    >
                                        <td className="px-3 py-3 text-slate-900">
                                            {r.first_name} {r.last_name}
                                        </td>
                                        <td className="px-3 py-3 text-slate-700">
                                            {r.academic_title ?? ''}
                                        </td>
                                        <td className="px-3 py-3 text-slate-700">{r.email}</td>
                                        <td className="px-3 py-3 text-slate-700">{r.mobile_phone}</td>
                                        <td className="px-3 py-3 text-slate-700">{r.country?.name}</td>
                                        <td className="px-3 py-3 text-slate-700">
                                            {r.organization?.name}
                                        </td>
                                        <td className="px-3 py-3 text-slate-700">
                                            {r.admin_assistant_name || r.admin_assistant_email
                                                ? `${r.admin_assistant_name ?? ''}${r.admin_assistant_email
                                                    ? ` (${r.admin_assistant_email})`
                                                    : ''
                                                }`
                                                : ''}
                                        </td>
                                        <td className="px-3 py-3 text-slate-700">
                                            {r.creator?.full_name || ''}
                                        </td>
                                        <td className="px-3 py-3 text-slate-700">
                                            {new Date(r.created_at).toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                                {filtered.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={9}
                                            className="px-3 py-6 text-center text-slate-400"
                                        >
                                            No contacts found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
