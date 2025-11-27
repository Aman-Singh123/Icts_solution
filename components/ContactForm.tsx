// components/ContactForm.tsx
'use client';

import { useForm } from 'react-hook-form';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useLoader } from './LoaderProvider';
import { useToast } from './Toast';

type Option = { id: number; name: string };

type FormValues = {
    first_name: string;
    last_name: string;
    email: string;
    mobile_phone: string;
    office_phone: string;

    // NEW FIELDS that match updated contact table
    academic_title: string;
    hospital_clinic_address: string;
    admin_assistant_name: string;
    admin_assistant_email: string;
    admin_assistant_phone: string;

    country_id: number | '';
    state_id: number | '';
    city_id: number | '';
    organization_id: number | '';
    specialty_id: number | '';
    occupation_id: number | '';
    department_id: number | '';

    // investigator section
    has_pi_experience: boolean;
    pi_experience_notes: string;
    interested_in_pi_role: boolean;
    pi_interest_notes: string;
    has_subi_experience: boolean;
    subi_experience_notes: string;
    interested_in_subi_role: boolean;
    subi_interest_notes: string;
    gcp_trained: boolean;
    gcp_last_training_date: string;
    inv_notes: string;
    is_investigator: boolean;
};

type TabId = 'contact' | 'professional' | 'investigator' | 'admin';

export function ContactForm() {
    const {
        register,
        handleSubmit,
        watch,
        reset,
    } = useForm<FormValues>({
        defaultValues: {
            has_pi_experience: false,
            interested_in_pi_role: false,
            has_subi_experience: false,
            interested_in_subi_role: false,
            gcp_trained: false,
            is_investigator: false,
        },
    });

    const router = useRouter();
    const { showToast } = useToast();
    const { showLoader, hideLoader } = useLoader();

    const [activeTab, setActiveTab] = useState<TabId>('contact');

    const [countries, setCountries] = useState<Option[]>([]);
    const [states, setStates] = useState<Option[]>([]);
    const [cities, setCities] = useState<Option[]>([]);
    const [orgs, setOrgs] = useState<Option[]>([]);
    const [specialties, setSpecialties] = useState<Option[]>([]);
    const [occupations, setOccupations] = useState<Option[]>([]);
    const [departments, setDepartments] = useState<Option[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    const [loggingOut, setLoggingOut] = useState(false);

    const selectedCountryId = watch('country_id');
    const selectedStateId = watch('state_id');
    const isInvestigator = watch('is_investigator');

    useEffect(() => {
        const loadStatic = async () => {
            try {
                const [countryRes, orgRes, specRes, occRes, deptRes] = await Promise.all([
                    supabase.from('country').select('id, name').order('name'),
                    supabase.from('organization').select('id, name').order('name'),
                    supabase.from('specialty').select('id, name').order('name'),
                    supabase.from('occupation').select('id, name').order('name'),
                    supabase.from('department').select('id, name').order('name'),
                ]);

                setCountries(countryRes.data ?? []);
                setOrgs(orgRes.data ?? []);
                setSpecialties(specRes.data ?? []);
                setOccupations(occRes.data ?? []);
                setDepartments(deptRes.data ?? []);
            } catch (err) {
                console.error('Failed to load static lists', err);
                showToast('Failed to load dropdown data.', 'error');
            }
        };
        loadStatic();
    }, [showToast]);

    useEffect(() => {
        const loadStates = async () => {
            try {
                if (!selectedCountryId) {
                    setStates([]);
                    return;
                }
                const { data } = await supabase
                    .from('state_region')
                    .select('id, name')
                    .eq('country_id', selectedCountryId)
                    .order('name');
                setStates(data ?? []);
            } catch (err) {
                console.error('Failed to load states', err);
                setStates([]);
                showToast('Failed to load states.', 'error');
            }
        };
        loadStates();
    }, [selectedCountryId, showToast]);

    useEffect(() => {
        const loadCities = async () => {
            try {
                if (!selectedStateId) {
                    setCities([]);
                    return;
                }
                const { data } = await supabase
                    .from('city')
                    .select('id, name')
                    .eq('state_id', selectedStateId)
                    .order('name');
                setCities(data ?? []);
            } catch (err) {
                console.error('Failed to load cities', err);
                setCities([]);
                showToast('Failed to load cities.', 'error');
            }
        };
        loadCities();
    }, [selectedStateId, showToast]);

    const onSubmit = async (values: FormValues) => {
        setSubmitting(true);
        setMessage('');
        showLoader();

        const { is_investigator, inv_notes, ...rest } = values;

        try {
            // 1) Get current logged-in user
            const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

            if (sessionError) {
                const msg = sessionError.message || 'Could not get user session.';
                setMessage(msg);
                showToast(msg, 'error');
                setSubmitting(false);
                hideLoader();
                return;
            }

            const session = sessionData.session;
            if (!session) {
                const msg = 'You must be logged in to save a contact.';
                setMessage(msg);
                showToast(msg, 'error');
                setSubmitting(false);
                hideLoader();
                return;
            }

            const userId = session.user.id;

            // 2) Insert contact WITH created_by and new fields
            const { data: contactData, error: contactError } = await supabase
                .from('contact')
                .insert({
                    first_name: rest.first_name,
                    last_name: rest.last_name,
                    email: rest.email || null,
                    mobile_phone: rest.mobile_phone || null,
                    office_phone: rest.office_phone || null,
                    academic_title: rest.academic_title || null,
                    hospital_clinic_address: rest.hospital_clinic_address || null,
                    admin_assistant_name: rest.admin_assistant_name || null,
                    admin_assistant_email: rest.admin_assistant_email || null,
                    admin_assistant_phone: rest.admin_assistant_phone || null,
                    country_id: rest.country_id || null,
                    state_id: rest.state_id || null,
                    city_id: rest.city_id || null,
                    organization_id: rest.organization_id || null,
                    specialty_id: rest.specialty_id || null,
                    occupation_id: rest.occupation_id || null,
                    department_id: rest.department_id || null,
                    created_by: userId,
                })
                .select('id')
                .single();

            if (contactError || !contactData) {
                const msg = contactError?.message || 'Error creating contact.';
                setMessage(msg);
                showToast(msg, 'error');
                setSubmitting(false);
                hideLoader();
                return;
            }

            // 3) Investigator profile if flagged
            if (is_investigator) {
                const { error: invError } = await supabase
                    .from('contact_investigator_profile')
                    .insert({
                        contact_id: contactData.id,
                        has_pi_experience: rest.has_pi_experience,
                        pi_experience_notes: rest.pi_experience_notes || null,
                        interested_in_pi_role: rest.interested_in_pi_role,
                        pi_interest_notes: rest.pi_interest_notes || null,
                        has_subi_experience: rest.has_subi_experience,
                        subi_experience_notes: rest.subi_experience_notes || null,
                        interested_in_subi_role: rest.interested_in_subi_role,
                        subi_interest_notes: rest.subi_interest_notes || null,
                        gcp_trained: rest.gcp_trained,
                        gcp_last_training_date: rest.gcp_last_training_date || null,
                        notes: inv_notes || null,
                    });

                if (invError) {
                    const msg =
                        'Contact saved but investigator profile failed: ' + invError.message;
                    setMessage(msg);
                    showToast(msg, 'error');
                    setSubmitting(false);
                    hideLoader();
                    return;
                }
            }

            setMessage('Contact saved successfully.');
            showToast('Contact saved successfully.', 'success');
            reset();
            setActiveTab('contact');
        } catch (err: any) {
            console.error('Save failed', err);
            const msg = err?.message || 'Something went wrong.';
            setMessage(msg);
            showToast(msg, 'error');
        } finally {
            setSubmitting(false);
            hideLoader();
        }
    };

    const handleLogout = async () => {
        setLoggingOut(true);
        showLoader();
        try {
            await supabase.auth.signOut();
            showToast('Logged out successfully.', 'success');
        } catch (e: any) {
            console.warn('Sign out error', e);
            showToast(e?.message || 'Error while logging out.', 'error');
        } finally {
            setLoggingOut(false);
            hideLoader();
            router.replace('/login');
        }
    };

    const tabs: { id: TabId; label: string }[] = [
        { id: 'contact', label: 'Contact Details' },
        { id: 'professional', label: 'Professional & Location' },
        { id: 'investigator', label: 'Investigator Profile' },
        { id: 'admin', label: 'Admin Assistant' },
    ];

    return (
        <div className="relative bg-gray-50 min-h-screen py-6 px-4">
            {/* Logout button */}
            <div className="absolute top-4 right-4 z-50">
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

            <div className="max-w-4xl mx-auto p-4 sm:p-8">
                {/* Card */}
                <div className="p-6 sm:p-8 rounded-2xl bg-white border border-gray-200 shadow-sm">
                    <div className="mb-6 text-center">
                        <Image
                            width={160}
                            height={160}
                            src="/Images/icts.jpeg"
                            alt="ICTS"
                            className="mb-8 mx-auto block"
                        />
                        <h3 className="text-slate-600 text-2xl mt-3">Contact Form</h3>
                    </div>

                    {/* Tabs */}
                    <div className="border-b border-slate-200 mb-4 flex gap-2 flex-wrap">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-3 py-2 text-xs sm:text-sm rounded-t-md border-b-2
                  ${activeTab === tab.id
                                        ? 'border-blue-600 text-blue-600 bg-blue-50'
                                        : 'border-transparent text-slate-500 hover:text-slate-800'
                                    }
                `}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        {/* TAB: Contact Details */}
                        {activeTab === 'contact' && (
                            <section className="space-y-3">
                                <h3 className="font-semibold text-sm">Contact Details</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs mb-1">First Name *</label>
                                        <input
                                            {...register('first_name', { required: true })}
                                            className="w-full px-2 py-2 rounded bg-slate-100 border border-slate-300 text-sm text-slate-900"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs mb-1">Last Name *</label>
                                        <input
                                            {...register('last_name', { required: true })}
                                            className="w-full px-2 py-2 rounded bg-slate-100 border border-slate-300 text-sm text-slate-900"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs mb-1">Academic / Work Title</label>
                                        <input
                                            {...register('academic_title')}
                                            className="w-full px-2 py-2 rounded bg-slate-100 border border-slate-300 text-sm text-slate-900"
                                            placeholder="e.g. Consultant Physician, Professor"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs mb-1">Email</label>
                                        <input
                                            type="email"
                                            {...register('email')}
                                            className="w-full px-2 py-2 rounded bg-slate-100 border border-slate-300 text-sm text-slate-900"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs mb-1">Mobile Phone</label>
                                        <input
                                            {...register('mobile_phone')}
                                            className="w-full px-2 py-2 rounded bg-slate-100 border border-slate-300 text-sm text-slate-900"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs mb-1">Office Phone</label>
                                        <input
                                            {...register('office_phone')}
                                            className="w-full px-2 py-2 rounded bg-slate-100 border border-slate-300 text-sm text-slate-900"
                                        />
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* TAB: Professional & Location */}
                        {activeTab === 'professional' && (
                            <section className="space-y-3">
                                <h3 className="font-semibold text-sm">Professional & Location</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div className="md:col-span-2">
                                        <label className="block text-xs mb-1">Hospital / Clinic Address</label>
                                        <textarea
                                            {...register('hospital_clinic_address')}
                                            className="w-full px-2 py-2 rounded bg-slate-100 border border-slate-300 text-sm text-slate-900"
                                            rows={2}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs mb-1">Organization</label>
                                        <select
                                            {...register('organization_id')}
                                            className="w-full px-2 py-2 rounded bg-slate-100 border border-slate-300 text-sm text-slate-900"
                                        >
                                            <option value="">-- Select --</option>
                                            {orgs.map(o => (
                                                <option key={o.id} value={o.id}>
                                                    {o.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs mb-1">Department</label>
                                        <select
                                            {...register('department_id')}
                                            className="w-full px-2 py-2 rounded bg-slate-100 border border-slate-300 text-sm text-slate-900"
                                        >
                                            <option value="">-- Select --</option>
                                            {departments.map(d => (
                                                <option key={d.id} value={d.id}>
                                                    {d.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs mb-1">Occupation</label>
                                        <select
                                            {...register('occupation_id')}
                                            className="w-full px-2 py-2 rounded bg-slate-100 border border-slate-300 text-sm text-slate-900"
                                        >
                                            <option value="">-- Select --</option>
                                            {occupations.map(o => (
                                                <option key={o.id} value={o.id}>
                                                    {o.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs mb-1">Specialty</label>
                                        <select
                                            {...register('specialty_id')}
                                            className="w-full px-2 py-2 rounded bg-slate-100 border border-slate-300 text-sm text-slate-900"
                                        >
                                            <option value="">-- Select --</option>
                                            {specialties.map(s => (
                                                <option key={s.id} value={s.id}>
                                                    {s.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs mb-1">Country</label>
                                        <select
                                            {...register('country_id')}
                                            className="w-full px-2 py-2 rounded bg-slate-100 border border-slate-300 text-sm text-slate-900"
                                        >
                                            <option value="">-- Select --</option>
                                            {countries.map(c => (
                                                <option key={c.id} value={c.id}>
                                                    {c.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs mb-1">State / Region</label>
                                        <select
                                            {...register('state_id')}
                                            className="w-full px-2 py-2 rounded bg-slate-100 border border-slate-300 text-sm text-slate-900"
                                        >
                                            <option value="">-- Select --</option>
                                            {states.map(s => (
                                                <option key={s.id} value={s.id}>
                                                    {s.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs mb-1">City</label>
                                        <select
                                            {...register('city_id')}
                                            className="w-full px-2 py-2 rounded bg-slate-100 border border-slate-300 text-sm text-slate-900"
                                        >
                                            <option value="">-- Select --</option>
                                            {cities.map(c => (
                                                <option key={c.id} value={c.id}>
                                                    {c.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* TAB: Investigator */}
                        {activeTab === 'investigator' && (
                            <section className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <input type="checkbox" {...register('is_investigator')} />
                                    <span className="text-sm">This contact is an investigator</span>
                                </div>

                                {isInvestigator && (
                                    <div className="space-y-3 border border-slate-200 rounded p-3">
                                        <h3 className="font-semibold text-sm">Investigator Profile</h3>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs mb-1">Has PI experience?</label>
                                                <input type="checkbox" {...register('has_pi_experience')} />
                                            </div>
                                            <div>
                                                <label className="block text-xs mb-1">Interested in PI role?</label>
                                                <input type="checkbox" {...register('interested_in_pi_role')} />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="block text-xs mb-1">PI experience notes</label>
                                                <textarea
                                                    {...register('pi_experience_notes')}
                                                    className="w-full px-2 py-2 rounded bg-slate-100 border border-slate-300 text-sm text-slate-900"
                                                />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="block text-xs mb-1">PI interest notes</label>
                                                <textarea
                                                    {...register('pi_interest_notes')}
                                                    className="w-full px-2 py-2 rounded bg-slate-100 border border-slate-300 text-sm text-slate-900"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs mb-1">Has Sub-I experience?</label>
                                                <input type="checkbox" {...register('has_subi_experience')} />
                                            </div>
                                            <div>
                                                <label className="block text-xs mb-1">Interested in Sub-I role?</label>
                                                <input type="checkbox" {...register('interested_in_subi_role')} />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="block text-xs mb-1">Sub-I experience notes</label>
                                                <textarea
                                                    {...register('subi_experience_notes')}
                                                    className="w-full px-2 py-2 rounded bg-slate-100 border border-slate-300 text-sm text-slate-900"
                                                />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="block text-xs mb-1">Sub-I interest notes</label>
                                                <textarea
                                                    {...register('subi_interest_notes')}
                                                    className="w-full px-2 py-2 rounded bg-slate-100 border border-slate-300 text-sm text-slate-900"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs mb-1">GCP trained?</label>
                                                <input type="checkbox" {...register('gcp_trained')} />
                                            </div>
                                            <div>
                                                <label className="block text-xs mb-1">Last GCP training date</label>
                                                <input
                                                    type="date"
                                                    {...register('gcp_last_training_date')}
                                                    className="w-full px-2 py-2 rounded bg-slate-100 border border-slate-300 text-sm text-slate-900"
                                                />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="block text-xs mb-1">Notes</label>
                                                <textarea
                                                    {...register('inv_notes')}
                                                    className="w-full px-2 py-2 rounded bg-slate-100 border border-slate-300 text-sm text-slate-900"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </section>
                        )}

                        {/* TAB: Admin Assistant */}
                        {activeTab === 'admin' && (
                            <section className="space-y-3">
                                <h3 className="font-semibold text-sm">Admin Assistant Details</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs mb-1">Admin Assistant Name</label>
                                        <input
                                            {...register('admin_assistant_name')}
                                            className="w-full px-2 py-2 rounded bg-slate-100 border border-slate-300 text-sm text-slate-900"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs mb-1">Admin Assistant Email</label>
                                        <input
                                            type="email"
                                            {...register('admin_assistant_email')}
                                            className="w-full px-2 py-2 rounded bg-slate-100 border border-slate-300 text-sm text-slate-900"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs mb-1">Admin Assistant Phone</label>
                                        <input
                                            {...register('admin_assistant_phone')}
                                            className="w-full px-2 py-2 rounded bg-slate-100 border border-slate-300 text-sm text-slate-900"
                                        />
                                    </div>
                                </div>
                            </section>
                        )}

                        {message && (
                            <p className="text-xs text-slate-600">{message}</p>
                        )}

                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-4 py-2 rounded bg-[#0B62C1] hover:bg-emerald-500 text-sm text-white disabled:opacity-60"
                        >
                            {submitting ? 'Saving...' : 'Save Contact'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
