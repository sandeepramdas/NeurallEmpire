import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { RegisterForm } from '@/types';
import OAuthButtons from '@/components/auth/OAuthButtons';

const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character (!@#$%^&*)'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  organizationName: z.string().min(1, 'Organization name is required'),
  organizationSlug: z.string().optional(),
  acceptTerms: z.boolean().refine(val => val === true, 'You must accept the terms'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register: registerUser, isLoading } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    try {
      const { confirmPassword, acceptTerms, ...registerData } = data;
      await registerUser(registerData);
      toast.success('Welcome to NeurallEmpire! 🎉');

      // Get the organization from auth store after registration
      const { organization } = useAuthStore.getState();

      if (organization) {
        // Navigate to organization's path-based dashboard
        navigate(`/org/${organization.slug}/dashboard`);
      } else {
        navigate('/select-organization');
      }
    } catch (error: any) {
      toast.error(error.message || 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neural-900 via-primary-900 to-purple-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Link to="/" className="text-4xl font-display font-bold text-white">
            🧠 NeurallEmpire
          </Link>
          <h2 className="mt-6 text-3xl font-display font-bold text-white">
            Create Your Empire
          </h2>
          <p className="mt-2 text-sm text-neural-200">
            Or{' '}
            <Link
              to="/login"
              className="font-medium text-primary-400 hover:text-primary-300"
            >
              sign in to your existing empire
            </Link>
          </p>
        </div>

        <div className="card bg-white/10 backdrop-blur-sm border-white/20">
          {/* OAuth Buttons */}
          <OAuthButtons
            showDivider={false}
            title="Sign up with"
            onError={(error) => toast.error(error)}
          />

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/20" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-transparent text-white">Or sign up with email</span>
            </div>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-white">
                  First Name *
                </label>
                <div className="mt-1">
                  <input
                    {...register('firstName')}
                    type="text"
                    className="input-field bg-white/10 border-white/20 text-white placeholder-neutral-400"
                    placeholder="John"
                  />
                  {errors.firstName && (
                    <p className="mt-1 text-sm text-red-400">{errors.firstName.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-white">
                  Last Name *
                </label>
                <div className="mt-1">
                  <input
                    {...register('lastName')}
                    type="text"
                    className="input-field bg-white/10 border-white/20 text-white placeholder-neutral-400"
                    placeholder="Doe"
                  />
                  {errors.lastName && (
                    <p className="mt-1 text-sm text-red-400">{errors.lastName.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white">
                Email address *
              </label>
              <div className="mt-1">
                <input
                  {...register('email')}
                  type="email"
                  autoComplete="email"
                  className="input-field bg-white/10 border-white/20 text-white placeholder-neutral-400"
                  placeholder="john@example.com"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>
                )}
              </div>
            </div>

            {/* Organization Name */}
            <div>
              <label htmlFor="organizationName" className="block text-sm font-medium text-white">
                Organization Name *
              </label>
              <div className="mt-1">
                <input
                  {...register('organizationName')}
                  type="text"
                  className="input-field bg-white/10 border-white/20 text-white placeholder-neutral-400"
                  placeholder="My AI Empire"
                />
                {errors.organizationName && (
                  <p className="mt-1 text-sm text-red-400">{errors.organizationName.message}</p>
                )}
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white">
                Password *
              </label>
              <div className="mt-1 relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  className="input-field bg-white/10 border-white/20 text-white placeholder-neutral-400"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-white"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
              <div className="mt-1 text-xs text-neutral-300 space-y-0.5">
                <p>Password must contain:</p>
                <ul className="list-disc list-inside ml-2">
                  <li>At least 12 characters</li>
                  <li>Uppercase letter (A-Z)</li>
                  <li>Lowercase letter (a-z)</li>
                  <li>Number (0-9)</li>
                  <li>Special character (!@#$%^&*)</li>
                </ul>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-400">{errors.password.message}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-white">
                Confirm Password *
              </label>
              <div className="mt-1 relative">
                <input
                  {...register('confirmPassword')}
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="input-field bg-white/10 border-white/20 text-white placeholder-neutral-400"
                  placeholder="Confirm your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-white"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? '🙈' : '👁️'}
                </button>
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-400">{errors.confirmPassword.message}</p>
                )}
              </div>
            </div>

            {/* Terms */}
            <div className="flex items-center">
              <input
                {...register('acceptTerms')}
                type="checkbox"
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-white/20 rounded"
              />
              <label className="ml-2 block text-sm text-white">
                I accept the{' '}
                <Link to="/terms" className="text-primary-400 hover:text-primary-300">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link to="/privacy" className="text-primary-400 hover:text-primary-300">
                  Privacy Policy
                </Link>
              </label>
            </div>
            {errors.acceptTerms && (
              <p className="text-sm text-red-400">{errors.acceptTerms.message}</p>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Creating your empire...' : 'Create Empire 🚀'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;