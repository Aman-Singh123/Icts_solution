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

const steps: { id: TabId; label: string }[] = [
    { id: 'contact', label: 'Contact Details' },
    { id: 'professional', label: 'Professional & Location' },
    { id: 'investigator', label: 'Investigator Profile' },
    { id: 'admin', label: 'Admin Assistant' },
];

export function ContactForm() {
    const [isAdmin, setIsAdmin] = useState(false);;
    useEffect(() => {
        const loadProfile = async () => {
            const { data: sessionData } = await supabase.auth.getSession();
            const session = sessionData.session;
            if (!session) return;

            const { data: profile } = await supabase
                .from('profiles')
                .select('is_admin')
                .eq('id', session.user.id)
                .maybeSingle();

            if (profile?.is_admin) {
                setIsAdmin(true);
            }
        };

        loadProfile();
    }, []);


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

    // we now track which step we're on (0..3)
    const [activeStep, setActiveStep] = useState(0);

    const currentTab = steps[activeStep].id;

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

    // --- Load dropdown data ---
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

    // --- Step navigation (does NOT save) ---
    const goNext = () => {
        setActiveStep(prev => Math.min(prev + 1, steps.length - 1));
    };

    const goPrev = () => {
        setActiveStep(prev => Math.max(prev - 1, 0));
    };

    // --- Submit handler (only called when clicking Save Contact on last step) ---
    const onSubmit = async (values: FormValues) => {
        setSubmitting(true);
        setMessage('');
        showLoader();

        const { is_investigator, inv_notes, ...rest } = values;

        try {
            // 0) Clean/normalize email
            const trimmedEmail = rest.email?.trim() || null;

            // 1) If email is provided, check if a contact already exists with same email
            if (trimmedEmail) {
                const { data: existing, error: existingError } = await supabase
                    .from('contact')
                    .select('id')
                    .ilike('email', trimmedEmail) // case-insensitive
                    .maybeSingle();

                if (existingError) {
                    console.error('Email check failed', existingError);
                    const msg = 'Could not verify email uniqueness. Please try again.';
                    setMessage(msg);
                    showToast(msg, 'error');
                    setSubmitting(false);
                    hideLoader();
                    return;
                }

                if (existing) {
                    const msg = 'A contact with this email already exists.';
                    setMessage(msg);
                    showToast(msg, 'error');
                    setSubmitting(false);
                    hideLoader();
                    return;
                }
            }

            // 2) Get current logged-in user
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

            // 3) Insert contact WITH created_by and all fields
            const { data: contactData, error: contactError } = await supabase
                .from('contact')
                .insert({
                    first_name: rest.first_name,
                    last_name: rest.last_name,
                    email: trimmedEmail,
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
                // extra safety: handle unique constraint here as well
                const rawMsg = contactError?.message || '';
                let msg = contactError?.message || 'Error creating contact.';

                if (rawMsg.includes('contact_email_unique') || rawMsg.includes('duplicate key value')) {
                    msg = 'A contact with this email already exists.';
                }

                setMessage(msg);
                showToast(msg, 'error');
                setSubmitting(false);
                hideLoader();
                return;
            }

            // 4) Investigator profile if flagged
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
            setActiveStep(0);
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

    return (
        <div className="relative bg-gray-50 min-h-screen py-6 px-4">
            {/* Logout button */}
            <div className="absolute top-4 right-4 z-50 flex gap-2">
                {/* Admin button – only for admins */}
                {isAdmin && (
                    <button
                        type="button"
                        onClick={() => router.push('/admin')}
                        className="flex items-center gap-2 px-3 h-10 rounded-full bg-[#0B62C1] text-white text-sm font-medium shadow hover:bg-emerald-500 focus:outline-none"
                    >
                        Admin
                    </button>
                )}

                {/* Logout button – always visible */}
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
                        <p className="text-xs text-slate-500 mt-1">
                            Use Next / Previous to move between sections. Data is saved only when you click
                            &quot;Save Contact&quot; on the last step.
                        </p>
                    </div>

                    {/* Step header (like tabs, but main navigation is via Next/Previous) */}
                    <div className="border-b border-slate-200 mb-4 flex gap-2 flex-wrap">
                        {steps.map((step, index) => (
                            <div
                                key={step.id}
                                className={`px-3 py-2 text-xs sm:text-sm rounded-t-md border-b-2
                  ${index === activeStep
                                        ? 'border-blue-600 text-blue-600 bg-blue-50'
                                        : 'border-transparent text-slate-400'
                                    }
                `}
                            >
                                {step.label}
                            </div>
                        ))}
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        {/* STEP: Contact Details */}
                        {currentTab === 'contact' && (
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

                        {/* STEP: Professional & Location */}
                        {currentTab === 'professional' && (
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

                        {/* STEP: Investigator */}
                        {currentTab === 'investigator' && (
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

                        {/* STEP: Admin Assistant */}
                        {currentTab === 'admin' && (
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

                        {/* Message */}
                        {message && (
                            <p className="text-xs text-slate-600">{message}</p>
                        )}

                        {/* Navigation + Save (only last step has Save) */}
                        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                            <div>
                                {activeStep > 0 && (
                                    <button
                                        type="button"
                                        onClick={goPrev}
                                        className="px-4 py-2 mr-2 rounded border border-slate-300 text-sm text-slate-700 bg-white hover:bg-slate-100"
                                    >
                                        Previous
                                    </button>
                                )}
                            </div>

                            <div className="ml-auto flex gap-2">
                                {activeStep < steps.length - 1 && (
                                    <button
                                        type="button"
                                        onClick={goNext}
                                        className="px-4 py-2 rounded bg-slate-600 hover:bg-slate-700 text-sm text-white"
                                    >
                                        Next
                                    </button>
                                )}

                                {activeStep === steps.length - 1 && (
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="px-4 py-2 rounded bg-[#0B62C1] hover:bg-emerald-500 text-sm text-white disabled:opacity-60"
                                    >
                                        {submitting ? 'Saving...' : 'Save Contact'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
