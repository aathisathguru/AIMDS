import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  Info,
  Lightbulb,
  Lock,
  Mail,
  Search,
  Shield,
  TrendingUp,
  User,
} from 'lucide-react';
import campusBg from '../assets/campus-bg.png';
import aimdsMark from '../assets/aimds-mark.png';
import ThemeToggle from '../components/ui/ThemeToggle.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import './Login.css';

const WORKFLOW_STEPS = [
  {
    step: '01',
    title: 'MONITOR',
    desc: 'Continuous utility telemetry across every block and floor.',
    icon: TrendingUp,
  },
  {
    step: '02',
    title: 'ANALYZE',
    desc: 'Pattern analysis and anomaly detection against learned baselines.',
    icon: Search,
  },
  {
    step: '03',
    title: 'DECIDE',
    desc: 'Severity, probable cause and the recommended next action.',
    icon: Lightbulb,
  },
];

export default function Login({ defaultSignUp = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, signup, googleLogin, pending } = useAuth();

  // Mode: Sign In (false) or Sign Up (true)
  const [isSignUp, setIsSignUp] = useState(defaultSignUp);

  // Sign In state
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);

  // Sign Up state
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupRole, setSignupRole] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupShowPassword, setSignupShowPassword] = useState(false);

  // Feedback states
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const from = location.state?.from?.pathname ?? '/';
  const submittingRef = useRef(false);

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

  // Google credential response handler (Google Identity Services button / One Tap)
  const handleGoogleCredentialResponse = useCallback(
    async (response) => {
      if (submittingRef.current) return;
      submittingRef.current = true;
      setError('');
      setNotice('');
      try {
        let email = '';
        let name = '';
        let picture = '';
        if (response?.credential) {
          try {
            const base64Url = response.credential.split('.')[1];
            if (base64Url) {
              const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
              const jsonPayload = decodeURIComponent(
                atob(base64)
                  .split('')
                  .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                  .join(''),
              );
              const payload = JSON.parse(jsonPayload);
              email = payload.email || '';
              name = payload.name || payload.given_name || '';
              picture = payload.picture || '';
            }
          } catch (err) {
            console.warn('Could not decode client-side Google token:', err);
          }
        }

        await googleLogin({
          credential: response.credential,
          email: email || undefined,
          name: name || undefined,
          picture: picture || undefined,
          remember,
        });
        navigate(from, { replace: true });
      } catch (err) {
        setError(err?.message || 'Google sign-in was unsuccessful. Please try again.');
      } finally {
        submittingRef.current = false;
      }
    },
    [googleLogin, navigate, from, remember],
  );

  // Initialize Google Identity Services if client ID is configured
  useEffect(() => {
    if (!googleClientId || typeof window === 'undefined' || !window.google?.accounts?.id) return;
    try {
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
      });
    } catch (e) {
      console.warn('Google Identity initialization notice:', e);
    }
  }, [googleClientId, handleGoogleCredentialResponse]);

  // Ensure fields start clean and override any aggressive browser autofill on mount
  useEffect(() => {
    setIdentifier('');
    setPassword('');
  }, []);

  // Handle standard login submit
  const handleLoginSubmit = async (e) => {
    e?.preventDefault();
    if (submittingRef.current || pending) return;
    submittingRef.current = true;
    setError('');
    setNotice('');

    const targetUser = identifier.trim();
    if (!targetUser) {
      setError('Please enter your email or username.');
      submittingRef.current = false;
      return;
    }
    if (!password) {
      setError('Password is required.');
      submittingRef.current = false;
      return;
    }

    try {
      await login({ identifier: targetUser, password, remember });
      navigate(from, { replace: true });
    } catch {
      setError('Invalid email or password.');
    } finally {
      submittingRef.current = false;
    }
  };

  // Handle sign up submit
  const handleSignUpSubmit = async (e) => {
    e?.preventDefault();
    if (submittingRef.current || pending) return;
    submittingRef.current = true;
    setError('');
    setNotice('');

    const name = signupName.trim();
    const email = signupEmail.trim();
    const role = signupRole || '';
    const pwd = signupPassword;

    if (!name) {
      setError('Please enter your full name.');
      submittingRef.current = false;
      return;
    }
    if (!email || !email.includes('@')) {
      setError('Please enter a valid work email address.');
      submittingRef.current = false;
      return;
    }
    if (!role) {
      setError('Please select an operator role.');
      submittingRef.current = false;
      return;
    }
    if (!pwd || pwd.length < 4) {
      setError('Password must be at least 4 characters long.');
      submittingRef.current = false;
      return;
    }

    try {
      await signup({
        name,
        email,
        password: pwd,
        role,
        remember,
      });
      navigate(from, { replace: true });
    } catch (err) {
      setError(err?.message || 'Unable to create account. Please try again.');
    } finally {
      submittingRef.current = false;
    }
  };

  // Handle Google authentication button
  const handleGoogleLogin = async () => {
    if (submittingRef.current || pending) return;
    setError('');
    setNotice('');

    if (googleClientId && typeof window !== 'undefined' && window.google?.accounts?.oauth2) {
      try {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: googleClientId,
          scope: 'email profile openid',
          callback: async (tokenResponse) => {
            if (tokenResponse.error) {
              console.warn('Google OAuth prompt dismissed or failed:', tokenResponse.error);
              return;
            }
            if (tokenResponse.access_token) {
              submittingRef.current = true;
              try {
                const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                  headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
                });
                const userInfo = await res.json();
                await googleLogin({
                  credential: tokenResponse.access_token,
                  email: userInfo.email,
                  name: userInfo.name || userInfo.given_name,
                  picture: userInfo.picture,
                  remember,
                });
                navigate(from, { replace: true });
              } catch (err) {
                setError(err?.message || 'Failed to authenticate with Google account.');
              } finally {
                submittingRef.current = false;
              }
            }
          },
        });
        client.requestAccessToken({ prompt: 'select_account' });
        return;
      } catch (e) {
        console.warn('Google OAuth popup initialization failed, falling back to direct auth:', e);
      }
    }

    // Direct auth fallback if no OAuth popup or client ID not set
    submittingRef.current = true;
    try {
      const activeEmail = isSignUp ? signupEmail.trim() : identifier.trim();
      if (!activeEmail || !activeEmail.includes('@')) {
        setError('Please enter your email address to continue with sign-in.');
        submittingRef.current = false;
        return;
      }
      const email = activeEmail;
      const name =
        isSignUp && signupName.trim()
          ? signupName.trim()
          : email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

      await googleLogin({
        email,
        name,
        remember,
      });
      navigate(from, { replace: true });
    } catch (err) {
      setError(err?.message || 'Google sign-in was unsuccessful. Please check connection.');
    } finally {
      submittingRef.current = false;
    }
  };

  const toggleMode = (targetSignUp) => {
    setIsSignUp(targetSignUp);
    setError('');
    setNotice('');
  };

  return (
    <div className="login">
      {/* Background campus photo layer */}
      <div
        className="login__bg-layer"
        style={{ backgroundImage: `url(${campusBg})` }}
        aria-hidden="true"
      />

      {/* Atmospheric dark navy gradient overlay */}
      <div className="login__bg-overlay" aria-hidden="true" />

      {/* Top Header: Brand on left, theme switch on right */}
      <header className="login__header">
        <div className="login__brand-header">
          <img
            src={aimdsMark}
            alt="AIMDS Brand Mark"
            className="login__brand-mark"
            width="46"
            height="46"
          />
          <div className="login__brand-text">
            <div className="login__brand-name">AIMDS</div>
            <div className="login__brand-desc">
              <span>AI-BASED MULTI-UTILITY</span>
              <span>MONITORING &amp; DECISION SUPPORT SYSTEM</span>
            </div>
            <div className="login__brand-inst">
              <span>BANNARI AMMAN INSTITUTE OF TECHNOLOGY</span>
              <span className="login__brand-since">SINCE 2026</span>
            </div>
          </div>
        </div>

        <div className="login__header-actions">
          <ThemeToggle />
        </div>
      </header>

      {/* Main 2-column layout */}
      <main className="login__main">
        {/* Left Column: Product Branding & 3-Step Process */}
        <section className="login__col-left" aria-label="AIMDS Overview">
          <h1 className="login__pitch">
            Operational intelligence,
            <br />
            <span className="login__pitch-highlight">ready for action.</span>
          </h1>

          <p className="login__subtitle">
            Monitor utilities. Detect anomalies. Make informed decisions.
          </p>

          <div className="login__workflow" role="list" aria-label="AIMDS Operational Process">
            {WORKFLOW_STEPS.map((step, idx) => {
              const IconComponent = step.icon;
              const isLast = idx === WORKFLOW_STEPS.length - 1;

              return (
                <div key={step.step} className="login__workflow-item" role="listitem">
                  <div className="login__workflow-track" aria-hidden="true">
                    <div className="login__workflow-badge">
                      <IconComponent size={17} strokeWidth={2} />
                    </div>
                    {!isLast && <div className="login__workflow-line" />}
                  </div>

                  <div className="login__workflow-content">
                    <div className="login__workflow-header">
                      <span className="login__workflow-step">{step.step}</span>
                      <span className="login__workflow-title">{step.title}</span>
                    </div>
                    <p className="login__workflow-desc">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Right Column: Authentication Card */}
        <section className="login__col-right" aria-label="Operator Authentication">
          <div className="login__panel-container">
            <div className={`login__flip-card ${isSignUp ? 'is-flipped' : ''}`}>
              
              {/* -----------------------------------------------------------
                 FRONT FACE: SECURE ACCESS (SIGN IN)
                 ----------------------------------------------------------- */}
              <div
                className="login__panel login__flip-face login__flip-face--front"
                aria-hidden={isSignUp}
              >
                <div className="login__panel-header">
                  <div className="login__panel-eyebrow">
                    <span className="login__panel-eyebrow-dot" aria-hidden="true" />
                    SECURE ACCESS
                  </div>
                  <h2 className="login__panel-title">Sign in to AIMDS</h2>
                  <p className="login__panel-sub">
                    Access the monitoring and decision-support workspace.
                  </p>
                </div>

                <form className="login__form" onSubmit={handleLoginSubmit} noValidate autoComplete="off">
                  {/* Decoy fields to intercept aggressive browser autofill */}
                  <input
                    type="text"
                    name="fake_autofill_username"
                    autoComplete="username"
                    style={{ display: 'none' }}
                    tabIndex={-1}
                    aria-hidden="true"
                  />
                  <input
                    type="password"
                    name="fake_autofill_password"
                    autoComplete="current-password"
                    style={{ display: 'none' }}
                    tabIndex={-1}
                    aria-hidden="true"
                  />

                  {/* Field: Identifier */}
                  <div className="login__field">
                    <label className="login__label" htmlFor="login-identifier">
                      Email or Username
                    </label>
                    <div className="login__input-box">
                      <User className="login__input-icon" size={16} strokeWidth={1.8} aria-hidden="true" />
                      <input
                        id="login-identifier"
                        name="aimds_operator_identifier"
                        type="text"
                        autoComplete="off"
                        className="login__input"
                        placeholder="Enter your email or username"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        disabled={pending}
                        aria-invalid={Boolean(error && !identifier.trim())}
                      />
                    </div>
                  </div>

                  {/* Field: Password */}
                  <div className="login__field">
                    <label className="login__label" htmlFor="login-password">
                      Password
                    </label>
                    <div className="login__input-box">
                      <Lock className="login__input-icon" size={16} strokeWidth={1.8} aria-hidden="true" />
                      <input
                        id="login-password"
                        name="aimds_operator_credential"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        className="login__input login__input--password"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={pending}
                        aria-invalid={Boolean(error && !password)}
                      />
                      <button
                        type="button"
                        className="login__eye-btn"
                        onClick={() => setShowPassword((s) => !s)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        aria-pressed={showPassword}
                        tabIndex={0}
                      >
                        {showPassword ? (
                          <EyeOff size={16} strokeWidth={1.8} aria-hidden="true" />
                        ) : (
                          <Eye size={16} strokeWidth={1.8} aria-hidden="true" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Row: Remember me + Forgot password */}
                  <div className="login__options-row">
                    <label className="login__remember">
                      <input
                        type="checkbox"
                        checked={remember}
                        onChange={(e) => setRemember(e.target.checked)}
                        disabled={pending}
                        className="login__checkbox"
                      />
                      <span className="login__checkbox-custom" aria-hidden="true">
                        <Check size={11} strokeWidth={2.6} />
                      </span>
                      <span className="login__remember-label">Remember me</span>
                    </label>

                    <button
                      type="button"
                      className="login__forgot-btn"
                      onClick={() =>
                        setNotice('A password reset link will be sent to your registered account.')
                      }
                      tabIndex={0}
                    >
                      Forgot password?
                    </button>
                  </div>

                  {/* Inline Error Notice */}
                  {error && !isSignUp && (
                    <div className="login__alert login__alert--error" role="alert">
                      <AlertCircle size={15} strokeWidth={2} aria-hidden="true" />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Inline Status Notice */}
                  {notice && !error && !isSignUp && (
                    <div className="login__alert login__alert--notice" role="status">
                      <Info size={15} strokeWidth={2} aria-hidden="true" />
                      <span>{notice}</span>
                    </div>
                  )}

                  {/* Primary Submit Button */}
                  <button
                    type="submit"
                    className="login__btn-primary"
                    disabled={pending}
                  >
                    {pending ? (
                      <>
                        <span className="login__spinner" aria-hidden="true" />
                        <span>Signing in…</span>
                      </>
                    ) : (
                      <>
                        <span>Sign in</span>
                        <ArrowRight size={16} strokeWidth={2.2} aria-hidden="true" />
                      </>
                    )}
                  </button>

                  {/* Divider */}
                  <div className="login__divider" aria-hidden="true">
                    <span className="login__divider-line" />
                    <span className="login__divider-text">or</span>
                    <span className="login__divider-line" />
                  </div>

                  {/* Google Authentication Button */}
                  <button
                    type="button"
                    className="login__btn-google"
                    onClick={handleGoogleLogin}
                    disabled={pending}
                    aria-label="Continue with Google"
                  >
                    <svg
                      className="login__google-icon"
                      viewBox="0 0 24 24"
                      width="18"
                      height="18"
                      aria-hidden="true"
                    >
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3h3.86c2.26-2.09 3.685-5.17 3.685-9.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.32 21.3 7.39 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.39 0 3.32 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
                      />
                    </svg>
                    <span>Continue with Google</span>
                  </button>

                  {/* Switch to Sign Up */}
                  <div className="login__switch-row">
                    <span>Don&apos;t have an operator account?</span>
                    <button
                      type="button"
                      className="login__switch-link"
                      onClick={() => toggleMode(true)}
                    >
                      Create account
                    </button>
                  </div>
                </form>
              </div>

              {/* -----------------------------------------------------------
                 BACK FACE: OPERATOR ONBOARDING (SIGN UP)
                 ----------------------------------------------------------- */}
              <div
                className="login__panel login__flip-face login__flip-face--back"
                aria-hidden={!isSignUp}
              >
                <div className="login__panel-header">
                  <div className="login__panel-eyebrow">
                    <span className="login__panel-eyebrow-dot" aria-hidden="true" />
                    OPERATOR ONBOARDING
                  </div>
                  <h2 className="login__panel-title">Create Account</h2>
                  <p className="login__panel-sub">
                    Register for access to telemetry monitoring and decision support.
                  </p>
                </div>

                <form className="login__form" onSubmit={handleSignUpSubmit} noValidate autoComplete="off">
                  {/* Field: Full Name */}
                  <div className="login__field">
                    <label className="login__label" htmlFor="signup-name">
                      Full Name
                    </label>
                    <div className="login__input-box">
                      <User className="login__input-icon" size={16} strokeWidth={1.8} aria-hidden="true" />
                      <input
                        id="signup-name"
                        name="name"
                        type="text"
                        autoComplete="name"
                        className="login__input"
                        placeholder="Enter your full name"
                        value={signupName}
                        onChange={(e) => setSignupName(e.target.value)}
                        disabled={pending}
                        required
                      />
                    </div>
                  </div>

                  {/* Field: Work Email */}
                  <div className="login__field">
                    <label className="login__label" htmlFor="signup-email">
                      Work Email
                    </label>
                    <div className="login__input-box">
                      <Mail className="login__input-icon" size={16} strokeWidth={1.8} aria-hidden="true" />
                      <input
                        id="signup-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        className="login__input"
                        placeholder="name@organization.edu"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        disabled={pending}
                        required
                      />
                    </div>
                  </div>

                  {/* Field: Operator Role */}
                  <div className="login__field">
                    <label className="login__label" htmlFor="signup-role">
                      Operator Role
                    </label>
                    <div className="login__input-box">
                      <Shield className="login__input-icon" size={16} strokeWidth={1.8} aria-hidden="true" />
                      <select
                        id="signup-role"
                        name="role"
                        className={`login__input login__select ${!signupRole ? 'is-placeholder' : ''}`}
                        value={signupRole}
                        onChange={(e) => setSignupRole(e.target.value)}
                        disabled={pending}
                        required
                      >
                        <option value="" disabled hidden>
                          Select your operational role…
                        </option>
                        <option value="Operations Engineer">Operations Engineer</option>
                        <option value="System Administrator">System Administrator</option>
                        <option value="Facilities Director">Facilities Director</option>
                        <option value="Energy Auditor">Energy Auditor</option>
                        <option value="SCADA Specialist">SCADA Specialist</option>
                      </select>
                      <ChevronDown size={14} className="login__select-arrow" aria-hidden="true" />
                    </div>
                  </div>

                  {/* Field: Password */}
                  <div className="login__field">
                    <label className="login__label" htmlFor="signup-password">
                      Password
                    </label>
                    <div className="login__input-box">
                      <Lock className="login__input-icon" size={16} strokeWidth={1.8} aria-hidden="true" />
                      <input
                        id="signup-password"
                        name="new-password"
                        type={signupShowPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        className="login__input login__input--password"
                        placeholder="Create a password (min 4 chars)"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        disabled={pending}
                        required
                      />
                      <button
                        type="button"
                        className="login__eye-btn"
                        onClick={() => setSignupShowPassword((s) => !s)}
                        aria-label={signupShowPassword ? 'Hide password' : 'Show password'}
                        aria-pressed={signupShowPassword}
                        tabIndex={0}
                      >
                        {signupShowPassword ? (
                          <EyeOff size={16} strokeWidth={1.8} aria-hidden="true" />
                        ) : (
                          <Eye size={16} strokeWidth={1.8} aria-hidden="true" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Inline Error Notice */}
                  {error && isSignUp && (
                    <div className="login__alert login__alert--error" role="alert">
                      <AlertCircle size={15} strokeWidth={2} aria-hidden="true" />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Primary Submit Button */}
                  <button
                    type="submit"
                    className="login__btn-primary"
                    disabled={pending}
                  >
                    {pending ? (
                      <>
                        <span className="login__spinner" aria-hidden="true" />
                        <span>Creating account…</span>
                      </>
                    ) : (
                      <>
                        <span>Create account</span>
                        <ArrowRight size={16} strokeWidth={2.2} aria-hidden="true" />
                      </>
                    )}
                  </button>

                  {/* Divider */}
                  <div className="login__divider" aria-hidden="true">
                    <span className="login__divider-line" />
                    <span className="login__divider-text">or</span>
                    <span className="login__divider-line" />
                  </div>

                  {/* Google Authentication Button */}
                  <button
                    type="button"
                    className="login__btn-google"
                    onClick={handleGoogleLogin}
                    disabled={pending}
                    aria-label="Continue with Google"
                  >
                    <svg
                      className="login__google-icon"
                      viewBox="0 0 24 24"
                      width="18"
                      height="18"
                      aria-hidden="true"
                    >
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3h3.86c2.26-2.09 3.685-5.17 3.685-9.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.32 21.3 7.39 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.39 0 3.32 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
                      />
                    </svg>
                    <span>Continue with Google</span>
                  </button>

                  {/* Switch to Sign In */}
                  <div className="login__switch-row">
                    <span>Already have an operator account?</span>
                    <button
                      type="button"
                      className="login__switch-link"
                      onClick={() => toggleMode(false)}
                    >
                      Sign in here
                    </button>
                  </div>
                </form>
              </div>

            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
