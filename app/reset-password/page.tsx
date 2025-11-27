"use client";

import { useForm } from "react-hook-form";
import { supabase } from "@/lib/supabaseClient";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { useLoader } from "@/components/LoaderProvider";
import Image from "next/image";

type ResetForm = {
    password: string;
    confirmPassword: string;
};

export default function ResetPasswordPage() {
    const { register, handleSubmit } = useForm<ResetForm>();
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const router = useRouter();
    const { showToast } = useToast();
    const { showLoader, hideLoader } = useLoader()

    useEffect(() => {
        const verifySession = async () => {
            const { data } = await supabase.auth.getSession();
            if (!data.session) {
                showToast("Invalid or expired link!", "error");
            }
        };
        verifySession();
    }, []);

    const onSubmit = async (values: ResetForm) => {
        if (values.password !== values.confirmPassword) {
            showToast("Passwords do not match!", "error");
            return;
        }

        setLoading(true);
        showLoader();

        const { error } = await supabase.auth.updateUser({
            password: values.password,
        });

        if (error) {
            setLoading(false);
            hideLoader();
            showToast(error.message, "error");
            return;
        }

        // 🔥 Force logout after password update
        await supabase.auth.signOut();

        setLoading(false);
        hideLoader();

        showToast("Password updated! Redirecting to login...", "success");

        setTimeout(() => router.replace("/login"), 1500);
    };


    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="bg-white p-6 rounded-xl shadow-lg border max-w-md w-full">
                <Image width={160} height={160} src="/Images/icts.jpeg" alt="ICTS" className="mb-8 mx-auto" />
                <h2 className="text-xl font-semibold text-center mb-6">Reset Password</h2>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

                    {/* Password Field */}
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700 ">New Password</label>

                        <div className="relative mt-1">
                            <input
                                type={showPassword ? "text" : "password"}
                                required
                                {...register("password")}
                                className="border w-full p-3 rounded pr-10"
                                placeholder="Enter new password"
                            />

                            {/* Eye Icon */}
                            <span
                                onClick={() => setShowPassword(prev => !prev)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-slate-500"
                            >
                                {showPassword ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5"
                                        fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                            d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9-4-10-7
                              1-3 5-7 10-7 1.3 0 2.55.25 3.75.75m2.25 1.5C20.5 7.75 
                              22 10 22 12c0 2-.5 4.25-2 5.75m-5-3.75a3 3 0 11-6 0 
                              3 3 0 016 0z" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5"
                                        fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                            d="M3 3l18 18M9.88 9.88A3 3 0 0114.12 14.12M6.1 6.1C3.8 7.8 
                              2 10.3 2 12c1 3 5 7 10 7 1.7 0 3.3-.3 4.8-.9M17.9 17.9
                              C20.2 16.2 22 13.7 22 12c-1-3-5-7-10-7-1.7 0-3.3.3-4.8.9"/>
                                    </svg>
                                )}
                            </span>
                        </div>
                    </div>

                    {/* Confirm Password Field */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Confirm Password</label>

                        <div className="relative mt-1">
                            <input
                                type={showConfirm ? "text" : "password"}
                                required
                                {...register("confirmPassword")}
                                className="border w-full p-3 rounded pr-10"
                                placeholder="Confirm new password"
                            />

                            {/* Eye Icon */}
                            <span
                                onClick={() => setShowConfirm(prev => !prev)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-slate-500"
                            >
                                {showConfirm ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5"
                                        fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                            d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9-4-10-7
                              1-3 5-7 10-7 1.3 0 2.55.25 3.75.75m2.25 1.5C20.5 7.75 
                              22 10 22 12c0 2-.5 4.25-2 5.75m-5-3.75a3 3 0 11-6 0 
                              3 3 0 016 0z" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5"
                                        fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                            d="M3 3l18 18M9.88 9.88A3 3 0 0114.12 14.12M6.1 6.1C3.8 7.8 
                              2 10.3 2 12c1 3 5 7 10 7 1.7 0 3.3-.3 4.8-.9M17.9 17.9
                              C20.2 16.2 22 13.7 22 12c-1-3-5-7-10-7-1.7 0-3.3.3-4.8.9"/>
                                    </svg>
                                )}
                            </span>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-[#0B62C1] text-white rounded-md"
                    >
                        {loading ? "Updating..." : "Update Password"}
                    </button>

                    <p
                        className="text-sm text-center mt-2 text-blue-600 underline cursor-pointer"
                        onClick={() => router.push("/login")}
                    >
                        Back to Login
                    </p>
                </form>

            </div>

        </div>
    );
}
