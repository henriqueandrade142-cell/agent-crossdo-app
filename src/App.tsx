import { useMemo, useState } from 'react'
import {
  Building2,
  ChevronDown,
  HelpCircle,
  Home,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCog,
  Users,
} from 'lucide-react'
import './App.css'

type Screen = 'dashboard' | 'usuarios' | 'clientes'

type UserRecord = {
  id: string
  nome: string
  email: string
  setor: string
  perfil: 'Master' | 'Administrador' | 'Atendimento'
  status: 'Ativo' | 'Inativo'
  protegido?: boolean
}

const MASTER_EMAIL = 'henrique.andrade142@gmail.com'
const MASTER_PASSWORD_HASH = '4cfd8b11c5d6d57f420889084a45b4a808f4c4ecc21c3abc6aa903fc99e5536a'

const masterUser: UserRecord = {
  id: 'USR-0001',
  nome: 'Henrique Andrade',
  email: MASTER_EMAIL,
  setor: 'Diretoria / Cross Agent',
  perfil: 'Master',
  status: 'Ativo',
  protegido: true,
}

const clientQuestions = [
  'Nome do cliente',
  'CNPJ / CPF',
  'Nome do responsável',
  'E-mail do responsável',
  'Telefone / WhatsApp',
  'Unidade atendida',
  'Grupo de WhatsApp monitorado',
  'Tipo de demanda inicial',
  'SLA esperado',
  'Observações e regras específicas',
]

async function sha256(value: string) {
  const data = new TextEncoder().encode(value)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function App() {
  const [authenticated, setAuthenticated] = useState(false)
  const [loginEmail, setLoginEmail] = useState(MASTER_EMAIL)
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [screen, setScreen] = useState<Screen>('dashboard')
  const [cadastrosOpen, setCadastrosOpen] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [clientForm, setClientForm] = useState<Record<string, string>>({
    'Unidade atendida': 'Nova Lima/MG',
    'Tipo de demanda inicial': 'Atendimento e suporte operacional via Cross Agent',
  })

  const stats = useMemo(
    () => [
      { label: 'Clientes cadastrados', value: '0', hint: 'Aguardando primeiro cadastro', tone: 'blue' },
      { label: 'Usuários ativos', value: '1', hint: 'Master protegido', tone: 'green' },
      { label: 'Demandas em análise', value: '0', hint: 'MVP em montagem', tone: 'orange' },
      { label: 'Respostas automáticas', value: 'Off', hint: 'Somente após validação humana', tone: 'red' },
    ],
    [],
  )

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoginError('')

    const emailOk = loginEmail.trim().toLowerCase() === MASTER_EMAIL
    const passwordOk = (await sha256(loginPassword)) === MASTER_PASSWORD_HASH

    if (!emailOk || !passwordOk) {
      setLoginError('E-mail ou senha inválidos para este protótipo.')
      return
    }

    setAuthenticated(true)
    setLoginPassword('')
  }

  function renderContent() {
    if (screen === 'usuarios') {
      return (
        <main className="content-shell">
          <SectionHeader
            eyebrow="Cadastros"
            title="Usuários"
            description="Controle de acessos do Agent CrossDo. O primeiro usuário é master e fica protegido contra exclusão, inativação e alteração de dados críticos."
          />

          <div className="toolbar">
            <div className="search-box">
              <Search size={18} />
              <input value="Henrique Andrade" readOnly aria-label="Buscar usuário" />
            </div>
            <button className="primary-button" disabled>Novo usuário</button>
          </div>

          <div className="card table-card">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Setor</th>
                  <th>Perfil</th>
                  <th>Status</th>
                  <th>Proteção</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{masterUser.nome}</td>
                  <td>{masterUser.email}</td>
                  <td>{masterUser.setor}</td>
                  <td><span className="pill dark">{masterUser.perfil}</span></td>
                  <td><span className="pill success">{masterUser.status}</span></td>
                  <td><span className="pill lock"><ShieldCheck size={14} /> Não editável</span></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="notice-card">
            <ShieldCheck size={22} />
            <div>
              <strong>Regra fixa do usuário master</strong>
              <p>Henrique Andrade não pode ser excluído, inativado, nem ter nome, e-mail ou senha alterados pelas telas administrativas.</p>
            </div>
          </div>
        </main>
      )
    }

    if (screen === 'clientes') {
      return (
        <main className="content-shell">
          <SectionHeader
            eyebrow="Cadastros"
            title="Clientes"
            description="Tela inicial para registrar as respostas do cliente antes de ativar monitoramento, regras e fluxos do Cross Agent."
          />

          <form className="card client-form">
            {clientQuestions.map((label) => (
              <label key={label} className={label.includes('Observações') ? 'span-2' : ''}>
                <span>{label}</span>
                {label.includes('Observações') ? (
                  <textarea
                    value={clientForm[label] ?? ''}
                    onChange={(event) => setClientForm({ ...clientForm, [label]: event.target.value })}
                    placeholder="Preencher com as respostas enviadas pelo cliente"
                  />
                ) : (
                  <input
                    value={clientForm[label] ?? ''}
                    onChange={(event) => setClientForm({ ...clientForm, [label]: event.target.value })}
                    placeholder="Aguardando informação"
                  />
                )}
              </label>
            ))}
            <div className="form-actions span-2">
              <button className="secondary-button" type="button">Limpar</button>
              <button className="primary-button" type="button">Salvar rascunho</button>
            </div>
          </form>
        </main>
      )
    }

    return (
      <main className="content-shell">
        <SectionHeader
          eyebrow="Painel operacional"
          title="Dashboard Agent CrossDo"
          description="Visão inicial do projeto de atendimento, auditoria e automação operacional da CrossDo."
        />

        <div className="stats-grid">
          {stats.map((stat) => (
            <article className={`stat-card ${stat.tone}`} key={stat.label}>
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
              <small>{stat.hint}</small>
            </article>
          ))}
        </div>

        <div className="dashboard-grid">
          <article className="card">
            <div className="card-title">
              <LayoutDashboard size={20} />
              <h3>Resumo do projeto</h3>
            </div>
            <ul className="timeline">
              <li><strong>Etapa atual:</strong> estrutura base do portal.</li>
              <li><strong>Login:</strong> padrão parecido com Portal CrossDo.</li>
              <li><strong>Cadastro:</strong> usuário master e tela de cliente.</li>
              <li><strong>Próximo passo:</strong> preencher dados reais do primeiro cliente.</li>
            </ul>
          </article>

          <article className="card">
            <div className="card-title">
              <Building2 size={20} />
              <h3>Cross Agent</h3>
            </div>
            <p className="muted">Portal preparado para centralizar cadastros, regras de atendimento, clientes, usuários e acompanhamento do projeto antes da URL definitiva.</p>
            <div className="quick-actions">
              <button onClick={() => setScreen('clientes')}>Cadastrar cliente</button>
              <button onClick={() => setScreen('usuarios')}>Ver usuários</button>
            </div>
          </article>
        </div>
      </main>
    )
  }

  if (!authenticated) {
    return (
      <div className="login-page">
        <section className="login-brand">
          <img className="login-logo" src="/agent-crossdo-app/brand/logo-icon.png" alt="CrossDo" />
          <p>Portal de atendimento e auditoria</p>
          <h1>Agent CrossDo</h1>
          <span>Mesmo padrão visual do Portal CrossDo, adaptado para o projeto Cross Agent.</span>
        </section>

        <form className="login-card" onSubmit={handleLogin}>
          <div>
            <p className="eyebrow">Acesso restrito</p>
            <h2>Entrar no painel</h2>
            <span className="login-subtitle">Acesse com seu e-mail e senha</span>
          </div>
          <label>
            <span>E-mail</span>
            <input value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} type="email" autoComplete="email" />
          </label>
          <label>
            <span>Senha</span>
            <input value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} type="password" autoComplete="current-password" autoFocus />
          </label>
          {loginError && <p className="login-error">{loginError}</p>}
          <button className="primary-button full" type="submit">Entrar</button>
          <small>Depois será criada a estrutura de e-mail para envio de senha.</small>
        </form>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-brand">
          <img className="sidebar-logo" src="/agent-crossdo-app/brand/logo-icon.png" alt="CrossDo" />
          <div>
            <strong>Agent CrossDo</strong>
            <span>Cross Agent</span>
          </div>
        </div>

        <nav className="side-nav">
          <button className={screen === 'dashboard' ? 'active' : ''} onClick={() => setScreen('dashboard')}>
            <Home size={18} /> Dashboard
          </button>
          <button className="nav-parent" onClick={() => setCadastrosOpen(!cadastrosOpen)}>
            <Users size={18} /> Cadastros <ChevronDown size={16} className={cadastrosOpen ? 'rotate' : ''} />
          </button>
          {cadastrosOpen && (
            <div className="submenu">
              <button className={screen === 'usuarios' ? 'active' : ''} onClick={() => setScreen('usuarios')}>
                <UserCog size={17} /> Usuários
              </button>
              <button className={screen === 'clientes' ? 'active' : ''} onClick={() => setScreen('clientes')}>
                <Building2 size={17} /> Clientes
              </button>
            </div>
          )}
        </nav>
      </aside>

      <section className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Alternar menu"><Menu size={20} /></button>
            <div>
              <strong>Agent CrossDo</strong>
              <span>Nome: Henrique Andrade • Setor: Diretoria / Cross Agent</span>
            </div>
          </div>

          <div className="topbar-actions">
            <button title="Ajuda"><HelpCircle size={17} /> <span>Ajuda</span></button>
            <button title="Atualizar"><RefreshCw size={17} /> <span>Atualizar</span></button>
            <button title="Trocar senha"><KeyRound size={17} /> <span>Trocar senha</span></button>
            <button title="Sair" onClick={() => setAuthenticated(false)}><LogOut size={17} /> <span>Sair</span></button>
          </div>
        </header>
        {renderContent()}
      </section>
    </div>
  )
}

function SectionHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="section-header">
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  )
}

export default App
