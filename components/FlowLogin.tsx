import React, { useState, useCallback, useEffect } from 'react';
import { saveUserPersonalAuthToken } from '../services/userService';
import { type User } from '../types';
import { KeyIcon, CheckCircleIcon, XIcon, AlertTriangleIcon, InformationCircleIcon, EyeIcon, EyeOffIcon, SparklesIcon } from './Icons';
import Spinner from './common/Spinner';
import { getTranslations } from '../services/translations';
import { runComprehensiveTokenTest, type TokenTestResult } from '../services/imagenV3Service';
import { testAntiCaptchaKey } from '../services/antiCaptchaService';

interface FlowLoginProps {
    currentUser?: User | null;
    onUserUpdate?: (user: User) => void;
}

const FlowLogin: React.FC<FlowLoginProps> = ({ currentUser, onUserUpdate }) => {
    const [flowToken, setFlowToken] = useState('');
    const [showToken, setShowToken] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [testStatus, setTestStatus] = useState<'idle' | 'testing'>('idle');
    const [testResults, setTestResults] = useState<TokenTestResult[] | null>(null);
    const T = getTranslations().settingsView;
    const T_Api = T.api;

    // Anti-Captcha Configuration State
    const [enableAntiCaptcha, setEnableAntiCaptcha] = useState(() => {
        return localStorage.getItem('antiCaptchaEnabled') === 'true';
    });
    const [antiCaptchaApiKey, setAntiCaptchaApiKey] = useState(() => {
        return localStorage.getItem('antiCaptchaApiKey') || '';
    });
    const [antiCaptchaProjectId, setAntiCaptchaProjectId] = useState(() => {
        return localStorage.getItem('antiCaptchaProjectId') || '';
    });
    const [showAntiCaptchaKey, setShowAntiCaptchaKey] = useState(false);
    const [antiCaptchaTestStatus, setAntiCaptchaTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
    const [antiCaptchaTestMessage, setAntiCaptchaTestMessage] = useState<string>('');
    
    // Initialize token from current user
    useEffect(() => {
        if (currentUser?.personalAuthToken) {
            setFlowToken(currentUser.personalAuthToken);
        }
    }, [currentUser?.personalAuthToken]);

    // Save Anti-Captcha settings to localStorage
    useEffect(() => {
        localStorage.setItem('antiCaptchaEnabled', enableAntiCaptcha.toString());
    }, [enableAntiCaptcha]);

    useEffect(() => {
        localStorage.setItem('antiCaptchaApiKey', antiCaptchaApiKey);
    }, [antiCaptchaApiKey]);

    useEffect(() => {
        localStorage.setItem('antiCaptchaProjectId', antiCaptchaProjectId);
    }, [antiCaptchaProjectId]);

    // Test Anti-Captcha API Key
    const handleTestAntiCaptcha = async () => {
        if (!antiCaptchaApiKey.trim()) {
            setAntiCaptchaTestStatus('error');
            setAntiCaptchaTestMessage('Please enter an API key');
            setTimeout(() => setAntiCaptchaTestStatus('idle'), 3000);
            return;
        }

        setAntiCaptchaTestStatus('testing');
        setAntiCaptchaTestMessage('Testing API key...');

        try {
            const result = await testAntiCaptchaKey(antiCaptchaApiKey.trim());
            if (result.valid) {
                setAntiCaptchaTestStatus('success');
                setAntiCaptchaTestMessage('✅ API key is valid!');
            } else {
                setAntiCaptchaTestStatus('error');
                setAntiCaptchaTestMessage(`❌ ${result.error || 'Invalid API key'}`);
            }
        } catch (error) {
            setAntiCaptchaTestStatus('error');
            setAntiCaptchaTestMessage(`❌ ${error instanceof Error ? error.message : 'Test failed'}`);
        }

        setTimeout(() => {
            setAntiCaptchaTestStatus('idle');
            setAntiCaptchaTestMessage('');
        }, 5000);
    };
    
    const handleSaveToken = async () => {
        if (!currentUser) {
            setError('Please login first');
            return;
        }

        if (!flowToken.trim()) {
            setError('Please enter a Flow token');
            return;
        }

        setIsSaving(true);
        setError(null);
        setSuccessMessage(null);
        setSaveStatus('idle');

        try {
            const result = await saveUserPersonalAuthToken(currentUser.id, flowToken.trim());
            
            if (result.success) {
                setSaveStatus('success');
                setSuccessMessage('Flow token saved successfully!');
                if (onUserUpdate) {
                    onUserUpdate(result.user);
                }
                // Clear input after successful save
                setTimeout(() => {
                    setFlowToken('');
                    setSaveStatus('idle');
                    setSuccessMessage(null);
                }, 3000);
            } else {
                setSaveStatus('error');
                setError(result.message || 'Failed to save token');
            }
        } catch (err) {
            setSaveStatus('error');
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setIsSaving(false);
        }
    };

    const handleOpenFlow = () => {
        window.open('https://labs.google/fx/tools/flow', '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
    };

    const handleGetToken = () => {
        window.open('https://labs.google/fx/api/auth/session', '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
    };

    const handleTestToken = useCallback(async () => {
        const tokenToTest = flowToken.trim() || currentUser?.personalAuthToken;
        if (!tokenToTest) {
            setError('Please enter a token to test');
            return;
        }
        
        setTestStatus('testing');
        setTestResults(null);
        setError(null);
        
        try {
            const results = await runComprehensiveTokenTest(tokenToTest);
            setTestResults(results);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Test failed');
        } finally {
            setTestStatus('idle');
        }
    }, [flowToken, currentUser?.personalAuthToken]);

    if (!currentUser) {
        return (
            <div className="w-full max-w-2xl mx-auto">
                <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-lg p-6 md:p-8 border border-neutral-200 dark:border-neutral-800">
                    <div className="text-center py-8">
                        <AlertTriangleIcon className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-200 mb-2">
                            Login Required
                        </h3>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                            Please login to your account first to use Flow Login
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* Left Panel: Anti-Captcha Configuration */}
                <div className="bg-white dark:bg-neutral-900 p-6 rounded-lg shadow-sm h-full overflow-y-auto">
                    <div className="mb-8">
                        <h3 className="text-lg font-bold mb-4 text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
                            <KeyIcon className="w-5 h-5 text-primary-500" />
                            Anti-Captcha Configuration
                        </h3>

                        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-100 dark:border-yellow-800 mb-4">
                            <div className="flex items-start gap-3">
                                <InformationCircleIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                                <div className="text-sm text-yellow-800 dark:text-yellow-200">
                                    <p className="font-semibold mb-1">Required for Video/Image Generation</p>
                                    <p>Google API requires reCAPTCHA v3 Enterprise tokens. Enable this to automatically solve captchas using <a href="https://anti-captcha.com" target="_blank" rel="noopener noreferrer" className="underline font-semibold">anti-captcha.com</a> service.</p>
                                </div>
                            </div>
                        </div>

                        {/* Enable Toggle */}
                        <div className="mb-4">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={enableAntiCaptcha}
                                    onChange={(e) => setEnableAntiCaptcha(e.target.checked)}
                                    className="w-5 h-5 text-primary-600 bg-neutral-100 border-neutral-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-neutral-800 focus:ring-2 dark:bg-neutral-700 dark:border-neutral-600"
                                />
                                <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                    Enable Anti-Captcha Integration
                                </span>
                            </label>
                        </div>

                        {enableAntiCaptcha && (
                            <div className="space-y-4 pl-8 border-l-2 border-primary-200 dark:border-primary-800">
                                {/* API Key Input */}
                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                                        Anti-Captcha API Key *
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showAntiCaptchaKey ? 'text' : 'password'}
                                            value={antiCaptchaApiKey}
                                            onChange={(e) => setAntiCaptchaApiKey(e.target.value)}
                                            placeholder="Enter your anti-captcha.com API key"
                                            className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-2.5 pr-10 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors font-mono text-sm"
                                        />
                                        <button
                                            onClick={() => setShowAntiCaptchaKey(!showAntiCaptchaKey)}
                                            className="absolute inset-y-0 right-0 px-3 flex items-center text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                                        >
                                            {showAntiCaptchaKey ? <EyeOffIcon className="w-4 h-4"/> : <EyeIcon className="w-4 h-4"/>}
                                        </button>
                                    </div>
                                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                                        Get your API key from <a href="https://anti-captcha.com/clients/settings/apisetup" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">anti-captcha.com dashboard</a>
                                    </p>
                                </div>

                                {/* Project ID Input */}
                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                                        Project ID (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={antiCaptchaProjectId}
                                        onChange={(e) => setAntiCaptchaProjectId(e.target.value)}
                                        placeholder="e.g., 92f722f2-8241-4a32-a890-8ac07ffc508b"
                                        className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-2.5 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors font-mono text-sm"
                                    />
                                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                                        Leave empty to auto-generate. Used for tracking purposes.
                                    </p>
                                </div>

                                {/* Test Button and Status */}
                                <div className="flex items-center gap-3 flex-wrap">
                                    <button
                                        onClick={handleTestAntiCaptcha}
                                        disabled={!antiCaptchaApiKey || antiCaptchaTestStatus === 'testing'}
                                        className="px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {antiCaptchaTestStatus === 'testing' ? <Spinner /> : <SparklesIcon className="w-4 h-4" />}
                                        Test API Key
                                    </button>

                                    {antiCaptchaTestMessage && (
                                        <span className={`text-sm font-medium ${
                                            antiCaptchaTestStatus === 'success' ? 'text-green-600' :
                                            antiCaptchaTestStatus === 'error' ? 'text-red-600' :
                                            'text-neutral-600'
                                        }`}>
                                            {antiCaptchaTestMessage}
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel: Flow Login */}
                <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-sm p-6 h-full overflow-y-auto">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                            <KeyIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-200">
                                Flow Login
                            </h2>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                Login ke akun Flow Anda dan ambil token manual
                            </p>
                        </div>
                    </div>

                {successMessage && (
                    <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                        <div className="flex items-center gap-2">
                            <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                            <span className="font-semibold text-green-800 dark:text-green-200">{successMessage}</span>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <div className="flex items-center gap-2">
                            <XIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
                            <span className="font-semibold text-red-800 dark:text-red-200">{error}</span>
                        </div>
                    </div>
                )}

                <div className="space-y-4">
                    <div>
                        <label htmlFor="flow-token" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                            Personal Token (Flow Token) *
                        </label>
                        <div className="relative">
                            <input
                                id="flow-token"
                                type={showToken ? 'text' : 'password'}
                                value={flowToken}
                                onChange={(e) => {
                                    setFlowToken(e.target.value);
                                    setTestResults(null);
                                }}
                                placeholder="Paste your Flow token here"
                                className="w-full px-4 py-3 pr-10 bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors font-mono text-sm"
                            />
                            <button
                                type="button"
                                onClick={() => setShowToken(!showToken)}
                                className="absolute inset-y-0 right-0 px-3 flex items-center text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                            >
                                {showToken ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                            </button>
                        </div>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                            Token dari akun Flow Anda (labs.google/fx/tools/flow)
                        </p>
                    </div>

                    {testStatus === 'testing' && (
                        <div className="flex items-center gap-2 text-sm text-neutral-500">
                            <Spinner /> {T_Api.testing}
                        </div>
                    )}
                    
                    {testResults && (
                        <div className="space-y-2">
                            {testResults.map(result => (
                                <div key={result.service} className={`flex items-start gap-2 text-sm p-2 rounded-md ${result.success ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                                    {result.success ? <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5"/> : <XIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"/>}
                                    <div>
                                        <span className={`font-semibold ${result.success ? 'text-green-800 dark:text-green-200' : 'text-red-700 dark:text-red-300'}`}>{result.service} Service</span>
                                        <p className={`text-xs ${result.success ? 'text-green-700 dark:text-green-300' : 'text-red-600 dark:text-red-400'}`}>{result.message}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex items-center gap-3 flex-wrap">
                        <button
                            onClick={handleOpenFlow}
                            className="flex items-center justify-center gap-2 bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 text-sm font-semibold py-2 px-4 rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors shadow-[0px_4px_12px_0px_rgba(0,0,0,0.15)]"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            Login Google Flow
                        </button>
                        <button
                            onClick={handleGetToken}
                            className="flex items-center justify-center gap-2 bg-primary-600 dark:bg-primary-700 text-white text-sm font-semibold py-2 px-4 rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 transition-colors"
                        >
                            <KeyIcon className="w-4 h-4" />
                            Get Token
                        </button>
                        <button
                            onClick={handleSaveToken}
                            disabled={isSaving || !flowToken.trim()}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                        >
                            {isSaving ? <Spinner /> : T_Api.save}
                        </button>
                        <button
                            onClick={handleTestToken}
                            disabled={(!flowToken.trim() && !currentUser?.personalAuthToken) || testStatus === 'testing'}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                            {testStatus === 'testing' ? <Spinner /> : <SparklesIcon className="w-4 h-4" />}
                            {T_Api.runTest}
                        </button>
                        
                        {saveStatus === 'success' && (
                            <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                                <CheckCircleIcon className="w-4 h-4"/> {T_Api.updated}
                            </span>
                        )}
                        {saveStatus === 'error' && (
                            <span className="text-sm text-red-600 font-medium flex items-center gap-1">
                                <XIcon className="w-4 h-4"/> {T_Api.saveFail}
                            </span>
                        )}
                    </div>
                </div>

                <div className="mt-6 pt-6 border-t border-neutral-200 dark:border-neutral-700">
                    <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <InformationCircleIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-800 dark:text-blue-200">
                            <p className="font-semibold mb-2">Cara Mengambil Token dari Flow:</p>
                            <ol className="text-xs space-y-1 list-decimal list-inside">
                                <li>Klik tombol "Get Token" untuk membuka halaman session API</li>
                                <li>Copy token dari response JSON yang muncul</li>
                                <li>Paste token tersebut di form di atas</li>
                                <li>Klik "Save Token" untuk menyimpan</li>
                                <li className="mt-2 text-neutral-600 dark:text-neutral-400">Atau gunakan cara manual: Klik "Login Google Flow" → Login → Buka Developer Tools (F12) → Network tab → Cari request API → Copy token dari header Authorization</li>
                            </ol>
                        </div>
                    </div>
                </div>
                </div>
            </div>
        </div>
    );
};

export default FlowLogin;

