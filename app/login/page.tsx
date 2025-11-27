"use client";

import { useForm } from "react-hook-form";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useToast } from "@/components/Toast";
import Image from "next/image";

type LoginForm = {
    email: string;
    password: string;
};

export default function LoginPage() {
    const { register, handleSubmit, watch } = useForm<LoginForm>();
    const [loading, setLoading] = useState(false);
    const [resetLoading, setResetLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const router = useRouter();
    const { showToast } = useToast();
    const emailValue = watch("email");

    // Redirect if logged in
    useEffect(() => {
        const check = async () => {
            const { data } = await supabase.auth.getSession();
            if (data.session) {
                router.replace("/");
            }
        };
        check();
    }, [router]);

    const onSubmit = async (values: LoginForm) => {
        setLoading(true);

        const { data, error } = await supabase.auth.signInWithPassword({
            email: values.email,
            password: values.password,
        });

        setLoading(false);

        if (error) {
            showToast(error.message, "error");
            return;
        }

        const session = data.session;

        const { data: profile } = await supabase
            .from("profiles")
            .select("is_admin")
            .eq("id", session.user.id)
            .maybeSingle();

        if (profile?.is_admin) {
            showToast("Welcome Admin!", "success");
            router.replace("/admin");
        } else {
            showToast("Login Successful!", "success");
            router.replace("/contact");
        }
    };

    const handleForgotPassword = async () => {
        if (!emailValue) {
            showToast("Enter your email first!", "error");
            return;
        }

        setResetLoading(true);
        showToast("Sending reset link...", "loading");

        const baseUrl =
            process.env.NEXT_PUBLIC_SITE_URL ||
            (typeof window !== "undefined" ? window.location.origin : "");

        const redirectTo = `${baseUrl}/reset-password`;

        const { error } = await supabase.auth.resetPasswordForEmail(emailValue, {
            redirectTo,
        });

        setResetLoading(false);

        if (error) showToast(error.message, "error");
        else showToast("Check your email for reset link!", "success");
    };


    return (
        <div className="bg-gray-50 min-h-screen flex flex-col items-center justify-center py-6 px-4">
            <div className="max-w-[480px] w-full">

                <Image width={160} height={160} src="/Images/icts.jpeg" alt="ICTS" className="mb-8 mx-auto" />

                <div className="p-8 bg-white rounded-2xl shadow border border-gray-200">
                    <h1 className="text-slate-900 text-center text-3xl font-semibold">
                        Sign in
                    </h1>

                    <form onSubmit={handleSubmit(onSubmit)} className="mt-12 space-y-6">
                        {/* Email */}
                        <div>
                            <label className="text-sm font-medium">Email</label>
                            <input type="email" required {...register('email')} className="w-full text-slate-900 text-sm border border-slate-300 px-4 py-3 pr-8 rounded-md outline-blue-600" placeholder="Enter email" />
                        </div>

                        {/* Password */}
                        <div>
                            <label className="text-sm font-medium">Password</label>
                            <div className="relative flex items-center"> <input type={showPassword ? 'text' : 'password'} required {...register('password')} className="w-full text-slate-900 text-sm border border-slate-300 px-4 py-3 pr-10 rounded-md outline-blue-600" placeholder="Enter password" />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 cursor-pointer" > {showPassword ? ( <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="#555" viewBox="0 0 24 24"> <path d="M12 5c-7.633 0-11 6.727-11 7s3.367 7 11 7 11-6.727 11-7-3.367-7-11-7zm0 12c-2.757 0-5-2.243-5-5s2.243-5 5-5a5.006 5.006 0 0 1 5 5c0 2.757-2.243 5-5 5zm0-8a3 3 0 1 0 .002 6.002A3 3 0 0 0 12 9z" /> </svg> ) : ( <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="#555" viewBox="0 0 24 24"> <path d="M12 5c-7.633 0-11 6.727-11 7 .104.18 1.867 3.082 5.563 5.088L4.293 19.36a1 1 0 0 0 1.414 1.414l15-15a1 1 0 0 0-1.414-1.414l-2.031 2.031C15.27 5.751 13.797 5 12 5zm0 12c-2.757 0-5-2.243-5-5 0-.795.186-1.546.516-2.219l-1.51 1.51a7.806 7.806 0 0 0 1.742 3.214C9.708 15.96 10.797 16.5 12 16.5c.988 0 1.902-.286 2.642-.772l-1.51-1.51c-.673.33-1.424.516-2.132.516zm6.245-6.245l-1.51 1.51c.187.508.265 1.042.265 1.735a5 5 0 0 1-5 5c-.693 0-1.227-.078-1.735-.265l-1.51 1.51A7.91 7.91 0 0 0 12 19c7.633 0 11-6.727 11-7 0-.308-1.006-2.131-3.185-4.139z" /> </svg> )} </button>
                            </div>

                            {/* Forgot password */}
                            <p className="text-right mt-1 text-xs text-blue-600 cursor-pointer underline"
                                onClick={handleForgotPassword}>
                                {resetLoading ? "Sending..." : "Forgot password?"}
                            </p>
                        </div>

                        {/* Submit */}
                        <button type="submit" disabled={loading} className="w-full py-2 px-4 text-[15px] font-medium tracking-wide rounded-md text-white bg-blue-300 hover:bg-blue-700 focus:outline-none" > {loading ? 'Logging in...' : 'Sign in'} </button>

                        <p className="text-sm text-center mt-4">
                            Don't have an account?
                            <span className="text-blue-600 underline ml-1 cursor-pointer"
                                onClick={() => router.push("/signup")}>Register</span>
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
}
