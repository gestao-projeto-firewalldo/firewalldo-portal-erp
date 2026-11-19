import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { AuthGate } from '@/context/AuthGate';
import { PrefsProvider } from '@/context/PrefsContext';
import { SessionProvider } from '@/context/SessionContext';
import { ToastProvider } from '@/context/ToastContext';
import { TaskEditorProvider } from '@/components/tasks/TaskEditor';
import { EmptyState } from '@/components/ui';
import Dashboard from '@/pages/Dashboard';
import Kanban from '@/pages/Kanban';
import Agenda from '@/pages/Agenda';
import Projects from '@/pages/Projects';
import ProjectDetail from '@/pages/ProjectDetail';
import Library from '@/pages/Library';
import News from '@/pages/News';
import Ideas from '@/pages/Ideas';
import AuditPage from '@/pages/Audit';
import Team from '@/pages/Team';
import Reports from '@/pages/Reports';
import SettingsPage from '@/pages/Settings';

export default function App() {
  return (
    <PrefsProvider>
      <ToastProvider>
        <AuthGate>
          <SessionProvider>
            <TaskEditorProvider>
              <Routes>
                <Route element={<Layout />}>
                  <Route index element={<Dashboard />} />
                  <Route path="tarefas" element={<Kanban />} />
                  <Route path="agenda" element={<Agenda />} />
                  <Route path="kanban" element={<Navigate to="/tarefas" replace />} />
                  <Route path="projetos" element={<Projects />} />
                  <Route path="projetos/:id" element={<ProjectDetail />} />
                  <Route path="biblioteca" element={<Library />} />
                  <Route path="radar" element={<News />} />
                  <Route path="ideias" element={<Ideas />} />
                  <Route path="usuarios" element={<Team />} />
                  <Route path="equipe" element={<Navigate to="/usuarios" replace />} />
                  <Route path="relatorios" element={<Reports />} />
                  <Route path="auditoria" element={<AuditPage />} />
                  <Route path="configuracoes" element={<SettingsPage />} />
                  <Route
                    path="*"
                    element={
                      <div className="page card pad">
                        <EmptyState
                          title="Página não encontrada"
                          description="O endereço acessado não existe."
                          action={<Link className="btn primary" to="/">Voltar ao início</Link>}
                        />
                      </div>
                    }
                  />
                </Route>
              </Routes>
            </TaskEditorProvider>
          </SessionProvider>
        </AuthGate>
      </ToastProvider>
    </PrefsProvider>
  );
}
