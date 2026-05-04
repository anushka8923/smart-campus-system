import axios from 'axios';
import {
  Bell,
  CalendarDays,
  Check,
  ExternalLink,
  Gauge,
  Lightbulb,
  LogIn,
  LogOut,
  Menu,
  Plus,
  Rocket,
  ShieldCheck,
  Users,
  X
} from 'lucide-react';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api' });
const AuthContext = createContext(null);

function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function getDashboardPath(role) {
  if (role === 'SUPER_ADMIN') return '/superadmin/dashboard';
  if (role === 'SOCIETY_ADMIN') return '/society/dashboard';
  return '/student/dashboard';
}

const demoCredentials = [
  ['College', 'SUPER_ADMIN', 'superadmin@college.com', 'Super@123'],
  ['Coding Society', 'SOCIETY_ADMIN', 'codingadmin@college.com', 'Admin@123'],
  ['Cultural Society', 'SOCIETY_ADMIN', 'cultureadmin@college.com', 'Admin@123'],
  ['Student', 'STUDENT', 'student@college.com', 'Student@123']
];

const DEFAULT_REGISTRATION_LINK = 'https://example.com/register';
const DEFAULT_POSTER_URL = 'https://placehold.co/600x400?text=Event+Poster';

const loginOptions = {
  STUDENT: {
    eyebrow: 'Student Access',
    title: 'Register as Student',
    detail: 'Students register once, then go directly to recommended events and registration links.'
  },
  SOCIETY_ADMIN: {
    eyebrow: 'Society Workspace',
    title: 'Society Admin Login',
    detail: 'Society admins use credentials created by the college to publish events for their society.'
  },
  SUPER_ADMIN: {
    eyebrow: 'College Workspace',
    title: 'College Login',
    detail: 'The college account creates societies, assigns society admins, and reviews submitted events.'
  }
};

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}

function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('smartCampusToken') || '');
  const [user, setUser] = useState(null);
  const [isBooting, setIsBooting] = useState(Boolean(token));

  useEffect(() => {
    async function loadMe() {
      if (!token) {
        setIsBooting(false);
        return;
      }
      try {
        const response = await api.get('/auth/me', { headers: authHeaders(token) });
        setUser(response.data.user);
      } catch {
        localStorage.removeItem('smartCampusToken');
        setToken('');
        setUser(null);
      } finally {
        setIsBooting(false);
      }
    }
    loadMe();
  }, [token]);

  const value = useMemo(
    () => ({
      token,
      user,
      isBooting,
      loginSession(nextToken, nextUser) {
        localStorage.setItem('smartCampusToken', nextToken);
        setToken(nextToken);
        setUser(nextUser);
      },
      logout() {
        localStorage.removeItem('smartCampusToken');
        setToken('');
        setUser(null);
      }
    }),
    [token, user, isBooting]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function useAuth() {
  return useContext(AuthContext);
}

function Shell() {
  const { user, logout, isBooting } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  if (isBooting) return <main className="grid min-h-screen place-items-center bg-zinc-100 text-zinc-600">Loading campus workspace...</main>;

  const navItems = (
    <>
      <NavLink to="/discover">Discover</NavLink>
      {user && <NavLink to={getDashboardPath(user.role)}>Dashboard</NavLink>}
      {user && <NavLink to="/notifications">Notifications</NavLink>}
      {user ? (
        <button className="btn-secondary w-full sm:w-auto" onClick={logout} type="button">
          <LogOut className="h-4 w-4" /> Logout
        </button>
      ) : (
        <Link className="btn-primary w-full sm:w-auto" to="/auth">
          <LogIn className="h-4 w-4" /> Login
        </Link>
      )}
    </>
  );

  return (
    <main className="min-h-screen bg-zinc-100 text-zinc-950">
      <header className="sticky top-0 z-20 border-b bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-3 py-3 sm:px-6">
          <div className="flex min-w-0 items-center justify-between gap-3">
          <Link to="/" className="min-w-0 text-left">
            <h1 className="truncate text-lg font-bold">Smart Campus</h1>
            <p className="text-xs text-zinc-500">Events, hackathons, societies</p>
          </Link>
            <button
              aria-expanded={isMenuOpen}
              aria-label="Toggle navigation"
              className="icon-btn md:hidden"
              onClick={() => setIsMenuOpen((current) => !current)}
              type="button"
            >
              <Menu className="h-5 w-5" />
            </button>
            <nav className="hidden flex-wrap items-center justify-end gap-2 md:flex">
              {navItems}
            </nav>
          </div>
          <nav className={`${isMenuOpen ? 'grid' : 'hidden'} grid-cols-1 gap-2 md:hidden`}>
            {navItems}
          </nav>
        </div>
      </header>

      <Routes>
        <Route path="/" element={<Navigate to={user ? getDashboardPath(user.role) : '/discover'} replace />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/discover" element={<DiscoverPage />} />
        <Route path="/dashboard" element={<Protected><DashboardRedirect /></Protected>} />
        <Route path="/student/dashboard" element={<RoleProtected roles={['STUDENT']}><StudentDashboard /></RoleProtected>} />
        <Route path="/society/dashboard" element={<RoleProtected roles={['SOCIETY_ADMIN']}><SocietyDashboard /></RoleProtected>} />
        <Route path="/superadmin/dashboard" element={<RoleProtected roles={['SUPER_ADMIN']}><AdminDashboard /></RoleProtected>} />
        <Route path="/user/dashboard" element={<Protected><DashboardRedirect /></Protected>} />
        <Route path="/admin/dashboard" element={<Protected><DashboardRedirect /></Protected>} />
        <Route path="/super-admin/dashboard" element={<Protected><DashboardRedirect /></Protected>} />
        <Route path="/notifications" element={<Protected><NotificationsPage /></Protected>} />
        <Route path="/events/:id" element={<DetailPage type="events" />} />
        <Route path="/hackathons/:id" element={<DetailPage type="hackathons" />} />
      </Routes>
    </main>
  );
}

function NavLink({ children, to }) {
  return (
    <Link className="inline-flex min-h-10 w-full min-w-0 items-center justify-center rounded-md px-3 py-2 text-center text-sm font-semibold text-zinc-700 hover:bg-zinc-100 md:w-auto" to={to}>
      {children}
    </Link>
  );
}

function Protected({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/auth" replace />;
}

function RoleProtected({ children, roles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/auth" replace />;
  if (!roles.includes(user.role)) return <AccessDenied />;
  return children;
}

function AccessDenied() {
  const { user } = useAuth();
  return (
    <Page>
      <Hero eyebrow="Access Denied" title="This dashboard is not available for your role" detail={`You are signed in as ${labelize(user?.role || 'guest')}. Use your assigned dashboard for this account.`} />
      {user && <Link className="btn-primary w-fit" to={getDashboardPath(user.role)}>Go to my dashboard</Link>}
    </Page>
  );
}

function DashboardRedirect() {
  const { user } = useAuth();
  return <Navigate to={getDashboardPath(user.role)} replace />;
}

function AuthPage() {
  const { loginSession, user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('register');
  const [loginRole, setLoginRole] = useState('STUDENT');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    interests: 'coding, robotics, workshops',
    department: '',
    course: '',
    year: ''
  });
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (user) return <Navigate to={getDashboardPath(user.role)} replace />;

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function chooseLoginRole(role) {
    setMode(role === 'STUDENT' ? 'register' : 'login');
    setLoginRole(role);
    setMessage('');
  }

  async function submit(event) {
    event.preventDefault();
    setIsSaving(true);
    setMessage('');
    try {
      const payload =
        mode === 'login'
            ? { email: form.email, password: form.password }
            : {
                name: form.name,
                email: form.email,
                password: form.password,
                department: form.department || undefined,
                course: form.course || undefined,
                year: form.year || undefined,
                interests: form.interests.split(',').map((item) => item.trim()).filter(Boolean)
            };
      const response = await api.post(`/auth/${mode === 'login' ? 'login' : 'register'}`, payload);
      loginSession(response.data.token, response.data.user);
      navigate(getDashboardPath(response.data.user.role));
    } catch (error) {
      setMessage(formatApiError(error, 'Authentication failed.'));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Page>
      <section className="mx-auto w-full max-w-2xl overflow-hidden rounded-lg border bg-white p-4 shadow-sm sm:p-5">
        <SectionTitle
          icon={ShieldCheck}
          eyebrow={mode === 'register' ? 'Student Registration' : loginOptions[loginRole].eyebrow}
          title={mode === 'register' ? 'Register as Student' : loginOptions[loginRole].title}
        />
        <p className="mt-3 text-sm text-zinc-600">
          {mode === 'register'
            ? 'Create a student account with your own password, then continue to the student dashboard.'
            : `${loginOptions[loginRole].detail} The app will open the correct dashboard for the signed-in email.`}
        </p>
        <div className="mt-5 grid gap-2 rounded-lg bg-zinc-100 p-1 md:grid-cols-3">
          <button className={`tab ${mode === 'register' && loginRole === 'STUDENT' ? 'tab-active' : ''}`} onClick={() => chooseLoginRole('STUDENT')} type="button">Register as Student</button>
          <button className={`tab ${mode === 'login' && loginRole === 'SOCIETY_ADMIN' ? 'tab-active' : ''}`} onClick={() => chooseLoginRole('SOCIETY_ADMIN')} type="button">Society</button>
          <button className={`tab ${mode === 'login' && loginRole === 'SUPER_ADMIN' ? 'tab-active' : ''}`} onClick={() => chooseLoginRole('SUPER_ADMIN')} type="button">College</button>
        </div>
        <div className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
          {mode === 'login' && loginRole === 'SUPER_ADMIN' && 'The college login is created only by the seed/bootstrap flow.'}
          {mode === 'login' && loginRole === 'SOCIETY_ADMIN' && 'Society admins cannot self-register. The college creates their login from the College dashboard.'}
          {mode === 'register' && 'Public signup creates only student accounts. College and society admin accounts use authorized credentials.'}
        </div>
        <div className="mt-4 rounded-lg border bg-zinc-50 p-3 sm:p-4">
          <h3 className="text-sm font-bold text-zinc-800">Demo credentials</h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {demoCredentials.map(([label, role, email, password]) => (
              <button
                className="flex min-w-0 flex-col rounded-md border bg-white px-3 py-2 text-left text-sm hover:bg-zinc-50"
                key={email}
                onClick={() => {
                  setMode('login');
                  setLoginRole(role);
                  setForm((current) => ({ ...current, email, password }));
                }}
                type="button"
              >
                <span className="font-semibold">{label}</span>
                <span className="break-all text-zinc-600">{email} / {password}</span>
              </button>
            ))}
          </div>
        </div>
        <form className="mt-5 grid gap-3" onSubmit={submit}>
          {mode === 'register' && <Input label="Full name" onChange={(value) => update('name', value)} required value={form.name} />}
          <Input label="Email" onChange={(value) => update('email', value)} required type="email" value={form.email} />
          <Input label="Password" onChange={(value) => update('password', value)} required type="password" value={form.password} />
          {mode === 'register' && (
            <>
              <Input label="Interests" onChange={(value) => update('interests', value)} value={form.interests} />
              <div className="grid gap-3 md:grid-cols-3">
                <Input label="Course" onChange={(value) => update('course', value)} placeholder="B.Tech, BCA, MBA..." value={form.course} />
                <Input label="Department" onChange={(value) => update('department', value)} value={form.department} />
                <Input label="Year" onChange={(value) => update('year', value)} type="number" value={form.year} />
              </div>
            </>
          )}
          <button className="btn-primary w-full" disabled={isSaving} type="submit">
            <LogIn className="h-4 w-4" /> {isSaving ? 'Please wait...' : mode === 'login' ? loginOptions[loginRole].title : 'Continue to Student Dashboard'}
          </button>
          {message && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{message}</p>}
        </form>
      </section>
    </Page>
  );
}

function StudentDashboard() {
  const { token, user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [events, setEvents] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  async function load() {
    const headers = authHeaders(token);
    const [summaryResponse, recommendationResponse, eventsResponse, notificationsResponse] = await Promise.all([
      api.get('/dashboard/summary', { headers }),
      api.get('/recommendations/me', { headers }),
      api.get('/events', { headers }),
      api.get('/notifications?limit=5', { headers })
    ]);
    const nextEvents = getEventsFromResponse(eventsResponse.data);
    setSummary(summaryResponse.data);
    setRecommendations(recommendationResponse.data.recommendations || []);
    setEvents(nextEvents);
    setNotifications(notificationsResponse.data.notifications || []);
    setIsLoading(false);
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { console.log(events); }, [events]);
  const upcomingEvents = events?.filter((item) => item?.eventType !== 'hackathon') || [];
  const upcomingHackathons = events?.filter((item) => item?.eventType === 'hackathon') || [];

  if (isLoading) return <Page><Empty text="Loading..." /></Page>;

  return (
    <Page>
      <Hero title={`Welcome, ${user?.name || 'Student'}`} eyebrow="Student Dashboard" detail="Recommended events, upcoming opportunities, and deadline reminders." />
      <MetricGrid items={[
        ['Upcoming events', events?.length || 0],
        ['Unread alerts', summary?.unreadNotifications || 0],
        ['Interests', summary?.interests || 0]
      ]} />
      <TwoColumn>
        <Panel icon={Lightbulb} title="Recommended For You">
          <ItemList
            empty="No recommendations yet."
            items={recommendations}
            render={(entry) => (
              <ContentRow
                key={`${entry?.targetType}-${entry?.item?._id}`}
                item={entry?.item}
                type={entry?.targetType}
                meta={(entry?.reasons || []).join(', ')}
                action={<RegisterActions item={entry?.item} />}
              />
            )}
          />
        </Panel>
        <Panel icon={CalendarDays} title="Upcoming Events">
          <ItemList
            empty="No approved events yet."
            items={upcomingEvents}
            render={(event) => <ContentRow key={event?._id} item={event} type="EVENT" meta={event?.category} action={<RegisterActions item={event} />} />}
          />
        </Panel>
      </TwoColumn>
      <TwoColumn>
        <Panel icon={Rocket} title="Upcoming Hackathons">
          <ItemList
            empty="No approved hackathons yet."
            items={upcomingHackathons}
            render={(event) => <ContentRow key={event?._id} item={event} type="HACKATHON" meta={event?.category} action={<RegisterActions item={event} />} />}
          />
        </Panel>
        <Panel icon={Bell} title="Notifications">
          <ItemList
            empty="No notifications yet."
            items={notifications}
            render={(item) => (
              <article className={`rounded-lg border p-4 ${item?.readAt ? 'bg-white' : 'border-emerald-200 bg-emerald-50'}`} key={item?._id}>
                <h3 className="font-semibold">{item?.title}</h3>
                <p className="mt-1 text-sm text-zinc-600">{item?.message}</p>
              </article>
            )}
          />
        </Panel>
      </TwoColumn>
    </Page>
  );
}

function SocietyDashboard() {
  const { token } = useAuth();
  return <ManagementDashboard mode="society" token={token} />;
}

function AdminDashboard() {
  const { token } = useAuth();
  return <ManagementDashboard mode="admin" token={token} />;
}

function ManagementDashboard({ mode, token }) {
  const [summary, setSummary] = useState(null);
  const [societies, setSocieties] = useState([]);
  const [events, setEvents] = useState([]);
  const [hackathons, setHackathons] = useState([]);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [eventForm, setEventForm] = useState(emptyEventForm());
  const [societyForm, setSocietyForm] = useState({ name: '', description: '', category: 'TECHNICAL', contactEmail: '' });
  const [adminForm, setAdminForm] = useState({ society: '', name: '', email: '', password: 'ChangeThisPassword123' });

  async function load() {
    const headers = authHeaders(token);
    const [summaryResponse, societiesResponse, eventsResponse, usersResponse] = await Promise.all([
      api.get('/dashboard/summary', { headers }),
      api.get('/societies', { headers }),
      api.get('/events', { headers }),
      mode === 'admin' ? api.get('/users', { headers }) : Promise.resolve({ data: { users: [] } })
    ]);
    const nextEvents = getEventsFromResponse(eventsResponse.data);
    setSummary(summaryResponse.data);
    setSocieties(societiesResponse.data.societies || []);
    setEvents(nextEvents);
    setHackathons(nextEvents?.filter((item) => item?.eventType === 'hackathon') || []);
    setUsers(usersResponse.data.users || []);
    setIsLoading(false);
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { console.log(events); }, [events]);

  async function createSociety(event) {
    event.preventDefault();
    try {
      await api.post('/societies', societyForm, { headers: authHeaders(token) });
      setSocietyForm({ name: '', description: '', category: 'TECHNICAL', contactEmail: '' });
      setMessage('Society created.');
      await load();
    } catch (error) {
      setMessage(formatApiError(error, 'Could not create society.'));
    }
  }

  async function assignAdmin(event) {
    event.preventDefault();
    try {
      await api.post(
        `/societies/${adminForm.society}/admins`,
        { name: adminForm.name, email: adminForm.email, password: adminForm.password },
        { headers: authHeaders(token) }
      );
      setAdminForm({ society: '', name: '', email: '', password: 'ChangeThisPassword123' });
      setMessage('Society admin login created. Share the email and temporary password with that society.');
      await load();
    } catch (error) {
      setMessage(formatApiError(error, 'Could not assign admin.'));
    }
  }

  async function createContent(kind, event) {
    event.preventDefault();
    const form = eventForm;
    const payload = cleanPayload({ ...form, tags: splitList(form.tags) });
    try {
      await api.post('/events', payload, { headers: authHeaders(token) });
      setEventForm(emptyEventForm());
      setMessage('Event submitted for college approval.');
      await load();
    } catch (error) {
      setMessage(formatApiError(error, `Could not create ${kind}.`));
    }
  }

  async function review(kind, id, action) {
    try {
      await api.patch(`/${kind}/${id}/${action}`, {}, { headers: authHeaders(token) });
      setMessage(`${kind === 'events' ? 'Event' : 'Hackathon'} ${action}d.`);
      await load();
    } catch (error) {
      setMessage(formatApiError(error, 'Review action failed.'));
    }
  }

  async function removeEvent(id) {
    try {
      await api.delete(`/events/${id}`, { headers: authHeaders(token) });
      setMessage('Event deleted.');
      await load();
    } catch (error) {
      setMessage(formatApiError(error, 'Delete failed.'));
    }
  }

  return (
    <Page>
      <Hero
        eyebrow={mode === 'admin' ? 'College Dashboard' : 'Society Dashboard'}
        title={mode === 'admin' ? 'Manage societies and approvals' : 'Publish events for your society'}
        detail={
          mode === 'admin'
            ? 'Create societies, issue society admin accounts, and review submitted events before students see them.'
            : 'Create event details, registration links, deadlines, and hackathons for students.'
        }
      />
      {isLoading ? <Empty text="Loading..." /> : <MetricGrid items={Object.entries(summary || {}).map(([key, value]) => [labelize(key), value])} />}
      {message && <Notice>{message}</Notice>}
      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(300px,380px)_minmax(0,1fr)] xl:gap-5 2xl:grid-cols-[400px_minmax(0,1fr)]">
        <div className="grid min-w-0 gap-4 xl:gap-5">
          {mode === 'admin' && (
            <>
              <Panel icon={Users} title="Create Society">
                <form className="grid gap-3" onSubmit={createSociety}>
                  <Input label="Society name" onChange={(value) => setSocietyForm({ ...societyForm, name: value })} required value={societyForm.name} />
                  <Textarea label="Description" onChange={(value) => setSocietyForm({ ...societyForm, description: value })} value={societyForm.description} />
                  <Select label="Category" onChange={(value) => setSocietyForm({ ...societyForm, category: value })} options={['TECHNICAL', 'CULTURAL', 'OTHER']} value={societyForm.category} />
                  <Input label="Contact email" onChange={(value) => setSocietyForm({ ...societyForm, contactEmail: value })} type="email" value={societyForm.contactEmail} />
                  <button className="btn-primary" type="submit"><Plus className="h-4 w-4" /> Add Society</button>
                </form>
              </Panel>
              <Panel icon={ShieldCheck} title="Create Society Admin">
                <form className="grid gap-3" onSubmit={assignAdmin}>
                  <Select
                    label="Assign to society"
                    onChange={(value) => setAdminForm({ ...adminForm, society: value })}
                    options={societies?.map((society) => [society?._id, society?.name])}
                    required
                    value={adminForm.society}
                  />
                  <Input label="Admin name" onChange={(value) => setAdminForm({ ...adminForm, name: value })} required value={adminForm.name} />
                  <Input label="Admin email" onChange={(value) => setAdminForm({ ...adminForm, email: value })} required type="email" value={adminForm.email} />
                  <Input label="Temporary password" onChange={(value) => setAdminForm({ ...adminForm, password: value })} required type="password" value={adminForm.password} />
                  <button className="btn-primary" disabled={(societies?.length || 0) === 0} type="submit">
                    <Check className="h-4 w-4" /> Create Login
                  </button>
                </form>
              </Panel>
            </>
          )}
          {mode === 'society' && (
            <ContentForm title="Create Event" form={eventForm} societies={societies} onChange={setEventForm} onSubmit={(event) => createContent('events', event)} type="event" />
          )}
        </div>
        <div className="grid min-w-0 gap-4 xl:gap-5">
          <Panel icon={CalendarDays} title="Events">
            <ManageList items={events} kind="events" canReview={mode === 'admin'} canDelete={mode === 'society'} onDelete={removeEvent} onReview={review} />
          </Panel>
          <Panel icon={Rocket} title="Hackathons">
            <ManageList items={hackathons} kind="events" canReview={mode === 'admin'} canDelete={mode === 'society'} onDelete={removeEvent} onReview={review} />
          </Panel>
          {mode === 'admin' && (
            <Panel icon={Users} title="Users">
              <ItemList
                empty="No users yet."
                items={users}
                render={(item) => (
                  <article className="rounded-lg border bg-zinc-50 p-4" key={item?._id}>
                    <h3 className="font-semibold">{item?.name}</h3>
                    <p className="text-sm text-zinc-600">{item?.email} · {labelize(item?.role || '')}</p>
                  </article>
                )}
              />
            </Panel>
          )}
        </div>
      </div>
    </Page>
  );
}

function DiscoverPage() {
  const [events, setEvents] = useState([]);
  const [hackathons, setHackathons] = useState([]);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      const params = cleanPayload({ q, category });
      const eventsResponse = await api.get('/events', { params });
      const nextEvents = getEventsFromResponse(eventsResponse.data);
      setEvents(nextEvents?.filter((item) => item?.eventType !== 'hackathon') || []);
      setHackathons(nextEvents?.filter((item) => item?.eventType === 'hackathon') || []);
      setIsLoading(false);
    }
    load();
  }, [q, category]);
  useEffect(() => { console.log(events); }, [events]);

  return (
    <Page>
      <Hero eyebrow="Discovery" title="Find campus opportunities" detail="Browse approved events and hackathons with fast filters." />
      <section className="grid min-w-0 gap-3 rounded-lg border bg-white p-3 sm:p-4 md:grid-cols-[1fr_220px]">
        <input className="form-input" onChange={(event) => setQ(event.target.value)} placeholder="Search title, tags, society..." value={q} />
        <select className="form-input" onChange={(event) => setCategory(event.target.value)} value={category}>
          <option value="">All categories</option>
          <option value="TECHNICAL">Technical</option>
          <option value="CULTURAL">Cultural</option>
          <option value="WORKSHOP">Workshop</option>
          <option value="COMPETITION">Competition</option>
          <option value="OPEN_INNOVATION">Open innovation</option>
        </select>
      </section>
      {isLoading && <Empty text="Loading..." />}
      <TwoColumn>
        <Panel icon={CalendarDays} title="Events">
          <CardGrid items={events} type="EVENT" />
        </Panel>
        <Panel icon={Rocket} title="Hackathons">
          <CardGrid items={hackathons} type="HACKATHON" />
        </Panel>
      </TwoColumn>
    </Page>
  );
}

function NotificationsPage() {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  async function load() {
    const response = await api.get('/notifications', { headers: authHeaders(token) });
    setNotifications(response.data.notifications || []);
    setIsLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function readAll() {
    await api.patch('/notifications/read-all', {}, { headers: authHeaders(token) });
    await load();
  }

  return (
    <Page>
      <Hero eyebrow="Notifications" title="Campus updates" detail="Approvals, reminders, and registration confirmations." />
      {isLoading && <Empty text="Loading..." />}
      <Panel icon={Bell} title="Inbox" action={<button className="btn-secondary" onClick={readAll} type="button">Mark all read</button>}>
        <ItemList
          empty="No notifications yet."
          items={notifications}
          render={(item) => (
            <article className={`rounded-lg border p-4 ${item?.readAt ? 'bg-white' : 'bg-emerald-50 border-emerald-200'}`} key={item?._id}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="font-semibold">{item?.title}</h3>
                  <p className="mt-1 text-sm text-zinc-600">{item?.message}</p>
                </div>
                <Badge>{item?.type}</Badge>
              </div>
            </article>
          )}
        />
      </Panel>
    </Page>
  );
}

function DetailPage() {
  return <Navigate to="/discover" replace />;
}

function ContentForm({ title, form, societies, onChange, onSubmit, type }) {
  return (
    <Panel icon={type === 'event' ? CalendarDays : Rocket} title={title}>
      <form className="grid gap-3" onSubmit={onSubmit}>
        <Input label="Title" onChange={(value) => onChange({ ...form, title: value })} required value={form.title} />
        <Textarea label="Description" onChange={(value) => onChange({ ...form, description: value })} required value={form.description} />
        <Select label="Society" onChange={(value) => onChange({ ...form, society: value })} options={societies?.map((society) => [society?._id, society?.name])} required value={form.society} />
        <Select label="Event type" onChange={(value) => onChange({ ...form, eventType: value })} options={['event', 'hackathon', 'workshop', 'competition']} required value={form.eventType} />
        <Input label="Category" onChange={(value) => onChange({ ...form, category: value })} required value={form.category} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Event date" onChange={(value) => onChange({ ...form, date: value })} required type="datetime-local" value={form.date} />
          <Input label="Deadline" onChange={(value) => onChange({ ...form, registrationDeadline: value })} required type="datetime-local" value={form.registrationDeadline} />
        </div>
        <Input label="Venue" onChange={(value) => onChange({ ...form, venue: value })} required value={form.venue} />
        <Input label="External registration link" onChange={(value) => onChange({ ...form, registrationLink: value })} placeholder={DEFAULT_REGISTRATION_LINK} value={form.registrationLink} />
        <p className="-mt-2 text-xs text-zinc-500">If you don't have a link, a demo link will be used automatically.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Registration fee" onChange={(value) => onChange({ ...form, registrationFee: value })} type="number" value={form.registrationFee} />
          <div className="grid gap-1.5">
            <Input label="Poster URL" onChange={(value) => onChange({ ...form, posterUrl: value })} value={form.posterUrl} />
            <p className="text-xs text-zinc-500">If you don't have a link, a demo poster will be used automatically.</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Eligibility" onChange={(value) => onChange({ ...form, eligibility: value })} value={form.eligibility} />
          <Input label="Team size" onChange={(value) => onChange({ ...form, teamSize: value })} value={form.teamSize} />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Input label="Contact email" onChange={(value) => onChange({ ...form, contactEmail: value })} type="email" value={form.contactEmail} />
          <Input label="Contact phone" onChange={(value) => onChange({ ...form, contactPhone: value })} value={form.contactPhone} />
        </div>
        <Input label="Tags" onChange={(value) => onChange({ ...form, tags: value })} value={form.tags} />
        <button className="btn-primary" disabled={(societies?.length || 0) === 0} type="submit"><Plus className="h-4 w-4" /> Submit</button>
      </form>
    </Panel>
  );
}

function ManageList({ items, kind, canReview, canDelete, onDelete, onReview }) {
  return (
    <ItemList
      empty="Nothing created yet."
      items={items}
      render={(item) => (
        <ContentRow
          key={item?._id}
          item={item}
          type={kind === 'events' ? 'EVENT' : 'HACKATHON'}
          meta={`${item?.status} / ${item?.approvalStatus} | Deadline ${formatDate(item?.registrationDeadline)}`}
          action={
            canReview && item?.approvalStatus === 'PENDING' ? (
              <div className="flex flex-wrap gap-2">
                <button className="icon-btn text-emerald-700" onClick={() => onReview(kind, item?._id, 'approve')} type="button"><Check className="h-4 w-4" /></button>
                <button className="icon-btn text-red-700" onClick={() => onReview(kind, item?._id, 'reject')} type="button"><X className="h-4 w-4" /></button>
              </div>
            ) : canDelete ? (
              <button className="btn-danger" onClick={() => onDelete(item?._id)} type="button">Delete</button>
            ) : null
          }
        />
      )}
    />
  );
}

function CardGrid({ items, type }) {
  if ((items?.length || 0) === 0) return <Empty text="No approved items yet." />;
  return (
    <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {items?.map((item) => (
        <article className="flex min-w-0 flex-col rounded-lg border bg-zinc-50 p-3 sm:p-4" key={item?._id}>
          <img
            alt={`${item?.title || 'Event'} poster`}
            className="mb-4 aspect-[3/2] h-auto w-full rounded-lg border object-cover"
            src={safeUrl(item?.posterUrl, DEFAULT_POSTER_URL)}
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h3 className="line-clamp-2 font-semibold">{item?.title}</h3>
              <p className="text-sm text-zinc-600">{item?.society?.name || 'Campus Society'}</p>
            </div>
            <Badge>{item?.category}</Badge>
          </div>
          <p className="mt-3 line-clamp-3 text-sm text-zinc-700">{item?.description}</p>
          <div className="mt-4 grid gap-1 text-sm text-zinc-600">
            <span>{formatDate(type === 'EVENT' ? item?.date : item?.startDate)}</span>
            <span>Deadline: {formatDate(item?.registrationDeadline)}</span>
            <span>{item?.venue}</span>
          </div>
          <a className="btn-primary mt-4 w-full" href={safeUrl(item?.registrationLink || item?.registrationUrl, DEFAULT_REGISTRATION_LINK)} rel="noreferrer" target="_blank">
            Register Now <ExternalLink className="h-4 w-4" />
          </a>
        </article>
      ))}
    </div>
  );
}

function ContentRow({ item, type, meta, action }) {
  if (!item) return null;
  return (
    <article className="flex min-w-0 flex-col gap-3 rounded-lg border bg-zinc-50 p-3 sm:p-4 xl:flex-row xl:items-start xl:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold">{item?.title}</h3>
          <Badge>{type}</Badge>
        </div>
        <p className="mt-1 text-sm text-zinc-600">{item?.society?.name || 'Campus Society'} · {meta}</p>
        <p className="mt-2 line-clamp-2 text-sm text-zinc-700">{item?.description}</p>
        <div className="mt-3 grid gap-1 text-xs font-medium text-zinc-500 sm:grid-cols-2">
          <span>Date: {formatDate(item?.date || item?.startDate)}</span>
          <span>Deadline: {formatDate(item?.registrationDeadline)}</span>
          <span>Venue: {item?.venue || 'Not added'}</span>
          <span>Fee: {Number(item?.registrationFee || 0) === 0 ? 'Free' : `₹${item?.registrationFee}`}</span>
          <span>Team: {item?.teamSize || 'Individual'}</span>
        </div>
      </div>
      {action}
    </article>
  );
}

function RegisterActions({ item }) {
  const link = safeUrl(item?.registrationLink || item?.registrationUrl, DEFAULT_REGISTRATION_LINK);
  return (
    <div className="grid w-full shrink-0 gap-2 xl:w-44">
      <a className="btn-primary" href={link} rel="noreferrer" target="_blank">
        Register Now <ExternalLink className="h-4 w-4" />
      </a>
    </div>
  );
}

function Page({ children }) {
  return <div className="mx-auto grid w-full max-w-7xl min-w-0 gap-4 px-3 py-4 sm:gap-5 sm:px-6 sm:py-6 lg:px-8">{children}</div>;
}

function Hero({ eyebrow, title, detail }) {
  return (
    <section className="min-w-0 rounded-lg border bg-white p-4 sm:p-5">
      <p className="text-sm font-semibold uppercase text-emerald-700">{eyebrow}</p>
      <h2 className="mt-2 break-words text-xl font-bold sm:text-2xl lg:text-3xl">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm text-zinc-600">{detail}</p>
    </section>
  );
}

function Panel({ icon: Icon, title, children, action }) {
  return (
    <section className="min-w-0 overflow-hidden rounded-lg border bg-white p-3 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-100 text-emerald-700"><Icon className="h-5 w-5" /></div>
          <h2 className="min-w-0 break-words text-base font-bold sm:text-lg">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function SectionTitle({ icon: Icon, eyebrow, title }) {
  return (
    <div className="flex gap-3">
      <div className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-100 text-emerald-700"><Icon className="h-5 w-5" /></div>
      <div>
        <p className="text-sm font-semibold uppercase text-emerald-700">{eyebrow}</p>
        <h2 className="text-xl font-bold">{title}</h2>
      </div>
    </div>
  );
}

function MetricGrid({ items }) {
  return (
    <section className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items?.map(([label, value]) => (
        <div className="min-w-0 rounded-lg border bg-white p-4" key={label}>
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-500"><Gauge className="h-4 w-4" /> {label}</div>
          <p className="mt-2 text-2xl font-bold">{value}</p>
        </div>
      ))}
    </section>
  );
}

function TwoColumn({ children }) {
  return <section className="grid min-w-0 gap-4 md:grid-cols-2 xl:gap-5">{children}</section>;
}

function ItemList({ items, render, empty }) {
  const safeItems = Array.isArray(items) ? items.filter(Boolean) : [];
  return <div className="grid min-w-0 gap-3 overflow-x-auto">{safeItems.length ? safeItems?.map(render) : <Empty text={empty || 'Loading...'} />}</div>;
}

function Empty({ text }) {
  return <p className="rounded-md border border-dashed bg-white p-4 text-sm text-zinc-500">{text}</p>;
}

function Notice({ children }) {
  return <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">{children}</p>;
}

function Badge({ children }) {
  return <span className="inline-flex w-fit rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 ring-1 ring-zinc-200">{children}</span>;
}

function Input({ label, onChange, value, ...props }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-sm font-medium text-zinc-700">{label}</span>
      <input className="form-input" onChange={(event) => onChange(event.target.value)} value={value} {...props} />
    </label>
  );
}

function Textarea({ label, onChange, value, ...props }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-sm font-medium text-zinc-700">{label}</span>
      <textarea className="form-input min-h-24 resize-y" onChange={(event) => onChange(event.target.value)} value={value} {...props} />
    </label>
  );
}

function Select({ label, onChange, options, value, ...props }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-sm font-medium text-zinc-700">{label}</span>
      <select className="form-input" onChange={(event) => onChange(event.target.value)} value={value} {...props}>
        <option value="">Select</option>
        {options?.map((option) => {
          const [valueOption, labelOption] = Array.isArray(option) ? option : [option, labelize(option)];
          return <option key={valueOption} value={valueOption}>{labelOption}</option>;
        })}
      </select>
    </label>
  );
}

function emptyEventForm() {
  return {
    title: '',
    description: '',
    category: 'TECHNICAL',
    eventType: 'event',
    society: '',
    date: '',
    registrationDeadline: '',
    venue: '',
    registrationLink: DEFAULT_REGISTRATION_LINK,
    registrationFee: '',
    eligibility: '',
    teamSize: '',
    contactEmail: '',
    contactPhone: '',
    posterUrl: DEFAULT_POSTER_URL,
    tags: '',
    status: 'PENDING'
  };
}

function emptyHackathonForm() {
  return {
    title: '',
    description: '',
    category: 'OPEN_INNOVATION',
    society: '',
    startDate: '',
    endDate: '',
    registrationDeadline: '',
    venue: '',
    registrationUrl: '',
    capacity: '',
    posterUrl: '',
    tags: '',
    themes: '',
    problemStatements: '',
    prizes: '',
    status: 'PENDING'
  };
}

function splitList(value = '') {
  return String(value).split(',').map((item) => item.trim()).filter(Boolean);
}

function cleanPayload(payload) {
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== '' && value !== undefined && !(Array.isArray(value) && value.length === 0)));
}

function getEventsFromResponse(data) {
  if (Array.isArray(data)) return data;
  return Array.isArray(data?.events) ? data.events : [];
}

function labelize(value) {
  return String(value).replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim().replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value) {
  if (!value) return 'Not scheduled';
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function safeUrl(value, fallback) {
  const candidate = String(value || '').trim();
  return /^https?:\/\//i.test(candidate) ? candidate : fallback;
}

function formatApiError(error, fallback) {
  if (error.response?.status === 401) {
    return 'Invalid email or password. Students must register first. Society admins must be created by the college, and the college login must match server/.env credentials.';
  }
  const errors = error.response?.data?.errors;
  if (Array.isArray(errors) && errors.length > 0) return errors.map((item) => item.message).join(' ');
  return error.response?.data?.message || fallback;
}
