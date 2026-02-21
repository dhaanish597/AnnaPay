import NotificationDashboard from './components/NotificationDashboard';
import Login from './components/Login';
import { AuthProvider, useAuth } from './AuthContext';

function AuthWrapper() {
  const { user } = useAuth();
  if (!user) {
    return <Login />;
  }
  return <NotificationDashboard />;
}

function App() {
  return (
    <AuthProvider>
      <AuthWrapper />
    </AuthProvider>
  );
}

export default App;
