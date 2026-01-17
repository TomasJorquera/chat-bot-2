import React, { useState } from 'react';
import { User, Mail, Lock, UserPlus, AlertCircle, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface RegisterFormProps {
  onSwitchToLogin: () => void;
  onClose: () => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onSwitchToLogin, onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const { register, loading } = useAuth();

  const validatePassword = (password: string) => {
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasMinLength = password.length >= 6;
    
    return hasUpper && hasLower && hasNumber && hasMinLength;
  };

  const validateEmail = (email: string) => {
    return email.endsWith('@correo.uss.cl') || email.endsWith('@docente.uss.cl');
  };

  const getPasswordRequirements = (password: string) => [
    { text: 'At least 6 characters', met: password.length >= 6 },
    { text: 'One uppercase letter', met: /[A-Z]/.test(password) },
    { text: 'One lowercase letter', met: /[a-z]/.test(password) },
    { text: 'One number', met: /\d/.test(password) },
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateEmail(formData.email)) {
      setError('Email must end with @correo.uss.cl or @docente.uss.cl');
      return;
    }

    if (!validatePassword(formData.password)) {
      setError('The password does not meet the requirements');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const success = await register(formData);
    if (success) {
      onClose();
    } else {
      setError('Error al crear la cuenta');
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-[#0D47A1] mb-2">Create Account</h2>
        <p className="text-[#37474F]">Join our educational platform</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[#0D47A1] mb-2">
              First Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#37474F]" />
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 border border-blue-200 rounded-lg focus:ring-2 focus:ring-[#1E88E5] focus:border-transparent outline-none transition-all"
                placeholder="Your first name"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#0D47A1] mb-2">
              Last Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#37474F]" />
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 border border-blue-200 rounded-lg focus:ring-2 focus:ring-[#1E88E5] focus:border-transparent outline-none transition-all"
                placeholder="Your last name"
                required
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#0D47A1] mb-2">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#37474F]" />
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full pl-10 pr-4 py-3 border border-blue-200 rounded-lg focus:ring-2 focus:ring-[#1E88E5] focus:border-transparent outline-none transition-all"
              placeholder="user@correo.uss.cl"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#0D47A1] mb-2">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#37474F]" />
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full pl-10 pr-4 py-3 border border-blue-200 rounded-lg focus:ring-2 focus:ring-[#1E88E5] focus:border-transparent outline-none transition-all"
              placeholder="Your password"
              required
            />
          </div>
          
          {formData.password && (
            <div className="mt-2 space-y-1">
              {getPasswordRequirements(formData.password).map((req, index) => (
                <div key={index} className="flex items-center space-x-2">
                  {req.met ? (
                    <Check className="w-4 h-4 text-[#43A047]" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                  )}
                  <span className={`text-xs ${req.met ? 'text-[#43A047]' : 'text-[#37474F]'}`}>
                    {req.text}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-[#0D47A1] mb-2">
            Confirm Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#37474F]" />
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="w-full pl-10 pr-4 py-3 border border-blue-200 rounded-lg focus:ring-2 focus:ring-[#1E88E5] focus:border-transparent outline-none transition-all"
              placeholder="Confirm your password"
              required
            />
          </div>
        </div>

        {error && (
            <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-[#E53935]" />
            <span className="text-[#E53935] text-sm">{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#1E88E5] hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium flex items-center justify-center space-x-2 transition-colors"
        >
          <UserPlus className="w-5 h-5" />
          <span>{loading ? 'Creating account...' : 'Create Account'}</span>
        </button>

        <div className="text-center">
            <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-[#1E88E5] hover:text-blue-700 text-sm font-medium transition-colors"
          >
            Already have an account? Sign in here
          </button>
        </div>
      </form>
    </div>
  );
};

export default RegisterForm;