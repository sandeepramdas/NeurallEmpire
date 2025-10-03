import React, { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Palette, Upload, Eye, RefreshCw, Sparkles, Save, Image as ImageIcon } from 'lucide-react';

interface BrandColors {
  primary: string;
  secondary: string;
  accent: string;
}

interface ThemePreview {
  id: string;
  name: string;
  mode: 'light' | 'dark';
}

const BrandingTheme: React.FC = () => {
  const { organization } = useAuthStore();
  const [primaryLogo, setPrimaryLogo] = useState<string>('');
  const [favicon, setFavicon] = useState<string>('');
  const [brandColors, setBrandColors] = useState<BrandColors>({
    primary: '#4F46E5',
    secondary: '#7C3AED',
    accent: '#EC4899',
  });
  const [selectedFont, setSelectedFont] = useState('Inter');
  const [customCSS, setCustomCSS] = useState('');
  const [previewMode, setPreviewMode] = useState<'light' | 'dark'>('light');

  const fonts = [
    'Inter',
    'Roboto',
    'Open Sans',
    'Lato',
    'Montserrat',
    'Poppins',
    'Raleway',
    'Ubuntu',
    'Nunito',
    'Playfair Display',
  ];

  const themePreview: ThemePreview[] = [
    { id: '1', name: 'Light Theme', mode: 'light' },
    { id: '2', name: 'Dark Theme', mode: 'dark' },
  ];

  const handleLogoUpload = (type: 'primary' | 'favicon') => {
    console.log(`Uploading ${type} logo`);
    // Simulate file upload
    if (type === 'primary') {
      setPrimaryLogo('/placeholder-logo.png');
    } else {
      setFavicon('/placeholder-favicon.png');
    }
  };

  const handleColorChange = (colorType: keyof BrandColors, value: string) => {
    setBrandColors({ ...brandColors, [colorType]: value });
  };

  const handleResetToDefaults = () => {
    if (window.confirm('Are you sure you want to reset all branding settings to defaults?')) {
      setPrimaryLogo('');
      setFavicon('');
      setBrandColors({
        primary: '#4F46E5',
        secondary: '#7C3AED',
        accent: '#EC4899',
      });
      setSelectedFont('Inter');
      setCustomCSS('');
    }
  };

  const handleSave = () => {
    console.log('Saving branding settings:', {
      primaryLogo,
      favicon,
      brandColors,
      selectedFont,
      customCSS,
    });
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Branding & Theme</h1>
        <p className="text-gray-600 mt-2">Customize your organization's appearance and branding</p>
      </div>

      {/* Logo Upload Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <ImageIcon className="w-5 h-5 mr-2" />
          Logo & Branding Assets
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Primary Logo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Primary Logo
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-indigo-500 transition-colors">
              {primaryLogo ? (
                <div className="space-y-4">
                  <div className="bg-gray-100 rounded-lg p-4 flex items-center justify-center h-32">
                    <span className="text-gray-400">Logo Preview</span>
                  </div>
                  <button
                    onClick={() => handleLogoUpload('primary')}
                    className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                  >
                    Change Logo
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                  <div>
                    <button
                      onClick={() => handleLogoUpload('primary')}
                      className="text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                      Upload Logo
                    </button>
                    <p className="text-xs text-gray-500 mt-1">PNG, JPG or SVG (max. 2MB)</p>
                    <p className="text-xs text-gray-500">Recommended: 400x100px</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Favicon */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Favicon
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-indigo-500 transition-colors">
              {favicon ? (
                <div className="space-y-4">
                  <div className="bg-gray-100 rounded-lg p-4 flex items-center justify-center h-32">
                    <div className="w-16 h-16 bg-gray-300 rounded"></div>
                  </div>
                  <button
                    onClick={() => handleLogoUpload('favicon')}
                    className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                  >
                    Change Favicon
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                  <div>
                    <button
                      onClick={() => handleLogoUpload('favicon')}
                      className="text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                      Upload Favicon
                    </button>
                    <p className="text-xs text-gray-500 mt-1">PNG or ICO (max. 100KB)</p>
                    <p className="text-xs text-gray-500">Recommended: 32x32px or 64x64px</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Favicon Generator */}
        <div className="mt-4 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
          <div className="flex items-start">
            <Sparkles className="w-5 h-5 text-indigo-600 mt-0.5 mr-2" />
            <div>
              <p className="text-sm font-medium text-indigo-900">Favicon Generator</p>
              <p className="text-sm text-indigo-700 mt-1">
                Don't have a favicon? Generate one from your logo automatically.
              </p>
              <button className="mt-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                Generate Favicon
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Brand Colors */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Palette className="w-5 h-5 mr-2" />
          Brand Colors
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Primary Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Primary Color
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="color"
                value={brandColors.primary}
                onChange={(e) => handleColorChange('primary', e.target.value)}
                className="w-16 h-16 rounded-lg cursor-pointer border-2 border-gray-300"
              />
              <div className="flex-1">
                <input
                  type="text"
                  value={brandColors.primary}
                  onChange={(e) => handleColorChange('primary', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm"
                  placeholder="#4F46E5"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Used for buttons, links, and primary actions</p>
          </div>

          {/* Secondary Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Secondary Color
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="color"
                value={brandColors.secondary}
                onChange={(e) => handleColorChange('secondary', e.target.value)}
                className="w-16 h-16 rounded-lg cursor-pointer border-2 border-gray-300"
              />
              <div className="flex-1">
                <input
                  type="text"
                  value={brandColors.secondary}
                  onChange={(e) => handleColorChange('secondary', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm"
                  placeholder="#7C3AED"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Used for secondary elements and accents</p>
          </div>

          {/* Accent Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Accent Color
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="color"
                value={brandColors.accent}
                onChange={(e) => handleColorChange('accent', e.target.value)}
                className="w-16 h-16 rounded-lg cursor-pointer border-2 border-gray-300"
              />
              <div className="flex-1">
                <input
                  type="text"
                  value={brandColors.accent}
                  onChange={(e) => handleColorChange('accent', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm"
                  placeholder="#EC4899"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Used for highlights and special elements</p>
          </div>
        </div>
      </div>

      {/* Font Selection */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Sparkles className="w-5 h-5 mr-2" />
          Typography
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Primary Font
            </label>
            <select
              value={selectedFont}
              onChange={(e) => setSelectedFont(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              {fonts.map((font) => (
                <option key={font} value={font}>
                  {font}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <div className="w-full p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p style={{ fontFamily: selectedFont }} className="text-lg">
                The quick brown fox jumps over the lazy dog
              </p>
              <p style={{ fontFamily: selectedFont }} className="text-sm text-gray-600 mt-1">
                0123456789
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Theme Preview */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Eye className="w-5 h-5 mr-2" />
          Theme Preview
        </h3>
        <div className="flex space-x-4 mb-4">
          {themePreview.map((theme) => (
            <button
              key={theme.id}
              onClick={() => setPreviewMode(theme.mode)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                previewMode === theme.mode
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {theme.name}
            </button>
          ))}
        </div>
        <div
          className={`rounded-lg border-2 border-gray-200 p-8 ${
            previewMode === 'dark' ? 'bg-gray-900' : 'bg-white'
          }`}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4
                className={`text-2xl font-bold ${previewMode === 'dark' ? 'text-white' : 'text-gray-900'}`}
              >
                {organization?.name || 'Your Organization'}
              </h4>
              <div
                className="w-12 h-12 rounded-lg"
                style={{ backgroundColor: brandColors.primary }}
              ></div>
            </div>
            <p className={previewMode === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
              This is a preview of how your branding will appear in the application.
            </p>
            <div className="flex space-x-3">
              <button
                className="px-4 py-2 rounded-lg text-white font-medium"
                style={{ backgroundColor: brandColors.primary }}
              >
                Primary Button
              </button>
              <button
                className="px-4 py-2 rounded-lg text-white font-medium"
                style={{ backgroundColor: brandColors.secondary }}
              >
                Secondary Button
              </button>
              <button
                className="px-4 py-2 rounded-lg text-white font-medium"
                style={{ backgroundColor: brandColors.accent }}
              >
                Accent Button
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Custom CSS */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Sparkles className="w-5 h-5 mr-2" />
          Custom CSS
        </h3>
        <p className="text-gray-600 mb-4">
          Add custom CSS to further customize the appearance of your application. Advanced users only.
        </p>
        <textarea
          value={customCSS}
          onChange={(e) => setCustomCSS(e.target.value)}
          placeholder="/* Enter your custom CSS here */
.custom-element {
  color: #4F46E5;
  font-weight: bold;
}"
          rows={10}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm"
        />
        <div className="mt-2 flex items-start">
          <div className="flex-shrink-0">
            <Sparkles className="w-5 h-5 text-yellow-500" />
          </div>
          <p className="ml-2 text-sm text-gray-600">
            Custom CSS will be applied globally. Please test thoroughly before saving.
          </p>
        </div>
      </div>

      {/* Email Template Branding */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Palette className="w-5 h-5 mr-2" />
          Email Template Branding
        </h3>
        <p className="text-gray-600 mb-4">
          Your brand colors and logo will be automatically applied to all email templates sent from your organization.
        </p>
        <div className="border-2 border-gray-200 rounded-lg p-6 bg-gray-50">
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-center mb-4">
              <div
                className="w-32 h-12 rounded flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: brandColors.primary }}
              >
                LOGO
              </div>
            </div>
            <h4 className="text-xl font-bold text-gray-900 mb-2">Email Subject Line</h4>
            <p className="text-gray-600 mb-4">
              This is a preview of how your emails will appear with your branding applied.
            </p>
            <button
              className="px-6 py-2 rounded-lg text-white font-medium"
              style={{ backgroundColor: brandColors.primary }}
            >
              Call to Action
            </button>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center">
        <button
          onClick={handleResetToDefaults}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Reset to Defaults
        </button>
        <button
          onClick={handleSave}
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center"
        >
          <Save className="w-4 h-4 mr-2" />
          Save Branding Settings
        </button>
      </div>
    </div>
  );
};

export default BrandingTheme;
