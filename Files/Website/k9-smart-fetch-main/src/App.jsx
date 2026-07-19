import React from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useParams,
  useNavigate,
} from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import dogLogo from "./assets/k9-logo.jpg";



// --- Brand palette (hex) ---
const palette = {
  marigold: "#E59D2C",
  buff: "#F3D58D",
  pearl: "#EBDDC5",
  policeBlue: "#2E4365",
  citrineBrown: "#8A3B08",
};

// --- Mock data (fallback si Supabase no está configurado) ---
const MOCK_ENTRIES = [
  { id: "A-001", perro: "Lobo", fecha: "2025-10-12" },
  { id: "A-002", perro: "Mora", fecha: "2025-10-18" },
  { id: "A-003", perro: "Kira", fecha: "2025-10-21" },
  { id: "A-004", perro: "Thor", fecha: "2025-10-25" },
];

// --- Supabase client ---
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase = null;
if (supabaseUrl && supabaseAnonKey && /^https?:\/\//.test(supabaseUrl)) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
} else {
  console.warn(
    "Supabase no configurado o URL inválida. Se usarán datos mock. " +
      "Revisá VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en tu .env.local"
  );
}

// --- Auth context: usuario + perfil (rol) ---
const AuthContext = React.createContext(null);

const useAuth = () => React.useContext(AuthContext);

const AuthProvider = ({ children }) => {
  const [user, setUser] = React.useState(null);
  const [profile, setProfile] = React.useState(null); // { role, full_name }
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    const loadProfile = async (userId) => {
      const { data, error } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", userId)
        .single();

      if (!error && data) {
        setProfile(data);
      } else {
        setProfile(null);
      }
    };

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data?.session;
      if (session?.user) {
        setUser(session.user);
        await loadProfile(session.user.id);
      }
      setLoading(false);
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        loadProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const value = React.useMemo(
    () => ({ user, profile, loading }),
    [user, profile, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// --- Guards de rutas ---
const RequireAuth = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Shell>
        <p style={{ color: palette.citrineBrown }}>Cargando sesión...</p>
      </Shell>
    );
  }

  if (!user) {
    return (
      <Shell>
        <section className="space-y-4 text-center">
          <h2
            className="text-2xl font-bold"
            style={{ color: palette.policeBlue }}
          >
            Iniciá sesión para continuar
          </h2>
          <p style={{ color: palette.citrineBrown }}>
            Esta página está disponible solo para usuarios autenticados.
          </p>
          <Button to="/" variant="primary">
            Ir al inicio de sesión
          </Button>
        </section>
      </Shell>
    );
  }

  return children;
};

const RequireAdmin = ({ children }) => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <Shell>
        <p style={{ color: palette.citrineBrown }}>Cargando sesión...</p>
      </Shell>
    );
  }

  if (!user) {
    return (
      <Shell>
        <section className="space-y-4 text-center">
          <h2
            className="text-2xl font-bold"
            style={{ color: palette.policeBlue }}
          >
            Iniciá sesión para continuar
          </h2>
          <Button to="/" variant="primary">
            Ir al inicio de sesión
          </Button>
        </section>
      </Shell>
    );
  }

  const isAdmin = profile?.role === "admin";
  if (!isAdmin) {
    return (
      <Shell>
        <section className="space-y-4 text-center">
          <h2
            className="text-2xl font-bold"
            style={{ color: palette.policeBlue }}
          >
            Acceso restringido
          </h2>
          <p style={{ color: palette.citrineBrown }}>
            Solo los usuarios con rol <strong>admin</strong> pueden crear
            nuevos perros.
          </p>
          <Button to="/home" variant="primary">
            Volver al inicio
          </Button>
        </section>
      </Shell>
    );
  }

  return children;
};

// --- UI primitives ---
const Button = ({ to, children, onClick, variant = "primary", type }) => {
  const base =
    "inline-flex items-center justify-center rounded-2xl px-5 py-3 font-semibold shadow-md transition-transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-offset-2";
  const variants = {
    primary: `${base} text-white`,
    ghost: `${base} border-2`,
  };

  const styleMap = {
    primary: {
      background: palette.policeBlue,
      borderColor: palette.policeBlue,
    },
    ghost: {
      background: "transparent",
      color: palette.policeBlue,
      borderColor: palette.policeBlue,
    },
  };

  const content = (
    <span className="flex items-center gap-2">
      {children}
    </span>
  );

  if (to) {
    return (
      <Link to={to} className={variants[variant]} style={styleMap[variant]}>
        {content}
      </Link>
    );
  }
  return (
    <button
      type={type}
      className={variants[variant]}
      style={styleMap[variant]}
      onClick={onClick}
    >
      {content}
    </button>
  );
};

const Shell = ({ children }) => {
  const { user } = useAuth() || {};

  return (
    <div
      className="min-h-screen w-screen"
      style={{
        background: `linear-gradient(160deg, ${palette.buff} 0%, ${palette.pearl} 40%, ${palette.marigold} 100%)`,
      }}
    >
      <div className="w-full px-4 md:px-8 py-8">
        <header className="flex items-center justify-between mb-8">
          <Link
            to={user ? "/home" : "/"}
            className="flex items-center gap-3 group"
          >
            <Logo size={40} />
            <span
              className="text-xl font-bold"
              style={{ color: palette.policeBlue }}
            >
              K-9 Smart Fetch
            </span>
          </Link>
          {user && supabase && (
            <button
              className="text-sm font-semibold px-3 py-1 rounded-full border"
              style={{
                borderColor: palette.policeBlue,
                color: palette.policeBlue,
              }}
              onClick={() => supabase.auth.signOut()}
            >
              Cerrar sesión
            </button>
          )}
        </header>

        <main className="bg-white/70 backdrop-blur rounded-none md:rounded-3xl shadow-xl p-6 md:p-10 w-full">
          {children}
        </main>

        <footer
          className="mt-8 text-sm text-center"
          style={{ color: palette.policeBlue }}
        >
          © {new Date().getFullYear()} K-9 Smart Fetch
        </footer>
      </div>
    </div>
  );
};

// --- Logo ---
const Logo = ({ size = 170 }) => (
  <div
    aria-label="K-9 Smart Fetch logo"
    className="rounded-full shadow-xl overflow-hidden flex items-center justify-center"
    style={{
      width: size,
      height: size,
      border: `6px solid ${palette.buff}`,
      background: "white", 
    }}
  >
    <img
      src={dogLogo}
      alt="K-9 Smart Fetch"
      style={{
        width: "100%",
        height: "100%",
        objectFit: "contain", 
      }}
    />
  </div>
);


// --- Página de inicio de sesión ---
const LoginPage = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState(null);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!loading && user) {
      navigate("/home", { replace: true });
    }
  }, [user, loading, navigate]);

  if (!supabase) {
    return (
      <Shell>
        <section className="space-y-6 max-w-md mx-auto flex flex-col items-center text-center">
          <Logo />
          <h1
            className="text-3xl font-extrabold"
            style={{ color: palette.policeBlue }}
          >
            K-9 Smart Fetch
          </h1>
          <p style={{ color: palette.citrineBrown }}>
            Supabase no está configurado correctamente. No se puede iniciar
            sesión.
          </p>
        </section>
      </Shell>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      setSubmitting(true);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      // AuthProvider se encarga de redirigir cuando haya sesión
    } catch (err) {
      console.error(err);
      setError(err.message || "Error al iniciar sesión.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Shell>
      <section className="space-y-6 max-w-md mx-auto flex flex-col items-center text-center">
        <Logo />
        <h1
          className="text-3xl font-extrabold"
          style={{ color: palette.policeBlue }}
        >
          Iniciar sesión
        </h1>
        <p style={{ color: palette.citrineBrown }}>
          Usá tu correo y contraseña de K-9 Smart Fetch.
        </p>

        {error && <p style={{ color: "crimson" }}>{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4 w-full text-left">
          <div>
            <label className="block font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl px-3 py-2 border"
              required
            />
          </div>

          <div>
            <label className="block font-medium mb-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl px-3 py-2 border"
              required
            />
          </div>

          <div className="pt-2 flex justify-center">
            <Button type="submit" variant="primary">
              {submitting ? "Ingresando..." : "Ingresar"}
            </Button>
          </div>
        </form>
      </section>
    </Shell>
  );
};


// --- Home (después de iniciar sesión) ---
const Home = () => {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";

  return (
    <Shell>
      <section className="flex flex-col items-center text-center gap-6 md:gap-10">
        <Logo />
        <h1
          className="text-4xl md:text-5xl font-extrabold tracking-tight"
          style={{ color: palette.policeBlue }}
        >
          K-9 Smart Fetch
        </h1>
        <p
          className="max-w-2xl text-lg md:text-xl"
          style={{ color: palette.citrineBrown }}
        >
          La plataforma para hacer tu entrenamiento inteligente.
        </p>
        <div className="flex flex-col gap-3 mt-4">
          <Button to="/records" variant="primary">
            Acceder a registros individuales
          </Button>
          <Button to="/stats" variant="primary">
            Estadísticas generales
          </Button>
          {isAdmin && (
            <Button to="/dogs/new" variant="primary">
              Agregar un nuevo perro
            </Button>
          )}
        </div>
      </section>
    </Shell>
  );
};

/**
 * Records: lista de perros.
 */
const Records = () => {
  const navigate = useNavigate();
  const [dogs, setDogs] = React.useState([]);
  const [loading, setLoading] = React.useState(!!supabase);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    if (supabase) {
      (async () => {
        try {
          setLoading(true);
          const { data, error } = await supabase
            .from("dogs")
            .select(
              "id, dog_code, name, breed, sex, birthdate, notes, active, created_at"
            )
            .order("created_at", { ascending: false });

          if (error) throw error;
          setDogs(data || []);
        } catch (err) {
          console.error(err);
          setError(err.message || "Error al cargar perros desde Supabase");
        } finally {
          setLoading(false);
        }
      })();
    } else {
      const mapped = MOCK_ENTRIES.map((e) => ({
        id: e.id,
        dog_code: e.id,
        name: e.perro,
        breed: null,
        sex: null,
        birthdate: null,
        notes: null,
        active: true,
        created_at: e.fecha,
      }));
      setDogs(mapped);
      setLoading(false);
    }
  }, []);

  return (
    <Shell>
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            ← Volver
          </Button>
          <h2
            className="text-3xl font-bold"
            style={{ color: palette.policeBlue }}
          >
            Registros individuales
          </h2>
        </div>

        {loading && (
          <p style={{ color: palette.citrineBrown }}>Cargando perros…</p>
        )}
        {error && <p style={{ color: "crimson" }}>Error: {error}</p>}

        {!loading && !error && (
          <ul className="grid md:grid-cols-2 gap-4">
            {dogs.map((dog) => (
              <li key={dog.id}>
                <Link
                  to={`/records/${dog.id}`}
                  className="block rounded-2xl p-5 shadow-md hover:shadow-lg transition-shadow"
                  style={{
                    background: palette.pearl,
                    border: `2px solid ${palette.buff}`,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div
                        className="text-lg font-semibold"
                        style={{ color: palette.policeBlue }}
                      >
                        {dog.name} {dog.dog_code ? `— ${dog.dog_code}` : ""}
                      </div>
                      <div
                        className="text-sm"
                        style={{ color: palette.citrineBrown }}
                      >
                        {dog.created_at
                          ? `Registrado: ${String(dog.created_at).slice(
                              0,
                              10
                            )}`
                          : "Fecha no disponible"}
                      </div>
                    </div>
                    <span
                      className="text-sm font-bold"
                      style={{ color: palette.marigold }}
                    >
                      Ver ▶
                    </span>
                  </div>
                </Link>
              </li>
            ))}
            {dogs.length === 0 && (
              <li
                className="text-sm"
                style={{ color: palette.citrineBrown }}
              >
                No hay perros cargados aún.
              </li>
            )}
          </ul>
        )}
      </section>
    </Shell>
  );
};

// --- Helpers estadísticos para el detalle del perro ---

// ¿Es una sesión exitosa?
const isSuccessResult = (result) =>
  String(result || "").toLowerCase() === "success";

// Extrae un valor numérico de conditions[key]
const getConditionValue = (session, key) => {
  const cond = session.conditions || {};
  let v = cond?.[key];
  if (typeof v === "string") v = parseFloat(v);
  return Number.isFinite(v) ? v : null;
};

// Calcula media, mediana y moda para un array de números
const computeNumericStats = (values) => {
  if (!values || values.length === 0) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  const mean = sum / n;

  let median;
  if (n % 2 === 1) {
    median = sorted[(n - 1) / 2];
  } else {
    median = (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
  }

  const freq = new Map();
  let mode = sorted[0];
  let bestCount = 0;
  sorted.forEach((v) => {
    const c = (freq.get(v) || 0) + 1;
    freq.set(v, c);
    if (c > bestCount) {
      bestCount = c;
      mode = v;
    }
  });

  return { mean, median, mode };
};

// Construye distribuciones (bins) y stats para una condición concreta
const buildConditionDistributions = (
  successSessions,
  failSessions,
  key,
  binCount = 6
) => {
  const successVals = successSessions
    .map((s) => getConditionValue(s, key))
    .filter((v) => v !== null);
  const failVals = failSessions
    .map((s) => getConditionValue(s, key))
    .filter((v) => v !== null);

  const allVals = [...successVals, ...failVals];
  if (allVals.length === 0) {
    return {
      binsSuccess: [],
      binsFail: [],
      statsSuccess: null,
      statsFail: null,
    };
  }

  const min = Math.min(...allVals);
  const max = Math.max(...allVals);

  const effectiveBinCount = min === max ? 1 : binCount;
  const step =
    effectiveBinCount === 1 ? 1 : (max - min) / effectiveBinCount || 1;

  const bins = Array.from({ length: effectiveBinCount }, (_, i) => ({
    start: min + i * step,
    end:
      i === effectiveBinCount - 1 ? max : min + (i + 1) * step,
    success: 0,
    fail: 0,
  }));

  const getIndex = (v) => {
    if (effectiveBinCount === 1) return 0;
    const idx = Math.floor((v - min) / step);
    return Math.max(0, Math.min(effectiveBinCount - 1, idx));
  };

  successVals.forEach((v) => {
    const idx = getIndex(v);
    bins[idx].success += 1;
  });

  failVals.forEach((v) => {
    const idx = getIndex(v);
    bins[idx].fail += 1;
  });

  const formatLabel = (b) => {
    if (effectiveBinCount === 1) return b.start.toFixed(1);
    return `${b.start.toFixed(1)}–${b.end.toFixed(1)}`;
  };

  const binsSuccess = bins.map((b) => ({
    range: formatLabel(b),
    count: b.success,
  }));

  const binsFail = bins.map((b) => ({
    range: formatLabel(b),
    count: b.fail,
  }));

  return {
    binsSuccess,
    binsFail,
    statsSuccess: computeNumericStats(successVals),
    statsFail: computeNumericStats(failVals),
  };
};


/**
 * RecordDetail: detalle de un perro.
 */
const RecordDetail = () => {
  const { id } = useParams(); // id del perro (dogs.id)
  const navigate = useNavigate();

  const [dog, setDog] = React.useState(null);
  const [sessions, setSessions] = React.useState([]);
  const [loading, setLoading] = React.useState(!!supabase);
  const [error, setError] = React.useState(null);
  const [selectedCondition, setSelectedCondition] =
    React.useState("temp");

  // Opciones de condiciones para el desplegable
  const conditionOptions = [
    { key: "temp", label: "Temperatura" },
    { key: "wind", label: "Viento" },
    { key: "press", label: "Presión" },
    { key: "hum", label: "Humedad" },
  ];

  React.useEffect(() => {
    // Si hay Supabase: 
    if (supabase) {
      (async () => {
        try {
          setLoading(true);
          setError(null);

          const { data: dogData, error: dogError } = await supabase
            .from("dogs")
            .select(
              "id, dog_code, name, breed, sex, birthdate, notes, active, created_at"
            )
            .eq("id", id)
            .single();

          if (dogError) throw dogError;

          const { data: sessData, error: sessError } = await supabase
            .from("training_sessions")
            .select(
              "id, result, started_at, duration_s, conditions"
            )
            .eq("dog_id", id)
            .order("started_at", { ascending: true });

          if (sessError) throw sessError;

          setDog(dogData);
          setSessions(sessData || []);
        } catch (err) {
          console.error(err);
          setError(
            err.message ||
              "Error al cargar el perro / sus sesiones desde Supabase"
          );
        } finally {
          setLoading(false);
        }
      })();
    } else {
      // Fallback sin Supabase: 
      setLoading(false);
      const entry = MOCK_ENTRIES.find((e) => e.id === id);
      if (entry) {
        setDog({
          id: entry.id,
          dog_code: entry.id,
          name: entry.perro,
          breed: null,
          sex: null,
          birthdate: null,
          notes: null,
          active: true,
          created_at: entry.fecha,
        });
        setSessions([]); // no hay datos de sesiones reales
      }
    }
  }, [id]);

  // Derivados: partición de sesiones
  const successSessions = sessions.filter((s) =>
    isSuccessResult(s.result)
  );
  const failSessions = sessions.filter(
    (s) => !isSuccessResult(s.result)
  );
  const totalSessions = sessions.length;

  const successRate = totalSessions
    ? (successSessions.length / totalSessions) * 100
    : 0;
  const failRate = totalSessions ? 100 - successRate : 0;

  const rateHistogramData = [
    {
      label: "Éxitos",
      rate: Math.round(successRate),
    },
    {
      label: "Falsos positivos",
      rate: Math.round(failRate),
    },
  ];

  // Distribuciones por condición seleccionada
  const {
    binsSuccess,
    binsFail,
    statsSuccess,
    statsFail,
  } = React.useMemo(
    () =>
      buildConditionDistributions(
        successSessions,
        failSessions,
        selectedCondition
      ),
    [successSessions, failSessions, selectedCondition]
  );

  // Serie temporal de duración
  const durationSeries = sessions.map((s) => ({
    date: s.started_at
      ? String(s.started_at).slice(0, 10)
      : "Sin fecha",
    duration: s.duration_s || 0,
  }));

  return (
    <Shell>
      <section className="space-y-8">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            ← Volver
          </Button>
          <h2
            className="text-3xl font-bold"
            style={{ color: palette.policeBlue }}
          >
            {dog ? dog.name : "Perro"}
          </h2>
        </div>

        {loading && (
          <p style={{ color: palette.citrineBrown }}>Cargando…</p>
        )}
        {error && (
          <p style={{ color: "crimson" }}>Error: {error}</p>
        )}

        {dog ? (
          <>

            <div className="space-y-6">
              <div
                className="rounded-2xl p-5 shadow-md"
                style={{
                  background: palette.pearl,
                  border: `2px solid ${palette.buff}`,
                }}
              >
                <h3
                  className="text-xl font-semibold mb-3"
                  style={{ color: palette.policeBlue }}
                >
                  Información básica
                </h3>
                <dl className="space-y-2">
                  <div className="flex justify-between">
                    <dt className="font-medium">Nombre</dt>
                    <dd>{dog.name}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium">Código</dt>
                    <dd>{dog.dog_code || "—"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium">Raza</dt>
                    <dd>{dog.breed || "—"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium">Sexo</dt>
                    <dd>{dog.sex || "—"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium">Nacimiento</dt>
                    <dd>{dog.birthdate || "—"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium">Activo</dt>
                    <dd>{dog.active ? "Sí" : "No"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium">Registrado</dt>
                    <dd>
                      {dog.created_at
                        ? String(dog.created_at).slice(0, 10)
                        : "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium">
                      Sesiones registradas
                    </dt>
                    <dd>{totalSessions}</dd>
                  </div>
                </dl>
              </div>

              <div
                className="rounded-2xl p-5 shadow-md"
                style={{
                  background: palette.pearl,
                  border: `2px solid ${palette.buff}`,
                }}
              >
                <h3
                  className="text-xl font-semibold mb-3"
                  style={{ color: palette.policeBlue }}
                >
                  Notas
                </h3>
                <p style={{ color: palette.citrineBrown }}>
                  {dog.notes || "Sin notas"}
                </p>
              </div>
            </div>

            <section className="space-y-4">
              <h3
                className="text-xl font-semibold"
                style={{ color: palette.policeBlue }}
              >
                Tasas de entrenamientos exitosos y falsos positivos
              </h3>

              {totalSessions === 0 ? (
                <p style={{ color: palette.citrineBrown }}>
                  Todavía no hay sesiones registradas para este
                  perro.
                </p>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={rateHistogramData}
                      margin={{
                        top: 10,
                        right: 30,
                        left: 0,
                        bottom: 20,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" />
                      <YAxis unit="%" />
                      <Tooltip />
                      <Bar
                        dataKey="rate"
                        name="Tasa (%)"
                        fill={palette.marigold}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>

            {/* Distribuciones por condición */}
            <section className="space-y-4">
              <h3
                className="text-xl font-semibold"
                style={{ color: palette.policeBlue }}
              >
                Distribución de condiciones ambientales
              </h3>

              <div className="flex flex-wrap items-center gap-3">
                <span
                  className="font-medium"
                  style={{ color: palette.policeBlue }}
                >
                  Condición:
                </span>
                <select
                  value={selectedCondition}
                  onChange={(e) =>
                    setSelectedCondition(e.target.value)
                  }
                  className="rounded-xl px-3 py-2 border bg-white"
                >
                  {conditionOptions.map((opt) => (
                    <option key={opt.key} value={opt.key}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {binsSuccess.length === 0 &&
              binsFail.length === 0 ? (
                <p style={{ color: palette.citrineBrown }}>
                  No hay datos numéricos para esta condición en las
                  sesiones de este perro.
                </p>
              ) : (
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Éxitos */}
                  <div
                    className="rounded-2xl p-4 shadow-md"
                    style={{
                      background: palette.pearl,
                      border: `2px solid ${palette.buff}`,
                    }}
                  >
                    <h4
                      className="font-semibold mb-2"
                      style={{ color: palette.policeBlue }}
                    >
                      Entrenamientos exitosos
                    </h4>
                    <div className="h-56 mb-2">
                      <ResponsiveContainer
                        width="100%"
                        height="100%"
                      >
                        <BarChart data={binsSuccess}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="range" />
                          <YAxis />
                          <Tooltip />
                          <Bar
                            dataKey="count"
                            name="Frecuencia"
                            fill={palette.marigold}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <StatsSummary stats={statsSuccess} />
                  </div>

                  {/* Fallos */}
                  <div
                    className="rounded-2xl p-4 shadow-md"
                    style={{
                      background: palette.pearl,
                      border: `2px solid ${palette.buff}`,
                    }}
                  >
                    <h4
                      className="font-semibold mb-2"
                      style={{ color: palette.policeBlue }}
                    >
                      Falsos positivos
                    </h4>
                    <div className="h-56 mb-2">
                      <ResponsiveContainer
                        width="100%"
                        height="100%"
                      >
                        <BarChart data={binsFail}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="range" />
                          <YAxis />
                          <Tooltip />
                          <Bar
                            dataKey="count"
                            name="Frecuencia"
                            fill={palette.citrineBrown}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <StatsSummary stats={statsFail} />
                  </div>
                </div>
              )}
            </section>

            {/* Serie temporal de duración */}
            <section className="space-y-4">
              <h3
                className="text-xl font-semibold"
                style={{ color: palette.policeBlue }}
              >
                Evolución temporal de la duración de las sesiones
              </h3>

              {durationSeries.length === 0 ? (
                <p style={{ color: palette.citrineBrown }}>
                  No hay datos de duración para las sesiones.
                </p>
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={durationSeries}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="duration"
                        name="Duración (s)"
                        stroke={palette.policeBlue}
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>
          </>
        ) : (
          !loading &&
          !error && (
            <p style={{ color: palette.citrineBrown }}>
              No encontramos el registro solicitado.
            </p>
          )
        )}
      </section>
    </Shell>
  );
};


const Stats = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(!!supabase);
  const [error, setError] = React.useState(null);

  const [globalKpis, setGlobalKpis] = React.useState(null);
  const [perDogStats, setPerDogStats] = React.useState([]);
  const [scentStats, setScentStats] = React.useState([]);
  const [conditionSeries, setConditionSeries] = React.useState({
    temp: [],
    hum: [],
    press: [],
    wind: [],
  });

  const [selectedCondition, setSelectedCondition] = React.useState("temp");

  const [dogTableMode, setDogTableMode] =
    React.useState("absolute"); 

  const chartColors = {
    success: palette.marigold,
    fail: palette.citrineBrown,
    scent1: palette.marigold,
    scent2: palette.policeBlue,
  };

  const conditionOptions = [
    { key: "temp", label: "Temperatura" },
    { key: "hum", label: "Humedad" },
    { key: "press", label: "Presión" },
    { key: "wind", label: "Viento" },
  ];

  // --- Derivados para las tablas de ranking por perro ---

  const sortKeySuccess =
    dogTableMode === "absolute" ? "success" : "successRate";
  const sortKeyFail =
    dogTableMode === "absolute" ? "fail" : "failRate";

  const successRanking = React.useMemo(() => {
    if (!perDogStats.length) return [];
    return [...perDogStats].sort(
      (a, b) => b[sortKeySuccess] - a[sortKeySuccess]
    );
  }, [perDogStats, sortKeySuccess]);

  const failRanking = React.useMemo(() => {
    if (!perDogStats.length) return [];
    return [...perDogStats].sort(
      (a, b) => b[sortKeyFail] - a[sortKeyFail]
    );
  }, [perDogStats, sortKeyFail]);

  const successValuesForStats = successRanking.map((d) =>
    dogTableMode === "absolute" ? d.success : d.successRate
  );
  const failValuesForStats = failRanking.map((d) =>
    dogTableMode === "absolute" ? d.fail : d.failRate
  );

  const successStatsGlobal =
    computeNumericStats(successValuesForStats);
  const failStatsGlobal = computeNumericStats(failValuesForStats);

  const currentConditionSeries =
    conditionSeries[selectedCondition] || [];

  // --- Carga de datos desde Supabase ---

  React.useEffect(() => {
    if (!supabase) {
      setLoading(false);
      setError(
        "Supabase no está configurado correctamente. No se pueden mostrar estadísticas."
      );
      return;
    }

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
          .from("training_sessions")
          .select(
            `
            id,
            dog_id,
            result,
            started_at,
            duration_s,
            conditions,
            type,
            dogs (
              id,
              name,
              dog_code
            )
          `
          );

        if (error) throw error;
        const sessions = data || [];
        processSessions(sessions);
      } catch (err) {
        console.error(err);
        setError(
          err.message || "Error al cargar las estadísticas."
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const processSessions = (sessions) => {
    if (!sessions.length) {
      setGlobalKpis({
        totalSessions: 0,
        totalDogs: 0,
        successRate: 0,
        totalFails: 0,
      });
      setPerDogStats([]);
      setScentStats([]);
      setConditionSeries({
        temp: [],
        hum: [],
        press: [],
        wind: [],
      });
      return;
    }

    const perDogMap = new Map();
    const scentMap = new Map();
    const condMaps = {
      temp: new Map(),
      hum: new Map(),
      press: new Map(),
      wind: new Map(),
    };

    let totalSessions = 0;
    let totalSuccess = 0;
    let totalFail = 0;

    sessions.forEach((s) => {
      const resultStr = String(s.result || "").toLowerCase();
      const isSuccess = resultStr === "success";

      const dog = s.dogs;
      const dogId = dog?.id || s.dog_id;
      const dogName = dog?.name || "Perro sin nombre";
      const dogCode = dog?.dog_code || "";

      totalSessions += 1;
      if (isSuccess) totalSuccess += 1;
      else totalFail += 1;

      if (!perDogMap.has(dogId)) {
        perDogMap.set(dogId, {
          dogId,
          name: dogName,
          code: dogCode,
          total: 0,
          success: 0,
          fail: 0,
        });
      }
      const dEntry = perDogMap.get(dogId);
      dEntry.total += 1;
      if (isSuccess) dEntry.success += 1;
      else dEntry.fail += 1;

      const typeObj = s.type || {};
      const scent = String(typeObj.scent || "Desconocido");
      if (!scentMap.has(scent)) {
        scentMap.set(scent, {
          scent,
          total: 0,
          success: 0,
          fail: 0,
        });
      }
      const scentEntry = scentMap.get(scent);
      scentEntry.total += 1;
      if (isSuccess) scentEntry.success += 1;
      else scentEntry.fail += 1;

      const cond = s.conditions || {};
      ["temp", "hum", "press", "wind"].forEach((key) => {
        let v = cond?.[key];
        if (typeof v === "string") v = parseFloat(v);
        if (!Number.isFinite(v)) return;

        const map = condMaps[key];
        let entry = map.get(v);
        if (!entry) {
          entry = {
            value: v,
            total: 0,
            success: 0,
            fail: 0,
          };
          map.set(v, entry);
        }
        entry.total += 1;
        if (isSuccess) entry.success += 1;
        else entry.fail += 1;
      });
    });

    setGlobalKpis({
      totalSessions,
      totalDogs: perDogMap.size,
      successRate: totalSessions
        ? Math.round((totalSuccess / totalSessions) * 100)
        : 0,
      totalFails: totalFail,
    });

    const perDogArr = Array.from(perDogMap.values()).map(
      (d) => {
        const successRate = d.total
          ? (d.success / d.total) * 100
          : 0;
        const failRate = d.total ? (d.fail / d.total) * 100 : 0;
        return {
          ...d,
          successRate,
          failRate,
        };
      }
    );
    setPerDogStats(perDogArr);

    const scentArr = Array.from(scentMap.values()).map(
      (s) => ({
        ...s,
        successRate: s.total
          ? Math.round((s.success / s.total) * 100)
          : 0,
      })
    );
    setScentStats(scentArr);

    const buildSeries = (map) => {
      const arr = Array.from(map.values()).map((e) => ({
        value: e.value,
        total: e.total,
        success: e.success,
        fail: e.fail,
        successRate: e.total
          ? Math.round((e.success / e.total) * 100)
          : 0,
      }));
      arr.sort((a, b) => a.value - b.value);
      return arr;
    };

    setConditionSeries({
      temp: buildSeries(condMaps.temp),
      hum: buildSeries(condMaps.hum),
      press: buildSeries(condMaps.press),
      wind: buildSeries(condMaps.wind),
    });
  };

  return (
    <Shell>
      <section className="space-y-8">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            ← Volver
          </Button>
          <h2
            className="text-3xl font-bold"
            style={{ color: palette.policeBlue }}
          >
            Estadísticas generales
          </h2>
        </div>

        {loading && (
          <p style={{ color: palette.citrineBrown }}>
            Cargando estadísticas…
          </p>
        )}
        {error && (
          <p style={{ color: "crimson" }}>Error: {error}</p>
        )}

        {!loading && !error && globalKpis && (
          <>
            {/* KPIs globales */}
            <section className="grid md:grid-cols-4 gap-4">
              <KpiCard
                label="Entrenamientos totales"
                value={globalKpis.totalSessions}
              />
              <KpiCard
                label="Canes con entrenamientos registrados"
                value={globalKpis.totalDogs}
              />
              <KpiCard
                label="Tasa de éxito global"
                value={`${globalKpis.successRate}%`}
              />
              <KpiCard
                label="Falsos positivos totales"
                value={globalKpis.totalFails}
              />
            </section>

            {/* Ranking por perro: éxitos / falsos positivos */}
            <section className="space-y-4">
              <div className="flex flex-wrap items-center gap-3 justify-between">
                <h3
                  className="text-xl font-semibold"
                  style={{ color: palette.policeBlue }}
                >
                  Rankings
                </h3>
                <div className="flex items-center gap-2">
                  <span
                    className="text-sm"
                    style={{ color: palette.citrineBrown }}
                  >
                    Mostrar:
                  </span>
                  <div
                    className="inline-flex rounded-xl overflow-hidden border"
                    style={{ borderColor: palette.buff }}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setDogTableMode("absolute")
                      }
                      className={`px-3 py-1 text-sm ${
                        dogTableMode === "absolute"
                          ? "font-semibold"
                          : ""
                      }`}
                      style={{
                        background:
                          dogTableMode === "absolute"
                            ? palette.buff
                            : "white",
                        color: palette.policeBlue,
                      }}
                    >
                      Valores absolutos
                    </button>
                    <button
                      type="button"
                      onClick={() => setDogTableMode("rate")}
                      className={`px-3 py-1 text-sm ${
                        dogTableMode === "rate"
                          ? "font-semibold"
                          : ""
                      }`}
                      style={{
                        background:
                          dogTableMode === "rate"
                            ? palette.buff
                            : "white",
                        color: palette.policeBlue,
                      }}
                    >
                      Valores ponderados
                    </button>
                  </div>
                </div>
              </div>

              {perDogStats.length === 0 ? (
                <p style={{ color: palette.citrineBrown }}>
                  No hay sesiones registradas todavía.
                </p>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Éxitos */}
                  <div
                    className="rounded-2xl p-4 shadow-md"
                    style={{
                      background: palette.pearl,
                      border: `2px solid ${palette.buff}`,
                    }}
                  >
                    <h4
                      className="font-semibold mb-2"
                      style={{ color: palette.policeBlue }}
                    >
                      {dogTableMode === "absolute"
                        ? "Entrenamientos exitosos totales"
                        : "Tasa de entrenamientos exitosos totales"}
                    </h4>
                    <ul className="space-y-1 font-mono text-sm">
                      {successRanking.map((d, index) => (
                        <li
                          key={d.dogId}
                          className="flex justify-between"
                        >
                          <span>
                            {index + 1}. {d.name}
                          </span>
                          <span>
                            {dogTableMode === "absolute"
                              ? d.success
                              : `${d.successRate.toFixed(1)}%`}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3">
                      <StatsSummary stats={successStatsGlobal} />
                    </div>
                  </div>

                  {/* Falsos positivos */}
                  <div
                    className="rounded-2xl p-4 shadow-md"
                    style={{
                      background: palette.pearl,
                      border: `2px solid ${palette.buff}`,
                    }}
                  >
                    <h4
                      className="font-semibold mb-2"
                      style={{ color: palette.policeBlue }}
                    >
                      {dogTableMode === "absolute"
                        ? "Falsos positivos totales"
                        : "Tasa de falsos positivos"}
                    </h4>
                    <ul className="space-y-1 font-mono text-sm">
                      {failRanking.map((d, index) => (
                        <li
                          key={d.dogId}
                          className="flex justify-between"
                        >
                          <span>
                            {index + 1}. {d.name}
                          </span>
                          <span>
                            {dogTableMode === "absolute"
                              ? d.fail
                              : `${d.failRate.toFixed(1)}%`}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3">
                      <StatsSummary stats={failStatsGlobal} />
                    </div>
                  </div>
                </div>
              )}
            </section>

            <section className="space-y-4">
              <h3
                className="text-xl font-semibold"
                style={{ color: palette.policeBlue }}
              >
                Rendimiento por sustancia
              </h3>

              {scentStats.length === 0 ? (
                <p style={{ color: palette.citrineBrown }}>
                  No hay suficientes datos para esta gráfica.
                </p>
              ) : (
                <div className="h-80">
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
                    <BarChart
                      data={scentStats}
                      margin={{
                        top: 10,
                        right: 30,
                        left: 0,
                        bottom: 40,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="scent"
                        angle={-15}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar
                        dataKey="success"
                        name="Éxitos"
                        fill={chartColors.scent1}
                      />
                      <Bar
                        dataKey="fail"
                        name="Fallos"
                        fill={chartColors.scent2}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>

            <section className="space-y-4">
              <h3
                className="text-xl font-semibold"
                style={{ color: palette.policeBlue }}
              >
                Tasa de éxito según condiciones ambientales
              </h3>

              <div className="flex flex-wrap items-center gap-3">
                <span
                  className="font-medium"
                  style={{ color: palette.policeBlue }}
                >
                  Condición:
                </span>
                <select
                  value={selectedCondition}
                  onChange={(e) =>
                    setSelectedCondition(e.target.value)
                  }
                  className="rounded-xl px-3 py-2 border bg-white"
                >
                  {conditionOptions.map((opt) => (
                    <option key={opt.key} value={opt.key}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {currentConditionSeries.length === 0 ? (
                <p style={{ color: palette.citrineBrown }}>
                  No hay datos para esta condición.
                </p>
              ) : (
                <div className="h-80">
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
                    <LineChart data={currentConditionSeries}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="value"
                        type="number"
                        domain={["dataMin", "dataMax"]}
                        tickFormatter={(v) => v.toFixed(1)}
                      />
                      <YAxis unit="%" />
                      <Tooltip
                        formatter={(v) => `${v}%`}
                        labelFormatter={(v) =>
                          `Valor: ${v.toFixed(2)}`
                        }
                      />
                      <Line
                        type="monotone"
                        dataKey="successRate"
                        name="Tasa de éxito"
                        stroke={palette.policeBlue}
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>
          </>
        )}
      </section>
    </Shell>
  );
};

const KpiCard = ({ label, value }) => (
  <div
    className="rounded-2xl p-4 shadow-md"
    style={{ background: palette.pearl, border: `2px solid ${palette.buff}` }}
  >
    <div
      className="text-sm font-medium mb-1"
      style={{ color: palette.citrineBrown }}
    >
      {label}
    </div>
    <div
      className="text-2xl font-bold"
      style={{ color: palette.policeBlue }}
    >
      {value}
    </div>
  </div>
);


const NewDog = () => {
  const navigate = useNavigate();
  const [form, setForm] = React.useState({
    dog_code: "",
    name: "",
    breed: "",
    sex: "",
    birthdate: "",
    notes: "",
    active: true,
  });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  if (!supabase) {
    return (
      <Shell>
        <section className="space-y-6">
          <h2
            className="text-3xl font-bold"
            style={{ color: palette.policeBlue }}
          >
            Agregar un nuevo perro
          </h2>
          <p style={{ color: palette.citrineBrown }}>
            Supabase no está configurado correctamente. No se pueden guardar
            perros nuevos.
          </p>
        </section>
      </Shell>
    );
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!form.dog_code.trim() || !form.name.trim()) {
      setError("Los campos Código y Nombre son obligatorios.");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        dog_code: form.dog_code.trim(),
        name: form.name.trim(),
        breed: form.breed.trim() || null,
        sex: form.sex.trim() || null,
        birthdate: form.birthdate || null,
        notes: form.notes.trim() || null,
        active: form.active,
      };

      const { data, error } = await supabase
        .from("dogs")
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      navigate(`/records/${data.id}`);
    } catch (err) {
      console.error(err);
      setError(err.message || "Error al guardar el perro.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Shell>
      <section className="space-y-6 max-w-xl mx-auto">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            ← Volver
          </Button>
          <h2
            className="text-3xl font-bold"
            style={{ color: palette.policeBlue }}
          >
            Agregar un nuevo perro
          </h2>
        </div>

        <p style={{ color: palette.citrineBrown }}>
          Completá los datos del perro. Los campos marcados con * son
          obligatorios.
        </p>

        {error && <p style={{ color: "crimson" }}>{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-medium mb-1">
              Código del perro* (dog_code)
            </label>
            <input
              type="text"
              name="dog_code"
              value={form.dog_code}
              onChange={handleChange}
              className="w-full rounded-xl px-3 py-2 border"
              required
            />
          </div>

          <div>
            <label className="block font-medium mb-1">
              Nombre* (name)
            </label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              className="w-full rounded-xl px-3 py-2 border"
              required
            />
          </div>

          <div>
            <label className="block font-medium mb-1">Raza (breed)</label>
            <input
              type="text"
              name="breed"
              value={form.breed}
              onChange={handleChange}
              className="w-full rounded-xl px-3 py-2 border"
            />
          </div>

          <div>
            <label className="block font-medium mb-1">Sexo (sex)</label>
            <input
              type="text"
              name="sex"
              value={form.sex}
              onChange={handleChange}
              className="w-full rounded-xl px-3 py-2 border"
              placeholder="M para macho / H para hembra"
            />
          </div>

          <div>
            <label className="block font-medium mb-1">
              Fecha de nacimiento (birthdate)
            </label>
            <input
              type="date"
              name="birthdate"
              value={form.birthdate}
              onChange={handleChange}
              className="w-full rounded-xl px-3 py-2 border"
            />
          </div>

          <div>
            <label className="block font-medium mb-1">Notas (notes)</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              className="w-full rounded-xl px-3 py-2 border"
              rows={3}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="active"
              type="checkbox"
              name="active"
              checked={form.active}
              onChange={handleChange}
              className="h-4 w-4"
            />
            <label htmlFor="active" className="font-medium">
              Activo para entrenamiento (active)
            </label>
          </div>

          <div className="pt-2">
            <Button type="submit" variant="primary">
              {loading ? "Guardando..." : "Guardar perro"}
            </Button>
          </div>
        </form>
      </section>
    </Shell>
  );
};

// --- App (Router) ---
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route
            path="/home"
            element={
              <RequireAuth>
                <Home />
              </RequireAuth>
            }
          />
          <Route
            path="/records"
            element={
              <RequireAuth>
                <Records />
              </RequireAuth>
            }
          />
          <Route
            path="/records/:id"
            element={
              <RequireAuth>
                <RecordDetail />
              </RequireAuth>
            }
          />
          <Route
            path="/stats"
            element={
              <RequireAuth>
                <Stats />
              </RequireAuth>
            }
          />
          <Route
            path="/dogs/new"
            element={
              <RequireAdmin>
                <NewDog />
              </RequireAdmin>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

const StatsSummary = ({ stats }) => {
  if (!stats) {
    return (
      <p
        className="text-sm"
        style={{ color: palette.citrineBrown }}
      >
        No hay suficientes datos para calcular estadísticos.
      </p>
    );
  }
  const format = (x) =>
    Number.isFinite(x) ? x.toFixed(2) : "—";

  return (
    <p
      className="text-sm"
      style={{ color: palette.citrineBrown }}
    >
      <span className="font-medium">Media:</span>{" "}
      {format(stats.mean)} ·{" "}
      <span className="font-medium">Mediana:</span>{" "}
      {format(stats.median)} ·{" "}
      <span className="font-medium">Moda:</span>{" "}
      {format(stats.mode)}
    </p>
  );
};


const NotFound = () => (
  <Shell>
    <div className="text-center space-y-4">
      <h2
        className="text-3xl font-bold"
        style={{ color: palette.policeBlue }}
      >
        Página no encontrada
      </h2>
      <p style={{ color: palette.citrineBrown }}>
        La ruta solicitada no existe.
      </p>
      <Button to="/" variant="primary">
        Volver al inicio
      </Button>
    </div>
  </Shell>
);
