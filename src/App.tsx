import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Reports from './pages/Reports';
import Clients from './pages/Clients';
import Incomes from './pages/Incomes';
import Expenses from './pages/Expenses';
import Salaries from './pages/Salaries';
import Collaborators from './pages/Collaborators';
import Billing from './pages/Billing';
import Caja from './pages/Caja';
import Login from './pages/Login';
import { useAuth } from './context/AuthContext';

function App() {
  const { user, isAuthLoading } = useAuth();

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Login />;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="reports" element={<Reports />} />
          <Route path="billing" element={<Billing />} />
          <Route path="clients" element={<Clients />} />
          <Route path="team" element={<Collaborators />} />
          <Route path="incomes" element={<Incomes />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="salaries" element={<Salaries />} />
          <Route path="caja" element={<Caja />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
