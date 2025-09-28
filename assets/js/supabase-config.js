/* ===================================
   SUPABASE CONFIGURATION & CLIENT
   =================================== */

// Supabase Configuration
const SUPABASE_CONFIG = {
    url: 'YOUR_SUPABASE_URL', // Replace with your Supabase URL
    anonKey: 'YOUR_SUPABASE_ANON_KEY', // Replace with your Supabase anon key
    enabled: true, // Set to true once you configure Supabase

    // Additional configuration options
    options: {
        auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true,
            storageKey: 'neurall-auth-token',
            storage: window.localStorage,
            flowType: 'pkce'
        },
        db: {
            schema: 'public',
        },
        realtime: {
            params: {
                eventsPerSecond: 10,
            },
        },
        global: {
            headers: {
                'X-Application': 'NeurallEmpire',
            },
        },
    }
};

// Initialize Supabase client
let supabase = null;

const initializeSupabase = async () => {
    if (!SUPABASE_CONFIG.enabled) {
        console.warn('🔧 Supabase is not enabled. Enable it in supabase-config.js');
        return null;
    }

    if (!SUPABASE_CONFIG.url || !SUPABASE_CONFIG.anonKey ||
        SUPABASE_CONFIG.url === 'YOUR_SUPABASE_URL' ||
        SUPABASE_CONFIG.anonKey === 'YOUR_SUPABASE_ANON_KEY') {
        console.warn('🔧 Supabase credentials not configured. Please update supabase-config.js');
        return null;
    }

    try {
        // Import Supabase from CDN
        if (typeof window.supabase === 'undefined') {
            console.log('📦 Loading Supabase client from CDN...');

            // Load Supabase client dynamically
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.38.5/dist/umd/supabase.min.js';
            script.onload = () => {
                supabase = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, SUPABASE_CONFIG.options);
                console.log('✅ Supabase client initialized successfully');

                // Test connection
                testSupabaseConnection();

                // Set up auth state change listener
                setupAuthStateListener();
            };
            script.onerror = () => {
                console.error('❌ Failed to load Supabase client');
            };
            document.head.appendChild(script);
        } else {
            supabase = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, SUPABASE_CONFIG.options);
            console.log('✅ Supabase client initialized successfully');

            testSupabaseConnection();
            setupAuthStateListener();
        }

        return supabase;

    } catch (error) {
        console.error('❌ Failed to initialize Supabase:', error);
        return null;
    }
};

// Test Supabase connection
const testSupabaseConnection = async () => {
    try {
        const { data, error } = await supabase
            .from('user_profiles')
            .select('count', { count: 'exact', head: true });

        if (error) {
            console.warn('⚠️ Supabase connection test failed:', error.message);
        } else {
            console.log('✅ Supabase connection test successful');
        }
    } catch (error) {
        console.warn('⚠️ Supabase connection test error:', error);
    }
};

// Set up auth state change listener
const setupAuthStateListener = () => {
    if (!supabase) return;

    supabase.auth.onAuthStateChange((event, session) => {
        console.log('🔐 Auth state changed:', event, session?.user?.email);

        switch (event) {
            case 'SIGNED_IN':
                handleUserSignedIn(session);
                break;
            case 'SIGNED_OUT':
                handleUserSignedOut();
                break;
            case 'TOKEN_REFRESHED':
                console.log('🔄 Token refreshed successfully');
                break;
            case 'USER_UPDATED':
                console.log('👤 User data updated');
                break;
        }
    });
};

// Handle user signed in
const handleUserSignedIn = async (session) => {
    try {
        // Get or create user profile
        const { data: profile, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

        if (error && error.code === 'PGRST116') {
            // Profile doesn't exist, this might be a new user
            console.log('👤 New user detected, profile will be created on first update');
        } else if (error) {
            console.error('❌ Error fetching user profile:', error);
        } else {
            console.log('✅ User profile loaded:', profile);
        }

        // Update last login
        updateLastLogin(session.user.id);

        // Trigger auth update in main app
        if (typeof NeurallAuth !== 'undefined') {
            NeurallAuth.handleSupabaseAuth(session, profile);
        }

    } catch (error) {
        console.error('❌ Error handling user sign in:', error);
    }
};

// Handle user signed out
const handleUserSignedOut = () => {
    console.log('👋 User signed out');

    // Clear any cached data
    localStorage.removeItem('neurall_current_user');
    sessionStorage.removeItem('neurall_current_user');

    // Trigger auth update in main app
    if (typeof NeurallAuth !== 'undefined') {
        NeurallAuth.handleSupabaseSignOut();
    }
};

// Update last login timestamp
const updateLastLogin = async (userId) => {
    try {
        const { error } = await supabase
            .from('user_profiles')
            .upsert({
                id: userId,
                last_login: new Date().toISOString(),
                login_count: 1 // This will be incremented by a database trigger
            }, {
                onConflict: 'id',
                ignoreDuplicates: false
            });

        if (error) {
            console.warn('⚠️ Failed to update last login:', error);
        }
    } catch (error) {
        console.warn('⚠️ Error updating last login:', error);
    }
};

// Supabase Service Object
const SupabaseService = {
    // Get the Supabase client
    getClient: () => supabase,

    // Check if Supabase is available
    isAvailable: () => supabase !== null && SUPABASE_CONFIG.enabled,

    // Authentication methods
    auth: {
        // Sign up new user
        signUp: async (email, password, userData = {}) => {
            if (!supabase) throw new Error('Supabase not initialized');

            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        first_name: userData.firstName,
                        last_name: userData.lastName,
                        company: userData.company,
                        newsletter: userData.newsletter || false
                    }
                }
            });

            if (error) throw error;

            // Create user profile
            if (data.user) {
                await SupabaseService.profiles.create(data.user.id, userData);
            }

            return data;
        },

        // Sign in user
        signIn: async (email, password) => {
            if (!supabase) throw new Error('Supabase not initialized');

            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;
            return data;
        },

        // Sign out user
        signOut: async () => {
            if (!supabase) throw new Error('Supabase not initialized');

            const { error } = await supabase.auth.signOut();
            if (error) throw error;
        },

        // Get current user
        getCurrentUser: async () => {
            if (!supabase) return null;

            const { data: { user } } = await supabase.auth.getUser();
            return user;
        },

        // Get current session
        getCurrentSession: async () => {
            if (!supabase) return null;

            const { data: { session } } = await supabase.auth.getSession();
            return session;
        }
    },

    // User profile methods
    profiles: {
        // Create user profile
        create: async (userId, userData) => {
            if (!supabase) throw new Error('Supabase not initialized');

            const { data, error } = await supabase
                .from('user_profiles')
                .insert({
                    id: userId,
                    first_name: userData.firstName,
                    last_name: userData.lastName,
                    company: userData.company,
                    newsletter: userData.newsletter || false,
                    ip_address: userData.ipAddress,
                    user_agent: userData.userAgent,
                    referral_source: userData.referralSource || 'direct'
                });

            if (error) throw error;
            return data;
        },

        // Get user profile
        get: async (userId) => {
            if (!supabase) throw new Error('Supabase not initialized');

            const { data, error } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) throw error;
            return data;
        },

        // Update user profile
        update: async (userId, updates) => {
            if (!supabase) throw new Error('Supabase not initialized');

            const { data, error } = await supabase
                .from('user_profiles')
                .update(updates)
                .eq('id', userId)
                .select()
                .single();

            if (error) throw error;
            return data;
        }
    },

    // Contact methods
    contacts: {
        // Submit contact form
        submit: async (contactData) => {
            if (!supabase) throw new Error('Supabase not initialized');

            // Get current user if logged in
            const { data: { user } } = await supabase.auth.getUser();

            const { data, error } = await supabase
                .from('contacts')
                .insert({
                    name: contactData.name,
                    email: contactData.email,
                    phone: contactData.phone,
                    company: contactData.company,
                    message: contactData.message,
                    budget: contactData.budget,
                    user_id: user?.id,
                    is_logged_in_user: !!user,
                    ip_address: contactData.ipAddress,
                    user_agent: contactData.userAgent,
                    referrer: contactData.referrer,
                    utm_source: contactData.utmSource,
                    utm_medium: contactData.utmMedium,
                    utm_campaign: contactData.utmCampaign
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },

        // Get user's contacts
        getUserContacts: async (userId) => {
            if (!supabase) throw new Error('Supabase not initialized');

            const { data, error } = await supabase
                .from('contacts')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data;
        }
    },

    // Payment methods
    payments: {
        // Create payment record
        create: async (paymentData) => {
            if (!supabase) throw new Error('Supabase not initialized');

            const { data, error } = await supabase
                .from('payments')
                .insert(paymentData)
                .select()
                .single();

            if (error) throw error;
            return data;
        },

        // Update payment status
        update: async (paymentId, updates) => {
            if (!supabase) throw new Error('Supabase not initialized');

            const { data, error } = await supabase
                .from('payments')
                .update(updates)
                .eq('payment_id', paymentId)
                .select()
                .single();

            if (error) throw error;
            return data;
        },

        // Get user's payments
        getUserPayments: async (userId) => {
            if (!supabase) throw new Error('Supabase not initialized');

            const { data, error } = await supabase
                .from('payments')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data;
        }
    },

    // Real-time subscriptions
    realtime: {
        // Subscribe to user profile changes
        subscribeToProfile: (userId, callback) => {
            if (!supabase) return null;

            return supabase
                .channel(`profile:${userId}`)
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'user_profiles',
                    filter: `id=eq.${userId}`
                }, callback)
                .subscribe();
        },

        // Subscribe to user's contacts
        subscribeToContacts: (userId, callback) => {
            if (!supabase) return null;

            return supabase
                .channel(`contacts:${userId}`)
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'contacts',
                    filter: `user_id=eq.${userId}`
                }, callback)
                .subscribe();
        }
    }
};

// Initialize Supabase when this script loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSupabase);
} else {
    initializeSupabase();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SupabaseService, SUPABASE_CONFIG };
} else if (typeof window !== 'undefined') {
    window.SupabaseService = SupabaseService;
    window.SUPABASE_CONFIG = SUPABASE_CONFIG;
}