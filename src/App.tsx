import { useEffect, useMemo, useState } from 'react'
import {
  Building2,
  ChevronDown,
  Edit3,
  HelpCircle,
  Home,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  UserCog,
  Users,
} from 'lucide-react'
import './App.css'

type Screen = 'dashboard' | 'usuarios' | 'clientes' | 'gruposClientes'
type Status = 'Ativo' | 'Inativo'

type UserRecord = {
  id: string
  nome: string
  email: string
  setor: string
  perfil: 'Master' | 'Administrador' | 'Atendimento'
  status: Status
  protegido?: boolean
}

type ClientRecord = {
  id: string
  nomeCliente: string
  documento: string
  responsavel: string
  emailResponsavel: string
  telefone: string
  unidade: string
  tipoDemanda: string
  sla: string
  status: Status
  observacoes: string
}

type GroupClientRecord = {
  id: string
  clienteId: string
  nomeGrupo: string
  identificadorGrupo: string
  unidade: string
  demandaMonitorada: string
  responsavelInterno: string
  status: Status
  observacoes: string
}

const MASTER_EMAIL = 'henrique.andrade142@gmail.com'
const MASTER_PASSWORD_HASH = '4cfd8b11c5d6d57f420889084a45b4a808f4c4ecc21c3abc6aa903fc99e5536a'
const USERS_KEY = 'agent_crossdo_users'
const CLIENTS_KEY = 'agent_crossdo_clients'
const GROUPS_KEY = 'agent_crossdo_groups_clients'

const masterUser: UserRecord = {
  id: 'USR-0001',
  nome: 'Henrique Andrade',
  email: MASTER_EMAIL,
  setor: 'Diretoria / Cross Agent',
  perfil: 'Master',
  status: 'Ativo',
  protegido: true,
}

const emptyUser: UserRecord = {
  id: '',
  nome: '',
  email: '',
  setor: '',
  perfil: 'Atendimento',
  status: 'Ativo',
}

const emptyClient: ClientRecord = {
  id: '',
  nomeCliente: '',
  documento: '',
  responsavel: '',
  emailResponsavel: '',
  telefone: '',
  unidade: 'Nova Lima/MG',
  tipoDemanda: 'Atendimento e suporte operacional via Cross Agent',
  sla: '',
  status: 'Ativo',
  observacoes: '',
}

const emptyGroupClient: GroupClientRecord = {
  id: '',
  clienteId: '',
  nomeGrupo: '',
  identificadorGrupo: '',
  unidade: 'Nova Lima/MG',
  demandaMonitorada: '',
  responsavelInterno: 'Henrique Andrade',
  status: 'Ativo',
  observacoes: '',
}

function generateId(prefix: string) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`
}

function readStore<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeStore<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value))
}

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
  const [flash, setFlash] = useState('')

  const [users, setUsers] = useState<UserRecord[]>([masterUser])
  const [clients, setClients] = useState<ClientRecord[]>([])
  const [groupsClients, setGroupsClients] = useState<GroupClientRecord[]>([])
  const [userForm, setUserForm] = useState<UserRecord>(emptyUser)
  const [clientForm, setClientForm] = useState<ClientRecord>(emptyClient)
  const [groupForm, setGroupForm] = useState<GroupClientRecord>(emptyGroupClient)
  const [userSearch, setUserSearch] = useState('')

  useEffect(() => {
    const storedUsers = readStore<UserRecord[]>(USERS_KEY, [masterUser])
    const hasMaster = storedUsers.some((user) => user.id === masterUser.id)
    setUsers(hasMaster ? storedUsers.map((user) => (user.id === masterUser.id ? masterUser : user)) : [masterUser, ...storedUsers])
    setClients(readStore<ClientRecord[]>(CLIENTS_KEY, []))
    setGroupsClients(readStore<GroupClientRecord[]>(GROUPS_KEY, []))
  }, [])

  function notify(message: string) {
    setFlash(message)
    window.setTimeout(() => setFlash(''), 2800)
  }

  function persistUsers(next: UserRecord[]) {
    const normalized = next.some((user) => user.id === masterUser.id)
      ? next.map((user) => (user.id === masterUser.id ? masterUser : user))
      : [masterUser, ...next]
    setUsers(normalized)
    writeStore(USERS_KEY, normalized)
  }

  function persistClients(next: ClientRecord[]) {
    setClients(next)
    writeStore(CLIENTS_KEY, next)
  }

  function persistGroups(next: GroupClientRecord[]) {
    setGroupsClients(next)
    writeStore(GROUPS_KEY, next)
  }

  const filteredUsers = users.filter((user) => {
    const term = userSearch.trim().toLowerCase()
    if (!term) return true
    return [user.nome, user.email, user.setor, user.perfil, user.status].some((value) => value.toLowerCase().includes(term))
  })

  const activeUsers = users.filter((user) => user.status === 'Ativo').length
  const activeClients = clients.filter((client) => client.status === 'Ativo').length
  const activeGroups = groupsClients.filter((group) => group.status === 'Ativo').length

  const stats = useMemo(
    () => [
      { label: 'Clientes cadastrados', value: String(clients.length), hint: `${activeClients} ativo(s)`, tone: 'blue' },
      { label: 'Grupos vinculados', value: String(groupsClients.length), hint: `${activeGroups} ativo(s)`, tone: 'orange' },
      { label: 'Usuários ativos', value: String(activeUsers), hint: `${users.length} cadastrado(s)`, tone: 'green' },
      { label: 'Modo operação', value: 'Manual', hint: 'Aprovação humana', tone: 'red' },
    ],
    [activeClients, activeGroups, activeUsers, clients.length, groupsClients.length, users.length],
  )

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoginError('')

    const emailOk = loginEmail.trim().toLowerCase() === MASTER_EMAIL
    const passwordOk = (await sha256(loginPassword)) === MASTER_PASSWORD_HASH

    if (!emailOk || !passwordOk) {
      setLoginError('E-mail ou senha inválidos.')
      return
    }

    setAuthenticated(true)
    setLoginPassword('')
  }

  function saveUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!userForm.nome.trim() || !userForm.email.trim() || !userForm.setor.trim()) {
      notify('Preencha nome, e-mail e setor.')
      return
    }
    if (userForm.id === masterUser.id) return

    const exists = users.some((user) => user.id !== userForm.id && user.email.toLowerCase() === userForm.email.toLowerCase())
    if (exists) {
      notify('Já existe usuário com este e-mail.')
      return
    }

    const record = { ...userForm, id: userForm.id || generateId('USR') }
    persistUsers(userForm.id ? users.map((user) => (user.id === userForm.id ? record : user)) : [...users, record])
    setUserForm(emptyUser)
    notify('Usuário salvo.')
  }

  function editUser(user: UserRecord) {
    if (user.id === masterUser.id) return
    setUserForm(user)
  }

  function deleteUser(id: string) {
    if (id === masterUser.id) return
    persistUsers(users.filter((user) => user.id !== id))
    if (userForm.id === id) setUserForm(emptyUser)
    notify('Usuário removido.')
  }

  function toggleUserStatus(user: UserRecord) {
    if (user.id === masterUser.id) return
    persistUsers(users.map((item) => (item.id === user.id ? { ...item, status: item.status === 'Ativo' ? 'Inativo' : 'Ativo' } : item)))
  }

  function saveClient(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!clientForm.nomeCliente.trim() || !clientForm.responsavel.trim() || !clientForm.emailResponsavel.trim()) {
      notify('Preencha cliente, responsável e e-mail.')
      return
    }
    const record = { ...clientForm, id: clientForm.id || generateId('CLI') }
    persistClients(clientForm.id ? clients.map((client) => (client.id === clientForm.id ? record : client)) : [...clients, record])
    setClientForm(emptyClient)
    notify('Cliente salvo.')
  }

  function deleteClient(id: string) {
    persistClients(clients.filter((client) => client.id !== id))
    persistGroups(groupsClients.filter((group) => group.clienteId !== id))
    if (clientForm.id === id) setClientForm(emptyClient)
    notify('Cliente removido.')
  }

  function saveGroupClient(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!groupForm.clienteId || !groupForm.nomeGrupo.trim() || !groupForm.demandaMonitorada.trim()) {
      notify('Preencha cliente, grupo e demanda monitorada.')
      return
    }
    const record = { ...groupForm, id: groupForm.id || generateId('GRP') }
    persistGroups(groupForm.id ? groupsClients.map((group) => (group.id === groupForm.id ? record : group)) : [...groupsClients, record])
    setGroupForm(emptyGroupClient)
    notify('Grupo/cliente salvo.')
  }

  function deleteGroupClient(id: string) {
    persistGroups(groupsClients.filter((group) => group.id !== id))
    if (groupForm.id === id) setGroupForm(emptyGroupClient)
    notify('Vínculo removido.')
  }

  function renderUsers() {
    return (
      <main className="content-shell">
        <SectionHeader eyebrow="Cadastros" title="Usuários" description="Controle de acessos internos do Agent CrossDo." />

        <div className="toolbar">
          <div className="search-box">
            <Search size={18} />
            <input value={userSearch} onChange={(event) => setUserSearch(event.target.value)} placeholder="Buscar usuário" aria-label="Buscar usuário" />
          </div>
          <button className="primary-button" type="button" onClick={() => setUserForm(emptyUser)}><Plus size={16} /> Novo usuário</button>
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
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td>{user.nome}</td>
                  <td>{user.email}</td>
                  <td>{user.setor}</td>
                  <td><span className="pill dark">{user.protegido ? 'Administrador' : user.perfil}</span></td>
                  <td><button className={`pill status ${user.status === 'Ativo' ? 'success' : 'neutral'}`} type="button" onClick={() => toggleUserStatus(user)}>{user.status}</button></td>
                  <td>
                    <div className="row-actions">
                      <button type="button" onClick={() => editUser(user)} disabled={user.protegido}><Edit3 size={15} /></button>
                      <button type="button" onClick={() => deleteUser(user.id)} disabled={user.protegido}><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <form className="card record-form" onSubmit={saveUser}>
          <h3>{userForm.id ? 'Editar usuário' : 'Novo usuário'}</h3>
          <label><span>Nome</span><input value={userForm.nome} onChange={(event) => setUserForm({ ...userForm, nome: event.target.value })} /></label>
          <label><span>E-mail</span><input type="email" value={userForm.email} onChange={(event) => setUserForm({ ...userForm, email: event.target.value })} /></label>
          <label><span>Setor</span><input value={userForm.setor} onChange={(event) => setUserForm({ ...userForm, setor: event.target.value })} /></label>
          <label><span>Perfil</span><select value={userForm.perfil} onChange={(event) => setUserForm({ ...userForm, perfil: event.target.value as UserRecord['perfil'] })}><option>Administrador</option><option>Atendimento</option></select></label>
          <label><span>Status</span><select value={userForm.status} onChange={(event) => setUserForm({ ...userForm, status: event.target.value as Status })}><option>Ativo</option><option>Inativo</option></select></label>
          <div className="form-actions span-2">
            <button className="secondary-button" type="button" onClick={() => setUserForm(emptyUser)}>Limpar</button>
            <button className="primary-button" type="submit"><Save size={16} /> Salvar</button>
          </div>
        </form>
      </main>
    )
  }

  function renderClients() {
    return (
      <main className="content-shell">
        <SectionHeader eyebrow="Cadastros" title="Clientes" description="Cadastro dos clientes acompanhados pelo Agent CrossDo." />

        <div className="card table-card spaced-card">
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Documento</th>
                <th>Responsável</th>
                <th>Unidade</th>
                <th>Demanda</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {clients.length === 0 ? <tr><td colSpan={7}>Nenhum cliente cadastrado.</td></tr> : clients.map((client) => (
                <tr key={client.id}>
                  <td>{client.nomeCliente}</td>
                  <td>{client.documento || '—'}</td>
                  <td>{client.responsavel}</td>
                  <td>{client.unidade}</td>
                  <td>{client.tipoDemanda}</td>
                  <td><span className={`pill ${client.status === 'Ativo' ? 'success' : 'neutral'}`}>{client.status}</span></td>
                  <td><div className="row-actions"><button type="button" onClick={() => setClientForm(client)}><Edit3 size={15} /></button><button type="button" onClick={() => deleteClient(client.id)}><Trash2 size={15} /></button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <form className="card record-form" onSubmit={saveClient}>
          <h3>{clientForm.id ? 'Editar cliente' : 'Novo cliente'}</h3>
          <label><span>Nome do cliente</span><input value={clientForm.nomeCliente} onChange={(event) => setClientForm({ ...clientForm, nomeCliente: event.target.value })} /></label>
          <label><span>CNPJ / CPF</span><input value={clientForm.documento} onChange={(event) => setClientForm({ ...clientForm, documento: event.target.value })} /></label>
          <label><span>Responsável</span><input value={clientForm.responsavel} onChange={(event) => setClientForm({ ...clientForm, responsavel: event.target.value })} /></label>
          <label><span>E-mail do responsável</span><input type="email" value={clientForm.emailResponsavel} onChange={(event) => setClientForm({ ...clientForm, emailResponsavel: event.target.value })} /></label>
          <label><span>Telefone / WhatsApp</span><input value={clientForm.telefone} onChange={(event) => setClientForm({ ...clientForm, telefone: event.target.value })} /></label>
          <label><span>Unidade atendida</span><select value={clientForm.unidade} onChange={(event) => setClientForm({ ...clientForm, unidade: event.target.value })}><option>Nova Lima/MG</option><option>Barueri/SP</option><option>Todas</option></select></label>
          <label><span>Tipo de demanda inicial</span><input value={clientForm.tipoDemanda} onChange={(event) => setClientForm({ ...clientForm, tipoDemanda: event.target.value })} /></label>
          <label><span>SLA esperado</span><input value={clientForm.sla} onChange={(event) => setClientForm({ ...clientForm, sla: event.target.value })} /></label>
          <label><span>Status</span><select value={clientForm.status} onChange={(event) => setClientForm({ ...clientForm, status: event.target.value as Status })}><option>Ativo</option><option>Inativo</option></select></label>
          <label className="span-2"><span>Observações e regras específicas</span><textarea value={clientForm.observacoes} onChange={(event) => setClientForm({ ...clientForm, observacoes: event.target.value })} /></label>
          <div className="form-actions span-2">
            <button className="secondary-button" type="button" onClick={() => setClientForm(emptyClient)}>Limpar</button>
            <button className="primary-button" type="submit"><Save size={16} /> Salvar</button>
          </div>
        </form>
      </main>
    )
  }

  function renderGroupsClients() {
    return (
      <main className="content-shell">
        <SectionHeader eyebrow="Cadastros" title="Grupos/Clientes" description="Vincule grupos de atendimento aos clientes cadastrados." />

        <div className="card table-card spaced-card">
          <table>
            <thead>
              <tr>
                <th>Grupo</th>
                <th>Cliente</th>
                <th>Identificador</th>
                <th>Unidade</th>
                <th>Demanda</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {groupsClients.length === 0 ? <tr><td colSpan={7}>Nenhum grupo vinculado.</td></tr> : groupsClients.map((group) => {
                const client = clients.find((item) => item.id === group.clienteId)
                return (
                  <tr key={group.id}>
                    <td>{group.nomeGrupo}</td>
                    <td>{client?.nomeCliente ?? '—'}</td>
                    <td>{group.identificadorGrupo || '—'}</td>
                    <td>{group.unidade}</td>
                    <td>{group.demandaMonitorada}</td>
                    <td><span className={`pill ${group.status === 'Ativo' ? 'success' : 'neutral'}`}>{group.status}</span></td>
                    <td><div className="row-actions"><button type="button" onClick={() => setGroupForm(group)}><Edit3 size={15} /></button><button type="button" onClick={() => deleteGroupClient(group.id)}><Trash2 size={15} /></button></div></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <form className="card record-form" onSubmit={saveGroupClient}>
          <h3>{groupForm.id ? 'Editar grupo/cliente' : 'Novo grupo/cliente'}</h3>
          <label><span>Cliente</span><select value={groupForm.clienteId} onChange={(event) => setGroupForm({ ...groupForm, clienteId: event.target.value })}><option value="">Selecione</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.nomeCliente}</option>)}</select></label>
          <label><span>Nome do grupo</span><input value={groupForm.nomeGrupo} onChange={(event) => setGroupForm({ ...groupForm, nomeGrupo: event.target.value })} /></label>
          <label><span>Identificador do grupo</span><input value={groupForm.identificadorGrupo} onChange={(event) => setGroupForm({ ...groupForm, identificadorGrupo: event.target.value })} /></label>
          <label><span>Unidade</span><select value={groupForm.unidade} onChange={(event) => setGroupForm({ ...groupForm, unidade: event.target.value })}><option>Nova Lima/MG</option><option>Barueri/SP</option><option>Todas</option></select></label>
          <label><span>Demanda monitorada</span><input value={groupForm.demandaMonitorada} onChange={(event) => setGroupForm({ ...groupForm, demandaMonitorada: event.target.value })} /></label>
          <label><span>Responsável interno</span><input value={groupForm.responsavelInterno} onChange={(event) => setGroupForm({ ...groupForm, responsavelInterno: event.target.value })} /></label>
          <label><span>Status</span><select value={groupForm.status} onChange={(event) => setGroupForm({ ...groupForm, status: event.target.value as Status })}><option>Ativo</option><option>Inativo</option></select></label>
          <label className="span-2"><span>Observações</span><textarea value={groupForm.observacoes} onChange={(event) => setGroupForm({ ...groupForm, observacoes: event.target.value })} /></label>
          <div className="form-actions span-2">
            <button className="secondary-button" type="button" onClick={() => setGroupForm(emptyGroupClient)}>Limpar</button>
            <button className="primary-button" type="submit"><Save size={16} /> Salvar</button>
          </div>
        </form>
      </main>
    )
  }

  function renderDashboard() {
    return (
      <main className="content-shell">
        <SectionHeader eyebrow="Painel operacional" title="Dashboard Agent CrossDo" description="Visão inicial dos cadastros e vínculos operacionais do Cross Agent." />

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
            <div className="card-title"><LayoutDashboard size={20} /><h3>Módulos ativos</h3></div>
            <ul className="timeline">
              <li><strong>Usuários:</strong> controle de acesso interno.</li>
              <li><strong>Clientes:</strong> cadastro base do atendimento.</li>
              <li><strong>Grupos/Clientes:</strong> vínculo entre grupos monitorados e clientes.</li>
            </ul>
          </article>

          <article className="card">
            <div className="card-title"><Building2 size={20} /><h3>Ações rápidas</h3></div>
            <div className="quick-actions stacked">
              <button type="button" onClick={() => setScreen('clientes')}>Cadastrar cliente</button>
              <button type="button" onClick={() => setScreen('gruposClientes')}>Vincular grupo/cliente</button>
              <button type="button" onClick={() => setScreen('usuarios')}>Gerenciar usuários</button>
            </div>
          </article>
        </div>
      </main>
    )
  }

  function renderContent() {
    if (screen === 'usuarios') return renderUsers()
    if (screen === 'clientes') return renderClients()
    if (screen === 'gruposClientes') return renderGroupsClients()
    return renderDashboard()
  }

  if (!authenticated) {
    return (
      <div className="login-page">
        <section className="login-brand">
          <img className="login-logo" src="/agent-crossdo-app/brand/logo-icon.png" alt="CrossDo" />
          <p>Portal de atendimento e auditoria</p>
          <h1>Agent CrossDo</h1>
        </section>

        <form className="login-card" onSubmit={handleLogin}>
          <div>
            <p className="eyebrow">Acesso restrito</p>
            <h2>Entrar no painel</h2>
            <span className="login-subtitle">Acesse com seu e-mail e senha</span>
          </div>
          <label><span>E-mail</span><input value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} type="email" autoComplete="email" /></label>
          <label><span>Senha</span><input value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} type="password" autoComplete="current-password" autoFocus /></label>
          {loginError && <p className="login-error">{loginError}</p>}
          <button className="primary-button full" type="submit">Entrar</button>
        </form>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-brand">
          <img className="sidebar-logo" src="/agent-crossdo-app/brand/logo-icon.png" alt="CrossDo" />
          <div><strong>Agent CrossDo</strong><span>Cross Agent</span></div>
        </div>

        <nav className="side-nav">
          <button className={screen === 'dashboard' ? 'active' : ''} onClick={() => setScreen('dashboard')}><Home size={18} /> <span>Dashboard</span></button>
          <button className="nav-parent" onClick={() => setCadastrosOpen(!cadastrosOpen)}><Users size={18} /> <span>Cadastros</span> <ChevronDown size={16} className={cadastrosOpen ? 'rotate' : ''} /></button>
          {cadastrosOpen && (
            <div className="submenu">
              <button className={screen === 'usuarios' ? 'active' : ''} onClick={() => setScreen('usuarios')}><UserCog size={17} /> <span>Usuários</span></button>
              <button className={screen === 'clientes' ? 'active' : ''} onClick={() => setScreen('clientes')}><Building2 size={17} /> <span>Clientes</span></button>
              <button className={screen === 'gruposClientes' ? 'active' : ''} onClick={() => setScreen('gruposClientes')}><Users size={17} /> <span>Grupos/Clientes</span></button>
            </div>
          )}
        </nav>
      </aside>

      <section className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Alternar menu"><Menu size={20} /></button>
            <div><strong>Agent CrossDo</strong><span>Nome: Henrique Andrade • Setor: Diretoria / Cross Agent</span></div>
          </div>

          <div className="topbar-actions">
            <button title="Ajuda" type="button" onClick={() => window.open('https://github.com/henriqueandrade142-cell/agent-crossdo-app', '_blank', 'noopener,noreferrer')}><HelpCircle size={17} /> <span>Ajuda</span></button>
            <button title="Atualizar" type="button" onClick={() => window.location.reload()}><RefreshCw size={17} /> <span>Atualizar</span></button>
            <button title="Trocar senha" type="button" onClick={() => notify('Solicitação registrada.')}><KeyRound size={17} /> <span>Trocar senha</span></button>
            <button title="Sair" type="button" onClick={() => setAuthenticated(false)}><LogOut size={17} /> <span>Sair</span></button>
          </div>
        </header>
        {flash && <div className="flash-message">{flash}</div>}
        {renderContent()}
      </section>
    </div>
  )
}

function SectionHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="section-header"><p className="eyebrow">{eyebrow}</p><h2>{title}</h2><p>{description}</p></div>
  )
}

export default App
