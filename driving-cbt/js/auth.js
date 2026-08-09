import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    onAuthStateChanged, 
    signOut, 
    sendEmailVerification, 
    updateProfile 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

// Firebase configuration from user
const firebaseConfig = {
  apiKey: "AIzaSyAtXQq87Af81kSvLLf3w-_-HSGso9ckvAQ",
  authDomain: "nigeria-driving-cbt-mock-test.firebaseapp.com",
  projectId: "nigeria-driving-cbt-mock-test",
  storageBucket: "nigeria-driving-cbt-mock-test.firebasestorage.app",
  messagingSenderId: "200032467860",
  appId: "1:200032467860:web:d604d53d2b0dfeaa862d81",
  measurementId: "G-DF5DXRRQFE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements for Auth
    const loginScreen = document.getElementById('login-screen');
    const signupScreen = document.getElementById('signup-screen');
    const landingScreen = document.getElementById('landing-screen');
    
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    
    const goToSignup = document.getElementById('go-to-signup');
    const goToLogin = document.getElementById('go-to-login');
    
    const loginError = document.getElementById('login-error');
    const signupError = document.getElementById('signup-error');
    
    const userGreeting = document.getElementById('user-greeting');
    const logoutBtn = document.getElementById('logout-btn');

    const resendRow = document.getElementById('resend-row');
    const resendLink = document.getElementById('resend-verification');

    // Signup and "resend verification" both sign in temporarily. While that is
    // happening the auth-state listener must not sign the user out from under
    // them, or the verification email never gets sent.
    let authFlowInProgress = false;

    // Utility to switch screens safely
    function switchAuthScreen(from, to) {
        if(from) from.classList.remove('active');
        if(to) to.classList.add('active');
    }

    function showError(element, message, isSuccess = false) {
        if(element) {
            element.textContent = message;
            element.classList.remove('hidden');
            if (isSuccess) {
                element.style.color = '#059669';
                element.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
            } else {
                element.style.color = '';
                element.style.backgroundColor = '';
            }
            setTimeout(() => {
                element.classList.add('hidden');
            }, 6000); // 6 seconds for Firebase messages
        }
    }

    // Toggle between Login and Signup
    if(goToSignup) {
        goToSignup.addEventListener('click', (e) => {
            e.preventDefault();
            switchAuthScreen(loginScreen, signupScreen);
        });
    }

    if(goToLogin) {
        goToLogin.addEventListener('click', (e) => {
            e.preventDefault();
            switchAuthScreen(signupScreen, loginScreen);
        });
    }

    // Password visibility toggle
    document.querySelectorAll('.toggle-password').forEach(button => {
        button.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const input = document.getElementById(targetId);
            
            if (input.type === 'password') {
                input.type = 'text';
                this.textContent = '🙈';
            } else {
                input.type = 'password';
                this.textContent = '👁️';
            }
        });
    });

    function showResendRow() {
        if(resendRow) resendRow.classList.remove('hidden');
    }

    // Handle Firebase Auth State Changes
    function renderAuthState(user) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));

        if (user) {
            if (!user.emailVerified) {
                // User exists but hasn't verified email
                showError(loginError, 'Please verify your email address to log in. Check your inbox!');
                showResendRow();
                signOut(auth);
                if(loginScreen) loginScreen.classList.add('active');
            } else {
                // Fully verified and logged in
                if(resendRow) resendRow.classList.add('hidden');
                if(userGreeting) {
                    const firstName = user.displayName ? user.displayName.split(' ')[0] : 'User';
                    userGreeting.textContent = `Welcome back, ${firstName}!`;
                }
                if(landingScreen) landingScreen.classList.add('active');
            }
        } else {
            // Not logged in
            if(loginScreen) loginScreen.classList.add('active');
        }
    }

    onAuthStateChanged(auth, (user) => {
        // Signup / resend drive their own UI and clean up after themselves.
        if (authFlowInProgress) return;
        renderAuthState(user);
    });

    // Handle Signup
    if(signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = document.getElementById('signup-name').value.trim();
            const email = document.getElementById('signup-email').value.trim();
            const password = document.getElementById('signup-password').value;
            const confirmPassword = document.getElementById('signup-confirm-password').value;

            if (!name || !email || !password || !confirmPassword) {
                showError(signupError, 'All fields are required.');
                return;
            }

            if (password !== confirmPassword) {
                showError(signupError, 'Passwords differ! Please correct the password.');
                return;
            }

            const btn = signupForm.querySelector('button');
            btn.disabled = true;
            btn.textContent = 'Creating account...';
            authFlowInProgress = true;

            try {
                // Create user in Firebase
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);

                // Update their profile with their name. Not worth failing signup over.
                try {
                    await updateProfile(userCredential.user, { displayName: name });
                } catch (profileError) {
                    console.error("Profile update error:", profileError);
                }

                // Send verification email
                let emailSent = true;
                try {
                    await sendEmailVerification(userCredential.user);
                } catch (mailError) {
                    emailSent = false;
                    console.error("Verification email error:", mailError);
                }

                // Sign them out immediately so they are forced to verify
                await signOut(auth);

                switchAuthScreen(signupScreen, loginScreen);
                signupForm.reset();

                if (emailSent) {
                    showError(loginError, 'Account created! Please check your email to verify your account before logging in.', true);
                } else {
                    showError(loginError, 'Account created, but we could not send the verification email. Enter your details below and use "Resend it".');
                }
                showResendRow();

            } catch (error) {
                console.error("Signup error:", error);
                if (error.code === 'auth/email-already-in-use') {
                    showError(signupError, 'An account with this email already exists.');
                } else if (error.code === 'auth/weak-password') {
                    showError(signupError, 'Password should be at least 6 characters.');
                } else {
                    showError(signupError, error.message);
                }
            } finally {
                authFlowInProgress = false;
                btn.disabled = false;
                btn.textContent = 'Sign Up';
            }
        });
    }

    // Handle Login
    if(loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value;

            if (!email || !password) {
                showError(loginError, 'Please enter email and password.');
                return;
            }

            const btn = loginForm.querySelector('button');
            btn.disabled = true;
            btn.textContent = 'Logging in...';

            try {
                await signInWithEmailAndPassword(auth, email, password);
                // onAuthStateChanged will automatically handle the screen switch
            } catch (error) {
                console.error("Login error:", error);
                if (error.code === 'auth/invalid-credential') {
                    showError(loginError, 'Invalid email or password.');
                } else {
                    showError(loginError, error.message);
                }
            } finally {
                btn.disabled = false;
                btn.textContent = 'Log In';
            }
        });
    }

    // Resend the verification email. Firebase can only send it for a signed-in
    // user, so we sign in with the credentials already typed into the login form,
    // send the mail, then sign back out.
    if(resendLink) {
        resendLink.addEventListener('click', async (e) => {
            e.preventDefault();

            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value;

            if (!email || !password) {
                showError(loginError, 'Enter your email and password above, then click "Resend it".');
                return;
            }

            resendLink.textContent = 'Sending...';
            authFlowInProgress = true;

            try {
                const userCredential = await signInWithEmailAndPassword(auth, email, password);

                if (userCredential.user.emailVerified) {
                    // Nothing to resend, they are already good to go.
                    authFlowInProgress = false;
                    resendRow.classList.add('hidden');
                    renderAuthState(userCredential.user);
                    return;
                }

                await sendEmailVerification(userCredential.user);
                await signOut(auth);
                showError(loginError, 'Verification email sent. Check your inbox, including the spam folder.', true);

            } catch (error) {
                console.error("Resend verification error:", error);
                if (error.code === 'auth/invalid-credential') {
                    showError(loginError, 'Invalid email or password.');
                } else if (error.code === 'auth/too-many-requests') {
                    showError(loginError, 'Too many attempts. Please wait a few minutes before trying again.');
                } else {
                    showError(loginError, error.message);
                }
                if (auth.currentUser) await signOut(auth);
            } finally {
                authFlowInProgress = false;
                resendLink.textContent = 'Resend it';
            }
        });
    }

    // Handle Logout
    if(logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            signOut(auth).then(() => {
                if(loginForm) loginForm.reset();
                if(signupForm) signupForm.reset();
                if(resendRow) resendRow.classList.add('hidden');
            }).catch((error) => {
                console.error("Sign out error", error);
            });
        });
    }
});
