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
    // Contact details
    title: string;
    first_name: string;
    last_name: string;
    email: string;
    mobile_phone: string;
    office_phone: string;
    academic_title: string;

    // Status
    record_status: 'Active' | 'Inactive' | '';

    // Organisation / address details
    address_line_1: string;
    address_line_2: string;
    postal_code: string;
    hospital_clinic_address: string; // derived when saving

    org_type: 'Hospital' | 'Clinic' | 'Other' | '';
    org_type_other: string;

    admin_assistant_name: string;
    admin_assistant_email: string;
    admin_assistant_phone: string;

    // Combo-box text values for lookups
    organization_name: string;
    specialty_name: string;
    occupation_name: string;
    department_name: string;
    country_name: string;
    state_name: string;
    city_name: string;

    // Investigator / specialty section
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

type TabId = 'contact' | 'specialty' | 'organisation' | 'admin';

const steps: { id: TabId; label: string }[] = [
    { id: 'contact', label: 'Contact Details' },
    { id: 'specialty', label: 'Specialty & Role' },
    { id: 'organisation', label: 'Organisation' },
    { id: 'admin', label: 'Secretary / Administrator' },
];

export function ContactForm() {
    const [isAdmin, setIsAdmin] = useState(false);

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
        formState: { errors },
    } = useForm<FormValues>({
        defaultValues: {
            title: '',
            first_name: '',
            last_name: '',
            email: '',
            mobile_phone: '',
            office_phone: '',
            academic_title: '',
            record_status: 'Active',

            address_line_1: '',
            address_line_2: '',
            postal_code: '',
            hospital_clinic_address: '',

            org_type: '',
            org_type_other: '',

            admin_assistant_name: '',
            admin_assistant_email: '',
            admin_assistant_phone: '',

            organization_name: '',
            specialty_name: '',
            occupation_name: '',
            department_name: '',
            country_name: '',
            state_name: '',
            city_name: '',

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

    // watch combo text values for dependent loading
    const countryName = watch('country_name');
    const stateName = watch('state_name');
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

    // Load states based on typed/selected country name
    useEffect(() => {
        const loadStates = async () => {
            try {
                if (!countryName) {
                    setStates([]);
                    return;
                }

                const matchCountry = countries.find(
                    c => c.name.toLowerCase() === countryName.toLowerCase()
                );
                if (!matchCountry) {
                    setStates([]);
                    return;
                }

                const { data } = await supabase
                    .from('state_region')
                    .select('id, name')
                    .eq('country_id', matchCountry.id)
                    .order('name');
                setStates(data ?? []);
            } catch (err) {
                console.error('Failed to load states', err);
                setStates([]);
                showToast('Failed to load states.', 'error');
            }
        };
        loadStates();
    }, [countryName, countries, showToast]);

    // Load cities based on typed/selected state name
    useEffect(() => {
        const loadCities = async () => {
            try {
                if (!stateName) {
                    setCities([]);
                    return;
                }

                const matchState = states.find(
                    s => s.name.toLowerCase() === stateName.toLowerCase()
                );
                if (!matchState) {
                    setCities([]);
                    return;
                }

                const { data } = await supabase
                    .from('city')
                    .select('id, name')
                    .eq('state_id', matchState.id)
                    .order('name');
                setCities(data ?? []);
            } catch (err) {
                console.error('Failed to load cities', err);
                setCities([]);
                showToast('Failed to load cities.', 'error');
            }
        };
        loadCities();
    }, [stateName, states, showToast]);

    // --- Step navigation (does NOT save) ---
    const goNext = () => {
        setActiveStep(prev => Math.min(prev + 1, steps.length - 1));
    };

    const goPrev = () => {
        setActiveStep(prev => Math.max(prev - 1, 0));
    };

    const goToStep = (index: number) => {
        setActiveStep(index);
    };

    // helper to lookup or create by name in a table
    const ensureLookup = async (
        table: string,
        name: string | undefined,
        extra: Record<string, any> = {}
    ): Promise<number | null> => {
        const trimmed = name?.trim();
        if (!trimmed) return null;

        // Try to find existing
        const { data: existing, error: selError } = await supabase
            .from(table)
            .select('id, name')
            .ilike('name', trimmed)
            .maybeSingle();

        if (selError) {
            console.error(`Lookup failed on ${table}`, selError);
        }

        if (existing?.id) {
            return existing.id as number;
        }

        // Insert new
        const { data: inserted, error: insError } = await supabase
            .from(table)
            .insert({ name: trimmed, ...extra })
            .select('id')
            .single();

        if (insError) {
            console.error(`Insert failed on ${table}`, insError);
            throw insError;
        }

        return inserted?.id ?? null;
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
                    .ilike('email', trimmedEmail)
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

            // 3) Resolve or create lookup IDs from combo-box names
            const countryId = await ensureLookup('country', rest.country_name);
            const stateId = await ensureLookup('state_region', rest.state_name, {
                country_id: countryId,
            });
            const cityId = await ensureLookup('city', rest.city_name, {
                state_id: stateId,
            });

            const organizationId = await ensureLookup('organization', rest.organization_name);
            const departmentId = await ensureLookup('department', rest.department_name);
            const specialtyId = await ensureLookup('specialty', rest.specialty_name);
            const occupationId = await ensureLookup('occupation', rest.occupation_name);

            // 4) Build address string from address_line_1/2 + postal_code + org type
            let orgTypeLabel: string | null = null;
            if (rest.org_type) {
                orgTypeLabel =
                    rest.org_type === 'Other'
                        ? rest.org_type_other || 'Other'
                        : rest.org_type;
            }

            const addressParts: string[] = [];
            if (orgTypeLabel) addressParts.push(`Org type: ${orgTypeLabel}`);
            if (rest.address_line_1) addressParts.push(rest.address_line_1);
            if (rest.address_line_2) addressParts.push(rest.address_line_2);
            if (rest.postal_code) addressParts.push(`Postal code: ${rest.postal_code}`);

            const fullAddress = addressParts.length > 0 ? addressParts.join('\n') : null;

            // 5) Insert contact WITH created_by and all fields
            const { data: contactData, error: contactError } = await supabase
                .from('contact')
                .insert({
                    title: rest.title || null, // requires `title` column
                    first_name: rest.first_name,
                    last_name: rest.last_name,
                    email: trimmedEmail,
                    mobile_phone: rest.mobile_phone || null,
                    office_phone: rest.office_phone || null,
                    academic_title: rest.academic_title || null,
                    hospital_clinic_address: fullAddress,
                    admin_assistant_name: rest.admin_assistant_name || null,
                    admin_assistant_email: rest.admin_assistant_email || null,
                    admin_assistant_phone: rest.admin_assistant_phone || null,
                    country_id: countryId,
                    state_id: stateId,
                    city_id: cityId,
                    organization_id: organizationId,
                    specialty_id: specialtyId,
                    occupation_id: occupationId,
                    department_id: departmentId,
                    record_status: (rest.record_status || 'Active') as 'Active' | 'Inactive', // requires column in DB
                    created_by: userId,
                })
                .select('id')
                .single();

            if (contactError || !contactData) {
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

            // 6) Investigator profile if flagged
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
            reset({ record_status: 'Active' } as any);
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
            {/* Top-right buttons */}
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
                            Use the tabs or Next / Previous to move between sections. Data is saved only
                            when you click &quot;Save Contact&quot; on the last step.
                        </p>
                    </div>

                    {/* Step header – TABS (clickable) */}
                    <div className="border-b border-slate-200 mb-4 flex gap-2 flex-wrap">
                        {steps.map((step, index) => (
                            <button
                                key={step.id}
                                type="button"
                                onClick={() => goToStep(index)}
                                className={`px-3 py-2 text-xs sm:text-sm rounded-t-md border-b-2
                  ${index === activeStep
                                        ? 'border-blue-600 text-blue-600 bg-blue-50'
                                        : 'border-transparent text-slate-400 hover:text-slate-700'
                                    }
                `}
                            >
                                {step.label}
                            </button>
                        ))}
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        {/* STEP: Contact Details */}
                        {currentTab === 'contact' && (
                            <section className="space-y-3">
                                <h3 className="font-semibold text-sm">Principal Contact</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs mb-1">Title </label>
                                        <input
                                            list="titleOptions"
                                            {...register('title')}
                                            className="w-full px-2 py-2 rounded bg-slate-100 border border-slate-300 text-sm text-slate-900"
                                            placeholder="e.g. Dr, Prof, Mr, Ms"
                                        />
                                        <datalist id="titleOptions">
                                            <option value="Dr" />
                                            <option value="Prof" />
                                            <option value="Mr" />
                                            <option value="Mrs" />
                                            <option value="Ms" />
                                        </datalist>
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
                                        <label className="block text-xs mb-1">First Name *</label>
                                        <input
                                            {...register('first_name', { required: 'First name is required' })}
                                            className="w-full px-2 py-2 rounded bg-slate-100 border border-slate-300 text-sm text-slate-900"
                                        />
                                        {errors.first_name && (
                                            <p className="text-[11px] text-red-500 mt-1">
                                                {errors.first_name.message}
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-xs mb-1">Last Name *</label>
                                        <input
                                            {...register('last_name', { required: 'Last name is required' })}
                                            className="w-full px-2 py-2 rounded bg-slate-100 border border-slate-300 text-sm text-slate-900"
                                        />
                                        {errors.last_name && (
                                            <p className="text-[11px] text-red-500 mt-1">
                                                {errors.last_name.message}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-xs mb-1">Email address</label>
                                        <input
                                            type="email"
                                            {...register('email')}
                                            className="w-full px-2 py-2 rounded bg-slate-100 border border-slate-300 text-sm text-slate-900"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs mb-1">Office Number</label>
                                        <input
                                            {...register("office_phone", {
                                                pattern: {
                                                    value: /^[0-9]*$/,
                                                    message: "Digits only",
                                                },
                                            })}
                                            inputMode="numeric"
                                            onInput={(e) => {
                                                e.currentTarget.value = e.currentTarget.value.replace(/\D/g, "");
                                            }}
                                            className="w-full px-2 py-2 rounded bg-slate-100 border border-slate-300 text-sm text-slate-900"
                                        />
                                        {errors.office_phone && (
                                            <p className="text-[11px] text-red-500 mt-1">
                                                {errors.office_phone.message}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-xs mb-1">Mobile Number</label>
                                        <input
                                            {...register("mobile_phone", {
                                                pattern: {
                                                    value: /^[0-9]*$/,
                                                    message: "Digits only",
                                                },
                                            })} 
                                            inputMode="numeric"
                                            onInput={(e) => {
                                                e.currentTarget.value = e.currentTarget.value.replace(/\D/g, "");
                                            }}
                                            className="w-full px-2 py-2 rounded bg-slate-100 border border-slate-300 text-sm text-slate-900"
                                        />
                                        {errors.mobile_phone && (
                                            <p className="text-[11px] text-red-500 mt-1">
                                                {errors.mobile_phone.message}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-xs mb-1">Record Status</label>
                                        <select
                                            {...register('record_status')}
                                            disabled={!isAdmin}
                                            className={`w-full px-2 py-2 rounded border text-sm ${isAdmin
                                                    ? 'bg-slate-100 border-slate-300 text-slate-900'
                                                    : 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
                                                }`}
                                        >
                                            <option value="Active">Active</option>
                                            <option value="Inactive">Inactive</option>
                                        </select>
                                        {!isAdmin && (
                                            <p className="text-[10px] text-slate-400 mt-1">
                                                Only admin can change this. Default is Active.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* STEP: Specialty & Role (Investigator) */}
                        {currentTab === 'specialty' && (
                            <section className="space-y-3">
                                <h3 className="font-semibold text-sm">Specialty & Investigator Role</h3>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-xs mb-1">Occupation </label>
                                        <input
                                            list="occupationOptions"
                                            {...register('occupation_name')}
                                            className="w-full px-2 py-2 rounded bg-slate-100 border border-slate-300 text-sm text-slate-900"
                                            placeholder="Type or select occupation"
                                        />
                                        <datalist id="occupationOptions">
                                            {occupations.map(o => (
                                                <option key={o.id} value={o.name} />
                                            ))}
                                        </datalist>
                                    </div>
                                    <div>
                                        <label className="block text-xs mb-1">Specialty </label>
                                        <input
                                            list="specialtyOptions"
                                            {...register('specialty_name')}
                                            className="w-full px-2 py-2 rounded bg-slate-100 border border-slate-300 text-sm text-slate-900"
                                            placeholder="Type or select specialty"
                                        />
                                        <datalist id="specialtyOptions">
                                            {specialties.map(s => (
                                                <option key={s.id} value={s.name} />
                                            ))}
                                        </datalist>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 mt-2">
                                    <input type="checkbox" {...register('is_investigator')} />
                                    <span className="text-sm">This contact is an investigator</span>
                                </div>

                                {isInvestigator && (
                                    <div className="space-y-3 border border-slate-200 rounded p-3 mt-2">
                                        <h4 className="font-semibold text-xs">PI Role</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div className="flex items-center gap-2">
                                                <input type="checkbox" {...register('has_pi_experience')} />
                                                <span className="text-xs">PI Role experience (Yes/No)</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <input type="checkbox" {...register('interested_in_pi_role')} />
                                                <span className="text-xs">Interested in PI Role (Yes/No)</span>
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="block text-xs mb-1">PI Role interest (Text)</label>
                                                <textarea
                                                    {...register('pi_interest_notes')}
                                                    className="w-full px-2 py-2 rounded bg-slate-100 border border-slate-300 text-sm text-slate-900"
                                                />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="block text-xs mb-1">PI experience notes</label>
                                                <textarea
                                                    {...register('pi_experience_notes')}
                                                    className="w-full px-2 py-2 rounded bg-slate-100 border border-slate-300 text-sm text-slate-900"
                                                />
                                            </div>
                                        </div>

                                        <h4 className="font-semibold text-xs mt-2">Sub-I Role</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div className="flex items-center gap-2">
                                                <input type="checkbox" {...register('has_subi_experience')} />
                                                <span className="text-xs">Sub-I Role experience (Yes/No)</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <input type="checkbox" {...register('interested_in_subi_role')} />
                                                <span className="text-xs">Interested in Sub-I Role (Yes/No)</span>
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="block text-xs mb-1">Sub-I Role interest (Text)</label>
                                                <textarea
                                                    {...register('subi_interest_notes')}
                                                    className="w-full px-2 py-2 rounded bg-slate-100 border border-slate-300 text-sm text-slate-900"
                                                />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="block text-xs mb-1">Sub-I experience notes</label>
                                                <textarea
                                                    {...register('subi_experience_notes')}
                                                    className="w-full px-2 py-2 rounded bg-slate-100 border border-slate-300 text-sm text-slate-900"
                                                />
                                            </div>
                                        </div>

                                        <h4 className="font-semibold text-xs mt-2">GCP Training</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div className="flex items-center gap-2">
                                                <input type="checkbox" {...register('gcp_trained')} />
                                                <span className="text-xs">GCP trained?</span>
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
                                                <label className="block text-xs mb-1">Investigator notes</label>
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

                        {/* STEP: Organisation */}
                        {currentTab === 'organisation' && (
                            <section className="space-y-3">
                                <h3 className="font-semibold text-sm">Organisation</h3>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div className="md:col-span-2">
                                        <label className="block text-xs mb-1">Organisation Name </label>
                                        <input
                                            list="organizationOptions"
                                            {...register('organization_name')}
                                            className="w-full px-2 py-2 rounded bg-slate-100 border border-slate-300 text-sm text-slate-900"
                                            placeholder="Type or select organisation"
                                        />
                                        <datalist id="organizationOptions">
                                            {orgs.map(o => (
                                                <option key={o.id} value={o.name} />
                                            ))}
                                        </datalist>
                                    </div>

                                    {/* Org Type radio */}
                                    <div className="md:col-span-1">
                                        <label className="block text-xs mb-1">Hospital / Clinic / Other</label>
                                        <div className="flex flex-col gap-1 text-xs text-slate-700">
                                            <label className="inline-flex items-center gap-1">
                                                <input
                                                    type="radio"
                                                    value="Hospital"
                                                    {...register('org_type')}
                                                />
                                                <span>Hospital</span>
                                            </label>
                                            <label className="inline-flex items-center gap-1">
                                                <input
                                                    type="radio"
                                                    value="Clinic"
                                                    {...register('org_type')}
                                                />
                                                <span>Clinic</span>
                                            </label>
                                            <label className="inline-flex items-center gap-1">
                                                <input
                                                    type="radio"
                                                    value="Other"
                                                    {...register('org_type')}
                                                />
                                                <span>Other</span>
                                            </label>
                                        </div>
                                        {watch('org_type') === 'Other' && (
                                            <input
                                                {...register('org_type_other')}
                                                className="mt-2 w-full px-2 py-2 rounded bg-slate-100 border border-slate-300 text-sm text-slate-900"
                                                placeholder="Please specify"
                                            />
                                        )}
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-xs mb-1">Address Line 1</label>
                                        <input
                                            {...register('address_line_1')}
                                            className="w-full px-2 py-2 rounded bg-slate-100 border border-slate-300 text-sm text-slate-900"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs mb-1">Address Line 2</label>
                                        <input
                                            {...register('address_line_2')}
                                            className="w-full px-2 py-2 rounded bg-slate-100 border border-slate-300 text-sm text-slate-900"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs mb-1">City </label>
                                        <input
                                            list="cityOptions"
                                            {...register('city_name')}
                                            className="w-full px-2 py-2 rounded bg-slate-100 border border-slate-300 text-sm text-slate-900"
                                            placeholder="Type or select city"
                                        />
                                        <datalist id="cityOptions">
                                            {cities.map(c => (
                                                <option key={c.id} value={c.name} />
                                            ))}
                                        </datalist>
                                    </div>
                                    <div>
                                        <label className="block text-xs mb-1">State / Region </label>
                                        <input
                                            list="stateOptions"
                                            {...register('state_name')}
                                            className="w-full px-2 py-2 rounded bg-slate-100 border border-slate-300 text-sm text-slate-900"
                                            placeholder="Type or select state"
                                        />
                                        <datalist id="stateOptions">
                                            {states.map(s => (
                                                <option key={s.id} value={s.name} />
                                            ))}
                                        </datalist>
                                    </div>
                                    <div>
                                        <label className="block text-xs mb-1">Country </label>
                                        <input
                                            list="countryOptionsCombo"
                                            {...register('country_name')}
                                            className="w-full px-2 py-2 rounded bg-slate-100 border border-slate-300 text-sm text-slate-900"
                                            placeholder="Type or select country"
                                        />
                                        <datalist id="countryOptionsCombo">
                                            {countries.map(c => (
                                                <option key={c.id} value={c.name} />
                                            ))}
                                        </datalist>
                                    </div>

                                    <div>
                                        <label className="block text-xs mb-1">Zip / Postal Code</label>
                                        <input
                                            {...register('postal_code')}
                                            className="w-full px-2 py-2 rounded bg-slate-100 border border-slate-300 text-sm text-slate-900"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs mb-1">Department </label>
                                        <input
                                            list="departmentOptions"
                                            {...register('department_name')}
                                            className="w-full px-2 py-2 rounded bg-slate-100 border border-slate-300 text-sm text-slate-900"
                                            placeholder="Type or select department"
                                        />
                                        <datalist id="departmentOptions">
                                            {departments.map(d => (
                                                <option key={d.id} value={d.name} />
                                            ))}
                                        </datalist>
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* STEP: Secretary / Administrator */}
                        {currentTab === 'admin' && (
                            <section className="space-y-3">
                                <h3 className="font-semibold text-sm">Secretary / Administrator Details</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs mb-1">Admin Asst. Name</label>
                                        <input
                                            {...register('admin_assistant_name')}
                                            className="w-full px-2 py-2 rounded bg-slate-100 border border-slate-300 text-sm text-slate-900"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs mb-1">Email of Admin Asst.</label>
                                        <input
                                            type="email"
                                            {...register('admin_assistant_email')}
                                            className="w-full px-2 py-2 rounded bg-slate-100 border border-slate-300 text-sm text-slate-900"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs mb-1">Phone number of Admin Asst. (digits only)</label>
                                        <input
                                            {...register('admin_assistant_phone', {
                                                pattern: {
                                                    value: /^[0-9]*$/,
                                                    message: 'Digits only',
                                                },
                                            })}
                                            inputMode="numeric"
                                            className="w-full px-2 py-2 rounded bg-slate-100 border border-slate-300 text-sm text-slate-900"
                                        />
                                        {errors.admin_assistant_phone && (
                                            <p className="text-[11px] text-red-500 mt-1">
                                                {errors.admin_assistant_phone.message}
                                            </p>
                                        )}
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
