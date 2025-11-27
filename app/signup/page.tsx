// app/signup/page.tsx
'use client';

import { useForm } from 'react-hook-form';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Image from 'next/image';
type SignupForm = {
    first_name: string;
    last_name: string;
    email: string;
    mobile?: string;
    password: string;
    confirm_password: string;
};

export default function SignupPage() {
    const { register, handleSubmit, watch } = useForm<SignupForm>();
    const [errorMsg, setErrorMsg] = useState('');
    const [loading, setLoading] = useState(false);

    // show/hide password states
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const router = useRouter();
    const passwordValue = watch('password', '');

    const onSubmit = async (values: SignupForm) => {
        setErrorMsg('');

        if (values.password !== values.confirm_password) {
            setErrorMsg("Passwords don't match");
            return;
        }

        setLoading(true);

        try {
            const { data, error } = await supabase.auth.signUp({
                email: values.email,
                password: values.password,
            });

            if (error) {
                setErrorMsg(error.message);
                setLoading(false);
                return;
            }

            const user = data.user;
            if (user) {
                const full_name = `${values.first_name || ''} ${values.last_name || ''}`.trim();

                const { error: profileError } = await supabase.from('profiles').insert({
                    id: user.id,
                    full_name,
                    is_admin: false,
                    mobile: values.mobile || null
                });

                if (profileError) {
                    setErrorMsg(profileError.message);
                    setLoading(false);
                    return;
                }
            }

            setLoading(false);
            router.replace('/login');
        } catch (err: any) {
            setErrorMsg(err?.message || 'Something went wrong');
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl max-sm:max-w-lg mx-auto p-6 mt-6">
            <div className="text-center mb-12 sm:mb-16">
                <Image width={160} height={160} src="/Images/icts.jpeg" alt="ICTS" className=" mb-8 mx-auto block" />
                <h4 className="text-slate-600 text-4xl mt-6">
                    Sign up into your account
                </h4>
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
                <div className="grid sm:grid-cols-2 gap-8">

                    {/* First Name */}
                    <div>
                        <label className="text-slate-900 text-sm font-medium mb-2 block">First Name</label>
                        <input
                            {...register('first_name', { required: true })}
                            className="bg-slate-100 w-full text-slate-900 text-sm px-4 py-3 rounded-md focus:bg-transparent outline-blue-500 transition-all"
                            placeholder="Enter name"
                        />
                    </div>

                    {/* Last Name */}
                    <div>
                        <label className="text-slate-900 text-sm font-medium mb-2 block">Last Name</label>
                        <input
                            {...register('last_name')}
                            className="bg-slate-100 w-full text-slate-900 text-sm px-4 py-3 rounded-md focus:bg-transparent outline-blue-500 transition-all"
                            placeholder="Enter last name"
                        />
                    </div>

                    {/* Email */}
                    <div>
                        <label className="text-slate-900 text-sm font-medium mb-2 block">Email Id</label>
                        <input
                            {...register('email', { required: true })}
                            type="email"
                            className="bg-slate-100 w-full text-slate-900 text-sm px-4 py-3 rounded-md focus:bg-transparent outline-blue-500 transition-all"
                            placeholder="Enter email"
                        />
                    </div>

                    {/* Mobile */}
                    <div>
                        <label className="text-slate-900 text-sm font-medium mb-2 block">Mobile No.</label>
                        <input
                            {...register('mobile')}
                            type="tel"
                            className="bg-slate-100 w-full text-slate-900 text-sm px-4 py-3 rounded-md focus:bg-transparent outline-blue-500 transition-all"
                            placeholder="Enter mobile number"
                        />
                    </div>

                    {/* Password */}
                    <div>
                        <label className="text-slate-900 text-sm font-medium mb-2 block">Password</label>
                        <div className="relative">
                            <input
                                {...register('password', { required: true, minLength: 6 })}
                                type={showPassword ? 'text' : 'password'}
                                className="bg-slate-100 w-full text-slate-900 text-sm px-4 py-3 pr-10 rounded-md focus:bg-transparent outline-blue-500 transition-all"
                                placeholder="Enter password"
                            />

                            {/* Eye Icon */}
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-3 cursor-pointer"
                            >
                                {showPassword ? (
                                    // 👁 open
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="#555" viewBox="0 0 24 24">
                                        <path d="M12 5c-7.633 0-11 6.727-11 7s3.367 7 11 7 11-6.727 11-7-3.367-7-11-7zm0 12c-2.757 0-5-2.243-5-5s2.243-5 5-5 5 2.243 5 5-2.243 5-5 5z" />
                                    </svg>
                                ) : (
                                    // 👁‍🗨 closed
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="#555" viewBox="0 0 24 24">
                                        <path d="M2.3 2.3a1 1 0 011.4 0L21.7 20.3a1 1 0 01-1.4 1.4L17.4 18A12.3 12.3 0 0112 19C4.4 19 1 12.3 1 12s3.4-7 11-7c1.9 0 3.6.3 5.1.9l-2.3 2.3A6.5 6.5 0 0012 7a5 5 0 00-5 5c0 .8.2 1.6.5 2.3L2.3 3.7a1 1 0 010-1.4z" />
                                    </svg>
                                )}
                            </button>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Password must be at least 6 characters</p>
                    </div>

                    {/* Confirm Password */}
                    <div>
                        <label className="text-slate-900 text-sm font-medium mb-2 block">Confirm Password</label>
                        <div className="relative">
                            <input
                                {...register('confirm_password', { required: true })}
                                type={showConfirmPassword ? 'text' : 'password'}
                                className="bg-slate-100 w-full text-slate-900 text-sm px-4 py-3 pr-10 rounded-md focus:bg-transparent outline-blue-500 transition-all"
                                placeholder="Enter confirm password"
                            />

                            {/* Eye Icon */}
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-3 cursor-pointer"
                            >
                                {showConfirmPassword ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="#555" viewBox="0 0 24 24">
                                        <path d="M12 5c-7.633 0-11 6.727-11 7s3.367 7 11 7 11-6.727 11-7-3.367-7-11-7zm0 12c-2.757 0-5-2.243-5-5s2.243-5 5-5 5 2.243 5 5-2.243 5-5 5z" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="#555" viewBox="0 0 24 24">
                                        <path d="M2.3 2.3a1 1 0 011.4 0L21.7 20.3a1 1 0 01-1.4 1.4L17.4 18A12.3 12.3 0 0112 19C4.4 19 1 12.3 1 12s3.4-7 11-7c1.9 0 3.6.3 5.1.9l-2.3 2.3A6.5 6.5 0 0012 7a5 5 0 00-5 5c0 .8.2 1.6.5 2.3L2.3 3.7a1 1 0 010-1.4z" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {errorMsg && (
                    <p className="text-red-500 text-sm mt-6">{errorMsg}</p>
                )}

                <div className="mt-12">
                    <button
                        type="submit"
                        disabled={loading}
                        className="mx-auto block min-w-32 py-3 px-6 text-sm font-medium tracking-wider rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
                    >
                        {loading ? 'Creating account...' : 'Sign up'}
                    </button>
                </div>
            </form>
        </div>
    );
}
