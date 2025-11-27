"use client";

import { useForm } from "react-hook-form";
import { supabase } from "@/lib/supabaseClient";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";

type ResetForm = {
    password: string;
    confirmPassword: string;
};

export default function ResetPasswordPage() {
    const { register, handleSubmit } = useForm<ResetForm>();
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { showToast } = useToast();

    useEffect(() => {
        const verifySession = async () => {
            const { data } = await supabase.auth.getSession();
            if (!data.session) {
                showToast("Invalid or expired link!", "error");
            }
        };
        verifySession();
    }, [showToast]);

    const onSubmit = async (values: ResetForm) => {
        if (values.password !== values.confirmPassword) {
            showToast("Passwords do not match!", "error");
            return;
        }

        setLoading(true);
        showToast("Updating password...", "loading");

        const { error } = await supabase.auth.updateUser({
            password: values.password,
        });

        setLoading(false);

        if (error) {
            showToast(error.message, "error");
            return;
        }

        showToast("Password updated! Redirecting...", "success");

        setTimeout(() => router.replace("/login"), 2000);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="bg-white p-6 rounded-xl shadow-lg border max-w-md w-full">
                <h2 className="text-xl font-semibold text-center mb-6">Reset Password</h2>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <input
                        type="password"
                        required
                        {...register("password")}
                        className="border w-full p-3 rounded"
                        placeholder="New password"
                    />

                    <input
                        type="password"
                        required
                        {...register("confirmPassword")}
                        className="border w-full p-3 rounded"
                        placeholder="Confirm new password"
                    />

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-blue-600 text-white rounded-md"
                    >
                        {loading ? "Updating..." : "Update Password"}
                    </button>

                    <p className="text-sm text-center mt-2 text-blue-600 underline cursor-pointer"
                        onClick={() => router.push("/login")}>
                        Back to Login
                    </p>
                </form>
            </div>
        </div>
    );
}
